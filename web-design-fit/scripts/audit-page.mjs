#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

import {
  buildSummary,
  detectLayoutIssues,
  pixelDiffRatio,
  samplePixelsFromPng,
  summarizePalette,
} from './lib/audit-utils.mjs';

const VIEWPORT = { width: 1440, height: 960 };
const WAIT_AFTER_LOAD_MS = 5000;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const outputDir = args.output ?? path.join(process.cwd(), 'audits', timestamp());
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await page.goto(args.url, { waitUntil: 'networkidle', timeout: args.timeout });

    const samples = [];
    samples.push(await screenshotPng(page));
    await page.waitForTimeout(1000);
    samples.push(await screenshotPng(page));
    await page.waitForTimeout(2000);
    samples.push(await screenshotPng(page));
    await page.waitForTimeout(Math.max(0, WAIT_AFTER_LOAD_MS - 3000));

    const screenshotPath = path.join(outputDir, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    samples.push(PNG.sync.read(await fs.readFile(screenshotPath)));

    const blocks = await collectLayoutBlocks(page);
    const layoutIssues = detectLayoutIssues(blocks);
    await writeLayoutOverlay(path.join(outputDir, 'layout-overlay.png'), samples.at(-1), blocks);

    const cssMotionElements = await collectMotionElements(page);
    await injectNoMotion(page);
    const noMotionPath = path.join(outputDir, 'screenshot-no-motion.png');
    await page.screenshot({ path: noMotionPath, fullPage: false });

    const palette = summarizePalette(samplePixelsFromPng(samples.at(-1), args.sampleStep));
    await writeColorPalette(path.join(outputDir, 'color-palette.png'), palette);

    const animation = summarizeAnimation(samples, cssMotionElements);
    const summary = buildSummary({
      url: args.url,
      viewport: VIEWPORT,
      palette,
      layout: { blocks, issues: layoutIssues },
      animation,
      artifacts: {
        screenshot: 'screenshot.png',
        screenshotNoMotion: 'screenshot-no-motion.png',
        layoutOverlay: 'layout-overlay.png',
        colorPalette: 'color-palette.png',
      },
    });

    await fs.writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(outputDir);
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const args = { timeout: 45000, sampleStep: 4 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' || arg === '--output') args.output = argv[++i];
    else if (arg === '--timeout') args.timeout = Number(argv[++i]);
    else if (arg === '--sample-step') args.sampleStep = Number(argv[++i]);
    else if (!args.url) args.url = arg;
  }
  return args;
}

function printUsage() {
  const script = path.basename(fileURLToPath(import.meta.url));
  console.error(`Usage: ${script} <url> [--out audits/run] [--timeout 45000]`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function screenshotPng(page) {
  const buffer = await page.screenshot({ fullPage: false });
  return PNG.sync.read(buffer);
}

async function collectLayoutBlocks(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('header, nav, main, section, article, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], body > div, main > div, section > div')];
    const viewportArea = window.innerWidth * window.innerHeight;
    const seen = new Set();
    const blocks = [];

    for (const element of candidates) {
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      const x = Math.round(rect.x);
      const y = Math.round(rect.y);
      const area = width * height;
      if (width < 80 || height < 40 || area < 6000) continue;
      if (x >= window.innerWidth || y >= window.innerHeight || x + width <= 0 || y + height <= 0) continue;
      const key = `${x}:${y}:${width}:${height}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const text = (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90);
      const className = typeof element.className === 'string' ? element.className.split(/\s+/).slice(0, 3).join('.') : '';
      const id = element.id ? `#${element.id}` : '';
      const cls = className ? `.${className}` : '';
      blocks.push({
        id: blocks.length + 1,
        label: `${element.tagName.toLowerCase()}${id}${cls}`,
        x,
        y,
        width,
        height,
        area,
        viewportShare: Number((area / viewportArea * 100).toFixed(2)),
        text,
      });
    }

    return blocks
      .sort((a, b) => b.area - a.area)
      .slice(0, 60)
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((block, index) => ({ ...block, id: index + 1 }));
  });
}

async function collectMotionElements(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('*')]
      .map((element) => {
        const style = getComputedStyle(element);
        const animationDuration = style.animationDuration;
        const transitionDuration = style.transitionDuration;
        if (animationDuration === '0s' && transitionDuration === '0s') return null;
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || '',
          className: typeof element.className === 'string' ? element.className.split(/\s+/).slice(0, 3).join(' ') : '',
          animationName: style.animationName,
          animationDuration,
          transitionProperty: style.transitionProperty,
          transitionDuration,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(Boolean)
      .slice(0, 80);
  });
}

async function injectNoMotion(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-delay: 0s !important;
        transition-duration: 0.001s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  });
  await page.waitForTimeout(100);
}

function summarizeAnimation(samples, cssMotionElements) {
  const diffs = [];
  for (let i = 1; i < samples.length; i += 1) {
    diffs.push({
      from: ['0s', '1s', '3s'][i - 1],
      to: ['1s', '3s', '5s'][i - 1],
      changedPixelRatio: Number(pixelDiffRatio(samples[i - 1], samples[i]).toFixed(4)),
    });
  }
  const stillMoving = diffs.at(-1)?.changedPixelRatio > 0.01;
  return {
    samples: diffs,
    cssMotionElementCount: cssMotionElements.length,
    cssMotionElements,
    risks: [
      ...(stillMoving ? [{ type: 'still-moving-after-5s', message: 'Pixel changes remain between 3s and 5s; final visual state may not be settled.' }] : []),
      ...(cssMotionElements.length > 30 ? [{ type: 'many-motion-elements', message: `${cssMotionElements.length} elements use CSS animation or transition.` }] : []),
    ],
  };
}

async function writeLayoutOverlay(filePath, basePng, blocks) {
  const png = clonePng(basePng);
  const colors = [
    [255, 40, 40, 255],
    [40, 120, 255, 255],
    [20, 180, 110, 255],
    [245, 170, 20, 255],
    [160, 80, 255, 255],
  ];
  for (const block of blocks) {
    const color = colors[(block.id - 1) % colors.length];
    drawRect(png, block.x, block.y, block.width, block.height, color);
    drawLabelBlock(png, block.x, block.y, block.id, color);
  }
  await fs.writeFile(filePath, PNG.sync.write(png));
}

async function writeColorPalette(filePath, palette) {
  const width = 900;
  const height = 180;
  const png = new PNG({ width, height });
  fill(png, [255, 255, 255, 255]);

  let x = 0;
  for (const swatch of palette.swatches) {
    const swatchWidth = Math.max(4, Math.round((swatch.percentage / 100) * width));
    fillRect(png, x, 0, swatchWidth, 120, [...hexToRgb(swatch.hex), 255]);
    x += swatchWidth;
  }

  x = 0;
  for (const family of palette.families) {
    const swatchWidth = Math.max(4, Math.round((family.percentage / 100) * width));
    fillRect(png, x, 132, swatchWidth, 48, [...familyColor(family.family), 255]);
    x += swatchWidth;
  }

  await fs.writeFile(filePath, PNG.sync.write(png));
}

function clonePng(source) {
  const png = new PNG({ width: source.width, height: source.height });
  source.data.copy(png.data);
  return png;
}

function drawRect(png, x, y, width, height, color) {
  for (let offset = 0; offset < 3; offset += 1) {
    drawLine(png, x, y + offset, x + width, y + offset, color);
    drawLine(png, x, y + height - offset, x + width, y + height - offset, color);
    drawLine(png, x + offset, y, x + offset, y + height, color);
    drawLine(png, x + width - offset, y, x + width - offset, y + height, color);
  }
}

function drawLine(png, x1, y1, x2, y2, color) {
  const minX = Math.max(0, Math.min(x1, x2));
  const maxX = Math.min(png.width - 1, Math.max(x1, x2));
  const minY = Math.max(0, Math.min(y1, y2));
  const maxY = Math.min(png.height - 1, Math.max(y1, y2));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) setPixel(png, x, y, color);
  }
}

function drawLabelBlock(png, x, y, id, color) {
  const width = Math.max(24, String(id).length * 10 + 10);
  fillRect(png, x, y, width, 20, color);
}

function fill(png, color) {
  fillRect(png, 0, 0, png.width, png.height, color);
}

function fillRect(png, x, y, width, height, color) {
  for (let yy = Math.max(0, y); yy < Math.min(png.height, y + height); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(png.width, x + width); xx += 1) {
      setPixel(png, xx, yy, color);
    }
  }
}

function setPixel(png, x, y, color) {
  const index = (png.width * y + x) << 2;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = color[3];
}

function hexToRgb(hex) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function familyColor(family) {
  return {
    white: [245, 245, 245],
    black: [20, 20, 20],
    gray: [140, 140, 140],
    red: [230, 50, 60],
    orange: [240, 130, 30],
    yellow: [245, 210, 60],
    green: [55, 170, 90],
    cyan: [40, 185, 200],
    blue: [60, 120, 230],
    purple: [145, 85, 220],
    pink: [230, 80, 155],
  }[family] ?? [120, 120, 120];
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
