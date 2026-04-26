/**
 * Shared configuration for the Random / Dice subsystem.
 *
 * - DICE_CONFIG describes per-parameter dice (single value vs min–max range).
 * - EFFECT_RANDOM_CONFIG describes effect-pill toggles re-rolled on Randomize.
 * - syncRandomDiceTitle keeps a dice button tooltip consistent with its state.
 *
 * Kept as a separate module so dice defaults and ranges live in one place
 * (constructor defaults, reset-all, and shuffle all read from here).
 */

export const RANDOM_DICE_TITLE_OFF = 'Add this parameter to random';
export const RANDOM_DICE_TITLE_ON = 'Remove this parameter from random';

export function syncRandomDiceTitle(btn, active) {
    if (!btn) return;
    btn.title = active ? RANDOM_DICE_TITLE_ON : RANDOM_DICE_TITLE_OFF;
}

/** Per-parameter dice config: single slider vs min–max range slider. */
export const DICE_CONFIG = {
    stem: {
        flag: 'randomizeStem', displayName: 'Stem',
        diceBtnId: 'stemDiceBtn', singleValueId: 'stemValue',
        singleWrap: 'stemSingleWrap', rangeWrap: 'stemRangeWrap',
        singleSlider: 'stemSlider', singleSetting: 'stemMultiplier',
        rangeSlider: 'randomStemRangeSlider',
        minSetting: 'randomStemMin', maxSetting: 'randomStemMax',
        min: 0.1, max: 3.0, defaultMin: 0.5, defaultMax: 1.0
    },
    strokes: {
        flag: 'randomizeStrokes', displayName: 'Lines',
        diceBtnId: 'strokesDiceBtn', singleValueId: 'strokesValue',
        singleWrap: 'strokesSingleWrap', rangeWrap: 'strokesRangeWrap',
        singleSlider: 'strokesSlider', singleSetting: 'strokesNum',
        rangeSlider: 'randomStrokesRangeSlider',
        minSetting: 'randomStrokesMin', maxSetting: 'randomStrokesMax',
        min: 1, max: 64, defaultMin: 1, defaultMax: 4
    },
    contrast: {
        flag: 'randomizeContrast', displayName: 'Contrast',
        diceBtnId: 'contrastDiceBtn', singleValueId: 'strokeGapRatioValue',
        singleWrap: 'contrastSingleWrap', rangeWrap: 'contrastRangeWrap',
        singleSlider: 'strokeGapRatioSlider', singleSetting: 'strokeGapRatio',
        rangeSlider: 'randomContrastRangeSlider',
        minSetting: 'randomContrastMin', maxSetting: 'randomContrastMax',
        min: 0.1, max: 8, defaultMin: 0.1, defaultMax: 2.0
    },
    dashLength: {
        flag: 'randomizeDashLength', displayName: 'Dash',
        diceBtnId: 'dashLengthDiceBtn', singleValueId: 'dashLengthValue',
        singleWrap: 'dashLengthSingleWrap', rangeWrap: 'dashLengthRangeWrap',
        singleSlider: 'dashLengthSlider', singleSetting: 'dashLength',
        rangeSlider: 'randomDashLengthRangeSlider',
        minSetting: 'randomDashLengthMin', maxSetting: 'randomDashLengthMax',
        min: 0.1, max: 5, defaultMin: 1.0, defaultMax: 1.5
    },
    gapLength: {
        flag: 'randomizeGapLength', displayName: 'Gap',
        diceBtnId: 'gapLengthDiceBtn', singleValueId: 'gapLengthValue',
        singleWrap: 'gapLengthSingleWrap', rangeWrap: 'gapLengthRangeWrap',
        singleSlider: 'gapLengthSlider', singleSetting: 'gapLength',
        rangeSlider: 'randomGapLengthRangeSlider',
        minSetting: 'randomGapLengthMin', maxSetting: 'randomGapLengthMax',
        min: 0.1, max: 5, defaultMin: 1.0, defaultMax: 1.5
    },
    wobblyAmount: {
        flag: 'randomizeWobblyAmount', displayName: 'Wobble',
        diceBtnId: 'wobblyAmountDiceBtn', singleValueId: 'wobblyAmountValue',
        singleWrap: 'wobblyAmountSingleWrap', rangeWrap: 'wobblyAmountRangeWrap',
        singleSlider: 'wobblyAmountSlider', singleSetting: 'wobblyAmount',
        rangeSlider: 'randomWobblyAmountRangeSlider',
        minSetting: 'randomWobblyAmountMin', maxSetting: 'randomWobblyAmountMax',
        min: 0, max: 20, defaultMin: 0, defaultMax: 10
    },
    wobblyFrequency: {
        flag: 'randomizeWobblyFrequency', displayName: 'Noise',
        diceBtnId: 'wobblyFrequencyDiceBtn', singleValueId: 'wobblyFrequencyValue',
        singleWrap: 'wobblyFrequencySingleWrap', rangeWrap: 'wobblyFrequencyRangeWrap',
        singleSlider: 'wobblyFrequencySlider', singleSetting: 'wobblyFrequency',
        rangeSlider: 'randomWobblyFrequencyRangeSlider',
        minSetting: 'randomWobblyFrequencyMin', maxSetting: 'randomWobblyFrequencyMax',
        min: 0.01, max: 0.5, defaultMin: 0.05, defaultMax: 0.2
    },
    paletteColors: {
        flag: 'randomizePaletteColors', displayName: 'Palette',
        singleValueId: 'paletteColorsValue',
        singleWrap: 'paletteColorsSingleWrap', rangeWrap: 'paletteColorsRangeWrap',
        singleSlider: 'paletteColorsSlider', singleSetting: 'colorChaosColors',
        rangeSlider: 'randomPaletteColorsRangeSlider',
        minSetting: 'randomPaletteColorsMin', maxSetting: 'randomPaletteColorsMax',
        min: 3, max: 32, defaultMin: 3, defaultMax: 32
    }
};

/** Effect pill-toggles: when flag is on, value is re-rolled on Randomize; shown in Random panel list. */
export const EFFECT_RANDOM_CONFIG = {
    roundedCaps: {
        flag: 'randomizeRoundedCaps', displayName: 'Round Caps',
        setting: 'roundedCaps', checkboxId: 'roundedCapsCheckbox', type: 'bool'
    },
    closeEnds: {
        flag: 'randomizeCloseEnds', displayName: 'Stems',
        setting: 'closeEnds', checkboxId: 'closeEndsCheckbox', type: 'bool'
    },
    dashChess: {
        flag: 'randomizeDashChess', displayName: 'Chess',
        setting: 'dashChess', checkboxId: 'dashChessCheckboxPD', type: 'bool'
    },
    altGlyphs: {
        flag: 'randomizeAltGlyphs', displayName: 'Alt Glyphs',
        setting: 'useAlternativesInRandom', checkboxId: 'alternativeGlyphsCheckbox', type: 'bool'
    },
    chaos: {
        flag: 'randomizeChaosMode', displayName: 'Unique',
        setting: 'randomModeType', checkboxId: 'chaosCheckbox', type: 'chaos'
    },
    grid: {
        flag: 'randomizeShowGrid', displayName: 'Grid',
        setting: 'showGrid', checkboxId: 'showGridCheckbox', type: 'bool'
    },
    joints: {
        flag: 'randomizeShowJoints', displayName: 'Joints',
        setting: 'showJoints', checkboxId: 'showJointsCheckbox', type: 'bool'
    },
    freeEndpoints: {
        flag: 'randomizeShowFreeEndpoints', displayName: 'Endpoints',
        setting: 'showFreeEndpoints', checkboxId: 'showFreeEndpointsCheckbox', type: 'bool'
    },
    colorBW: {
        flag: 'randomizeColorBW', displayName: 'BW',
        setting: 'colorBW', checkboxId: 'colorBWCheckbox', type: 'bool'
    }
};

