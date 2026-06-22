export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
}

export function classifyColor([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;
  const chroma = max - min;

  if (lightness >= 0.94 && chroma < 18) return { family: 'white', tone: 'neutral' };
  if (lightness <= 0.08 && chroma < 24) return { family: 'black', tone: 'neutral' };
  if (chroma < 18) return { family: 'gray', tone: lightness > 0.55 ? 'light' : 'dark' };

  const hue = rgbToHue(r, g, b);
  if (hue < 12 || hue >= 345) return { family: 'red', tone: toneFor(lightness) };
  if (hue < 38) return { family: 'orange', tone: toneFor(lightness) };
  if (hue < 65) return { family: 'yellow', tone: toneFor(lightness) };
  if (hue < 155) return { family: 'green', tone: toneFor(lightness) };
  if (hue < 190) return { family: 'cyan', tone: toneFor(lightness) };
  if (hue < 255) return { family: 'blue', tone: toneFor(lightness) };
  if (hue < 292) return { family: 'purple', tone: toneFor(lightness) };
  if (hue < 345) return { family: 'pink', tone: toneFor(lightness) };
  return { family: 'gray', tone: toneFor(lightness) };
}

export function summarizePalette(pixels, options = {}) {
  const maxSwatches = options.maxSwatches ?? 12;
  const familyCounts = new Map();
  const swatchCounts = new Map();

  for (const pixel of pixels) {
    const [r, g, b, a = 255] = pixel;
    if (a < 16) continue;

    const family = classifyColor([r, g, b]).family;
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);

    const quantized = [r, g, b].map((value) => Math.round(value / 16) * 16);
    const hex = rgbToHex(quantized);
    swatchCounts.set(hex, (swatchCounts.get(hex) ?? 0) + 1);
  }

  const totalPixels = [...familyCounts.values()].reduce((sum, count) => sum + count, 0);
  const families = toPercentRows(familyCounts, totalPixels, 'family');
  const swatches = toPercentRows(swatchCounts, totalPixels, 'hex').slice(0, maxSwatches);
  const accentCandidates = swatches.filter((swatch) => {
    const rgb = hexToRgb(swatch.hex);
    const family = classifyColor(rgb).family;
    return !['white', 'black', 'gray'].includes(family) && swatch.percentage <= 12;
  });

  return {
    totalPixels,
    familyCount: families.length,
    families,
    swatches,
    accentCandidates,
    risks: detectColorRisks(families, swatches),
  };
}

export function detectLayoutIssues(blocks, options = {}) {
  const minGap = options.minGap ?? 8;
  const alignTolerance = options.alignTolerance ?? 12;
  const issues = [];
  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      if (b.y > a.y + a.height + minGap && !rangesOverlap(a.x, a.x + a.width, b.x, b.x + b.width)) continue;
      if (rectsOverlap(a, b) && !rectContains(a, b) && !rectContains(b, a)) {
        issues.push(issue('overlap', [a.id, b.id], `Blocks ${a.id} and ${b.id} overlap.`));
        continue;
      }
      const verticalGap = b.y - (a.y + a.height);
      if (verticalGap >= 0 && verticalGap < minGap && rangesOverlap(a.x, a.x + a.width, b.x, b.x + b.width)) {
        issues.push(issue('tight-spacing', [a.id, b.id], `Blocks ${a.id} and ${b.id} have ${Math.round(verticalGap)}px vertical gap.`));
      }
    }
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const leftDelta = Math.abs(previous.x - current.x);
    if (leftDelta > alignTolerance && leftDelta < 96 && Math.abs(previous.width - current.width) < 160) {
      issues.push(issue('misalignment', [previous.id, current.id], `Blocks ${previous.id} and ${current.id} have similar width but left edges differ by ${Math.round(leftDelta)}px.`));
    }
  }

  const smallBlocks = blocks.filter((block) => block.area < 30000);
  if (smallBlocks.length >= 18) {
    issues.push(issue('fragmentation', smallBlocks.slice(0, 12).map((block) => block.id), `${smallBlocks.length} small blocks detected; page may feel fragmented.`));
  }

  return dedupeIssues(issues);
}

export function buildSummary({ url, viewport, palette, layout, animation, artifacts }) {
  return {
    tool: 'web-design-fit/audit-page',
    version: 1,
    createdAt: new Date().toISOString(),
    url,
    viewport,
    palette,
    layout,
    animation,
    artifacts,
  };
}

export function samplePixelsFromPng(png, step = 4) {
  const pixels = [];
  for (let y = 0; y < png.height; y += step) {
    for (let x = 0; x < png.width; x += step) {
      const index = (png.width * y + x) << 2;
      pixels.push([png.data[index], png.data[index + 1], png.data[index + 2], png.data[index + 3]]);
    }
  }
  return pixels;
}

export function pixelDiffRatio(a, b, step = 8) {
  if (a.width !== b.width || a.height !== b.height) return 1;
  let changed = 0;
  let sampled = 0;
  for (let y = 0; y < a.height; y += step) {
    for (let x = 0; x < a.width; x += step) {
      const index = (a.width * y + x) << 2;
      const delta =
        Math.abs(a.data[index] - b.data[index]) +
        Math.abs(a.data[index + 1] - b.data[index + 1]) +
        Math.abs(a.data[index + 2] - b.data[index + 2]);
      if (delta > 36) changed += 1;
      sampled += 1;
    }
  }
  return sampled === 0 ? 0 : changed / sampled;
}

function rgbToHue(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function toneFor(lightness) {
  if (lightness > 0.72) return 'light';
  if (lightness < 0.28) return 'dark';
  return 'mid';
}

function hexToRgb(hex) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function toPercentRows(map, total, key) {
  return [...map.entries()]
    .map(([name, count]) => ({ [key]: name, count, percentage: total === 0 ? 0 : Number(((count / total) * 100).toFixed(2)) }))
    .sort((a, b) => b.count - a.count);
}

function detectColorRisks(families, swatches) {
  const risks = [];
  const nonNeutral = families.filter((item) => !['white', 'black', 'gray'].includes(item.family));
  if (families.length > 5) {
    risks.push({ type: 'many-color-families', message: `${families.length} color families detected; check whether palette is intentional.` });
  }
  const saturatedLarge = nonNeutral.filter((item) => item.percentage >= 28);
  for (const item of saturatedLarge) {
    risks.push({ type: 'large-saturated-area', family: item.family, message: `${item.family} covers ${item.percentage}% of sampled pixels.` });
  }
  const tinyHighContrast = swatches.filter((item) => item.percentage >= 0.2 && item.percentage <= 4);
  if (tinyHighContrast.length > 0) {
    risks.push({ type: 'possible-accent-colors', message: 'Small high-contrast swatches may indicate CTA or emphasis colors.', swatches: tinyHighContrast.slice(0, 5) });
  }
  return risks;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function rectContains(a, b) {
  const inset = 3;
  return b.x >= a.x - inset && b.y >= a.y - inset && b.x + b.width <= a.x + a.width + inset && b.y + b.height <= a.y + a.height + inset;
}

function rangesOverlap(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}

function issue(type, blockIds, message) {
  return { type, blockIds, message };
}

function dedupeIssues(issues) {
  const seen = new Set();
  return issues.filter((item) => {
    const key = `${item.type}:${item.blockIds.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
