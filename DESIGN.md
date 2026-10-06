---
name: Talkpush UAT Tester Pages
description: A sturdy, high-contrast ink-on-paper checklist for non-technical testers working through UAT steps mid-task.
colors:
  ink: "hsl(240 10% 8%)"
  paper: "hsl(60 100% 98%)"
  card-white: "hsl(0 0% 100%)"
  ink-cream: "hsl(50 30% 92%)"
  mist: "hsl(60 30% 95%)"
  text-secondary: "#374151"
  text-body: "#1f2937"
  placeholder-gray: "hsl(240 5% 45%)"
  sage-wash: "hsl(139 25% 93%)"
  lavender-wash: "hsl(223 55% 94%)"
  amber-wash: "hsl(36 75% 92%)"
  brand-amber: "#f2b457"
  brand-pink: "#f1c1f3"
  brand-lavender: "#bbcaf0"
  brand-sage: "#accdb5"
  status-pass: "#15803d"
  status-fail: "#b91c1c"
  status-na: "#374151"
  status-blocked: "#c2410c"
  status-review: "#b45309"
typography:
  title:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "normal"
  instruction:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.625
    letterSpacing: "normal"
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: "normal"
  button:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "normal"
rounded:
  control: "6px"
  card: "9px"
  panel: "12px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  step-badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-cream}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
    typography: "{typography.label}"
  status-button:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
    typography: "{typography.button}"
  status-button-pass-selected:
    backgroundColor: "{colors.status-pass}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.control}"
    height: "48px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-cream}"
    rounded: "{rounded.card}"
    padding: "12px 24px"
    typography: "{typography.button}"
  button-outline:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 24px"
    typography: "{typography.button}"
  button-disabled:
    backgroundColor: "#f3f4f6"
    textColor: "#4b5563"
    rounded: "{rounded.card}"
    padding: "12px 24px"
  tip-callout:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  section-callout:
    backgroundColor: "{colors.lavender-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  textarea:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
---

# Design System: Talkpush UAT Tester Pages

This file documents the tester-facing pages (`/test/...`: register, checklist, step-by-step view, results). Admin pages share the same tokens but keep their lighter style and are not described here.

## Overview

**Creative North Star: "The Field Checklist"**

The tester pages are a checklist you hold while doing a real task somewhere else: a call on your phone, a profile in the Talkpush CRM. They are read in glances. So the interface is sturdy, plain and high-contrast. Every container is drawn with a heavy ink outline, labels are bold, instructions are the largest text on the screen, and colour is rationed to small, meaningful accents. Nothing is decorative, because the tester's attention belongs to the step.

The look is flat ink on warm paper. Depth comes from outlines and spacing, never shadows. The Talkpush Sign pastels (sage, lavender, pink, amber) survive only as pale washes behind a tip, a section header or a first-use callout, plus the gradient strip on the register page. Status is told by a filled button and a word, not by tinted cards.

**Key Characteristics:**
- 2px ink outlines on every card, control, input and the progress bar.
- Weight 500 body, weight 700 labels and buttons; nothing lighter than 14px.
- Flat: no shadows, no blur, no coloured side stripes.
- One filled answer per step; every other control stays an outline.
- A single column about 768px wide, aligned edge to edge: header, banners and cards share the same left and right edges.

## Colors

A near-black ink on a warm near-white page, with the four brand pastels held back as pale washes and one saturated status colour at a time.

### Primary
- **Ink** (hsl(240 10% 8%)): All text, every border, the step badge, the primary button and the progress fill. It is the system's single strong voice.

### Secondary
- **Pass Green / Fail Red / Blocked Orange / Review Amber / N/A Slate** (#15803d / #b91c1c / #c2410c / #b45309 / #374151): Only as the fill of the one selected status button and as the matching text colour for that status in lists. Each pairs with white text at AA contrast.

### Tertiary
- **Sage Wash** (hsl(139 25% 93%)): Quiet informational boxes such as the Talkpush "confirm it ran" notice.
- **Lavender Wash** (hsl(223 55% 94%)): Section headers inside a checklist.
- **Amber Wash** (hsl(36 75% 92%)): Tips and the Talkpush login link.
- **Brand gradient** (#f2b457, #f1c1f3, #bbcaf0, #accdb5): The 6px strip across the top of the register page only.

### Neutral
- **Paper** (hsl(60 100% 98%)): The page background.
- **Card White** (hsl(0 0% 100%)): Cards, the sticky header and inputs.
- **Ink Cream** (hsl(50 30% 92%)): Text on ink fills.
- **Mist** (hsl(60 30% 95%)): Hover fill on outline controls.
- **Secondary Text** (#374151) and **Body Text** (#1f2937): Supporting copy. Nothing lighter than these is used for text on white.

### Named Rules
**The One Filled Answer Rule.** On a step, exactly one control may be filled with a colour: the chosen status. Everything else is an outline. If five buttons are coloured at rest, none of them means anything.

**The Quiet Wash Rule.** Pastels are pale washes behind a small block of text, never a full-card tint or a border colour. A tester should be able to ignore colour and still use the page.

**The Ink Floor Rule.** Text is ink or one of the two secondary grays, never lighter. Body text meets 4.5:1 contrast and no text is below 14px.

## Typography

**Display Font:** DM Sans (with ui-sans-serif, system-ui)
**Body Font:** DM Sans
**Label/Mono Font:** DM Sans; the Space Grotesk face is reserved for admin navigation and not used on tester pages.

**Character:** A friendly geometric sans set heavy. Weight, not size, creates hierarchy, so a step reads correctly even on a small phone.

### Hierarchy
- **Title** (700, 20px mobile / 24px desktop, 1.33): The client name in the sticky header and page headings.
- **Instruction** (500, 17px, 1.625): The step text, the largest and most prominent copy.
- **Body** (500, 15px, 1.625): Tips, comments, helper lines and results text.
- **Label** (700, 14px): Actor name, field labels, "Review before testing", save state, counts.
- **Button** (700, 15px): Status buttons and actions; large primary actions go to 16px.

### Named Rules
**The Weight Over Size Rule.** Emphasis comes from 500 to 700 weight steps. Do not introduce small light text to mean "less important"; reduce it by position and colour from the ink to the secondary gray instead.

## Layout

One centred column, 768px at most (672px on results, 448px on register), with a 16px side gutter. Everything in the column, including the sticky title bar, the preview banner, the "How to answer" box and the step cards, shares the same left and right edges; nothing bleeds past the cards. Steps stack with 16px between them. Inside a card the padding is 16px on phones and 20px from the small breakpoint up.

The title bar is sticky at the top with a 2px ink rule beneath it. The progress bar sits inside it, so progress is always visible. The five status buttons are a 3 plus 2 grid on phones and one row from 640px up. Content must survive anything an admin pastes: text and links wrap inside their container and long URLs are shortened for display with a Copy control.

## Elevation & Depth

Flat by design. There are no shadows anywhere on tester pages. A surface is separated from the page by its 2px ink outline and by white against paper; nesting is avoided. The only layering is the sticky title bar, which is held in place by a solid white fill and its bottom rule, and the step-list side sheet.

### Named Rules
**The No-Shadow Rule.** Do not add shadows, glows or blur to indicate importance. Add an outline, a fill or whitespace.

## Shapes

Heavy 2px outlines with modestly rounded corners: 6px on controls and inputs, 9px on cards and large buttons, 12px on the register page cards, and fully round only for the progress bar and result badges. Dashed 2px outlines mean "drop or add something here" (the upload zone, and a selected answer that failed to save). There are no coloured left or right borders.

## Components

Every control is obvious and tappable: outlined, at least 44px tall on touch, with its state visible without relying on colour alone.

### Buttons
- **Shape:** 6px corners for status buttons; 9px for actions.
- **Primary:** Ink fill, cream text, 2px ink border, 12px by 24px padding. Used once per view for the main action (Next, Submit Test, Continue).
- **Outline:** White fill, ink text and border, Mist on hover. Used for Back, View My Results, Preview and the guide toggle.
- **Disabled:** Light gray fill, dark gray text and a gray 2px border. Still readable and clearly inactive.
- **Hover / Focus:** Hover shifts the fill; focus shows a 2px ring in ink with a 2px offset.

### Status buttons
Five equal outline buttons (Pass, Fail, N/A, Blocked, Up For Review). The chosen one fills with its status colour and white text; selecting it again clears it. A selected answer that failed to save turns back to a dashed outline so it never looks finished.

### Cards / Containers
- **Corner Style:** 9px.
- **Background:** White on paper.
- **Shadow Strategy:** None (see Elevation & Depth).
- **Border:** 2px ink.
- **Internal Padding:** 16px, 20px from the small breakpoint up.

### Inputs / Fields
- **Style:** White, 2px ink border, 6px corners, 16px weight-500 text.
- **Focus:** 2px ink focus ring.
- **Error:** Bold red-700 text under the field naming the problem and the recovery. The "didn't save" banner uses a 2px red outline.

### Callouts
Tips and the login link use the Amber Wash with a 2px ink outline and a bold "Tip" label. Section headers use the Lavender Wash. Talkpush-performed steps get a Sage Wash notice. A reference sample is a plain bold label above a 2px outlined image or embed.

### Navigation
The sticky title bar carries the client logos, name, the tester's greeting and the count. In step-by-step mode the count becomes a button that opens a side sheet listing every step with its status. Back and Next sit in a row under a 2px ink rule.

### Upload zone
A dashed 2px ink outline, a paperclip and "Add screenshot or file", with a one-line size note. Attached files appear as 2px outlined chips with a remove button.

## Do's and Don'ts

### Do:
- **Do** draw every container, control and input with a 2px ink outline.
- **Do** fill only the chosen status; keep all other controls as outlines.
- **Do** use weight 500 for body and 700 for labels; keep text at 14px or larger.
- **Do** keep the header, banners and cards on the same left and right edges.
- **Do** make long text and links wrap inside their container; shorten long URLs for display and keep the full address in the link and a Copy control.
- **Do** keep tester styling in tester components and the tester style helpers, so admin pages are unaffected.
- **Do** keep existing button labels, because analytics reads them.

### Don't:
- **Don't** use shadows, glows or blur.
- **Don't** tint a whole card or add a coloured left or right stripe to show status.
- **Don't** use light gray text or any text under 14px.
- **Don't** put a small uppercase label above a heading.
- **Don't** repeat the same explanation in two places on one screen.
- **Don't** let content widen the page; there must be no sideways scroll at 375px.
- **Don't** change shared UI primitives to restyle tester pages.
