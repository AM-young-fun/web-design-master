import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyColor,
  summarizePalette,
  detectLayoutIssues,
  buildSummary,
} from '../scripts/lib/audit-utils.mjs';

test('classifyColor maps neutral and hue families into readable buckets', () => {
  assert.equal(classifyColor([250, 250, 250]).family, 'white');
  assert.equal(classifyColor([8, 10, 12]).family, 'black');
  assert.equal(classifyColor([128, 128, 128]).family, 'gray');
  assert.equal(classifyColor([230, 40, 50]).family, 'red');
  assert.equal(classifyColor([30, 120, 230]).family, 'blue');
});

test('summarizePalette groups sampled pixels and reports percentages', () => {
  const pixels = [
    [255, 255, 255],
    [252, 252, 252],
    [20, 20, 20],
    [230, 20, 40],
  ];

  const summary = summarizePalette(pixels, { maxSwatches: 8 });

  assert.equal(summary.totalPixels, 4);
  assert.equal(summary.families[0].family, 'white');
  assert.equal(summary.families[0].percentage, 50);
  assert.equal(summary.families.find((item) => item.family === 'red').percentage, 25);
  assert.ok(summary.swatches.some((item) => item.hex === '#ffffff'));
});

test('detectLayoutIssues flags overlap, tight spacing, and column misalignment', () => {
  const blocks = [
    { id: 1, label: 'section.hero', x: 80, y: 0, width: 500, height: 200, area: 100000 },
    { id: 2, label: 'section.proof', x: 83, y: 204, width: 500, height: 100, area: 50000 },
    { id: 3, label: 'section.cards', x: 130, y: 304, width: 500, height: 100, area: 50000 },
    { id: 4, label: 'section.overlap', x: 120, y: 360, width: 200, height: 100, area: 20000 },
  ];

  const issues = detectLayoutIssues(blocks, { minGap: 8, alignTolerance: 12 });

  assert.ok(issues.some((issue) => issue.type === 'tight-spacing'));
  assert.ok(issues.some((issue) => issue.type === 'misalignment'));
  assert.ok(issues.some((issue) => issue.type === 'overlap'));
});

test('detectLayoutIssues does not flag normal parent-child containment as overlap', () => {
  const blocks = [
    { id: 1, label: 'main', x: 0, y: 0, width: 1000, height: 800, area: 800000 },
    { id: 2, label: 'section.hero', x: 80, y: 80, width: 840, height: 240, area: 201600 },
  ];

  const issues = detectLayoutIssues(blocks);

  assert.equal(issues.some((issue) => issue.type === 'overlap'), false);
});

test('buildSummary returns stable audit shape for AI consumption', () => {
  const summary = buildSummary({
    url: 'https://example.test',
    viewport: { width: 1440, height: 960 },
    palette: { families: [], swatches: [], risks: [] },
    layout: { blocks: [], issues: [] },
    animation: { samples: [], cssMotionElements: [], risks: [] },
    artifacts: { screenshot: 'screenshot.png' },
  });

  assert.equal(summary.tool, 'web-design-fit/audit-page');
  assert.equal(summary.url, 'https://example.test');
  assert.deepEqual(summary.viewport, { width: 1440, height: 960 });
  assert.ok(summary.createdAt);
  assert.equal(summary.artifacts.screenshot, 'screenshot.png');
});
