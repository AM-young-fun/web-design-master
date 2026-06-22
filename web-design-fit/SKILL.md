---
name: web-design-fit
description: Use when designing websites, landing pages, product pages, marketing sites, or web page visual direction. Guides design decisions from business intent, narrative, material choices, detail thinking, and taste guardrails instead of defaulting to generic attractive styles.
---

# Web Design Fit

Use this skill when designing a website, landing page, product page, marketing site, or web page visual direction.

Core principle: no design is best in general. Design is suitable or unsuitable for a specific business intent.

## Operating Model

Before proposing visual direction, reason through five layers:

1. Fit: what design is appropriate for this business.
2. Intent: what the business needs the page to achieve.
3. Narrative: how the page should express that intent.
4. Materials: what assets and combinations can prove the idea.
5. Detail: whether simplicity comes from thoughtful editing, not laziness.

Do not choose style from taste alone. Derive it from business meaning.

## L1: Design Fit Frame

Start by identifying:

- Business tier: high-end, mid-market, low-cost, mass-market, niche, or operational.
- Business intent: trust, conversion, explanation, status, speed, retention, purchase, lead capture, or product understanding.
- Audience state: cold visitor, warm lead, expert buyer, anxious buyer, repeat user, internal operator, or casual explorer.
- Use context: quick scan, deep reading, repeated operation, mobile-first, desktop-first, presentation, sales conversation.
- Success signal: click, lead, purchase, comprehension, saved time, perceived trust, perceived status, share, or repeat use.

Use these as the standard for whether the design fits.

## L2: Business Analogy

Generate 2-3 real-world analogies for the business each time. Do not rely on a fixed template library. The goal is to provoke better judgment, not constrain creativity.

Analogies can come from:

- Places: hotel, bank, lab, market, club, conference room, clinic, boutique, warehouse, cockpit.
- Cultural symbols: black card, cinema, retail shelf, operating room, luxury lounge, trade show booth.
- Buying psychology: status, safety, urgency, delight, efficiency, belonging, proof, exploration.

Then derive:

- Color theme and contrast.
- Layout density and whitespace.
- Type scale, typeface mood, weight, and rhythm.
- Paragraph length and information sequence.
- Image, video, UI screenshot, illustration, or 3D asset style.
- Motion strength and interaction feel.

Also identify style choices that may look good but conflict with the business intent.

## L3: Narrative Strategy

Choose a primary narrative strategy and explain why it fits.

Common strategies:

- Direct value: best for commodities, ordinary services, tools, clear offers, and most conversion pages.
- Mystery and reveal: useful for strong brands, launches, rare resources, art, and advanced technology when the payoff is real.
- Evidence accumulation: useful for expensive, risky, regulated, B2B, education, finance, medical, or trust-heavy decisions.
- Scenario immersion: useful for consumer products, travel, home, lifestyle, and experiential services.
- Identity projection: useful for luxury, membership, creators, personal brands, and status goods.
- Operational efficiency: useful for SaaS dashboards, internal tools, management systems, and repeated workflows.

These are suggestions, not hard rules. Invent another narrative if it fits better.

Check for narrative mismatch:

- Ordinary goods or services usually should reveal value early.
- Mystery without payoff feels annoying.
- Huge editorial drama needs a statement with real weight.
- A calm product UI usually should not become cute by default.

## L4: Material Composition Plan

Find the win point before choosing assets.

Possible win points:

- More valuable despite higher price.
- Faster.
- More credible.
- Rarer.
- Easier.
- More professional.
- More beautiful.
- More fun.
- Lower risk.
- Better proof.

Assets must serve the win point. They are not decoration.

For each major asset, decide:

- Main asset type: product photo, person, usage scene, UI screenshot, 3D render, video, data chart, proof artifact, comparison, testimonial, diagram.
- Asset role: prove reality, create desire, explain function, signal status, show speed, reduce risk, show craft, or make complexity understandable.
- Composition: full-bleed hero, side-by-side, evidence grid, timeline, before-after, product closeup, interface walkthrough, immersive scroll, operating panel, comparison table.
- Risk: fake, empty, cheap, stock-like, mismatched with price, too abstract, too decorative, or too generic.

If strong assets do not exist, do not fake luxury or sophistication. Use structure, contrast, copy, proof, real UI, real constraints, and honest evidence to carry the page.

The page should make the visitor understand within about three seconds why this business is worth choosing.

## L5: Detail Thinking

This is a thinking principle, not a mandatory long checklist.

Simple is not the same as underdesigned. Minimal design still contains many decisions about what to remove and what to keep.

Before finalizing, self-check:

- What was removed, and why?
- What detail remains because it improves trust, clarity, status, speed, or desire?
- Does the design feel intentionally concise or merely empty?
- Does density match the business? High-end can be sparse and precise. Operational tools can be dense and ordered.
- Does the first viewport show its complete intended content without clipping or being cut off at 414x896 mobile, 1440x900 desktop, and 1920x1080 desktop?
- When glassmorphism, box shadows, blur, glow, or similar effects extend beyond a block, do text and images still align vertically, with enough padding for the effect to breathe instead of being abruptly clipped at the edge?
- Do special visual effects preserve the row's overall composition and sense of air, rather than making the section feel like unrelated effects patched together?
- Do microstates support the experience: hover, loading, empty states, errors, icons, spacing, type weight, image crop, CTA state, form behavior?

Only mention detailed microstates when relevant to the task.

## Taste Guardrails

Avoid semantic mismatch and template reflex.

- Do not make calm product UI cute with rounded corners by default.
- Do not use huge magazine typography for weak or generic copy.
- Do not treat black as the default path to premium. Explain what real-world context makes black appropriate.
- Avoid generic AI visual habits: black backgrounds, glow, glassmorphism, loud gradients, hollow hero headlines, stacked cards, and decoration without argument.
- Do not use any attractive technique unless it can answer: what business job does this do here?
- Style choices can be bold, plain, playful, luxurious, dense, sparse, dark, bright, or strange, but they must be earned by intent.

## Response Pattern

## Audit Tool

For an existing page, gather page evidence before judging visual quality:

```bash
cd web-design-fit
npm install
npx playwright install chromium
npm run audit -- <url>
```

When already inside an installed global skill, run the same commands from the `web-design-fit` skill directory. The script lives at `scripts/audit-page.mjs` and writes an audit folder under `audits/<timestamp>/` unless `--out <dir>` is passed.

Artifacts:

- `summary.json`: palette percentages, layout blocks, layout risks, animation samples, and artifact names.
- `screenshot.png`: 1440x960 screenshot after network idle plus a 5 second wait.
- `screenshot-no-motion.png`: same page after injecting CSS that effectively disables animations and transitions.
- `layout-overlay.png`: screenshot with major blocks outlined and numbered.
- `color-palette.png`: visual strips for dominant swatches and color families.

Use the script output as evidence, not as the final verdict. The script reports signals; the AI still decides fit using business intent, analogies, narrative, materials, and taste guardrails.

Read `summary.json` first. Inspect overlay and screenshots when layout, color, or animation signals look suspicious.

Current checks:

- Color: sampled pixels grouped into human-readable families, dominant swatches, accent candidates, and palette risks.
- Layout: major semantic blocks and direct child blocks, with tight spacing, overlap, misalignment, and fragmentation signals.
- Animation: screenshots at roughly 0s, 1s, 3s, and 5s, pixel-diff ratios, CSS animation/transition element counts, and unsettled-motion risk.

The default viewport is `1440x960`.

## Recommendation Format

When enough context exists, structure recommendations as:

1. Business intent.
2. Business analogies.
3. Narrative strategy.
4. Visual system.
5. Materials and composition.
6. Detail thinking.
7. Taste guardrail check.

If context is missing, ask at most three high-leverage questions before giving direction. Prefer questions about business tier, buyer psychology, and win point.

If the user asks for a fast answer, use a compressed version:

- Fit.
- Analogy.
- Narrative.
- Visual direction.
- Assets.
- Avoid.

Do not present design as universal truth. Present it as a fit judgment tied to business intent.
