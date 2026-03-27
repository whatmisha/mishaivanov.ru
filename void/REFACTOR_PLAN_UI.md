# Void UI Refactor — Plan (Variant A)

## Target Architecture

**Random panel** — command center:
1. **Range Mode** toggle — shows/hides «↔» markers on sliders
2. **Active params list** (like Objects in grid_generator) — items appear when «↔» is activated on sliders
   - Each item: name + range (`Stem 0.5 – 1.0`)
   - On hover: 👁 (pause) and × (remove) icons
3. **Shuffle** / **Randomize** / **Reset** buttons

**Effects panel** — contains:
- Wobbly section (toggle + Amount + Scale sliders)
- Round Caps, Alt Glyphs, Chaos pills

**Single point of activation** — «↔» button on slider. Random panel is view-only + global actions.

---

## Phase 1: Pill-buttons ✅ DONE

Replace checkbox-label toggles with compact pill-buttons (`.pill-toggle`).

Affected toggles:
- Grid, Ends, Pointer (General panel)
- Close Stems, Chess Order (Style panel)
- Round Caps, Alt Glyphs, Chaos (Effects panel)
- BW, Lock BG, Lock Grid (Colors palette)

Later updated: no border, black background, white bg + black text on hover/active.

---

## Phase 2: Section Headers ✅ DONE

Uppercase section headers with full-width dividers (`.section-divider-header`).

Applied to:
- **DASHES** (Style panel) — power icon ⏻ inline, whole header is clickable label
- **WOBBLY** (Effects panel) — same pattern

Later updated: removed pill "on" button, replaced with inline power SVG icon after title text. Hover = subtle color change, no background.

---

## Phase 3: ↔ symbol + Range Mode toggle ✅ DONE

- All `.dice-btn` show «↔» symbol instead of 🎲
- Hidden by default (`display: none`), shown when `body.range-mode-active` or `.dice-btn.active`
- ↔ moved inside `<span>` name element — appears as last character of param name
- Click on param name also toggles dice (when range mode is on or dice already active)
- Hover = subtle color change of text and icon, no background
- Range Mode pill toggle added to Random panel — toggles `range-mode-active` class on body
- `displayName` added to DICE_CONFIG for all params

---

## Phase 4: Random panel — params list ✅ DONE

- Dynamic list `#randomParamsList` inside Random panel
- Each active dice param shows as item: `Stem 0.50 – 1.00` with 👁 (pause) and × (remove) on hover
- Colors also appears in list if color dice is on
- Empty placeholder: "Activate ↔ on any slider"
- Range text updates live when dragging range sliders (`updateParamRangeText`)
- `updateRandomParamsList()` called on every dice toggle, reset, shuffle, preset load

---

## Phase 5: Range Mode toggle ✅ DONE (merged into Phase 3)

- Setting `rangeModeActive: false` in settings
- Pill "Range Mode" in Random panel
- Toggles `range-mode-active` class on `<body>` → CSS shows/hides `.dice-btn`
- Active ranges preserved when toggling off (not reset)

---

## Phase 6: Shuffle button ✅ DONE

- **Shuffle**: enables Range Mode, all dices with default ranges, Full scope (Chaos), Alt Glyphs, clears caches
- **Randomize**: unchanged — rerolls values within current ranges
- **Reset**: resets all dices, turns off Range Mode, resets color dice

---

## Phase 7: Scope → Chaos pill ✅ DONE

- Replaced By Type / Full radio buttons with single **Chaos** pill on Effects panel
- Active = Full mode, inactive = By Type mode
- Old radio elements removed from Random panel

---

## Phase 8: Final Random panel layout ✅ DONE

- Old radio/scope HTML removed (was done earlier)
- Badge now counts only non-paused params (paused items excluded via `.paused` class check)
- Eye (👁) button triggers badge update on toggle
- Panel layout verified: Range Mode pill → params list → Shuffle/Randomize/Reset

---

## Phase 9: Cleanup & Testing ✅ DONE

Removed dead CSS:
- `.checkbox-label` (all variants: inactive, hidden, disabled, ::before, ::after)
- `.toggle-group-row` (all variants)
- `.random-section`, `.random-section.visible`, `.random-section + .random-section`
- `.random-section-header`, `.random-section .control-group`
- `#randomSectionDash`, `#randomControlGroup*`, `#randomDashSection`
- `#randomSectionButton`
- `.wobbly-section`, `.wobbly-section-header`, `.wobbly-section .control-group`
- `.checkbox-icon`

Fixed JS dead references:
- `randomControlGroupDashLength` → `dashLengthControlGroup`
- `randomControlGroupGapLength` → `gapLengthControlGroup`

---

## Alt Glyphs relocation ✅ DONE

- Moved from Random panel to Effects panel (next to Round Caps)
- Default: off (`useAlternativesInRandom: false`)
- Auto-enables when user clicks a glyph with alternatives on canvas
- On disable: clears `alternativeGlyphCache`, all glyphs reset to default
