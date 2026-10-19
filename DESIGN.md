---
name: DIAGCALC
description: Probability Rail design system for a diagnostic test teaching calculator
colors:
  paper: "#FAF7EE"
  paper-2: "#F1EBDD"
  ink: "#1C2B27"
  ink-soft: "#4F5B55"
  rule: "#C9C1AE"
  rule-strong: "#938B78"
  vermilion: "#A9432E"
  bottle: "#2F6B57"
  ochre: "#876019"
  dark-paper: "#101714"
  dark-ink: "#EDE7D8"
typography:
  body:
    fontFamily: "Plex Sans, Avenir Next, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "Plex Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "1.35rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Plex Sans, Avenir Next, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.06em"
  teaching:
    fontFamily: "Plex Serif, Georgia, Iowan Old Style, serif"
    fontSize: "1.02rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  control: "2px"
  surface: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
  tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "13px 16px 11px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  rail:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.vermilion}"
    rounded: "{rounded.surface}"
  metric-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "10px 12px"
  tool-disclosure:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "14px 0 18px"
---

# Design System: DIAGCALC

## Overview

**Creative North Star: "The Working Nomogram"**

DIAGCALC is a teaching instrument, not a medical dashboard and not a journal page. The surface is a ruled calculation sheet: paper, ink, tabular numerals, and one continuous probability rail that carries pre-test probability through a likelihood ratio to a post-test probability. The world comes from clinical epidemiology's nomograms and statistical graph paper; the controls remain ordinary web controls. Expression lives in type, palette, density and the rail, never in a costume of the world.

The page opens on a case sheet and its result, with the explanation written in the margin directly under the rail. Exploration and reading are separate tabs rather than a long scroll. The mood is calm, exacting and teacherly: the user should be able to see why a number moved, not merely that it did. Density is deliberate; white space separates the three jobs of the screen — enter, calculate, understand — while rules, not cards, bind related values.

**Key Characteristics:**
- A single logit-scaled probability rail is the signature interaction.
- Ruled, border-led surfaces; no cards, shadows or decorative gradients.
- One data size with rank carried by weight, case and rule.
- Vermilion for positive/active evidence, bottle green for negative evidence, ochre for caution.
- A serif teaching margin beneath the result, in the lecturer's voice.
- Four tabs: Case, Explore, Learn, History.

## Colors

The palette is a clinical workbook: warm paper, near-black ink, one active vermilion, one rule-out green and one caution ochre. Colour is functional, not atmospheric.

### Primary
- **Paper** (`#FAF7EE`): the working ground. It is warm enough to feel printed, neutral enough for long teaching sessions.
- **Ink** (`#1C2B27`): text, axes, rules and the primary action. It is green-black, not pure black, to sit beside the bottle accent.
- **Vermilion** (`#A9432E`): the active positive result, the rail line, focus rings and the selected tab rule. Used sparingly; it marks evidence, not decoration.

### Secondary
- **Bottle Green** (`#2F6B57`): negative evidence, rule-out, success and the print-safe privacy note. It never appears as a generic success badge.

### Tertiary
- **Ochre** (`#876019`): illustrative-data warnings, unavailable states and caution. It is the only colour that may carry a warning band.

### Neutral
- **Paper 2** (`#F1EBDD`): field backgrounds, matrix headers and quiet grouping.
- **Rule** (`#C9C1AE`): hairlines and ledger separators.
- **Rule Strong** (`#938B78`): matrix boundaries and active rules.
- **Ink Soft** (`#4F5B55`): secondary text and axis labels.
- **Dark Paper** (`#101714`) / **Dark Ink** (`#EDE7D8`): the dark theme is an ink ground with paper text, not an inversion of the light theme.

### Named Rules
**The One Active Colour Rule.** Vermilion or bottle green marks the active result and its rail. The rest of the screen stays paper and ink. If both accents compete for attention, the result is unclear.

**The Evidence Is Not a Badge Rule.** A colour never carries meaning alone. Every accent has a text label, a shape, or a position that says the same thing.

## Typography

**Display Font:** IBM Plex Sans (self-hosted; fallback Avenir Next, Segoe UI, sans-serif)
**Body Font:** IBM Plex Sans
**Label/Mono Font:** IBM Plex Mono (self-hosted; tabular numerals)
**Teaching Font:** IBM Plex Serif Italic (self-hosted; fallback Georgia, Iowan Old Style)

**Character:** Plex Sans gives the interface an engineered, neutral voice without looking like enterprise software. Plex Mono makes every value stable and comparable; Plex Serif Italic belongs only to the margin note, where it sounds like a lecturer writing beside a calculation.

### Hierarchy
- **Result display** (500, `1.9rem`, `1`, mono, `-0.03em`): the active post-test probability at the end of the rail.
- **Headline value** (500, `1.05–1.35rem`, `1.1`, mono): sensitivity, specificity and both post-test values in the ruled strip.
- **Heading** (600, `1.35–1.75rem`, `1.15`, sans, `-0.01em`): the two sheet headings and tab headings.
- **Label** (600, `11px`, `1.25`, sans, `0.06em`, uppercase): matrix headers, metric names, rail labels, small controls.
- **Body** (400, `15px`, `1.5`, sans, 65–75ch): help text, learning copy and labels that need a sentence.
- **Teaching note** (400 italic, `1.02rem`, `1.55`, serif, 62ch max): the “Why this result” paragraph.

### Named Rules
**The One Data Size Rule.** Data is set at one size per context; rank comes from weight, case and the rule above or below it. Do not inflate a metric to make it feel important.

**The Numbers Are Mono Rule.** Every probability, count, ratio and confidence interval uses Plex Mono with tabular numerals. A proportional face may set prose about a number, never the number itself.

## Layout

The page uses a 1440px working container with 48px side gutters at desktop, collapsing to 14px on phones. The Case tab is a 5/7 split: a 2×2 case sheet on the left and a result sheet on the right. The result sheet stacks a four-cell headline strip, the probability rail, the teaching margin and then the metric ledger. At 880px and below the case workspace becomes one column; the order remains enter → result → understand.

The tab bar sits directly under the 59px app bar. Content starts at 132px at 1440, so a calculated case shows the form actions, headline, rail and teaching note inside the first 900px. The rail track is 156px tall, with the axis at its midline. Page sections use a 4/8/16/24/32 spacing rhythm; headings get more space above than below.

**The Two Jobs Rule.** The Case tab never mixes the task of entering a matrix with the task of browsing references. Exploration and reading live behind their own tabs.

## Elevation & Depth

There are no shadows. Depth is conveyed by paper tone, 1px rules, matrix boundaries and the 2px top rule that opens each work area. A surface is either the page or a field; the page never stacks cards. The only moving depth is the rail: the active line, marker and CI bracket sit in front of the ruled axis.

**The Flat-by-Default Rule.** If an element needs emphasis, change its weight, rule or accent — never add a drop shadow.

## Shapes

Controls use a 2px radius; ruled surfaces and matrix cells use square corners. The rail is a line, not a rounded capsule. The result band is a thin 3–4px rule with square ends. Pills are reserved for nothing; the positive/negative switch is a two-button segmented control with square ends. Borders are 1px except the 2px top rules that open the case and result sheets.

## Components

### Buttons
- **Shape:** 2px radius (`{rounded.control}`), 40px minimum height.
- **Primary:** ink background, paper text, ink border; `9px 15px` padding. Hover: vermilion background and border.
- **Secondary:** transparent background, ink text, rule-strong border. Hover: paper-2 background and ink border.
- **Disabled:** 0.45 opacity and no pointer events.
- **Focus:** 2px vermilion outline with a 2px offset.

### Tabs
- **Shape:** square, with a 2px bottom rule. No pill or filled active state.
- **Default:** ink-soft text, transparent background. Hover: ink text and a rule-coloured bottom border.
- **Active:** ink text, 600 weight, vermilion bottom border. Arrow keys move focus; the URL hash records the active tab.

### Inputs / Fields
- **Style:** paper background, 1px rule border, 2px radius, 40px minimum height; monospace for numbers.
- **Focus:** ink border plus a 2px vermilion outline.
- **Matrix:** a three-column grid with a rule-strong outer boundary; headers and labels sit on paper-2; each cell is a 52px-high numeric field with no inner border.
- **Error:** feedback text in vermilion below the form; invalid results clear the rail and ledger.

### Cards / Containers
There are no cards. Results are a ruled headline strip and a metric ledger. Each metric cell has a right and bottom hairline; the strip has a top and bottom rule. Tools are ruled sections with a summary, not panels. The only bordered blocks are the matrix, the threshold gauge and the tool canvases.

### Signature Component: Probability Rail
- A logit-scaled axis from 0.1% to 99.9%, with seven labelled ticks.
- The pre-test marker is an ink 2px rule; the post-test marker is a 4px vermilion or bottle-green rule.
- The active branch is a 2px line in the result colour; the inactive endpoint remains a faint 1px tick.
- The CI is a 12px bracket with a tinted interior; a continuity-corrected interval uses a dashed top rule and a text label.
- The readout is `pre-test × LR → post-test` in mono, with the post-test value at `1.9rem`.
- The positive/negative segmented control is the only way to switch the active branch; `aria-pressed` records the selection.
- Undefined results remove the post marker and CI and print “Not defined for this table” in ochre.
- The rail draws once on calculation (320ms line, 220ms marker); reduced motion shows the final state immediately.

### Metric Ledger
- Three columns at desktop, two at tablet and phone.
- Each cell: 11px uppercase label, mono value, 11px CI/note, and a 3–4px bar or band where relevant.
- Undefined values use a dashed unavailable rule rather than a zero-width bar.

### Tool Disclosure
- A 1px top rule and a native `<details>` summary. No card, no icon tile.
- The open state is indicated by the summary and the content below; no animated chevron beyond the browser default.

## Do's and Don'ts

### Do:
- **Do** keep the 2×2 sheet, headline, rail and teaching note together in the Case tab.
- **Do** use Plex Mono for every number and Plex Serif Italic only for the teaching note.
- **Do** show the corrected CI label when the interval used +0.5.
- **Do** preserve the empty, invalid, undefined, sparse and storage-blocked states with text, not colour alone.
- **Do** keep the rail’s active branch switchable with a standard segmented control and `aria-pressed`.

### Don't:
- **Don't** turn the result into a grid of rounded cards or add shadows.
- **Don't** use vermilion or bottle green as decoration; they mark the active result, positive/negative evidence and focus.
- **Don't** use the rail as a generic progress bar; its positions are probabilities on a logit scale.
- **Don't** hide the teaching note below the ledger; it belongs immediately after the result.
- **Don't** add a second chart that repeats the rail’s job in the Case tab.
