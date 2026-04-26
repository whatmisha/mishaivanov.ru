/**
 * Void Typeface - main initialization file
 */

import { VoidRenderer } from './core/VoidRenderer.js';
import { VoidExporter } from './core/VoidExporter.js';
import { PresetManager } from './core/PresetManager.js';
import { VOID_ALPHABET_ALTERNATIVES } from './core/VoidAlphabet.js';
import { SliderController } from './ui/SliderController.js';
import { RangeSliderController } from './ui/RangeSliderController.js';
import { PanelManager } from './ui/PanelManager.js';
import { ColorPicker } from './ui/ColorPicker.js';
import { ModalManager } from './ui/ModalManager.js';
import { ColorUtils } from './utils/ColorUtils.js';
import { MathUtils } from './utils/MathUtils.js';
import GlyphEditor from './core/GlyphEditor.js';
import { HistoryManager } from './history/HistoryManager.js';

const RANDOM_DICE_TITLE_OFF = 'Add this parameter to random';
const RANDOM_DICE_TITLE_ON = 'Remove this parameter from random';

function syncRandomDiceTitle(btn, active) {
    if (!btn) return;
    btn.title = active ? RANDOM_DICE_TITLE_ON : RANDOM_DICE_TITLE_OFF;
}

/** Shared config for dice (per-param random) buttons */
const DICE_CONFIG = {
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

/** Effect pill-toggles: when flag is on, value is re-rolled on Randomize; shown in Random panel list */
const EFFECT_RANDOM_CONFIG = {
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

class VoidTypeface {
    constructor() {
        // Settings storage
        this.settings = {
            values: {
                stemMultiplier: 0.5, // module size multiplier (actual value)
                moduleSize: 24,
                letterSpacingMultiplier: 1,
                lineHeightMultiplier: 1,
                strokesNum: 1,
                strokeGapRatio: 1.0,
                dashEnabled: false,
                letterColor: '#ffffff',
                bgColor: '#000000',
                gridColor: '#333333',
                text: 'Void\nTypeface\nCode',
                textAlign: 'center',
                showGrid: true,
                showJoints: false,
                showFreeEndpoints: false,
                randomizeStem: false,
                randomizeStrokes: false,
                randomizeContrast: false,
                randomizeDashLength: false,
                randomizeGapLength: false,
                randomizeWobblyAmount: false,
                randomizeWobblyFrequency: false,
                randomizeRoundedCaps: false,
                randomizeCloseEnds: false,
                randomizeDashChess: false,
                randomizeAltGlyphs: false,
                randomizeChaosMode: false,
                randomizeShowGrid: false,
                randomizeShowJoints: false,
                randomizeShowFreeEndpoints: false,
                randomizeColorBW: false,
                randomizePaletteColors: false,
                randomPaletteColorsMin: 3,
                randomPaletteColorsMax: 32,
                colorBW: false,
                colorSource: 'solid', // 'solid', 'gradient'
                randomStemMin: 0.5,
                randomStemMax: 1.0,
                randomStrokesMin: 1,
                randomStrokesMax: 4,
                randomContrastMin: 0.1,
                randomContrastMax: 2.0,
                randomDashLengthMin: 1.0,
                randomDashLengthMax: 1.5,
                randomGapLengthMin: 1.0,
                randomGapLengthMax: 1.5,
                randomModeType: 'byType', // 'byType' or 'full'
                randomWobblyAmountMin: 0, // minimum wobbly displacement (px)
                randomWobblyAmountMax: 10, // maximum wobbly displacement (px)
                randomWobblyFrequencyMin: 0.05, // minimum wobbly noise frequency/scale
                randomWobblyFrequencyMax: 0.2, // maximum wobbly noise frequency/scale
                colorMode: 'manual', // derived: 'manual', 'randomChaos', 'gradient', 'randomGradient'
                colorChaos: false, // legacy
                /** If true, that channel is included in live palette / regen (◆ on swatch) */
                paletteDiceLetter: false,
                paletteDiceBg: false,
                paletteDiceGrid: false,
                paletteDiceGradientStart: false,
                paletteDiceGradientEnd: false,
                colorChaosColors: 16, // unused when randomizePaletteColors (range picks N each regen)
                gradientStartColor: '#ff0000', // gradient start color
                gradientEndColor: '#0000ff', // gradient end color
                roundedCaps: false, // rounded line ends (Rounded)
                closeEnds: false, // closing lines at ends in Stripes mode
                dashLength: 1.00, // dash length for Dash mode (multiplier of stem)
                gapLength: 1.50, // gap length for Dash mode (multiplier of stem)
                dashChess: false, // chess pattern for Dash mode (alternating dash starts)
                useAlternativesInRandom: false, // use alternative glyphs (auto-enabled on glyph click)
                wobblyEnabled: false, // wobbly/jittery lines effect
                wobblyAmount: 3, // wobbly displacement amount (px)
                wobblyFrequency: 0.1, // wobbly noise frequency/scale
                currentMode: 'normal' // 'normal' or 'editor'
            },
            get(key) {
                if (key === 'randomizeColor') {
                    const src = this.values.colorSource || 'solid';
                    if (src === 'gradient') {
                        return !!(
                            this.values.paletteDiceGradientStart ||
                            this.values.paletteDiceGradientEnd ||
                            this.values.paletteDiceBg ||
                            this.values.paletteDiceGrid
                        );
                    }
                    return !!(
                        this.values.paletteDiceLetter ||
                        this.values.paletteDiceBg ||
                        this.values.paletteDiceGrid
                    );
                }
                if (key === 'isRandom') {
                    const effectOn = Object.values(EFFECT_RANDOM_CONFIG).some(c => this.values[c.flag]);
                    return !! (this.values.randomizeStem || this.values.randomizeStrokes ||
                        this.values.randomizeContrast || this.values.randomizeDashLength ||
                        this.values.randomizeGapLength || this.values.randomizeWobblyAmount ||
                        this.values.randomizeWobblyFrequency || this.get('randomizeColor') || effectOn);
                }
                return this.values[key];
            },
            set(key, value) {
                if (key === 'isRandom') return this.get('isRandom');
                if (key === 'randomizeColor') {
                    if (!value) {
                        this.values.paletteDiceLetter = false;
                        this.values.paletteDiceBg = false;
                        this.values.paletteDiceGrid = false;
                        this.values.paletteDiceGradientStart = false;
                        this.values.paletteDiceGradientEnd = false;
                        this.values.randomizePaletteColors = false;
                    } else {
                        const hadAny = this.get('randomizeColor');
                        this.values.randomizePaletteColors = true;
                        if (!hadAny) {
                            if ((this.values.colorSource || 'solid') === 'gradient') {
                                this.values.paletteDiceGradientStart = true;
                                this.values.paletteDiceGradientEnd = true;
                            } else {
                                this.values.paletteDiceLetter = true;
                            }
                        }
                    }
                    return this.get('randomizeColor');
                }
                this.values[key] = value;
                return value;
            }
        };

        // Color pickers
        this.unifiedColorPicker = null;
        this.activeColorType = 'letter'; // 'letter', 'bg', 'grid'
        
        // Color Chaos / randomGradient mode
        this.colorPalette = [];
        this.moduleColorCache = new Map();
        this.moduleGradientCache = new Map();
        this.globalModuleIndex = 0;
        this.globalGradientIndex = 0;
        
        // Glyph Editor
        this.glyphEditor = null;

        // Render scheduling for performance optimization
        this.renderScheduled = false;
        
        // Throttled updateRenderer for slider dragging (16ms = ~60fps)
        this.throttledUpdateRenderer = MathUtils.throttle(() => {
            this.updateRenderer();
        }, 16);

        // Check for mobile device
        this.isMobile = this.checkIsMobile();
        
        // Initialize components
        this.initCanvas();
        this.initExporter();
        this.initPresetManager();
        
        if (this.isMobile) {
            // On mobile devices hide panels and show message
            this.initMobileView();
        } else {
            // Preset UI + change tracking must exist before any init that calls markAsChanged (e.g. ColorPicker onChange)
            this.currentPresetName = 'New';
            this.hasUnsavedChanges = false;
            this.isInitializing = true;

            // Undo/Redo: per-preset history. historyManager — текущий менеджер активного пресета.
            this.presetHistories = new Map();
            this.historyManager = new HistoryManager({ maxSize: 50 });
            this.isRestoringState = false;
            this.activeSliderTransactions = new Map();
            this.activeInputTransactions = new Set();
            this.snapshotDebounceTimer = null;
            // On desktop initialize everything as usual
            this.initPanels();
            this.initSliders();
            this.initRangeSliders();
            this.initColorPickers();
            this.initTextInput();
            this.initTextAlign();
            this.initStyleControls();
            this.initDiceButtons();
            this.initEffectDiceButtons();
            this.initRandomSection();
            this.initResetAllDice();
            this.initRoundedCapsToggle();
            this.initCloseEndsToggle();
            this.initDashChessToggle();
            this.initWobblyToggle();
            this.initGridToggle();
            this.initColorBWToggle();
            // this.initGlyphEditor(); // Glyph editor (DISABLED - use editor.html)
            // this.initEditorHotkey(); // Cmd+G hotkey for editor (DISABLED)
            this.initAlternativeGlyphs(); // Alternative glyphs
            
            // Set correct Rounded and Wobbly visibility on initialization
            this.updateRoundedCapsVisibility();
            this.updateWobblyVisibility();
            
            this.isLoadingPreset = false;
            
            this.setupChangeTracking();
            this.initSliderHistoryHandlers();
            this.initPresets();
            this.initExport();
            this.initResize();
            this.initCursorTooltips();
            
            // Clear random values cache before first render
            // to use correct values from settings
            if (this.renderer && this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            
            // Initialize color palette if Color Chaos is enabled
            const initColorMode = this.getDerivedColorMode();
            if (initColorMode === 'randomChaos' || initColorMode === 'randomGradient') {
                this.generateColorPalette();
            }
            
            // Initialize global module index counters
            this.globalModuleIndex = 0;
            this.globalGradientIndex = 0;
            
            // First render (with correct parameter calculation)
            this.updateRenderer();
            
            // Complete initialization and update buttons
            this.isInitializing = false;
            this.hasUnsavedChanges = false; // Ensure no changes after initialization

            // Записываем стартовый снэпшот в историю текущего пресета, если её ещё нет.
            // (loadPreset во время init мог уже это сделать — saveInitialHistorySnapshot
            // не дублирует одинаковое состояние благодаря compare-проверке.)
            if (this.historyManager.history.length === 0) {
                this.saveInitialHistorySnapshot(`init: ${this.currentPresetName || 'New'}`);
            }
            // Регистрируем активный менеджер в Map (на случай если init шёл без loadPreset)
            if (this.currentPresetName) {
                this.presetHistories.set(this.currentPresetName, this.historyManager);
            }

            if (this.currentPresetName === 'New') {
                this.updateSaveDeleteButtons();
            }
        }
    }

    /**
     * Check for mobile device
     * Returns true if screen width < 768px AND it's a touch device
     * OR if it's a mobile phone (not tablet) by User Agent
     */
    checkIsMobile() {
        const width = window.innerWidth;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Check for tablets (iPad, Android tablets)
        const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
        
        // Mobile device = small screen AND touch device AND NOT tablet
        // OR explicitly mobile phone by User Agent
        const isMobilePhone = /mobile|iphone|ipod|android.*mobile|blackberry|windows phone/i.test(userAgent);
        
        return (width < 768 && isTouchDevice && !isTablet) || (isMobilePhone && width < 1024);
    }

    /**
     * Initialize mobile view
     */
    initMobileView() {
        // Hide all control panels
        const panels = document.querySelectorAll('.controls-panel');
        panels.forEach(panel => { panel.style.display = 'none'; });
        
        // Hide preset/save/delete
        const presetDropdown = document.getElementById('presetDropdown');
        const saveBtn        = document.getElementById('savePresetBtn');
        const deleteBtn      = document.getElementById('deletePresetBtn');
        if (presetDropdown) presetDropdown.style.display = 'none';
        if (saveBtn)        saveBtn.style.display = 'none';
        if (deleteBtn)      deleteBtn.style.display = 'none';
        
        // Remove PNG export from DOM (desktop-only feature). SVG / Copy hidden via CSS.
        document.getElementById('exportPngBtn')?.remove();
        
        // Show Update button
        const renewBtn = document.getElementById('renewBtn');
        if (renewBtn) {
            renewBtn.style.display = 'inline-flex';
            renewBtn.addEventListener('click', () => {
                this.renderer.clearModuleTypeCache();
                if (this.renderer.clearAlternativeGlyphCache) {
                    this.renderer.clearAlternativeGlyphCache();
                }
                this.applyMobileChaos();
                this.calculateMobileModuleSize();
            });
        }

        this.settings.set('text', 'DESK\nTOP\nONLY');

        // Apply safe mobile chaos on first load
        this.applyMobileChaos();
        
        // Touch: tap a letter to cycle its alternative
        const canvas = document.getElementById('mainCanvas');
        if (canvas) {
            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                const rect   = canvas.getBoundingClientRect();
                const touch  = e.changedTouches[0];
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                const position = this.renderer.getLetterPositionAt(touchX, touchY);
                if (position) {
                    const char = position.char.toUpperCase();
                    const hasAlternatives = VOID_ALPHABET_ALTERNATIVES &&
                        VOID_ALPHABET_ALTERNATIVES[char] &&
                        VOID_ALPHABET_ALTERNATIVES[char].length > 0;
                    if (hasAlternatives) {
                        const toggled = this.renderer.toggleLetterAlternative(
                            position.lineIndex, position.charIndex);
                        if (toggled) this.updateRenderer();
                    }
                }
            });
        }

        this.calculateMobileModuleSize();

        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.checkIsMobile();
            if (wasMobile && !this.isMobile) {
                window.location.reload();
            } else if (this.isMobile) {
                this.calculateMobileModuleSize();
            }
        });
    }

    /**
     * Apply a safe, performance-friendly randomisation preset for mobile.
     * Fixed 3-colour palette (white letters / black bg / grey grid).
     * No Wobble, no Dashes, no Alt Glyphs, no per-module Full Chaos,
     * no colour randomisation — all of which are expensive on weak hardware.
     */
    applyMobileChaos() {
        // --- colours: always fixed, never randomised ---
        this.settings.set('letterColor', '#ffffff');
        this.settings.set('bgColor', '#000000');
        this.settings.set('gridColor', '#333333');
        this.settings.set('colorMode', 'manual');
        this.settings.set('colorSource', 'solid');
        this.settings.set('randomizeColor', false);
        this.settings.set('randomizePaletteColors', false);

        // --- cheap shape randomisers ---
        this.settings.set('randomizeStem',     true);
        this.settings.set('randomizeStrokes',  true);
        this.settings.set('randomizeContrast', true);

        // --- off: dashes add heavy path-subdivision per module ---
        this.settings.set('dashEnabled',          false);
        this.settings.set('randomizeDashLength',   false);
        this.settings.set('randomizeGapLength',    false);

        // --- off: Perlin noise recomputed per module every frame ---
        this.settings.set('wobblyEnabled',          false);
        this.settings.set('randomizeWobblyAmount',   false);
        this.settings.set('randomizeWobblyFrequency',false);

        // --- off: per-module full-chaos cache is very large ---
        this.settings.set('randomModeType', 'byType');
        this.settings.set('randomizeChaosMode', false);

        // --- off: alt-glyph cache lookup per letter ---
        this.settings.set('useAlternativesInRandom', false);

        // --- cosmetic extras off ---
        this.settings.set('roundedCaps',           false);
        this.settings.set('closeEnds',             false);
        this.settings.set('randomizeRoundedCaps',  false);
        this.settings.set('randomizeCloseEnds',    false);
        this.settings.set('randomizeDashChess',    false);
        this.settings.set('randomizeAltGlyphs',    false);
        this.settings.set('randomizeShowGrid',     false);
        this.settings.set('randomizeShowJoints',   false);
        this.settings.set('randomizeShowFreeEndpoints', false);
        this.settings.set('randomizeColorBW',     false);
        this.settings.set('colorBW', false);
        this.settings.set('showGrid',              true);
        this.settings.set('showJoints',            false);
        this.settings.set('showFreeEndpoints',     false);
    }

    /**
     * Calculate optimal module size for mobile device
     * so text "DESK\nTOP\nONLY" fits in window without clipping
     */
    calculateMobileModuleSize() {
        // Wait for next frame so canvas gets dimensions
        requestAnimationFrame(() => {
            const canvasContainer = document.getElementById('canvasContainer');
            const canvas = document.getElementById('mainCanvas');
            
            // Get container or window dimensions
            const containerRect = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
            const availableWidth  = containerRect ? containerRect.width  : window.innerWidth;
            const availableHeight = containerRect ? containerRect.height : window.innerHeight;
            
            // Text consists of 3 lines: "DESK", "TOP", "ONLY"
            // Longest line - "DESK" and "ONLY" (4 characters)
            const maxLineLength = 4;
            const numLines = 3;
            
            // Single character dimensions: 5 modules wide
            const cols = 5;
            const rows = 5;
            
            // Use current multiplier values from settings
            const letterSpacingMultiplier = this.settings.get('letterSpacingMultiplier') || 1;
            const lineHeightMultiplier = this.settings.get('lineHeightMultiplier') || 1;
            
            // Account for padding (10% on each side for safety)
            const padding = 0.1;
            const maxWidth = availableWidth * (1 - 2 * padding);
            const maxHeight = availableHeight * (1 - 2 * padding);
            
            // Width calculation:
            // Line width = maxLineLength * cols * moduleSize + (maxLineLength - 1) * letterSpacingMultiplier * moduleSize
            // = moduleSize * (maxLineLength * cols + (maxLineLength - 1) * letterSpacingMultiplier)
            const moduleSizeByWidth = maxWidth / (maxLineLength * cols + (maxLineLength - 1) * letterSpacingMultiplier);
            
            // Height calculation:
            // Text height = numLines * rows * moduleSize + (numLines - 1) * lineHeightMultiplier * moduleSize
            // = moduleSize * (numLines * rows + (numLines - 1) * lineHeightMultiplier)
            const moduleSizeByHeight = maxHeight / (numLines * rows + (numLines - 1) * lineHeightMultiplier);
            
            // Choose minimum size to fit both width and height
            const optimalModuleSize = Math.floor(Math.min(moduleSizeByWidth, moduleSizeByHeight));
            
            // Set module size (but not less than 8px and not more than 128px)
            const finalModuleSize = Math.max(8, Math.min(128, optimalModuleSize));
            this.settings.set('moduleSize', finalModuleSize);
            
            // Update renderer after setting module size
            this.updateRenderer();
        });
    }

    /**
     * Initialize canvas and renderer
     */
    initCanvas() {
        const canvas = document.getElementById('mainCanvas');
        this.renderer = new VoidRenderer(canvas);
        
        // Set color getter callback for Color Chaos mode
        this.renderer.setColorGetter(() => this.getModuleColor());
        // Set per-module gradient getter for randomGradient mode
        this.renderer.setGradientGetter(() => this.getGradientForModule());
        
        // Set initial parameters
        this.renderer.updateParams(this.settings.values);
    }

    /**
     * Initialize exporter
     */
    initExporter() {
        this.exporter = new VoidExporter(this.renderer, this.settings);
    }

    /**
     * Initialize preset manager and modal manager
     */
    initPresetManager() {
        this.presetManager = new PresetManager();
        this.modalManager = new ModalManager();
    }

    /**
     * Initialize control panels
     */
    initPanels() {
        this.panelManager = new PanelManager();
        
        // Register panels
        this.panelManager.registerPanel('controlsPanel', {
            headerId: 'controlsPanelHeader',
            draggable: true,
            persistent: true
        });
        
        this.panelManager.registerPanel('viewColorsPanel', {
            headerId: 'viewColorsPanelHeader',
            draggable: true,
            persistent: true
        });
        
        this.panelManager.registerPanel('variabilityPanel', {
            headerId: 'variabilityPanelHeader',
            draggable: true,
            persistent: true
        });

        this.panelManager.registerPanel('randomPanel', {
            headerId: 'randomPanelHeader',
            draggable: true,
        });
        this.panelManager.registerPanel('effectsPanel', {
            headerId: 'effectsPanelHeader',
            draggable: true,
            persistent: true
        });

        // Collapse functionality
        document.querySelectorAll('.collapse-icon').forEach(icon => {
            icon.addEventListener('click', function() {
                const panel = this.closest('.controls-panel');
                panel.classList.toggle('panel-collapsed');
                this.classList.toggle('collapsed');
            });
        });
    }

    /**
     * Initialize sliders
     */
    initSliders() {
        this.sliderController = new SliderController(this.settings);

        // Module (in pixels)
        this.sliderController.initSlider('moduleSizeSlider', {
            valueId: 'moduleSizeValue',
            setting: 'moduleSize',
            min: 4,
            max: 128,
            decimals: 0,
            baseStep: 1,
            shiftStep: 4,
            onUpdate: (value) => {
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Stem Weight (relative to module size)
        this.sliderController.initSlider('stemSlider', {
            valueId: 'stemValue',
            setting: 'stemMultiplier',
            min: 0.1,
            max: 3.0,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.1,
            onUpdate: (value) => {
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Letter Spacing (compact number input)
        this.initCompactInput('letterSpacingValue', {
            setting: 'letterSpacingMultiplier',
            min: 0,
            max: 16,
            step: 1
        });

        // Line Height (compact number input)
        this.initCompactInput('lineHeightValue', {
            setting: 'lineHeightMultiplier',
            min: 0,
            max: 16,
            step: 1
        });

        // Strokes Number (for Stripes mode)
        this.sliderController.initSlider('strokesSlider', {
            valueId: 'strokesValue',
            setting: 'strokesNum',
            min: 1,
            max: 64,
            decimals: 0,
            baseStep: 1,
            shiftStep: 1,
            onUpdate: (value) => {
                if (value === 1 && !this.linesAllowMultiLineForStyleUI()) {
                    this.resetDiceForParam('contrast');
                    this.updateRandomParamsList();
                    this.updateRandomSectionVisibility();
                }
                this.updateStyleDimmedState();
                this.updateRoundedCapsVisibility();
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Contrast (for Stripes mode)
        this.sliderController.initSlider('strokeGapRatioSlider', {
            valueId: 'strokeGapRatioValue',
            setting: 'strokeGapRatio',
            min: 0.1,
            max: 8.0,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 0.5,
            onUpdate: (value) => {
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Dash Length (for Dash mode)
        this.sliderController.initSlider('dashLengthSlider', {
            valueId: 'dashLengthValue',
            setting: 'dashLength',
            min: 0.01,
            max: 8.0,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.1,
            onUpdate: (value) => {
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Gap Length (for Dash mode)
        this.sliderController.initSlider('gapLengthSlider', {
            valueId: 'gapLengthValue',
            setting: 'gapLength',
            min: 0.01,
            max: 8.0,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.1,
            onUpdate: (value) => {
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Wobble Amount
        this.sliderController.initSlider('wobblyAmountSlider', {
            valueId: 'wobblyAmountValue',
            setting: 'wobblyAmount',
            min: 0,
            max: 20,
            decimals: 1,
            baseStep: 0.5,
            shiftStep: 1,
            onUpdate: (value) => {
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Wobble Scale (frequency)
        this.sliderController.initSlider('wobblyFrequencySlider', {
            valueId: 'wobblyFrequencyValue',
            setting: 'wobblyFrequency',
            min: 0.01,
            max: 0.5,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.05,
            onUpdate: (value) => {
                this.throttledUpdateRenderer();
                this.markAsChanged();
            }
        });

        // Palette Colors
        this.sliderController.initSlider('paletteColorsSlider', {
            valueId: 'paletteColorsValue',
            setting: 'colorChaosColors',
            min: 3,
            max: 32,
            decimals: 0,
            onUpdate: (value) => {
                if (!this.settings.get('randomizeColor')) return;
                const cm = this.getDerivedColorMode();
                this.settings.set('colorMode', cm);
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    this.generateColorPalette();
                }
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                this.updateRenderer();
                this.markAsChanged();
            }
        });

    }

    /**
     * Initialize compact number inputs (Figma-style)
     */
    initCompactInput(inputId, config) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const { setting, min, max, step, onUpdate } = config;
        
        // Set initial value
        input.value = this.settings.get(setting);
        
        // Change handler
        const handleChange = () => {
            let value = parseInt(input.value, 10);
            if (isNaN(value)) value = min;
            value = Math.max(min, Math.min(max, value));
            input.value = value;
            this.settings.set(setting, value);
            if (onUpdate) {
                onUpdate();
            } else {
                this.updateRenderer();
            }
            this.markAsChanged();
        };
        
        input.addEventListener('change', handleChange);
        input.addEventListener('input', handleChange);
        
        // Save reference for updating from presets
        if (!this.compactInputs) this.compactInputs = {};
        this.compactInputs[inputId] = { input, setting, min, max };
    }

    /**
     * Initialize range sliders (for Random mode)
     */
    initRangeSliders() {
        this.rangeSliderController = new RangeSliderController(this.settings);

        // Random mode range sliders
        const initRangeIfExists = (id, config) => {
            if (document.getElementById(id)) {
                this.rangeSliderController.initRangeSlider(id, config);
            }
        };

        initRangeIfExists('randomStemRangeSlider', {
            minSetting: 'randomStemMin',
            maxSetting: 'randomStemMax',
            minValueId: 'randomStemMinValue',
            maxValueId: 'randomStemMaxValue',
            min: 0.1,
            max: 3.0,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.1,
            onUpdate: (minValue, maxValue) => {
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateParamRangeText('stem');
                this.throttledUpdateRenderer();
            }
        });

        initRangeIfExists('randomStrokesRangeSlider', {
            minSetting: 'randomStrokesMin',
            maxSetting: 'randomStrokesMax',
            minValueId: 'randomStrokesMinValue',
            maxValueId: 'randomStrokesMaxValue',
            min: 1,
            max: 64,
            decimals: 0,
            baseStep: 1,
            shiftStep: 1,
            onUpdate: (minValue, maxValue) => {
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateCloseEndsState();
                if (!this.linesAllowMultiLineForStyleUI()) {
                    this.resetDiceForParam('contrast');
                    this.updateRandomParamsList();
                    this.updateRandomSectionVisibility();
                }
                this.updateStyleDimmedState();
                this.updateRoundedCapsVisibility();
                this.updateParamRangeText('strokes');
                this.throttledUpdateRenderer();
            }
        });

        initRangeIfExists('randomContrastRangeSlider', {
            minSetting: 'randomContrastMin',
            maxSetting: 'randomContrastMax',
            minValueId: 'randomContrastMinValue',
            maxValueId: 'randomContrastMaxValue',
            min: 0.1,
            max: 8.0,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 0.5,
            onUpdate: (minValue, maxValue) => {
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateParamRangeText('contrast');
                this.throttledUpdateRenderer();
            }
        });

        initRangeIfExists('randomDashLengthRangeSlider', {
            minSetting: 'randomDashLengthMin',
            maxSetting: 'randomDashLengthMax',
            minValueId: 'randomDashLengthMinValue',
            maxValueId: 'randomDashLengthMaxValue',
            min: 0.1,
            max: 5.0,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 0.5,
            onUpdate: (minValue, maxValue) => {
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateParamRangeText('dashLength');
                this.throttledUpdateRenderer();
            }
        });

        initRangeIfExists('randomGapLengthRangeSlider', {
            minSetting: 'randomGapLengthMin',
            maxSetting: 'randomGapLengthMax',
            minValueId: 'randomGapLengthMinValue',
            maxValueId: 'randomGapLengthMaxValue',
            min: 0.1,
            max: 5.0,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 0.5,
            onUpdate: (minValue, maxValue) => {
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateParamRangeText('gapLength');
                this.throttledUpdateRenderer();
            }
        });

        initRangeIfExists('randomPaletteColorsRangeSlider', {
            minSetting: 'randomPaletteColorsMin',
            maxSetting: 'randomPaletteColorsMax',
            minValueId: 'randomPaletteColorsMinValue',
            maxValueId: 'randomPaletteColorsMaxValue',
            min: 3,
            max: 32,
            decimals: 0,
            baseStep: 1,
            shiftStep: 1,
            onUpdate: (minValue, maxValue) => {
                if (!this.settings.get('randomizeColor')) return;
                const cm = this.getDerivedColorMode();
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    this.generateColorPalette();
                    this.updateRenderer();
                }
            }
        });

        initRangeIfExists('randomWobblyAmountRangeSlider', {
            minSetting: 'randomWobblyAmountMin',
            maxSetting: 'randomWobblyAmountMax',
            minValueId: 'randomWobblyAmountMinValue',
            maxValueId: 'randomWobblyAmountMaxValue',
            min: 0,
            max: 20,
            decimals: 1,
            baseStep: 0.5,
            shiftStep: 1,
            onUpdate: (minValue, maxValue) => {
                this.updateParamRangeText('wobblyAmount');
                if (this.settings.get('isRandom')) {
                    this.updateRenderer();
                }
            }
        });

        initRangeIfExists('randomWobblyFrequencyRangeSlider', {
            minSetting: 'randomWobblyFrequencyMin',
            maxSetting: 'randomWobblyFrequencyMax',
            minValueId: 'randomWobblyFrequencyMinValue',
            maxValueId: 'randomWobblyFrequencyMaxValue',
            min: 0.01,
            max: 0.5,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.05,
            onUpdate: (minValue, maxValue) => {
                this.updateParamRangeText('wobblyFrequency');
                if (this.settings.get('isRandom')) {
                    this.updateRenderer();
                }
            }
        });

        // Handlers for Stem Weight text fields
        const stemMinInput = document.getElementById('randomStemMinValue');
        const stemMaxInput = document.getElementById('randomStemMaxValue');
        
        if (stemMinInput) {
            stemMinInput.addEventListener('blur', () => {
                const value = parseFloat(stemMinInput.value);
                if (!isNaN(value)) {
                    const max = this.settings.get('randomStemMax');
                    const clampedValue = Math.max(0.1, Math.min(max, value));
                    this.rangeSliderController.setValues('randomStemRangeSlider', clampedValue, max, true);
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    this.updateRenderer();
                }
            });
        }

        if (stemMaxInput) {
            stemMaxInput.addEventListener('blur', () => {
                const value = parseFloat(stemMaxInput.value);
                if (!isNaN(value)) {
                    const min = this.settings.get('randomStemMin');
                    const clampedValue = Math.max(min, Math.min(3.0, value));
                    this.rangeSliderController.setValues('randomStemRangeSlider', min, clampedValue, true);
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    this.updateRenderer();
                }
            });
        }

        // Handlers for Strokes text fields
        const strokesMinInput = document.getElementById('randomStrokesMinValue');
        const strokesMaxInput = document.getElementById('randomStrokesMaxValue');
        
        if (strokesMinInput) {
            strokesMinInput.addEventListener('blur', () => {
                const value = parseFloat(strokesMinInput.value);
                if (!isNaN(value)) {
                    const max = this.settings.get('randomStrokesMax');
                    const clampedValue = Math.max(1, Math.min(max, Math.round(value)));
                    this.rangeSliderController.setValues('randomStrokesRangeSlider', clampedValue, max, true);
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    this.updateRenderer();
                }
            });
        }

        if (strokesMaxInput) {
            strokesMaxInput.addEventListener('blur', () => {
                const value = parseFloat(strokesMaxInput.value);
                if (!isNaN(value)) {
                    const min = this.settings.get('randomStrokesMin');
                    const clampedValue = Math.max(min, Math.min(64, Math.round(value)));
                    this.rangeSliderController.setValues('randomStrokesRangeSlider', min, clampedValue, true);
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    this.updateRenderer();
                }
            });
        }

        // Handlers for Contrast text fields
        const contrastMinInput = document.getElementById('randomContrastMinValue');
        const contrastMaxInput = document.getElementById('randomContrastMaxValue');
        
        if (contrastMinInput) {
            contrastMinInput.addEventListener('blur', () => {
                const value = parseFloat(contrastMinInput.value);
                if (!isNaN(value)) {
                    const max = this.settings.get('randomContrastMax');
                    const clampedValue = Math.max(0.1, Math.min(max, value));
                    this.rangeSliderController.setValues('randomContrastRangeSlider', clampedValue, max, true);
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    this.updateRenderer();
                }
            });
        }

        if (contrastMaxInput) {
            contrastMaxInput.addEventListener('blur', () => {
                const value = parseFloat(contrastMaxInput.value);
                if (!isNaN(value)) {
                    const min = this.settings.get('randomContrastMin');
                    const clampedValue = Math.max(min, Math.min(8.0, value));
                    this.rangeSliderController.setValues('randomContrastRangeSlider', min, clampedValue, true);
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    this.updateRenderer();
                }
            });
        }

        // Handlers for Wobbly Amount text fields
        const wobblyAmountMinInput = document.getElementById('randomWobblyAmountMinValue');
        const wobblyAmountMaxInput = document.getElementById('randomWobblyAmountMaxValue');
        
        if (wobblyAmountMinInput) {
            wobblyAmountMinInput.addEventListener('blur', () => {
                const value = parseFloat(wobblyAmountMinInput.value);
                if (!isNaN(value)) {
                    const max = this.settings.get('randomWobblyAmountMax');
                    const clampedValue = Math.max(0, Math.min(max, value));
                    this.rangeSliderController.setValues('randomWobblyAmountRangeSlider', clampedValue, max, true);
                    if (this.settings.get('isRandom')) {
                        this.updateRenderer();
                    }
                }
            });
        }

        if (wobblyAmountMaxInput) {
            wobblyAmountMaxInput.addEventListener('blur', () => {
                const value = parseFloat(wobblyAmountMaxInput.value);
                if (!isNaN(value)) {
                    const min = this.settings.get('randomWobblyAmountMin');
                    const clampedValue = Math.max(min, Math.min(20, value));
                    this.rangeSliderController.setValues('randomWobblyAmountRangeSlider', min, clampedValue, true);
                    if (this.settings.get('isRandom')) {
                        this.updateRenderer();
                    }
                }
            });
        }

        // Handlers for Wobbly Frequency text fields
        const wobblyFrequencyMinInput = document.getElementById('randomWobblyFrequencyMinValue');
        const wobblyFrequencyMaxInput = document.getElementById('randomWobblyFrequencyMaxValue');
        
        if (wobblyFrequencyMinInput) {
            wobblyFrequencyMinInput.addEventListener('blur', () => {
                const value = parseFloat(wobblyFrequencyMinInput.value);
                if (!isNaN(value)) {
                    const max = this.settings.get('randomWobblyFrequencyMax');
                    const clampedValue = Math.max(0.01, Math.min(max, value));
                    this.rangeSliderController.setValues('randomWobblyFrequencyRangeSlider', clampedValue, max, true);
                    if (this.settings.get('isRandom')) {
                        this.updateRenderer();
                    }
                }
            });
        }

        if (wobblyFrequencyMaxInput) {
            wobblyFrequencyMaxInput.addEventListener('blur', () => {
                const value = parseFloat(wobblyFrequencyMaxInput.value);
                if (!isNaN(value)) {
                    const min = this.settings.get('randomWobblyFrequencyMin');
                    const clampedValue = Math.max(min, Math.min(0.5, value));
                    this.rangeSliderController.setValues('randomWobblyFrequencyRangeSlider', min, clampedValue, true);
                    if (this.settings.get('isRandom')) {
                        this.updateRenderer();
                    }
                }
            });
        }
    }

    /**
     * Инициализация color pickers
     */
    /**
     * Обновление цвета превью с автоматическим выбором цвета текста
     */
    updateColorPreview(preview, color) {
        if (preview) {
            preview.style.backgroundColor = color;
        }
    }

    /**
     * Update active color indicator (● symbol)
     * @param {boolean} show - whether to show indicator (true - show on active, false - remove from all)
     */
    highlightActiveSwatch(activeType) {
        for (const [type, info] of Object.entries(this.colorTypeMap)) {
            const item = document.getElementById(info.itemId);
            if (item) {
                item.classList.toggle('active', type === activeType);
                const row = item.closest('.color-swatch-row');
                if (row) row.classList.toggle('active', type === activeType);
            }
        }
    }

    updateColorIndicator(show) {
        this.highlightActiveSwatch(show ? this.activeColorType : null);
    }

    /** Map of color types → {setting, dotId, hexId, itemId, hsbSlotId} */
    get colorTypeMap() {
        return {
            'letter':       { setting: 'letterColor',        dotId: 'letterColorPreview',       hexId: 'letterColorHex',       itemId: 'letterColorItem',       hsbSlotId: 'letterColorHsbSlot' },
            'bg':           { setting: 'bgColor',            dotId: 'bgColorPreview',           hexId: 'bgColorHex',           itemId: 'bgColorItem',           hsbSlotId: 'bgColorHsbSlot' },
            'grid':         { setting: 'gridColor',          dotId: 'gridColorPreview',         hexId: 'gridColorHex',         itemId: 'gridColorItem',         hsbSlotId: 'gridColorHsbSlot' },
            'gradientStart':{ setting: 'gradientStartColor', dotId: 'gradientStartColorPreview',hexId: 'gradientStartColorHex',itemId: 'gradientStartColorItem', hsbSlotId: 'gradientStartColorHsbSlot' },
            'gradientEnd':  { setting: 'gradientEndColor',   dotId: 'gradientEndColorPreview',  hexId: 'gradientEndColorHex',  itemId: 'gradientEndColorItem',   hsbSlotId: 'gradientEndColorHsbSlot' },
            'gradientBg':   { setting: 'bgColor',            dotId: 'gradientBgColorPreview',   hexId: 'gradientBgColorHex',   itemId: 'gradientBgColorItem',     hsbSlotId: 'gradientBgColorHsbSlot' },
            'gradientGrid': { setting: 'gridColor',          dotId: 'gradientGridColorPreview', hexId: 'gradientGridColorHex', itemId: 'gradientGridColorItem',   hsbSlotId: 'gradientGridColorHsbSlot' }
        };
    }

    /** Lines > 1 in single mode, or Lines with ◆ range whose max > 1 */
    linesAllowMultiLineForStyleUI() {
        if (this.settings.get('randomizeStrokes')) {
            return (this.settings.get('randomStrokesMax') ?? 1) > 1;
        }
        return (this.settings.get('strokesNum') ?? 1) > 1;
    }

    dockUnifiedColorPickerForType(colorType) {
        const info = this.colorTypeMap[colorType];
        if (!info?.hsbSlotId) return;
        const slot = document.getElementById(info.hsbSlotId);
        const container = document.getElementById('unifiedColorPickerContainer');
        if (slot && container && container.parentElement !== slot) {
            slot.appendChild(container);
        }
    }

    /** Apply hex from swatch row input; returns true if valid and applied */
    applySwatchHexInput(colorType, raw) {
        const info = this.colorTypeMap[colorType];
        if (!info) return false;
        let v = (raw || '').trim();
        if (v && !v.startsWith('#')) v = '#' + v;
        if (!/^#[0-9A-F]{6}$/i.test(v)) return false;
        const hex = v.toLowerCase();
        if (!ColorUtils.hexToRgb(hex)) return false;
        this.settings.set(info.setting, hex);
        this.updateSwatchDisplay(colorType, hex);
        if (colorType === 'bg') this.updateSwatchDisplay('gradientBg', hex);
        else if (colorType === 'gradientBg') this.updateSwatchDisplay('bg', hex);
        else if (colorType === 'grid') this.updateSwatchDisplay('gradientGrid', hex);
        else if (colorType === 'gradientGrid') this.updateSwatchDisplay('grid', hex);
        if (this.unifiedColorPicker && this.activeColorType === colorType) {
            this.unifiedColorPicker.setColor(hex);
        }
        this.updateRenderer();
        this.markAsChanged();
        return true;
    }

    /** Update a compact swatch dot + hex input value */
    updateSwatchDisplay(colorType, color) {
        const info = this.colorTypeMap[colorType];
        if (!info) return;
        const dot = document.getElementById(info.dotId);
        const hexEl = document.getElementById(info.hexId);
        if (dot) dot.style.background = color;
        if (hexEl) {
            if (hexEl.tagName === 'INPUT') hexEl.value = color;
            else hexEl.textContent = color;
        }
    }

    initColorPickers() {
        for (const [type, info] of Object.entries(this.colorTypeMap)) {
            const color = this.settings.get(info.setting);
            this.updateSwatchDisplay(type, color);
        }

        this.unifiedColorPicker = new ColorPicker({
            containerId: 'unifiedColorPickerContainer',
            initialColor: this.settings.get('letterColor'),
            onChange: (color) => {
                const info = this.colorTypeMap[this.activeColorType];
                if (!info) return;
                this.settings.set(info.setting, color);
                this.updateSwatchDisplay(this.activeColorType, color);
                if (this.activeColorType === 'bg') this.updateSwatchDisplay('gradientBg', color);
                else if (this.activeColorType === 'gradientBg') this.updateSwatchDisplay('bg', color);
                else if (this.activeColorType === 'grid') this.updateSwatchDisplay('gradientGrid', color);
                else if (this.activeColorType === 'gradientGrid') this.updateSwatchDisplay('grid', color);
                this.updateRenderer();
                this.markAsChanged();
            }
        });
        this.unifiedColorPicker.init();

        for (const [type, info] of Object.entries(this.colorTypeMap)) {
            const toggleUnifiedPicker = () => {
                const pickerElement = this.unifiedColorPicker.elements?.picker;
                const isCurrentlyActive = this.activeColorType === type &&
                    pickerElement && pickerElement.style.display !== 'none';
                if (isCurrentlyActive) {
                    this.unifiedColorPicker.close();
                    this.highlightActiveSwatch(null);
                    return;
                }
                this.activeColorType = type;
                this.dockUnifiedColorPickerForType(type);
                this.unifiedColorPicker.setColor(this.settings.get(info.setting));
                this.unifiedColorPicker.open();
                this.highlightActiveSwatch(type);
            };

            const dot = document.getElementById(info.dotId);
            if (dot) {
                dot.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleUnifiedPicker();
                });
            }
            const row = document.getElementById(info.itemId);
            if (row) {
                row.addEventListener('click', (e) => {
                    if (e.target.closest('.color-swatch-hex')) return;
                    e.preventDefault();
                    toggleUnifiedPicker();
                });
            }
            const hexIn = document.getElementById(info.hexId);
            if (hexIn && hexIn.tagName === 'INPUT') {
                hexIn.addEventListener('click', (e) => e.stopPropagation());
                hexIn.addEventListener('keydown', (e) => e.stopPropagation());
                hexIn.addEventListener('blur', () => {
                    if (!this.applySwatchHexInput(type, hexIn.value)) {
                        hexIn.value = this.settings.get(info.setting);
                    }
                });
            }
        }

        this.activeColorType = 'letter';
        const colorMap = {
            'letter': this.settings.get('letterColor'),
            'bg': this.settings.get('bgColor'),
            'grid': this.settings.get('gridColor')
        };
        this.unifiedColorPicker.setColor(colorMap['letter']);
        // Ensure indicator is not displayed
        this.updateColorIndicator(false);
        
        // Initialize color source buttons and dice
        this.initColorSourceButtons();
        this.initPaletteSwatchDice();
        this.updateColorModeUI();
    }
    
    /**
     * Compute colorMode from colorSource + randomizeColor
     */
    getDerivedColorMode() {
        const source = this.settings.get('colorSource') || 'solid';
        const random = !!this.settings.get('randomizeColor');
        if (source === 'gradient') return random ? 'randomGradient' : 'gradient';
        return random ? 'randomChaos' : 'manual';
    }

    /**
     * Apply actions when color mode changes (generate palette, randomize, etc.)
     */
    applyColorMode(mode) {
        if (mode === 'randomChaos' || mode === 'randomGradient') {
            this.generateColorPalette();
        }
        this.updateRenderer();
    }

    /**
     * Initialize color source buttons (Solid / Gradient)
     */
    initColorSourceButtons() {
        const buttons = document.querySelectorAll('#colorSourceButtons .style-button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const newSource = btn.dataset.colorSource;
                if (!newSource) return;
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.set('colorSource', newSource);
                // Close picker and deselect swatch when switching tabs
                if (this.unifiedColorPicker) this.unifiedColorPicker.close();
                this.highlightActiveSwatch(null);
                const colorMode = this.getDerivedColorMode();
                this.settings.set('colorMode', colorMode);
                this.applyColorMode(colorMode);
                this.updateColorModeUI();
                this.markAsChanged();
            });
        });
    }

    /**
     * ◆ on each color swatch — include in live palette / regen
     */
    initPaletteSwatchDice() {
        const map = {
            letter: 'paletteDiceLetter',
            bg: 'paletteDiceBg',
            grid: 'paletteDiceGrid',
            gradientStart: 'paletteDiceGradientStart',
            gradientEnd: 'paletteDiceGradientEnd'
        };
        document.querySelectorAll('button.palette-swatch-dice[data-palette-dice]').forEach(btn => {
            const key = map[btn.dataset.paletteDice];
            if (!key) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.settings.set(key, !this.settings.get(key));
                const active = this.settings.get('randomizeColor');
                this.settings.set('randomizePaletteColors', active);
                const cm = this.getDerivedColorMode();
                this.settings.set('colorMode', cm);
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    this.generateColorPalette();
                }
                this.syncPaletteSwatchDice();
                this.updatePaletteSizeGroupState();
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                this.updateRenderer();
                this.markAsChanged();
            });
        });
        this.syncPaletteSwatchDice();
    }

    syncPaletteSwatchDice() {
        const map = {
            letter: 'paletteDiceLetter',
            bg: 'paletteDiceBg',
            grid: 'paletteDiceGrid',
            gradientStart: 'paletteDiceGradientStart',
            gradientEnd: 'paletteDiceGradientEnd'
        };
        document.querySelectorAll('button.palette-swatch-dice[data-palette-dice]').forEach(btn => {
            const key = map[btn.dataset.paletteDice];
            if (!key) return;
            const enabled = !!this.settings.get(key);
            btn.classList.toggle('active', enabled);
            syncRandomDiceTitle(btn, enabled);
        });
    }

    /**
     * Palette size: always visible; enabled when at least one swatch ◆ is on. Range only.
     */
    updatePaletteSizeGroupState() {
        const active = !!this.settings.get('randomizeColor');
        this.settings.set('randomizePaletteColors', active);
        const group = document.getElementById('paletteColorsDiceGroup');
        if (group) {
            group.classList.toggle('palette-size-group--disabled', !active);
        }
        const singleWrap = document.getElementById('paletteColorsSingleWrap');
        const rangeWrap = document.getElementById('paletteColorsRangeWrap');
        const singleVal = document.getElementById('paletteColorsValue');
        if (singleWrap) singleWrap.style.display = 'none';
        if (rangeWrap) rangeWrap.style.display = 'block';
        if (singleVal) singleVal.style.display = 'none';
    }

    /**
     * Update color mode UI - show/hide mode-specific controls
     */
    updateColorModeUI() {
        const colorSource = this.settings.get('colorSource') || 'solid';
        const isGradient = colorSource === 'gradient';

        const solidControls = document.getElementById('colorSolidControls');
        const gradientControls = document.getElementById('colorGradientControls');
        if (solidControls) solidControls.style.display = isGradient ? 'none' : '';
        if (gradientControls) gradientControls.style.display = isGradient ? '' : 'none';

        // Sync gradient Back/Grid dot colors
        if (isGradient) {
            const gradBg = document.getElementById('gradientBgColorPreview');
            const gradGrid = document.getElementById('gradientGridColorPreview');
            if (gradBg) gradBg.style.background = this.settings.get('bgColor');
            if (gradGrid) gradGrid.style.background = this.settings.get('gridColor');
            const gradBgHex = document.getElementById('gradientBgColorHex');
            const gradGridHex = document.getElementById('gradientGridColorHex');
            if (gradBgHex) gradBgHex.textContent = this.settings.get('bgColor');
            if (gradGridHex) gradGridHex.textContent = this.settings.get('gridColor');
        }

        const sourceButtons = document.querySelectorAll('#colorSourceButtons .style-button');
        sourceButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.colorSource === colorSource);
        });

        this.syncPaletteSwatchDice();
        this.updatePaletteSizeGroupState();
    }

    /**
     * Generate random colors for type, background and grid
     */
    randomizeColors() {
        this._flushAutoSnapshot();
        this.historyManager.beginAction('randomize colors', this.getStateSnapshot());

        const letterColor = this.generateRandomColor();
        const bgColor = this.generateRandomColor();
        const gridColor = this.generateRandomColor();
        
        this.settings.set('letterColor', letterColor);
        this.settings.set('bgColor', bgColor);
        this.settings.set('gridColor', gridColor);
        
        this.updateSwatchDisplay('letter', letterColor);
        this.updateSwatchDisplay('bg', bgColor);
        this.updateSwatchDisplay('grid', gridColor);
        this.updateSwatchDisplay('gradientBg', bgColor);
        this.updateSwatchDisplay('gradientGrid', gridColor);
        
        if (this.unifiedColorPicker) {
            const colorMap = {
                'letter': letterColor,
                'bg': bgColor,
                'grid': gridColor
            };
            this.unifiedColorPicker.setColor(colorMap[this.activeColorType]);
        }
        
        // Render and mark as changed
        this.updateRenderer();
        this.markAsChanged();
        this.historyManager.commitAction(this.getStateSnapshot());
    }
    
    /**
     * Generate a random HEX color
     * @returns {string} Random color in #RRGGBB format
     */
    generateRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Generate random grayscale color (black and white shades)
     */
    generateRandomGrayscaleColor() {
        const gray = Math.floor(Math.random() * 256);
        return '#' + [gray, gray, gray].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Generate color palette for Color Chaos mode
     */
    generateColorPalette() {
        const colorMode = this.getDerivedColorMode();
        const minN = this.settings.get('randomPaletteColorsMin') ?? 3;
        const maxN = this.settings.get('randomPaletteColorsMax') ?? 32;
        let numColors = this.settings.get('colorChaosColors') || 16;
        if (this.settings.get('randomizePaletteColors')) {
            const lo = Math.min(minN, maxN);
            const hi = Math.max(minN, maxN);
            numColors = lo + Math.floor(Math.random() * (hi - lo + 1));
        }

        const isGrayscale = this.settings.get('colorBW');
        const generateColor = isGrayscale ? () => this.generateRandomGrayscaleColor() : () => this.generateRandomColor();

        const diceL = !!this.settings.get('paletteDiceLetter');
        const diceBg = !!this.settings.get('paletteDiceBg');
        const diceGrid = !!this.settings.get('paletteDiceGrid');
        const diceGS = !!this.settings.get('paletteDiceGradientStart');
        const diceGE = !!this.settings.get('paletteDiceGradientEnd');

        this.colorPalette = [];
        if (colorMode === 'randomChaos' && diceL) {
            for (let i = 0; i < numColors; i++) {
                this.colorPalette.push(generateColor());
            }
        }

        let bgColor = this.settings.get('bgColor');
        if (diceBg) {
            bgColor = generateColor();
            this.settings.set('bgColor', bgColor);
        }
        let gridColor = this.settings.get('gridColor');
        if (diceGrid) {
            gridColor = generateColor();
            this.settings.set('gridColor', gridColor);
        }

        if (colorMode === 'randomGradient') {
            if (diceGS) {
                this.settings.set('gradientStartColor', generateColor());
                this.updateSwatchDisplay('gradientStart', this.settings.get('gradientStartColor'));
            }
            if (diceGE) {
                this.settings.set('gradientEndColor', generateColor());
                this.updateSwatchDisplay('gradientEnd', this.settings.get('gradientEndColor'));
            }
            this.gradientPairs = [];
            if (diceGS || diceGE) {
                const pairCount = Math.max(1, Math.floor(numColors / 2));
                for (let i = 0; i < pairCount; i++) {
                    this.gradientPairs.push({
                        start: diceGS ? generateColor() : this.settings.get('gradientStartColor'),
                        end: diceGE ? generateColor() : this.settings.get('gradientEndColor')
                    });
                }
            }
        }

        this.updateSwatchDisplay('bg', bgColor);
        this.updateSwatchDisplay('grid', gridColor);
        this.updateSwatchDisplay('gradientBg', bgColor);
        this.updateSwatchDisplay('gradientGrid', gridColor);
        
        if (this.unifiedColorPicker) {
            const colorMap = {
                letter: this.settings.get('letterColor'),
                bg: bgColor,
                grid: gridColor,
                gradientStart: this.settings.get('gradientStartColor'),
                gradientEnd: this.settings.get('gradientEndColor'),
                gradientBg: bgColor,
                gradientGrid: gridColor
            };
            if (this.activeColorType && colorMap[this.activeColorType] !== undefined) {
                this.unifiedColorPicker.setColor(colorMap[this.activeColorType]);
            }
        }
        
        // Clear caches when regenerating palette
        this.moduleColorCache = new Map();
        this.moduleGradientCache = new Map();
        this.globalModuleIndex = 0;
        this.globalGradientIndex = 0;
    }
    
    /** Get gradient pair for a module in randomGradient multi-pair mode */
    getModuleGradient(moduleIndex) {
        if (!this.gradientPairs || this.gradientPairs.length === 0) {
            return { start: this.settings.get('gradientStartColor'), end: this.settings.get('gradientEndColor') };
        }
        return this.gradientPairs[moduleIndex % this.gradientPairs.length];
    }

    /**
     * Return per-module gradient pair (called by renderer for each module).
     * Returns null when not in randomGradient mode.
     */
    getGradientForModule() {
        if (this.getDerivedColorMode() !== 'randomGradient') return null;
        if (!this.gradientPairs || this.gradientPairs.length === 0) return null;
        if (!this.globalGradientIndex) this.globalGradientIndex = 0;
        const idx = this.globalGradientIndex++;
        if (!this.moduleGradientCache) this.moduleGradientCache = new Map();
        if (!this.moduleGradientCache.has(idx)) {
            const pairIdx = Math.floor(Math.random() * this.gradientPairs.length);
            this.moduleGradientCache.set(idx, this.gradientPairs[pairIdx]);
        }
        return this.moduleGradientCache.get(idx);
    }

    /**
     * Get color for a specific module from palette (Color Chaos mode)
     * @returns {string} Color for this module
     */
    getModuleColor() {
        const colorMode = this.getDerivedColorMode();
        if (colorMode === 'randomChaos' && !this.settings.get('paletteDiceLetter')) {
            return this.settings.get('letterColor');
        }
        const colorChaosEnabled = colorMode === 'randomChaos' || colorMode === 'randomGradient';
        if (!colorChaosEnabled || !this.colorPalette || this.colorPalette.length === 0) {
            return this.settings.get('letterColor');
        }
        
        // Use global counter to ensure each module gets unique random color
        if (!this.globalModuleIndex) {
            this.globalModuleIndex = 0;
        }
        
        const currentIndex = this.globalModuleIndex++;
        
        if (!this.moduleColorCache.has(currentIndex)) {
            // Pick random color from palette
            const colorIndex = Math.floor(Math.random() * this.colorPalette.length);
            this.moduleColorCache.set(currentIndex, this.colorPalette[colorIndex]);
        }
        
        return this.moduleColorCache.get(currentIndex);
    }
    

    /**
     * Initialize text input with debounce
     */
    initTextInput() {
        const textarea = document.getElementById('textInput');
        
        const debouncedUpdate = MathUtils.debounce(() => {
            // Remove spaces before line breaks
            let text = textarea.value;
            text = text.replace(/ +\n/g, '\n').replace(/\n +/g, '\n');
            
            this.settings.set('text', text);
            this.renderer.setText(text);
            this.renderer.render();
            this.markAsChanged();
        }, 300);
        
        textarea.addEventListener('input', debouncedUpdate);
    }

    /**
     * Initialize text alignment control
     */
    initTextAlign() {
        const leftRadio = document.getElementById('textAlignLeft');
        const centerRadio = document.getElementById('textAlignCenter');
        const rightRadio = document.getElementById('textAlignRight');
        
        const updateAlign = () => {
            let align = 'center';
            if (leftRadio.checked) align = 'left';
            else if (centerRadio.checked) align = 'center';
            else if (rightRadio.checked) align = 'right';
            
            this.settings.set('textAlign', align);
            this.updateRenderer();
            this.markAsChanged();
        };
        
        leftRadio.addEventListener('change', updateAlign);
        centerRadio.addEventListener('change', updateAlign);
        rightRadio.addEventListener('change', updateAlign);
    }


    /**
     * Инициализация управления альтернативными глифами
     */
    initAlternativeGlyphs() {
        const alternativeGlyphsCheckbox = document.getElementById('alternativeGlyphsCheckbox');
        if (!alternativeGlyphsCheckbox) return;
        
        alternativeGlyphsCheckbox.checked = this.settings.get('useAlternativesInRandom') ?? false;
        
        alternativeGlyphsCheckbox.addEventListener('change', () => {
            this.settings.set('useAlternativesInRandom', alternativeGlyphsCheckbox.checked);
            // Keep alternativeGlyphCache when toggled off so turning Alt Glyphs back on shows the same picks
            this.updateRenderer();
            this.markAsChanged();
        });
        
        // Canvas click handler for switching alternatives
        const canvas = document.getElementById('mainCanvas');
        if (canvas && !canvas.hasAttribute('data-alternatives-initialized')) {
            canvas.setAttribute('data-alternatives-initialized', 'true');
            
            // Mouse move handler for cursor change and transparency effect
            let lastHoveredPosition = null;
            let rafPending = false;
            
            const updateHover = () => {
                rafPending = false;
                const currentHovered = this.renderer.hoveredLetter;
                const positionChanged = !lastHoveredPosition || !currentHovered ||
                    lastHoveredPosition.lineIndex !== currentHovered.lineIndex ||
                    lastHoveredPosition.charIndex !== currentHovered.charIndex;
                
                if (positionChanged) {
                    this.updateRenderer();
                }
                lastHoveredPosition = currentHovered ? {...currentHovered} : null;
            };
            
            canvas.addEventListener('mousemove', (e) => {
                // Don't process events in editor mode
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                const rect = canvas.getBoundingClientRect();
                // Use CSS dimensions, not physical canvas dimensions
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const position = this.renderer.getLetterPositionAt(mouseX, mouseY);
                
                // Update cursor
                if (position) {
                    // Check if there are alternatives for this character
                    const char = position.char.toUpperCase();
                    const hasAlternatives = VOID_ALPHABET_ALTERNATIVES && VOID_ALPHABET_ALTERNATIVES[char] && VOID_ALPHABET_ALTERNATIVES[char].length > 0;
                    canvas.style.cursor = hasAlternatives ? 'pointer' : 'default';
                    
                    // Set hoveredLetter for transparency effect
                    const positionChanged = !this.renderer.hoveredLetter || 
                        this.renderer.hoveredLetter.lineIndex !== position.lineIndex ||
                        this.renderer.hoveredLetter.charIndex !== position.charIndex;
                    
                    if (positionChanged) {
                        this.renderer.setHoveredLetter(position);
                        // Redraw only if position changed and there are alternatives
                        if (hasAlternatives && !rafPending) {
                            rafPending = true;
                            requestAnimationFrame(updateHover);
                        }
                    }
                } else {
                    canvas.style.cursor = 'default';
                    // Remove hoveredLetter only if it was set
                    if (this.renderer.hoveredLetter) {
                        this.renderer.setHoveredLetter(null);
                        if (!rafPending) {
                            rafPending = true;
                            requestAnimationFrame(updateHover);
                        }
                    }
                }
            });
            
            // Mouse leave handler
            canvas.addEventListener('mouseleave', () => {
                // Don't process events in editor mode
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                this.renderer.setHoveredLetter(null);
                lastHoveredPosition = null;
                canvas.style.cursor = 'default';
                if (!rafPending) {
                    rafPending = true;
                    requestAnimationFrame(updateHover);
                }
            });
            
            canvas.addEventListener('click', (e) => {
                // Don't process events in editor mode
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                const rect = canvas.getBoundingClientRect();
                // Use CSS dimensions, not physical canvas dimensions
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                const position = this.renderer.getLetterPositionAt(clickX, clickY);
                if (position) {
                    const toggled = this.renderer.toggleLetterAlternative(position.lineIndex, position.charIndex);
                    if (toggled) {
                        if (!this.settings.get('useAlternativesInRandom')) {
                            this.settings.set('useAlternativesInRandom', true);
                            const cb = document.getElementById('alternativeGlyphsCheckbox');
                            if (cb) cb.checked = true;
                        }
                        this.updateRenderer();
                        this.markAsChanged();
                    }
                }
            });
        }
    }




    /**
     * Инициализация тогла Rounded
     * Round и Close Ends работают независимо друг от друга
     */
    initRoundedCapsToggle() {
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (!roundedCapsCheckbox) return;
        
        roundedCapsCheckbox.checked = this.settings.get('roundedCaps') || false;
        
        roundedCapsCheckbox.addEventListener('change', () => {
            this.settings.set('roundedCaps', roundedCapsCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    initChaosToggle() {
        const chaosCheckbox = document.getElementById('chaosCheckbox');
        if (!chaosCheckbox) return;

        chaosCheckbox.checked = this.settings.get('randomModeType') === 'full';

        chaosCheckbox.addEventListener('change', () => {
            const mode = chaosCheckbox.checked ? 'full' : 'byType';
            this.settings.set('randomModeType', mode);
            if (this.renderer.clearModuleTypeCache) this.renderer.clearModuleTypeCache();
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Инициализация тогла Close Ends
     * Round и Close Ends работают независимо друг от друга
     */
    initCloseEndsToggle() {
        const closeEndsCheckbox = document.getElementById('closeEndsCheckbox');
        if (!closeEndsCheckbox) return;
        
        // Set initial value
        closeEndsCheckbox.checked = this.settings.get('closeEnds') || false;
        
        // Change handler — just change Close Ends, don't touch Round
        closeEndsCheckbox.addEventListener('change', () => {
            this.settings.set('closeEnds', closeEndsCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Инициализация тогла Dash Chess
     */
    initDashChessToggle() {
        const dashChessCheckbox = document.getElementById('dashChessCheckboxPD');
        if (!dashChessCheckbox) return;

        dashChessCheckbox.checked = this.settings.get('dashChess') || false;

        dashChessCheckbox.addEventListener('change', () => {
            this.settings.set('dashChess', dashChessCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Initialize Wobbly toggle and sliders visibility
     */
    initWobblyToggle() {
        const wobblyCheckbox = document.getElementById('wobblyCheckbox');
        if (!wobblyCheckbox) return;
        
        // Set initial value
        wobblyCheckbox.checked = this.settings.get('wobblyEnabled') || false;
        
        // Change handler
        wobblyCheckbox.addEventListener('change', () => {
            const enabled = wobblyCheckbox.checked;
            this.settings.set('wobblyEnabled', enabled);
            if (!enabled) {
                this.resetDiceForParam('wobblyAmount');
                this.resetDiceForParam('wobblyFrequency');
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
            }
            this.updateWobblyVisibility();
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Update wobbly controls visibility (dimmed when wobbly is off)
     */
    updateWobblyVisibility() {
        const wobblyEnabled = this.settings.get('wobblyEnabled') || false;
        const isRandom = this.settings.get('isRandom');
        const hasWobblyDice = this.settings.get('randomizeWobblyAmount') || this.settings.get('randomizeWobblyFrequency');
        const effectiveWobblyEnabled = wobblyEnabled || (isRandom && hasWobblyDice);
        
        const wobblyAmountGroup = document.getElementById('wobblyAmountControlGroup');
        const wobblyFrequencyGroup = document.getElementById('wobblyFrequencyControlGroup');
        
        if (wobblyAmountGroup) {
            wobblyAmountGroup.classList.toggle('controls-disabled', !effectiveWobblyEnabled);
        }
        if (wobblyFrequencyGroup) {
            wobblyFrequencyGroup.classList.toggle('controls-disabled', !effectiveWobblyEnabled);
        }
    }

    /**
     * Обновить видимость Rounded (для стилей Solid, Stripes и Dash)
     */
    updateRoundedCapsVisibility() {
        const multiLine = this.linesAllowMultiLineForStyleUI();
        const dashEnabled = this.settings.get('dashEnabled') ?? false;

        // Close Stems: dimmed when multi-line is impossible (single Lines=1 and no range above 1)
        const closeEndsLabel = document.getElementById('closeEndsLabel');
        const closeEndsCheckbox = document.getElementById('closeEndsCheckbox');
        const closeDimmed = !multiLine;
        if (closeEndsLabel) closeEndsLabel.classList.toggle('controls-disabled', closeDimmed);
        if (closeEndsCheckbox) closeEndsCheckbox.disabled = closeDimmed;

        // Chess Order: dimmed when Dashes off or multi-line impossible
        const dashChessLabel = document.getElementById('dashChessLabel');
        const dashChessCheckbox = document.getElementById('dashChessCheckboxPD');
        const chessDimmed = !dashEnabled || !multiLine;
        if (dashChessLabel) {
            dashChessLabel.classList.toggle('controls-disabled', chessDimmed);
            // Tooltip text depends on which prerequisite is missing
            let disabledTip;
            if (!dashEnabled && !multiLine) {
                disabledTip = 'Turn on Dashes (● Dashes) and set multiple stroke lines (Lines > 1) to use this effect.';
            } else if (!dashEnabled) {
                disabledTip = 'Turn on Dashes (● Dashes) to use this effect.';
            } else {
                disabledTip = 'Set multiple stroke lines (Lines > 1, or a Random range whose max ≥ 2) to use this effect.';
            }
            dashChessLabel.setAttribute('data-tooltip-disabled', disabledTip);
        }
        if (dashChessCheckbox) dashChessCheckbox.disabled = chessDimmed;
    }



    /**
     * Apply default values for SD mode
     * Lines: 3, Contrast: 0.5, Dash Length: 1, Gap Length: 1.5, Round: enabled, Close Ends: disabled
     */
    applySDDefaults() {
        // Lines: 3
        this.settings.set('strokesNum', 3);
        const strokesValue = document.getElementById('strokesValue');
        const strokesSlider = document.getElementById('strokesSlider');
        if (strokesValue) strokesValue.value = '3';
        if (strokesSlider) strokesSlider.value = '3';
        
        // Contrast: 0.5
        this.settings.set('strokeGapRatio', 0.5);
        const strokeGapRatioValue = document.getElementById('strokeGapRatioValue');
        const strokeGapRatioSlider = document.getElementById('strokeGapRatioSlider');
        if (strokeGapRatioValue) strokeGapRatioValue.value = '0.5';
        if (strokeGapRatioSlider) strokeGapRatioSlider.value = '0.5';
        
        // Dash Length: 1
        this.settings.set('dashLength', 1);
        const dashLengthValue = document.getElementById('dashLengthValue');
        const dashLengthSlider = document.getElementById('dashLengthSlider');
        if (dashLengthValue) dashLengthValue.value = '1.00';
        if (dashLengthSlider) dashLengthSlider.value = '1';
        
        // Gap Length: 1.5
        this.settings.set('gapLength', 1.5);
        const gapLengthValue = document.getElementById('gapLengthValue');
        const gapLengthSlider = document.getElementById('gapLengthSlider');
        if (gapLengthValue) gapLengthValue.value = '1.50';
        if (gapLengthSlider) gapLengthSlider.value = '1.5';
        
        // Round: enabled
        this.settings.set('roundedCaps', true);
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (roundedCapsCheckbox) roundedCapsCheckbox.checked = true;
        
        // Close Ends: disabled
        this.settings.set('closeEnds', false);
        const closeEndsCheckbox = document.getElementById('closeEndsCheckbox');
        if (closeEndsCheckbox) closeEndsCheckbox.checked = false;
    }

    /**
     * Update dimmed/disabled state of style controls (Contrast when Lines=1, Dashes when disabled)
     */
    updateStyleDimmedState() {
        const multiLine = this.linesAllowMultiLineForStyleUI();
        const dashEnabled = this.settings.get('dashEnabled') ?? false;

        const strokeGapRatioGroup = document.getElementById('strokeGapRatioControlGroup');
        const strokeGapRatioSlider = document.getElementById('strokeGapRatioSlider');
        if (strokeGapRatioGroup) strokeGapRatioGroup.classList.toggle('controls-disabled', !multiLine);
        if (strokeGapRatioSlider) strokeGapRatioSlider.disabled = !multiLine;

        const dashesSectionContent = document.getElementById('dashesSectionContent');
        if (dashesSectionContent) dashesSectionContent.classList.toggle('controls-disabled', !dashEnabled);
            const dashLengthSlider = document.getElementById('dashLengthSlider');
            const gapLengthSlider = document.getElementById('gapLengthSlider');
            if (dashLengthSlider) dashLengthSlider.disabled = !dashEnabled;
            if (gapLengthSlider) gapLengthSlider.disabled = !dashEnabled;
            // Chess Order disabled state handled in updateRoundedCapsVisibility
    }

    /**
     * Compute mode from Lines and Dashes settings (no manual mode selection)
     */
    getDerivedMode() {
        const lines = this.settings.get('strokesNum') ?? 2;
        const dash = this.settings.get('dashEnabled') ?? false;
        if (dash && lines > 1) return 'sd';
        if (dash) return 'dash';
        if (lines > 1) return 'stripes';
        return 'fill';
    }

    /**
     * Initialize style controls (Lines, Contrast, Dashes toggle)
     */
    initStyleControls() {
        const dashEnabledCheckbox = document.getElementById('dashEnabledCheckbox');

        const updateStyleVisibility = () => {
            this.updateStyleDimmedState();
            this.updateRoundedCapsVisibility();
            this.updateWobblyVisibility();
        };

        // Dash enabled toggle (defer render to avoid blocking UI)
        if (dashEnabledCheckbox) {
            dashEnabledCheckbox.checked = this.settings.get('dashEnabled') ?? false;
            dashEnabledCheckbox.addEventListener('change', () => {
                const enabled = dashEnabledCheckbox.checked;
                this.settings.set('dashEnabled', enabled);
                if (enabled) {
                    // Apply defaults when first enabling Dashes
                    this.settings.set('dashLength', 1.00);
                    this.settings.set('gapLength', 1.50);
                    this.sliderController.setValue('dashLengthSlider', 1.00, false);
                    this.sliderController.setValue('gapLengthSlider', 1.50, false);
                } else {
                    // Reset dice for Dash Length and Gap Length
                    this.resetDiceForParam('dashLength');
                    this.resetDiceForParam('gapLength');
                    this.updateRandomParamsList();
                    this.updateRandomSectionVisibility();
                }
                updateStyleVisibility();
                requestAnimationFrame(() => {
                    this.updateRenderer();
                    this.markAsChanged();
                });
            });
        }

        // Initial visibility
        updateStyleVisibility();

        // Randomize button
        const renewBtn = document.getElementById('renewRandomBtn');
        if (renewBtn) {
            renewBtn.addEventListener('click', () => {
                if (this.settings.get('isRandom')) {
                    this._flushAutoSnapshot();
                    this.historyManager.beginAction('randomize', this.getStateSnapshot());

                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    if (this.renderer.clearAlternativeGlyphCache) {
                        this.renderer.clearAlternativeGlyphCache();
                    }
                    const wobblyEffect = this.renderer.moduleDrawer?.getWobblyEffect();
                    if (wobblyEffect) wobblyEffect.reseed();
                    this.rollEffectRandomValues();
                    const cm = this.getDerivedColorMode();
                    if (cm === 'randomChaos' || cm === 'randomGradient') {
                        this.generateColorPalette();
                    }
                    this.updateRenderer();
                    this.markAsChanged();
                    this.historyManager.commitAction(this.getStateSnapshot());
                }
            });
        }
    }

    /**
     * Reset dice for a single param (when parent toggle is disabled, e.g. Dashes off → reset dash dice)
     */
    resetDiceForParam(param) {
        if (param === 'paletteColors') {
            this.settings.set('randomizeColor', false);
            this.syncPaletteSwatchDice();
            this.updatePaletteSizeGroupState();
            return;
        }
        const cfg = DICE_CONFIG[param];
        if (!cfg) return;
        this.settings.set(cfg.flag, false);
        const singleWrap = document.getElementById(cfg.singleWrap);
        const rangeWrap = document.getElementById(cfg.rangeWrap);
        const diceBtn = cfg.diceBtnId ? document.getElementById(cfg.diceBtnId) : null;
        const singleValueEl = cfg.singleValueId ? document.getElementById(cfg.singleValueId) : null;
        if (singleWrap) singleWrap.style.display = '';
        if (rangeWrap) rangeWrap.style.display = 'none';
        if (singleValueEl) singleValueEl.style.display = '';
        if (diceBtn) {
            diceBtn.classList.remove('active');
            syncRandomDiceTitle(diceBtn, false);
        }
        // Restore single value from range average
        const min = this.settings.get(cfg.minSetting);
        const max = this.settings.get(cfg.maxSetting);
        let val = (min + max) / 2;
        if (Number.isInteger(cfg.min) && Number.isInteger(cfg.max)) {
            val = Math.round(val);
        }
        this.settings.set(cfg.singleSetting, val);
        if (this.sliderController && this.sliderController.setValue) {
            this.sliderController.setValue(cfg.singleSlider, val, false);
        }
    }

    resetEffectRandomParam(key) {
        const cfg = EFFECT_RANDOM_CONFIG[key];
        if (!cfg) return;
        this.settings.set(cfg.flag, false);
    }

    /**
     * Re-roll effect pill values when their randomize flags are on (Randomize button)
     */
    rollEffectRandomValues() {
        const coin = () => Math.random() < 0.5;
        for (const cfg of Object.values(EFFECT_RANDOM_CONFIG)) {
            if (!this.settings.get(cfg.flag)) continue;
            if (cfg.type === 'chaos') {
                const mode = coin() ? 'full' : 'byType';
                this.settings.set('randomModeType', mode);
                const chaosCb = document.getElementById('chaosCheckbox');
                if (chaosCb) chaosCb.checked = mode === 'full';
                if (this.renderer.clearModuleTypeCache) this.renderer.clearModuleTypeCache();
            } else {
                const v = coin();
                this.settings.set(cfg.setting, v);
                const cb = document.getElementById(cfg.checkboxId);
                if (cb) cb.checked = v;
            }
        }
    }

    /**
     * Initialize dice buttons (toggle per-parameter random)
     */
    initDiceButtons() {
        const toggleDice = (param) => {
            const cfg = DICE_CONFIG[param];
            if (!cfg) return;
            const enabled = !this.settings.get(cfg.flag);
            this.settings.set(cfg.flag, enabled);
            const singleWrap = document.getElementById(cfg.singleWrap);
            const rangeWrap = document.getElementById(cfg.rangeWrap);
            const diceBtn = cfg.diceBtnId ? document.getElementById(cfg.diceBtnId) : null;
            const singleValueEl = cfg.singleValueId ? document.getElementById(cfg.singleValueId) : null;
            if (singleWrap) singleWrap.style.display = enabled ? 'none' : '';
            if (rangeWrap) rangeWrap.style.display = enabled ? 'block' : 'none';
            if (singleValueEl) singleValueEl.style.display = enabled ? 'none' : '';
            if (diceBtn) {
                diceBtn.classList.toggle('active', enabled);
                syncRandomDiceTitle(diceBtn, enabled);
            }
            if (enabled) {
                const dMin = cfg.defaultMin !== undefined ? cfg.defaultMin : cfg.min;
                const dMax = cfg.defaultMax !== undefined ? cfg.defaultMax : cfg.max;
                this.settings.set(cfg.minSetting, dMin);
                this.settings.set(cfg.maxSetting, dMax);
                if (this.rangeSliderController && this.rangeSliderController.ranges.has(cfg.rangeSlider)) {
                    this.rangeSliderController.setValues(cfg.rangeSlider, dMin, dMax, false);
                }
            } else {
                const min = this.settings.get(cfg.minSetting);
                const max = this.settings.get(cfg.maxSetting);
                let val = (min + max) / 2;
                if (Number.isInteger(cfg.min) && Number.isInteger(cfg.max)) {
                    val = Math.round(val);
                }
                this.settings.set(cfg.singleSetting, val);
                this.sliderController.setValue(cfg.singleSlider, val, false);
            }
            // Special handling for palette colors dice
            if (param === 'paletteColors') {
                const cm = this.getDerivedColorMode();
                this.settings.set('colorMode', cm);
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    this.generateColorPalette();
                }
                this.updateColorModeUI();
            }
            this.updateRandomParamsList();
            this.updateRandomSectionVisibility();
            if (param === 'strokes') {
                this.updateStyleDimmedState();
                this.updateRoundedCapsVisibility();
                this.updateCloseEndsState();
            }
            this.updateRenderer();
            this.markAsChanged();
        };

        for (const param of Object.keys(DICE_CONFIG)) {
            if (param === 'paletteColors') {
                this.updatePaletteSizeGroupState();
                continue;
            }
            const cfg = DICE_CONFIG[param];
            const btn = cfg.diceBtnId ? document.getElementById(cfg.diceBtnId) : null;
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDice(param);
                });
            }

            const group = btn ? btn.closest('.dice-slider-group') : null;
            if (group) {
                const labelEl = group.querySelector('label');
                const nameSpan = labelEl ? labelEl.querySelector(':scope > span:first-child') : null;
                if (nameSpan) {
                    nameSpan.style.cursor = 'pointer';
                    nameSpan.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleDice(param);
                    });
                }
            }

            const enabled = this.settings.get(cfg.flag);
            const singleWrap = document.getElementById(cfg.singleWrap);
            const rangeWrap = document.getElementById(cfg.rangeWrap);
            const singleValueEl = cfg.singleValueId ? document.getElementById(cfg.singleValueId) : null;
            if (singleWrap) singleWrap.style.display = enabled ? 'none' : '';
            if (rangeWrap) rangeWrap.style.display = enabled ? 'block' : 'none';
            if (singleValueEl) singleValueEl.style.display = enabled ? 'none' : '';
            if (btn) {
                btn.classList.toggle('active', enabled);
                syncRandomDiceTitle(btn, enabled);
            }
        }
    }

    /**
     * ◆/◇ on effect pills: toggle randomize* flags (add/remove from Random); same control pattern as DICE_CONFIG sliders
     */
    initEffectDiceButtons() {
        for (const key of Object.keys(EFFECT_RANDOM_CONFIG)) {
            const btn = document.querySelector(`.dice-btn--pill[data-effect="${key}"]`);
            if (!btn) continue;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cfg = EFFECT_RANDOM_CONFIG[key];
                if (!cfg) return;
                this.settings.set(cfg.flag, !this.settings.get(cfg.flag));
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                this.updateRenderer();
                this.markAsChanged();
            });
        }
        this.syncEffectDiceButtons();
    }

    /** Keep ◆/◇ (random) state in sync when settings change from Random panel, presets, Chaos, etc. */
    syncEffectDiceButtons() {
        for (const key of Object.keys(EFFECT_RANDOM_CONFIG)) {
            const cfg = EFFECT_RANDOM_CONFIG[key];
            const btn = document.querySelector(`.dice-btn--pill[data-effect="${key}"]`);
            if (btn) {
                const enabled = !!this.settings.get(cfg.flag);
                btn.classList.toggle('active', enabled);
                syncRandomDiceTitle(btn, enabled);
            }
        }
    }

    /**
     * Initialize Random section (Scope, Alternatives, Randomize)
     */
    initRandomSection() {
        const randomPanel = document.getElementById('randomPanel');
        if (!randomPanel) return;

        this.initChaosToggle();

        this.initShuffle();
        this.updateRandomParamsList();
        this.updateRandomSectionVisibility();
    }

    /**
     * Build/rebuild the active-params list inside Random panel (pill-style items)
     */
    updateRandomParamsList() {
        const container = document.getElementById('randomParamsList');
        if (!container) return;
        container.innerHTML = '';

        const showEmptyHint = () => {
            const hint = document.createElement('p');
            hint.className = 'random-params-empty-hint';
            hint.textContent = 'No Random parameters yet. Use ◆ (filled) on Style sliders, effect pills, or color swatches; ◇ to exclude. On the Colors panel, enable ◆ on any swatch to use the Palette range. Then press Randomize.';
            container.appendChild(hint);
        };

        for (const [param, cfg] of Object.entries(DICE_CONFIG)) {
            if (!this.settings.get(cfg.flag)) continue;
            if (param === 'paletteColors' && this.settings.get('randomizeColor')) continue;

            const item = document.createElement('div');
            item.className = 'random-param-pill';
            item.dataset.param = param;

            const text = document.createElement('span');
            text.className = 'random-param-pill-text';
            text.textContent = cfg.displayName;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'random-param-pill-close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetDiceForParam(param);
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                this.updateRenderer();
                this.markAsChanged();
            });

            item.append(text, closeBtn);
            container.appendChild(item);
        }

        for (const [key, cfg] of Object.entries(EFFECT_RANDOM_CONFIG)) {
            if (!this.settings.get(cfg.flag)) continue;

            const item = document.createElement('div');
            item.className = 'random-param-pill';
            item.dataset.param = `effect:${key}`;

            const text = document.createElement('span');
            text.className = 'random-param-pill-text';
            text.textContent = cfg.displayName;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'random-param-pill-close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetEffectRandomParam(key);
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                this.updateRenderer();
                this.markAsChanged();
            });

            item.append(text, closeBtn);
            container.appendChild(item);
        }

        if (this.settings.get('randomizeColor')) {
            const item = document.createElement('div');
            item.className = 'random-param-pill';
            item.dataset.param = 'color';

            const text = document.createElement('span');
            text.className = 'random-param-pill-text';
            text.textContent = 'Colors';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'random-param-pill-close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.settings.set('randomizeColor', false);
                this.syncPaletteSwatchDice();
                this.updatePaletteSizeGroupState();
                const cm = this.getDerivedColorMode();
                this.settings.set('colorMode', cm);
                this.updateColorModeUI();
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                this.updateRenderer();
                this.markAsChanged();
            });

            item.append(text, closeBtn);
            container.appendChild(item);
        }

        if (container.children.length === 0) {
            showEmptyHint();
        }
        this.syncEffectDiceButtons();
    }

    /**
     * Pills show param name only; range changes do not alter the label.
     */
    updateParamRangeText() {}

    /**
     * 🎲 Shuffle: fully randomize except text, module size, letter spacing, line height, align
     */
    initShuffle() {
        const btn = document.getElementById('shuffleBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const rand = (min, max) => min + Math.random() * (max - min);
            const randInt = (min, max) => Math.floor(rand(min, max + 1));
            const coin = () => Math.random() < 0.5;

            // For each dice param: randomly enable/disable range, random values
            for (const [param, cfg] of Object.entries(DICE_CONFIG)) {
                const useRange = coin();
                this.settings.set(cfg.flag, useRange);

                if (useRange) {
                    let rMin = rand(cfg.min, cfg.max);
                    let rMax = rand(cfg.min, cfg.max);
                    if (rMin > rMax) [rMin, rMax] = [rMax, rMin];
                    if (Number.isInteger(cfg.min)) { rMin = Math.round(rMin); rMax = Math.round(rMax); }
                    this.settings.set(cfg.minSetting, rMin);
                    this.settings.set(cfg.maxSetting, rMax);
                    if (this.rangeSliderController && this.rangeSliderController.ranges.has(cfg.rangeSlider)) {
                        this.rangeSliderController.setValues(cfg.rangeSlider, rMin, rMax, false);
                    }
                    const singleWrap = document.getElementById(cfg.singleWrap);
                    const rangeWrap = document.getElementById(cfg.rangeWrap);
                    const singleValueEl = cfg.singleValueId ? document.getElementById(cfg.singleValueId) : null;
                    const diceBtn = cfg.diceBtnId ? document.getElementById(cfg.diceBtnId) : null;
                    if (singleWrap) singleWrap.style.display = 'none';
                    if (rangeWrap) rangeWrap.style.display = 'block';
                    if (singleValueEl) singleValueEl.style.display = 'none';
                    if (diceBtn) diceBtn.classList.add('active');
                } else {
                    let val = rand(cfg.min, cfg.max);
                    if (Number.isInteger(cfg.min)) val = Math.round(val);
                    this.settings.set(cfg.singleSetting, val);
                    if (this.sliderController) this.sliderController.setValue(cfg.singleSlider, val, false);
                    const singleWrap = document.getElementById(cfg.singleWrap);
                    const rangeWrap = document.getElementById(cfg.rangeWrap);
                    const singleValueEl = cfg.singleValueId ? document.getElementById(cfg.singleValueId) : null;
                    const diceBtn = cfg.diceBtnId ? document.getElementById(cfg.diceBtnId) : null;
                    if (singleWrap) singleWrap.style.display = '';
                    if (rangeWrap) rangeWrap.style.display = 'none';
                    if (singleValueEl) singleValueEl.style.display = '';
                    if (diceBtn) diceBtn.classList.remove('active');
                }
            }

            // Random toggles
            this.settings.set('dashEnabled', coin());
            const dashCb = document.getElementById('dashEnabledCheckbox');
            if (dashCb) dashCb.checked = this.settings.get('dashEnabled');

            this.settings.set('wobblyEnabled', coin());
            const wobblyCb = document.getElementById('wobblyCheckbox');
            if (wobblyCb) wobblyCb.checked = this.settings.get('wobblyEnabled');

            for (const cfg of Object.values(EFFECT_RANDOM_CONFIG)) {
                const on = coin();
                this.settings.set(cfg.flag, on);
                if (!on) continue;
                if (cfg.type === 'chaos') {
                    const mode = coin() ? 'full' : 'byType';
                    this.settings.set('randomModeType', mode);
                    const chaosCb = document.getElementById('chaosCheckbox');
                    if (chaosCb) chaosCb.checked = mode === 'full';
                } else {
                    const v = coin();
                    this.settings.set(cfg.setting, v);
                    const cb = document.getElementById(cfg.checkboxId);
                    if (cb) cb.checked = v;
                }
            }

            // Random colors
            const randColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            this.settings.set('colorSource', coin() ? 'gradient' : 'solid');
            this.settings.set('paletteDiceLetter', coin());
            this.settings.set('paletteDiceGradientStart', coin());
            this.settings.set('paletteDiceGradientEnd', coin());
            this.settings.set('paletteDiceBg', coin());
            this.settings.set('paletteDiceGrid', coin());
            if (this.settings.get('randomizeColor')) {
                this.settings.set('colorChaosColors', Math.floor(Math.random() * 29) + 4);
                this.settings.set('randomizePaletteColors', true);
            } else {
                this.settings.set('randomizePaletteColors', false);
            }
            this.settings.set('letterColor', randColor());
            this.settings.set('bgColor', randColor());
            this.settings.set('gridColor', randColor());
            this.settings.set('gradientStartColor', randColor());
            this.settings.set('gradientEndColor', randColor());

            if (this.renderer.clearModuleTypeCache) this.renderer.clearModuleTypeCache();
            if (this.renderer.clearAlternativeGlyphCache) this.renderer.clearAlternativeGlyphCache();

            const shuffleColorMode = this.getDerivedColorMode();
            this.settings.set('colorMode', shuffleColorMode);
            if (shuffleColorMode === 'randomChaos' || shuffleColorMode === 'randomGradient') {
                this.generateColorPalette();
            }

            this.updateStyleDimmedState();
            this.updateRoundedCapsVisibility();
            this.updateWobblyVisibility();
            this.updateColorModeUI();
            this.updateUIFromSettings();
            this.updateRandomParamsList();
            this.updateRandomSectionVisibility();
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Show/hide Random panel based on isRandom and update dice count badge
     */
    updateRandomSectionVisibility() {
        const panel = document.getElementById('randomPanel');
        if (!panel) return;
        panel.style.display = '';

        let total = Object.values(DICE_CONFIG).filter(cfg => this.settings.get(cfg.flag)).length;
        total += Object.values(EFFECT_RANDOM_CONFIG).filter(cfg => this.settings.get(cfg.flag)).length;
        if (this.settings.get('randomizeColor')) total++;

        const badge = document.getElementById('diceCountBadge');
        if (badge) {
            badge.textContent = total > 0 ? (total === 1 ? '1 parameter' : `${total} parameters`) : '';
        }

        const hasParams = total > 0;
        const renewBtn = document.getElementById('renewRandomBtn');
        const resetBtn = document.getElementById('resetAllDiceBtn');
        if (renewBtn) renewBtn.disabled = !hasParams;
        if (resetBtn) resetBtn.disabled = !hasParams;
    }

    /**
     * ↺ Reset: restore all settings to factory defaults (keep text)
     */
    initResetAllDice() {
        const btn = document.getElementById('resetAllDiceBtn');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            const confirmed = await this.modalManager.show({
                title: 'Reset Random Settings?',
                text: 'All randomization parameters will be cleared and settings will return to defaults.',
                buttons: [
                    { id: 'reset', text: 'Reset', type: 'danger' },
                    { id: 'cancel', text: 'No', type: 'ghost' }
                ]
            });
            if (confirmed.action !== 'reset') return;

            this._flushAutoSnapshot();
            this.historyManager.beginAction('reset all', this.getStateSnapshot());

            const defaults = {
                stemMultiplier: 0.5, strokesNum: 1, strokeGapRatio: 1.0,
                dashEnabled: false, dashLength: 1.00, gapLength: 1.50, dashChess: false,
                wobblyEnabled: false, wobblyAmount: 3, wobblyFrequency: 0.1,
                roundedCaps: false, closeEnds: false, useAlternativesInRandom: false,
                showGrid: true, showJoints: false, showFreeEndpoints: false,
                letterColor: '#ffffff', bgColor: '#000000', gridColor: '#333333',
                colorMode: 'manual', colorSource: 'solid', randomModeType: 'byType',
                paletteDiceLetter: false, paletteDiceBg: false, paletteDiceGrid: false,
                paletteDiceGradientStart: false, paletteDiceGradientEnd: false,
                colorChaosColors: 16, randomizePaletteColors: false,
                randomPaletteColorsMin: 3, randomPaletteColorsMax: 32,
                colorBW: false, randomizeColorBW: false,
                gradientStartColor: '#ff0000', gradientEndColor: '#0000ff',
                letterSpacingMultiplier: 1, lineHeightMultiplier: 1,
                randomStemMin: 0.5, randomStemMax: 1.0,
                randomStrokesMin: 1, randomStrokesMax: 4,
                randomContrastMin: 0.1, randomContrastMax: 2.0,
                randomDashLengthMin: 1.0, randomDashLengthMax: 1.5,
                randomGapLengthMin: 1.0, randomGapLengthMax: 1.5,
                randomWobblyAmountMin: 0, randomWobblyAmountMax: 10,
                randomWobblyFrequencyMin: 0.05, randomWobblyFrequencyMax: 0.2,
                randomizeRoundedCaps: false, randomizeCloseEnds: false, randomizeDashChess: false,
                randomizeAltGlyphs: false, randomizeChaosMode: false, randomizeShowGrid: false,
                randomizeShowJoints: false, randomizeShowFreeEndpoints: false,
            };

            // Reset dice UI first — otherwise restore-from-range average overwrites colorChaosColors (e.g. 17.5) after defaults
            for (const param of Object.keys(DICE_CONFIG)) {
                this.resetDiceForParam(param);
            }

            for (const [key, val] of Object.entries(defaults)) {
                this.settings.set(key, val);
            }

            // Restore single slider values to defaults
            this.sliderController.setValue('stemSlider', 0.5, false);
            this.sliderController.setValue('strokesSlider', 1, false);
            this.sliderController.setValue('strokeGapRatioSlider', 1.0, false);
            this.sliderController.setValue('dashLengthSlider', 1.00, false);
            this.sliderController.setValue('gapLengthSlider', 1.50, false);
            this.sliderController.setValue('wobblyAmountSlider', 3, false);
            this.sliderController.setValue('wobblyFrequencySlider', 0.1, false);
            this.sliderController.setValue('paletteColorsSlider', this.settings.get('colorChaosColors') || 16, false);

            // Reset color mode
            this.updateColorModeUI();

            if (this.renderer.clearModuleTypeCache) this.renderer.clearModuleTypeCache();
            if (this.renderer.clearAlternativeGlyphCache) this.renderer.clearAlternativeGlyphCache();

            this.updateStyleDimmedState();
            this.updateRoundedCapsVisibility();
            this.updateWobblyVisibility();
            this.updateColorModeUI();
            this.updateUIFromSettings();
            this.updateRandomParamsList();
            this.updateRandomSectionVisibility();
            this.updateRenderer();
            this.markAsChanged();
            this.historyManager.commitAction(this.getStateSnapshot());
        });
    }
    


    /**
     * Update Close toggle state based on Lines range
     * Close only works when Lines > 1
     */
    updateCloseEndsState() {
        if (!this.settings.get('isRandom')) return;

        const minLines = this.settings.get('randomStrokesMin') ?? 1;
        const maxLines = this.settings.get('randomStrokesMax') ?? 4;
        
        // Close is inactive only if both min and max are 1
        const isInactive = minLines === 1 && maxLines === 1;
        
        const closeLabel = document.getElementById('closeEndsLabel');
        if (closeLabel) {
            closeLabel.classList.toggle('inactive', isInactive);
        }
    }

    /**
     * Initialize grid toggle
     */
    initGridToggle() {
        const gridCheckbox = document.getElementById('showGridCheckbox');
        const jointsCheckbox = document.getElementById('showJointsCheckbox');
        const freeEpCheckbox = document.getElementById('showFreeEndpointsCheckbox');

        gridCheckbox.addEventListener('change', () => {
            this.settings.set('showGrid', gridCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });

        if (jointsCheckbox) {
            jointsCheckbox.addEventListener('change', () => {
                this.settings.set('showJoints', jointsCheckbox.checked);
                this.updateRenderer();
                this.markAsChanged();
            });
        }
        if (freeEpCheckbox) {
            freeEpCheckbox.addEventListener('change', () => {
                this.settings.set('showFreeEndpoints', freeEpCheckbox.checked);
                this.updateRenderer();
                this.markAsChanged();
            });
        }
    }

    /**
     * Black & white palette (effect pill on Style panel)
     */
    initColorBWToggle() {
        const cb = document.getElementById('colorBWCheckbox');
        if (!cb) return;
        cb.checked = this.settings.get('colorBW') || false;
        cb.addEventListener('change', () => {
            this.settings.set('colorBW', cb.checked);
            const cm = this.getDerivedColorMode();
            if (cm === 'randomChaos' || cm === 'randomGradient') {
                this.generateColorPalette();
            }
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Initialize presets
     */
    initPresets() {
        const presetDropdown = document.getElementById('presetDropdown');
        const presetDropdownToggle = document.getElementById('presetDropdownToggle');
        const presetDropdownMenu = document.getElementById('presetDropdownMenu');
        const presetDropdownText = presetDropdownToggle.querySelector('.preset-dropdown-text');
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');

        // Create or update default preset
        const defaultPreset = this.presetManager.loadPreset('New');
        if (!defaultPreset) {
            // Create new default preset with all random caches
            const presetData = this.collectPresetData();
            this.presetManager.savePreset('New', presetData);
        } else {
            // Update existing New preset if text is outdated
            if (defaultPreset.text === 'Void\nTypeface\ncoded') {
                defaultPreset.text = 'Void\nTypeface\nCode';
                this.presetManager.presets['New'] = defaultPreset;
                this.presetManager.savePresets();
            }
            
            // Update random parameter values in preset if they don't match new defaults
            const needsUpdate = 
                defaultPreset.strokesNum !== 1 ||
                defaultPreset.randomStemMin !== 0.5 ||
                defaultPreset.randomStemMax !== 1.0 ||
                defaultPreset.randomStrokesMin !== 1 ||
                defaultPreset.randomStrokesMax !== 4 ||
                defaultPreset.randomContrastMin !== 0.1 ||
                defaultPreset.randomContrastMax !== 2.0 ||
                defaultPreset.randomDashLengthMin !== 1.0 ||
                defaultPreset.randomDashLengthMax !== 1.5 ||
                defaultPreset.randomGapLengthMin !== 1.0 ||
                defaultPreset.randomGapLengthMax !== 1.5 ||
                defaultPreset.useAlternativesInRandom !== false ||
                defaultPreset.lineHeightMultiplier !== 1;

            // Factory Colors panel for preset "New" (Solid, no ◆, manual colorMode)
            const paletteDrift =
                defaultPreset.randomizePaletteColors === true ||
                defaultPreset.colorMode === 'randomChaos' ||
                defaultPreset.colorMode === 'randomGradient' ||
                defaultPreset.randomizeColor === true ||
                defaultPreset.paletteDiceLetter === true ||
                defaultPreset.paletteDiceBg === true ||
                defaultPreset.paletteDiceGrid === true ||
                defaultPreset.paletteDiceGradientStart === true ||
                defaultPreset.paletteDiceGradientEnd === true;
            
            if (needsUpdate || paletteDrift) {
                if (needsUpdate) {
                    defaultPreset.strokesNum = 1;
                    defaultPreset.randomStemMin = 0.5;
                    defaultPreset.randomStemMax = 1.0;
                    defaultPreset.randomStrokesMin = 1;
                    defaultPreset.randomStrokesMax = 4;
                    defaultPreset.randomContrastMin = 0.1;
                    defaultPreset.randomContrastMax = 2.0;
                    defaultPreset.randomDashLengthMin = 1.0;
                    defaultPreset.randomDashLengthMax = 1.5;
                    defaultPreset.randomGapLengthMin = 1.0;
                    defaultPreset.randomGapLengthMax = 1.5;
                    defaultPreset.useAlternativesInRandom = false;
                    defaultPreset.lineHeightMultiplier = 1;
                }
                if (paletteDrift) {
                    defaultPreset.letterColor = '#ffffff';
                    defaultPreset.bgColor = '#000000';
                    defaultPreset.gridColor = '#333333';
                    defaultPreset.colorSource = 'solid';
                    defaultPreset.colorMode = 'manual';
                    defaultPreset.colorChaosColors = 16;
                    defaultPreset.randomizePaletteColors = false;
                    defaultPreset.randomPaletteColorsMin = 3;
                    defaultPreset.randomPaletteColorsMax = 32;
                    defaultPreset.paletteDiceLetter = false;
                    defaultPreset.paletteDiceBg = false;
                    defaultPreset.paletteDiceGrid = false;
                    defaultPreset.paletteDiceGradientStart = false;
                    defaultPreset.paletteDiceGradientEnd = false;
                    defaultPreset.colorBW = false;
                    defaultPreset.randomizeColorBW = false;
                    delete defaultPreset.randomizeColor;
                    delete defaultPreset.colorRandomMode;
                    delete defaultPreset.colorPalette;
                    delete defaultPreset.moduleColorCache;
                }
                this.presetManager.presets['New'] = defaultPreset;
                this.presetManager.savePresets();
            }
        }

        // Update preset list
        this.updatePresetList();
        
        // Load default preset
        // loadPreset will set currentPresetName and hasUnsavedChanges = false
        this.loadPreset('New', false);
        presetDropdownText.textContent = 'New';

        // Open/close dropdown
        presetDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = presetDropdownToggle.getAttribute('aria-expanded') === 'true';
            presetDropdownToggle.setAttribute('aria-expanded', !isExpanded);
            presetDropdownMenu.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!presetDropdown.contains(e.target)) {
                presetDropdownToggle.setAttribute('aria-expanded', 'false');
                presetDropdownMenu.classList.remove('active');
            }
        });

        // Load preset on item click
        presetDropdownMenu.addEventListener('click', async (e) => {
            // Handle rename button click
            const editBtn = e.target.closest('.preset-dropdown-item-edit');
            if (editBtn) {
                e.stopPropagation();
                const presetName = editBtn.dataset.preset;
                
                // Close dropdown first
                presetDropdownToggle.setAttribute('aria-expanded', 'false');
                presetDropdownMenu.classList.remove('active');
                
                // Show rename modal
                const renameResult = await this.modalManager.promptRename(presetName);
                if (renameResult.action === 'rename' && renameResult.newName) {
                    // Check if name already exists
                    if (this.presetManager.hasPreset(renameResult.newName)) {
                        await this.modalManager.showError(`Preset "${renameResult.newName}" already exists.`);
                        return;
                    }
                    
                    const result = this.presetManager.renamePreset(presetName, renameResult.newName);
                    if (result.success) {
                        // Update current preset name if it was renamed
                        if (this.currentPresetName === presetName) {
                            this.currentPresetName = renameResult.newName;
                        }
                        this.updatePresetList();
                        
                        // Update dropdown text if current preset was renamed
                        if (this.currentPresetName === renameResult.newName) {
                            presetDropdownText.textContent = this.getDisplayName(renameResult.newName);
                        }
                    } else {
                        await this.modalManager.showError(result.error || 'Failed to rename preset.');
                    }
                } else if (renameResult.action === 'delete') {
                    // Delete preset from rename modal
                    const confirmed = await this.modalManager.confirmDelete(presetName);
                    if (confirmed) {
                        if (this.presetManager.deletePreset(presetName)) {
                            this.presetHistories.delete(presetName);
                            // Update preset list first
                            this.updatePresetList();
                            
                            // Switch to New if deleted preset was current
                            if (this.currentPresetName === presetName) {
                                this.loadPreset('New');
                            }
                            
                            // Update dropdown UI
                            presetDropdownText.textContent = 'New';
                            const defaultItem = Array.from(presetDropdownMenu.children).find(el => el.dataset.value === 'New');
                            if (defaultItem) {
                                presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                                defaultItem.classList.add('selected');
                            }
                        }
                    }
                }
                return;
            }
            
            const item = e.target.closest('.preset-dropdown-item');
            if (item) {
                const presetName = item.dataset.value;
                
                // Handle delete all presets
                if (presetName === '__delete_all__') {
                    // Close dropdown first
                    presetDropdownToggle.setAttribute('aria-expanded', 'false');
                    presetDropdownMenu.classList.remove('active');
                    
                    const confirmed = await this.modalManager.confirmDeleteAll();
                    if (confirmed) {
                        // Delete all presets except New
                        const names = this.presetManager.getPresetNames();
                        names.forEach(name => {
                            if (name !== 'New') {
                                this.presetManager.deletePreset(name);
                                this.presetHistories.delete(name);
                            }
                        });
                        
                        // Update preset list FIRST (before loadPreset, so it shows correct list)
                        this.updatePresetList();
                        
                        // Switch to New
                        this.loadPreset('New');
                        
                        // Update dropdown UI
                        presetDropdownText.textContent = 'New';
                        const defaultItem = Array.from(presetDropdownMenu.children).find(el => el.dataset.value === 'New');
                        if (defaultItem) {
                            presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                            defaultItem.classList.add('selected');
                        }
                    }
                    return;
                }
                
                if (presetName && presetName !== this.currentPresetName) {
                    // Handle "Unsaved" - it's just New with changes, so just update selection
                    if (presetName === 'Unsaved' && this.currentPresetName === 'New' && this.hasUnsavedChanges) {
                        presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                        item.classList.add('selected');
                        presetDropdownToggle.setAttribute('aria-expanded', 'false');
                        presetDropdownMenu.classList.remove('active');
                        return;
                    }
                    
                    // Handle switching from New with changes to another preset
                    const isSwitchingFromNewWithChanges = this.currentPresetName === 'New' && this.hasUnsavedChanges;
                    
                    // Check for unsaved changes
                    if (this.hasUnsavedChanges) {
                        // Close dropdown first
                        presetDropdownToggle.setAttribute('aria-expanded', 'false');
                        presetDropdownMenu.classList.remove('active');
                        
                        // Use appropriate preset name for dialog
                        const presetNameForDialog = this.currentPresetName === 'New' ? 'New' : this.currentPresetName;
                        const action = await this.modalManager.confirmUnsavedChanges(presetNameForDialog);
                        
                        if (action === 'cancel') {
                            return; // Stay on current preset
                        }
                        
                        if (action === 'save') {
                            if (this.currentPresetName === 'New') {
                                // Save as new preset
                                await this.saveCurrentPreset();
                                // After saving, we might have switched to a new preset
                                if (this.currentPresetName !== 'New') {
                                    // We switched to the newly saved preset, update list and return
                                    this.updatePresetList();
                                    return;
                                }
                            } else {
                                // Update current preset with all random caches
                                const presetData = this.collectPresetData();
                                this.presetManager.updatePreset(this.currentPresetName, presetData);
                                this.updatePresetList();
                            }
                        }
                        // If 'discard' - continue to load selected preset
                    }
                    
                    // loadPreset sets currentPresetName, hasUnsavedChanges and calls updateSaveDeleteButtons
                    this.loadPreset(presetName);
                    
                    // Update UI elements
                    const displayName = presetName === 'New' ? 'New' : this.getDisplayName(presetName);
                    presetDropdownText.textContent = displayName;
                    presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                    item.classList.add('selected');
                    
                    // Close dropdown
                    presetDropdownToggle.setAttribute('aria-expanded', 'false');
                    presetDropdownMenu.classList.remove('active');
                }
            }
        });

        // Save preset
        savePresetBtn.addEventListener('click', async () => {
            await this.saveCurrentPreset();
        });

        // Delete preset
        deletePresetBtn.addEventListener('click', async () => {
            if (this.currentPresetName === 'New') {
                return; // Cannot delete New preset
            }
            
            const confirmed = await this.modalManager.confirmDelete(this.currentPresetName);
            if (confirmed) {
                if (this.presetManager.deletePreset(this.currentPresetName)) {
                    this.presetHistories.delete(this.currentPresetName);
                    // Update preset list first
                    this.updatePresetList();
                    
                    // Switch to New
                    this.loadPreset('New');
                    
                    // Update dropdown UI
                    presetDropdownText.textContent = 'New';
                    const defaultItem = Array.from(presetDropdownMenu.children).find(el => el.dataset.value === 'New');
                    if (defaultItem) {
                        presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                        defaultItem.classList.add('selected');
                    }
                }
            }
        });
        
        // Initialize button visibility after loading New
        // Ensure buttons are hidden for New without changes
        if (this.currentPresetName === 'New') {
            this.hasUnsavedChanges = false;
        }
        this.updateSaveDeleteButtons();
    }

    /**
     * Normalize color string for comparison (lowercase, handle variations)
     * @param {string} color - Color string
     * @returns {string} - Normalized color
     */
    normalizeColor(color) {
        if (!color) return '';
        return color.toLowerCase().trim();
    }

    /**
     * Check if preset has non-default colors
     * @param {string} presetName - Preset name
     * @returns {Object|null} - Object with letterColor and bgColor if colors differ from defaults, null otherwise
     */
    getPresetColors(presetName) {
        const defaultLetterColor = '#ffffff';
        const defaultBgColor = '#000000';
        
        // For "Unsaved", use current settings
        if (presetName === 'Unsaved') {
            const letterColor = this.normalizeColor(this.settings.get('letterColor'));
            const bgColor = this.normalizeColor(this.settings.get('bgColor'));
            const normalizedDefaultLetter = this.normalizeColor(defaultLetterColor);
            const normalizedDefaultBg = this.normalizeColor(defaultBgColor);
            
            // Check if Color Chaos is enabled
            const currentColorMode = this.getDerivedColorMode();
            const hasColorChaos = currentColorMode === 'randomChaos' || currentColorMode === 'randomGradient';
            
            if (letterColor !== normalizedDefaultLetter || bgColor !== normalizedDefaultBg) {
                return { 
                    letterColor: this.settings.get('letterColor'), 
                    bgColor: this.settings.get('bgColor'),
                    hasColorChaos: hasColorChaos
                };
            }
            return null;
        }
        
        // For "New", always return null (default colors)
        if (presetName === 'New') {
            return null;
        }
        
        // Load preset and check colors
        const preset = this.presetManager.loadPreset(presetName);
        if (!preset) {
            return null;
        }
        
        const letterColor = this.normalizeColor(preset.letterColor || defaultLetterColor);
        const bgColor = this.normalizeColor(preset.bgColor || defaultBgColor);
        const normalizedDefaultLetter = this.normalizeColor(defaultLetterColor);
        const normalizedDefaultBg = this.normalizeColor(defaultBgColor);
        
        // Check if Color Chaos is enabled in preset
        const presetColorMode = preset.colorMode || 'manual';
        const hasColorChaos = presetColorMode === 'chaos' || presetColorMode === 'randomChaos';
        
        // Check if colors differ from defaults
        if (letterColor !== normalizedDefaultLetter || bgColor !== normalizedDefaultBg) {
            return { 
                letterColor: preset.letterColor || defaultLetterColor, 
                bgColor: preset.bgColor || defaultBgColor,
                hasColorChaos: hasColorChaos
            };
        }
        
        return null;
    }

    /**
     * Update preset list in dropdown
     */
    updatePresetList() {
        const presetDropdownMenu = document.getElementById('presetDropdownMenu');
        const names = this.presetManager.getPresetNames();
        const hasCustomPresets = names.length > 1; // More than just New
        
        // Add "Unsaved" if we're in New with unsaved changes
        const showUnsaved = this.currentPresetName === 'New' && this.hasUnsavedChanges;
        const listNames = [...names];
        if (showUnsaved && !listNames.includes('Unsaved')) {
            listNames.push('Unsaved');
        }
        
        presetDropdownMenu.innerHTML = '';
        listNames.forEach(name => {
            const item = document.createElement('li');
            item.className = 'preset-dropdown-item';
            item.dataset.value = name;
            item.setAttribute('role', 'option');
            
            // Create name span
            const nameSpan = document.createElement('span');
            nameSpan.className = 'preset-dropdown-item-name';
            let displayName;
            if (name === 'New') {
                displayName = 'New';
            } else if (name === 'Unsaved') {
                displayName = 'Unsaved';
            } else {
                displayName = this.getDisplayName(name);
            }
            nameSpan.textContent = displayName;
            nameSpan.title = name; // Full name on hover
            item.appendChild(nameSpan);
            
            // Add color indicators if colors differ from defaults
            const colors = this.getPresetColors(name);
            if (colors) {
                const colorIndicators = document.createElement('span');
                colorIndicators.className = 'preset-dropdown-item-colors';
                
                const typeDot = document.createElement('span');
                // Use white ◎ if Color Chaos is enabled, otherwise use colored ●
                if (colors.hasColorChaos) {
                    typeDot.textContent = '◎';
                    typeDot.style.color = '#ffffff';
                } else {
                    typeDot.textContent = '●';
                    typeDot.style.color = colors.letterColor;
                }
                
                const backDot = document.createElement('span');
                backDot.textContent = '●';
                backDot.style.color = colors.bgColor;
                
                colorIndicators.appendChild(typeDot);
                colorIndicators.appendChild(backDot);
                nameSpan.appendChild(colorIndicators);
            }
            
            // Add edit icon for custom presets (not New or Unsaved)
            if (name !== 'New' && name !== 'Unsaved') {
                const editBtn = document.createElement('span');
                editBtn.className = 'preset-dropdown-item-edit';
                editBtn.dataset.action = 'rename';
                editBtn.dataset.preset = name;
                editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                editBtn.title = 'Rename';
                item.appendChild(editBtn);
            }
            
            // Mark as selected if it's the current preset, or if it's Unsaved and we're in New with changes
            if (name === this.currentPresetName || (name === 'Unsaved' && this.currentPresetName === 'New' && this.hasUnsavedChanges)) {
                item.classList.add('selected');
            }
            presetDropdownMenu.appendChild(item);
        });
        
        // Add "× delete all" if there are custom presets
        if (hasCustomPresets) {
            const deleteAllItem = document.createElement('li');
            deleteAllItem.className = 'preset-dropdown-item preset-dropdown-item-danger';
            deleteAllItem.dataset.value = '__delete_all__';
            deleteAllItem.textContent = '× delete all';
            deleteAllItem.setAttribute('role', 'option');
            presetDropdownMenu.appendChild(deleteAllItem);
        }
    }

    /**
     * Load preset
     */
    loadPreset(name, updateUI = true) {
        const preset = this.presetManager.loadPreset(name);
        if (!preset) {
            alert('Preset not found');
            return;
        }

        // === Per-preset history: сохраняем историю текущего пресета и переключаем менеджер ===
        const oldPresetName = this.currentPresetName;
        if (oldPresetName && this.historyManager) {
            if (this.historyManager.currentTransaction) {
                this.historyManager.cancelAction();
            }
            this._flushAutoSnapshot();
            // Сохраняем только непустую историю (пустой менеджер незачем кэшировать)
            if (this.historyManager.history.length > 0) {
                this.presetHistories.set(oldPresetName, this.historyManager);
            }
        }

        // Если у пресета есть сохранённая история — восстанавливаем состояние ИЗ НЕЁ
        // (там, где пользователь оставил пресет в этой сессии), не накладывая данные с диска.
        const existingHistory = this.presetHistories.get(name);
        if (existingHistory && existingHistory.history.length > 0) {
            this.historyManager = existingHistory;
            this.currentPresetName = name;

            const currentState = this.historyManager.getCurrentState();
            if (currentState && updateUI) {
                this.applyStateSnapshot(currentState);
            }
            this.hasUnsavedChanges = this.historyManager.historyIndex > 0;
            this.updateSaveDeleteButtons();
            return;
        }

        // Иначе заводим свежую историю, текущий поток loadPreset сам выставит settings с диска.
        this.historyManager = new HistoryManager({ maxSize: 50 });

        // Set loading flag to avoid triggering change tracking
        this.isLoadingPreset = true;
        
        // Set preset name BEFORE applying parameters so tracking knows current preset
        this.currentPresetName = name;

        // List of cache keys that should not be applied to settings
        const cacheKeys = ['createdAt', 'updatedAt', 'alternativeGlyphCache', 'moduleTypeCache', 'moduleValueCache', 'colorPalette', 'moduleColorCache'];
        
        // Apply all parameters from preset (excluding cache data)
        Object.keys(preset).forEach(key => {
            if (!cacheKeys.includes(key) && this.settings.values.hasOwnProperty(key)) {
                this.settings.set(key, preset[key]);
            }
        });

        // Migrate old preset mode → dashEnabled (for presets saved before Phase 5)
        if (preset.mode !== undefined && preset.dashEnabled === undefined) {
            this.settings.set('dashEnabled', preset.mode === 'dash' || preset.mode === 'sd');
        }
        // Migrate mode === 'random' → dice flags (for presets saved before Phase 6)
        if (preset.mode === 'random') {
            this.settings.set('randomizeStem', preset.randomizeStem ?? true);
            this.settings.set('randomizeStrokes', preset.randomizeStrokes ?? true);
            this.settings.set('randomizeContrast', preset.randomizeContrast ?? true);
            this.settings.set('randomizeDashLength', preset.randomizeDashLength ?? (preset.randomDash || false));
            this.settings.set('randomizeGapLength', preset.randomizeGapLength ?? (preset.randomDash || false));
            this.settings.set('randomizeWobblyAmount', preset.randomizeWobblyAmount ?? (preset.randomWobblyEnabled || false));
            this.settings.set('randomizeWobblyFrequency', preset.randomizeWobblyFrequency ?? (preset.randomWobblyEnabled || false));
        }
        // Migrate randomRounded/randomCloseEnds → roundedCaps/closeEnds
        if (preset.randomRounded !== undefined && preset.roundedCaps === undefined) {
            this.settings.set('roundedCaps', preset.randomRounded);
        }
        if (preset.randomCloseEnds !== undefined && preset.closeEnds === undefined) {
            this.settings.set('closeEnds', preset.randomCloseEnds);
        }
        // Migrate colorMode → colorSource + palette
        if (preset.colorMode !== undefined && preset.colorSource === undefined) {
            const modeMap = {
                'manual':        { source: 'solid',    palette: false },
                'random':        { source: 'solid',    palette: true  },
                'chaos':         { source: 'solid',    palette: true  },
                'randomChaos':   { source: 'solid',    palette: true  },
                'gradient':      { source: 'gradient', palette: false },
                'randomGradient':{ source: 'gradient', palette: true  }
            };
            const mapped = modeMap[preset.colorMode] || { source: 'solid', palette: false };
            this.settings.set('colorSource', mapped.source);
            if (mapped.palette && (this.settings.get('colorChaosColors') || 3) <= 3) {
                this.settings.set('colorChaosColors', 16);
            }
        }
        // Migrate old randomizeColor flag
        if (preset.randomizeColor && (this.settings.get('colorChaosColors') || 3) <= 3) {
            this.settings.set('colorChaosColors', preset.colorChaosColors || 16);
        }
        // Migrate → per-swatch palette dice (replaces colorRandomMode)
        if (preset.paletteDiceLetter === undefined) {
            const legacyRandom =
                preset.colorRandomMode === true ||
                preset.colorMode === 'random' ||
                preset.colorMode === 'chaos' ||
                preset.colorMode === 'randomChaos' ||
                preset.colorMode === 'randomGradient' ||
                preset.randomizeColor === true ||
                (preset.colorChaosColors ?? 3) > 3;
            if (legacyRandom) {
                this.settings.set('paletteDiceLetter', true);
                this.settings.set('paletteDiceGradientStart', true);
                this.settings.set('paletteDiceGradientEnd', true);
                this.settings.set('paletteDiceBg', true);
                this.settings.set('paletteDiceGrid', true);
                this.settings.set('randomizePaletteColors', true);
                if ((this.settings.get('colorChaosColors') || 3) <= 3) {
                    this.settings.set('colorChaosColors', 16);
                }
            } else {
                this.settings.set('randomizePaletteColors', false);
            }
        }
        // Migrate old settings names
        if (preset.randomColorChaosGrayscale !== undefined) this.settings.set('colorBW', preset.randomColorChaosGrayscale);
        // showEndpoints (legacy) → Joints + Endpoints (same visibility as before)
        if (preset.showEndpoints !== undefined && preset.showJoints === undefined) {
            const on = !!preset.showEndpoints;
            this.settings.set('showJoints', on);
            this.settings.set('showFreeEndpoints', on);
        }
        if (preset.randomizeShowEndpoints !== undefined && preset.randomizeShowJoints === undefined) {
            const on = !!preset.randomizeShowEndpoints;
            this.settings.set('randomizeShowJoints', on);
            this.settings.set('randomizeShowFreeEndpoints', on);
        }

        // Restore alternative glyph cache if present in preset
        if (this.renderer) {
            if (preset.alternativeGlyphCache && typeof preset.alternativeGlyphCache === 'object') {
                this.renderer.alternativeGlyphCache = JSON.parse(JSON.stringify(preset.alternativeGlyphCache));
            } else {
                this.renderer.alternativeGlyphCache = {};
            }
        }
        
        // Restore module type cache (random values for each module type)
        if (this.renderer) {
            if (preset.moduleTypeCache && typeof preset.moduleTypeCache === 'object') {
                // Deep copy to avoid reference issues
                this.renderer.moduleTypeCache = JSON.parse(JSON.stringify(preset.moduleTypeCache));
            } else {
                this.renderer.moduleTypeCache = {};
            }
        }
        
        // Restore module value cache (random values for each module in full random mode)
        if (this.renderer) {
            if (preset.moduleValueCache && typeof preset.moduleValueCache === 'object') {
                // Deep copy to avoid reference issues
                this.renderer.moduleValueCache = JSON.parse(JSON.stringify(preset.moduleValueCache));
            } else {
                this.renderer.moduleValueCache = {};
            }
        }
        
        const hasColorChaos = !!this.settings.get('randomizeColor');
        
        // Restore or clear Color Chaos palette and cache
        if (!hasColorChaos) {
            this.colorPalette = [];
            this.moduleColorCache = new Map();
            this.moduleGradientCache = new Map();
            this.globalModuleIndex = 0;
            this.globalGradientIndex = 0;
        } else if (preset.colorPalette && preset.colorPalette.length > 0) {
            // Restore saved palette and module color cache
            this.colorPalette = [...preset.colorPalette];
            if (preset.moduleColorCache) {
                // Convert object back to Map
                this.moduleColorCache = new Map(Object.entries(preset.moduleColorCache).map(([k, v]) => [parseInt(k), v]));
            } else {
                this.moduleColorCache = new Map();
            }
            this.globalModuleIndex = this.moduleColorCache.size;
        } else {
            // If Color Chaos is enabled but no saved palette, generate new one
            this.generateColorPalette();
        }
        
        // Store caches to pass to updateRenderer
        this.pendingCacheRestore = {
            moduleTypeCache: this.renderer?.moduleTypeCache ? JSON.parse(JSON.stringify(this.renderer.moduleTypeCache)) : null,
            moduleValueCache: this.renderer?.moduleValueCache ? JSON.parse(JSON.stringify(this.renderer.moduleValueCache)) : null,
            alternativeGlyphCache: this.renderer?.alternativeGlyphCache ? JSON.parse(JSON.stringify(this.renderer.alternativeGlyphCache)) : null
        };
        
        if (updateUI) {
            // Clear layout cache to ensure fresh render with restored caches
            if (this.renderer && this.renderer.clearLayoutCache) {
                this.renderer.clearLayoutCache();
            }
            
            // Update UI (still with isLoadingPreset = true to prevent markAsChanged)
            this.updateUIFromSettings();
            
            // Update renderer with skipCacheClear=true to preserve restored caches
            this.updateRenderer(true);
        }
        
        // Clear pending cache restore
        this.pendingCacheRestore = null;
        
        // Reset loading flag AFTER all UI updates so initial snapshot is recorded clean
        this.isLoadingPreset = false;

        // Если у пресета ещё нет истории — пишем стартовый снэпшот.
        // Если есть — синхронизируем hasUnsavedChanges с положением курсора в истории.
        if (this.historyManager.history.length === 0) {
            this.saveInitialHistorySnapshot(`load preset: ${name}`);
            this.hasUnsavedChanges = false;
        } else {
            this.hasUnsavedChanges = this.historyManager.historyIndex > 0;
        }

        // Регистрируем активный менеджер в Map, чтобы при следующем переключении
        // его можно было найти по имени пресета.
        this.presetHistories.set(name, this.historyManager);
        
        // Update buttons after all changes
        this.updateSaveDeleteButtons();
    }

    /**
     * Update UI elements from settings
     */
    updateUIFromSettings() {
        // Sync dice flags with parent toggles (e.g. dash dice off when Dashes disabled)
        const dashEnabled = this.settings.get('dashEnabled') ?? false;
        if (!dashEnabled) {
            this.settings.set('randomizeDashLength', false);
            this.settings.set('randomizeGapLength', false);
        }
        const wobblyEnabled = this.settings.get('wobblyEnabled') ?? false;
        if (!wobblyEnabled) {
            this.settings.set('randomizeWobblyAmount', false);
            this.settings.set('randomizeWobblyFrequency', false);
        }
        const strokesNum = this.settings.get('strokesNum') ?? 2;
        if (strokesNum === 1 && !this.linesAllowMultiLineForStyleUI()) {
            this.settings.set('randomizeContrast', false);
        }

        // Update sliders (without calling callbacks to avoid extra updates)
        this.sliderController.setValue('stemSlider', this.settings.get('stemMultiplier'), false);
        for (const param of Object.keys(DICE_CONFIG)) {
            if (param === 'paletteColors') continue;
            const cfg = DICE_CONFIG[param];
            const enabled = this.settings.get(cfg.flag);
            const singleWrap = document.getElementById(cfg.singleWrap);
            const rangeWrap = document.getElementById(cfg.rangeWrap);
            const diceBtn = cfg.diceBtnId ? document.getElementById(cfg.diceBtnId) : null;
            const singleValueEl = cfg.singleValueId ? document.getElementById(cfg.singleValueId) : null;
            if (singleWrap) singleWrap.style.display = enabled ? 'none' : '';
            if (rangeWrap) rangeWrap.style.display = enabled ? 'block' : 'none';
            if (singleValueEl) singleValueEl.style.display = enabled ? 'none' : '';
            if (diceBtn) {
                diceBtn.classList.toggle('active', enabled);
                syncRandomDiceTitle(diceBtn, enabled);
            }
        }
        this.sliderController.setValue('moduleSizeSlider', this.settings.get('moduleSize'), false);
        // Update compact inputs
        if (this.compactInputs) {
            if (this.compactInputs['letterSpacingValue']) {
                this.compactInputs['letterSpacingValue'].input.value = this.settings.get('letterSpacingMultiplier');
            }
            if (this.compactInputs['lineHeightValue']) {
                this.compactInputs['lineHeightValue'].input.value = this.settings.get('lineHeightMultiplier');
            }
        }
        this.sliderController.setValue('strokesSlider', this.settings.get('strokesNum'), false);
        this.sliderController.setValue('strokeGapRatioSlider', this.settings.get('strokeGapRatio'), false);
        this.sliderController.setValue('dashLengthSlider', this.settings.get('dashLength'), false);
        this.sliderController.setValue('gapLengthSlider', this.settings.get('gapLength'), false);
        
        // Update range sliders
        if (this.rangeSliderController) {
            this.rangeSliderController.setValues('randomStemRangeSlider', 
                this.settings.get('randomStemMin'), 
                this.settings.get('randomStemMax'), 
                false
            );
            this.rangeSliderController.setValues('randomStrokesRangeSlider', 
                this.settings.get('randomStrokesMin'), 
                this.settings.get('randomStrokesMax'), 
                false
            );
            this.rangeSliderController.setValues('randomContrastRangeSlider', 
                this.settings.get('randomContrastMin'), 
                this.settings.get('randomContrastMax'), 
                false
            );
            this.rangeSliderController.setValues('randomDashLengthRangeSlider', 
                this.settings.get('randomDashLengthMin'), 
                this.settings.get('randomDashLengthMax'), 
                false
            );
            this.rangeSliderController.setValues('randomGapLengthRangeSlider', 
                this.settings.get('randomGapLengthMin'), 
                this.settings.get('randomGapLengthMax'), 
                false
            );
            this.rangeSliderController.setValues('randomPaletteColorsRangeSlider', 
                this.settings.get('randomPaletteColorsMin'), 
                this.settings.get('randomPaletteColorsMax'), 
                false
            );
            this.rangeSliderController.setValues('randomWobblyAmountRangeSlider', 
                this.settings.get('randomWobblyAmountMin'), 
                this.settings.get('randomWobblyAmountMax'), 
                false
            );
            this.rangeSliderController.setValues('randomWobblyFrequencyRangeSlider', 
                this.settings.get('randomWobblyFrequencyMin'), 
                this.settings.get('randomWobblyFrequencyMax'), 
                false
            );
        }

        // Update dash enabled toggle
        const dashEnabledCheckbox = document.getElementById('dashEnabledCheckbox');
        if (dashEnabledCheckbox) {
            dashEnabledCheckbox.checked = this.settings.get('dashEnabled') ?? false;
        }
        
        // Sync colorMode from colorSource + palette state
        this.settings.set('colorMode', this.getDerivedColorMode());
        
        // Update Color Mode UI
        this.updateColorModeUI();

        this.updateStyleDimmedState();
        
        // Update Rounded
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (roundedCapsCheckbox) {
            roundedCapsCheckbox.checked = this.settings.get('roundedCaps') || false;
        }
        this.updateRoundedCapsVisibility();

        // Update Alt Glyphs
        const altGlyphsCb = document.getElementById('alternativeGlyphsCheckbox');
        if (altGlyphsCb) {
            altGlyphsCb.checked = this.settings.get('useAlternativesInRandom') || false;
        }
        
        // Update Wobbly
        const wobblyCheckbox = document.getElementById('wobblyCheckbox');
        if (wobblyCheckbox) {
            wobblyCheckbox.checked = this.settings.get('wobblyEnabled') || false;
        }
        this.sliderController.setValue('wobblyAmountSlider', this.settings.get('wobblyAmount'), false);
        this.sliderController.setValue('wobblyFrequencySlider', this.settings.get('wobblyFrequency'), false);
        this.updateWobblyVisibility();
        this.updateRandomParamsList();
        this.updateRandomSectionVisibility();

        const chaosCb = document.getElementById('chaosCheckbox');
        if (chaosCb) chaosCb.checked = this.settings.get('randomModeType') === 'full';

        this.updateColorModeUI();

        // Update all color swatches
        for (const [type, info] of Object.entries(this.colorTypeMap)) {
            this.updateSwatchDisplay(type, this.settings.get(info.setting));
        }
        
        // Update picker if it's open
        if (this.unifiedColorPicker && this.activeColorType) {
            const info = this.colorTypeMap[this.activeColorType];
            if (info) {
                if (this.unifiedColorPicker.isOpen()) {
                    this.dockUnifiedColorPickerForType(this.activeColorType);
                }
                this.unifiedColorPicker.setColor(this.settings.get(info.setting));
            }
        }
        
        // Update palette slider
        const paletteSlider = document.getElementById('paletteColorsSlider');
        if (paletteSlider) paletteSlider.value = this.settings.get('colorChaosColors') || 16;
        const paletteVal = document.getElementById('paletteColorsValue');
        if (paletteVal) paletteVal.value = this.settings.get('colorChaosColors') || 16;

        // BW (effect panel)
        const colorBWEl = document.getElementById('colorBWCheckbox');
        if (colorBWEl) colorBWEl.checked = this.settings.get('colorBW') || false;

        // Update text
        const text = this.settings.get('text');
        document.getElementById('textInput').value = text;
        this.renderer.setText(text);

        // Update text alignment
        const textAlign = this.settings.get('textAlign') || 'center';
        document.getElementById('textAlignLeft').checked = textAlign === 'left';
        document.getElementById('textAlignCenter').checked = textAlign === 'center';
        document.getElementById('textAlignRight').checked = textAlign === 'right';

        // Update grid and endpoints
        document.getElementById('showGridCheckbox').checked = this.settings.get('showGrid');
        
        const dashChessCheckboxEl = document.getElementById('dashChessCheckboxPD');
        if (dashChessCheckboxEl) dashChessCheckboxEl.checked = this.settings.get('dashChess') || false;
        const jointsCb = document.getElementById('showJointsCheckbox');
        if (jointsCb) jointsCb.checked = this.settings.get('showJoints') || false;
        const freeEpCb = document.getElementById('showFreeEndpointsCheckbox');
        if (freeEpCb) freeEpCb.checked = this.settings.get('showFreeEndpoints') || false;
    }

    /**
     * Initialize export
     */
    initExport() {
        const exportBtn = document.getElementById('exportBtn');
        const exportPngBtn = document.getElementById('exportPngBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        exportBtn.addEventListener('click', () => {
            this.exportSVG();
        });

        if (exportPngBtn) {
            exportPngBtn.addEventListener('click', () => {
                this.exportViewportPng();
            });
        }

        copyBtn.addEventListener('click', () => {
            this.copySVG();
        });

        // Shortcut ⌘E (Cmd on Mac, Ctrl on Windows/Linux)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                // Don't export in editor mode
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                e.preventDefault();
                this.exportSVG();
            }

            // Cmd/Ctrl+Z — Undo, Cmd/Ctrl+Shift+Z — Redo
            // toLowerCase т.к. при зажатом Shift e.key может быть 'Z'
            if ((e.metaKey || e.ctrlKey) && typeof e.key === 'string' && e.key.toLowerCase() === 'z') {
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            }
        });
    }

    /**
     * Initialize resize handler
     */
    initResize() {
        const debouncedResize = MathUtils.debounce(() => {
            this.renderer.resize();
        }, 100);

        window.addEventListener('resize', debouncedResize);
    }

    /**
     * Update renderer with current settings
     * @param {boolean} skipCacheClear - if true, don't clear random caches (used when loading preset with saved caches)
     */
    updateRenderer(skipCacheClear = false) {
        // Don't update renderer in editor mode
        const currentMode = this.settings.get('currentMode') || 'normal';
        if (currentMode === 'editor') return;
        
        const moduleSize = this.settings.get('moduleSize');
        // Multiply by 2 because ModuleDrawer uses stem / 2
        const stem = moduleSize * this.settings.get('stemMultiplier') * 2;
        const letterSpacing = moduleSize * this.settings.get('letterSpacingMultiplier');
        const lineHeight = moduleSize * this.settings.get('lineHeightMultiplier');
        
        const mode = this.getDerivedMode();
        const isRandom = this.settings.get('isRandom');

        const params = {
            stem: stem,
            moduleSize: moduleSize,
            letterSpacing: letterSpacing,
            lineHeight: lineHeight,
            strokesNum: this.settings.get('strokesNum'),
            strokeGapRatio: this.settings.get('strokeGapRatio'),
            mode: mode,
            color: this.settings.get('letterColor'),
            bgColor: this.settings.get('bgColor'),
            gridColor: this.settings.get('gridColor'),
            textAlign: this.settings.get('textAlign') || 'center',
            showGrid: this.settings.get('showGrid'),
            includeGridToExport: this.settings.get('showGrid'), // Automatically export grid if visible
            isRandom: isRandom || false,
            randomizeStem: this.settings.get('randomizeStem') || false,
            randomizeStrokes: this.settings.get('randomizeStrokes') || false,
            randomizeContrast: this.settings.get('randomizeContrast') || false,
            randomizeDashLength: this.settings.get('randomizeDashLength') || false,
            randomizeGapLength: this.settings.get('randomizeGapLength') || false,
            randomizeWobblyAmount: this.settings.get('randomizeWobblyAmount') || false,
            randomizeWobblyFrequency: this.settings.get('randomizeWobblyFrequency') || false,
            randomStemMin: this.settings.get('randomStemMin'),
            randomStemMax: this.settings.get('randomStemMax'),
            randomStrokesMin: this.settings.get('randomStrokesMin'),
            randomStrokesMax: this.settings.get('randomStrokesMax'),
            randomContrastMin: this.settings.get('randomContrastMin'),
            randomContrastMax: this.settings.get('randomContrastMax'),
            randomDashLengthMin: this.settings.get('randomDashLengthMin'),
            randomDashLengthMax: this.settings.get('randomDashLengthMax'),
            randomGapLengthMin: this.settings.get('randomGapLengthMin'),
            randomGapLengthMax: this.settings.get('randomGapLengthMax'),
            randomModeType: this.settings.get('randomModeType'),
            colorBW: this.settings.get('colorBW') || false,
            useCustomModuleColor: ['randomChaos', 'randomGradient'].includes(this.getDerivedColorMode()),
            roundedCaps: this.settings.get('roundedCaps') || false,
            closeEnds: this.settings.get('closeEnds') || false,
            dashEnabled: this.settings.get('dashEnabled') ?? false,
            dashLength: this.settings.get('dashLength') ?? 1.00,
            gapLength: this.settings.get('gapLength') ?? 1.50,
            dashChess: this.settings.get('dashChess') || false,
            useAlternativesInRandom: this.settings.get('useAlternativesInRandom') || false,
            showJoints: this.settings.get('showJoints') || false,
            showFreeEndpoints: this.settings.get('showFreeEndpoints') || false,
            wobblyEnabled: isRandom
                ? (this.settings.get('randomizeWobblyAmount') || this.settings.get('randomizeWobblyFrequency') || this.settings.get('wobblyEnabled') || false)
                : (this.settings.get('wobblyEnabled') || false),
            wobblyAmount: isRandom
                ? (this.settings.get('randomizeWobblyAmount') ? ((this.settings.get('randomWobblyAmountMin') + this.settings.get('randomWobblyAmountMax')) / 2) : (this.settings.get('wobblyAmount') || 0))
                : (this.settings.get('wobblyAmount') || 0),
            wobblyFrequency: isRandom
                ? (this.settings.get('randomizeWobblyFrequency') ? ((this.settings.get('randomWobblyFrequencyMin') + this.settings.get('randomWobblyFrequencyMax')) / 2) : (this.settings.get('wobblyFrequency') || 0.1))
                : (this.settings.get('wobblyFrequency') || 0.1),
            // Pass random wobbly range for potential per-module randomization (future enhancement)
            randomWobblyAmountMin: this.settings.get('randomWobblyAmountMin') || 0,
            randomWobblyAmountMax: this.settings.get('randomWobblyAmountMax') || 10,
            randomWobblyFrequencyMin: this.settings.get('randomWobblyFrequencyMin') || 0.05,
            randomWobblyFrequencyMax: this.settings.get('randomWobblyFrequencyMax') || 0.2,
            // Gradient stroke parameters
            gradientMode: this.getDerivedColorMode(),
            gradientStartColor: this.settings.get('gradientStartColor') || '#ff0000',
            gradientEndColor: this.settings.get('gradientEndColor') || '#0000ff'
        };
        

        this.renderer.updateParams(params, skipCacheClear);
        
        // Restore caches from pending if available (used when loading preset)
        if (this.pendingCacheRestore) {
            if (this.pendingCacheRestore.moduleTypeCache && Object.keys(this.pendingCacheRestore.moduleTypeCache).length > 0) {
                this.renderer.moduleTypeCache = this.pendingCacheRestore.moduleTypeCache;
            }
            if (this.pendingCacheRestore.moduleValueCache && Object.keys(this.pendingCacheRestore.moduleValueCache).length > 0) {
                this.renderer.moduleValueCache = this.pendingCacheRestore.moduleValueCache;
            }
            if (this.pendingCacheRestore.alternativeGlyphCache && Object.keys(this.pendingCacheRestore.alternativeGlyphCache).length > 0) {
                this.renderer.alternativeGlyphCache = this.pendingCacheRestore.alternativeGlyphCache;
            }
        }
        
        // Set text from settings
        this.renderer.setText(this.settings.get('text'));
        
        // Reset global counters before each render for Color Chaos / gradient stability
        this.globalModuleIndex = 0;
        this.globalGradientIndex = 0;
        
        this.renderer.render();
    }

    /**
     * Экспорт в SVG
     */
    exportSVG() {
        // Ensure color palette is generated if Color Chaos is enabled
        const colorMode = this.getDerivedColorMode();
        if (colorMode === 'randomChaos' || colorMode === 'randomGradient') {
            if (!this.colorPalette || this.colorPalette.length === 0) {
                this.generateColorPalette();
            }
        }
        this.globalModuleIndex = 0;
        this.globalGradientIndex = 0;
        this.exporter.exportToSVG();
    }

    /**
     * Копировать SVG в буфер обмена
     */
    async copySVG() {
        // Ensure color palette is generated if Color Chaos is enabled
        const copyColorMode = this.getDerivedColorMode();
        if (copyColorMode === 'randomChaos' || copyColorMode === 'randomGradient') {
            if (!this.colorPalette || this.colorPalette.length === 0) {
                this.generateColorPalette();
            }
        }
        this.globalModuleIndex = 0;
        this.globalGradientIndex = 0;
        await this.exporter.copySVG();
    }

    /**
     * Экспорт PNG размером с видимую область окна (viewport): фон страницы + main canvas в его позиции.
     */
    exportViewportPng() {
        const canvas = this.renderer?.canvas;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const outW = Math.max(1, Math.round(vw * dpr));
        const outH = Math.max(1, Math.round(vh * dpr));

        const out = document.createElement('canvas');
        out.width = outW;
        out.height = outH;
        const ctx = out.getContext('2d');
        if (!ctx) return;

        const bodyBg = getComputedStyle(document.body).backgroundColor;
        ctx.fillStyle = bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : '#0a0a0a';
        ctx.fillRect(0, 0, outW, outH);

        const rect = canvas.getBoundingClientRect();
        const sx = 0;
        const sy = 0;
        const sw = canvas.width;
        const sh = canvas.height;
        const dx = rect.left * dpr;
        const dy = rect.top * dpr;
        const dw = rect.width * dpr;
        const dh = rect.height * dpr;
        ctx.drawImage(canvas, sx, sy, sw, sh, dx, dy, dw, dh);

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `void-viewport-${stamp}.png`;

        out.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.rel = 'noopener';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    /**
     * Save current preset
     * If current preset is New, prompt for name and create new preset
     * If current preset is custom, ask to update or save as new
     */
    async saveCurrentPreset() {
        const isDefaultPreset = this.currentPresetName === 'New';
        let name;
        let result;
        
        if (isDefaultPreset) {
            // For New: prompt for name with auto-generated default
            const defaultName = this.generatePresetName();
            name = await this.modalManager.promptPresetName(defaultName);
            
            if (!name) {
                return; // Cancelled
            }
            
            // Check if name already exists
            if (this.presetManager.hasPreset(name)) {
                await this.modalManager.showError(`Preset "${name}" already exists. Choose a different name.`);
                return this.saveCurrentPreset(); // Re-prompt
            }
            
            // Save preset with all random caches for exact layout reproduction
            const presetData = this.collectPresetData();
            result = this.presetManager.savePreset(name, presetData);
        } else {
            // For custom preset: ask to update or save as new
            const action = await this.modalManager.confirmSaveOrNew(this.currentPresetName);
            
            if (action === 'cancel') {
                return;
            }
            
            if (action === 'update') {
                // Update current preset with all random caches
                name = this.currentPresetName;
                const presetData = this.collectPresetData();
                result = this.presetManager.updatePreset(name, presetData);
            } else if (action === 'new') {
                // Save as new preset
                const defaultName = this.generatePresetName();
                name = await this.modalManager.promptPresetName(defaultName);
                
                if (!name) {
                    return; // Cancelled
                }
                
                // Check if name already exists
                if (this.presetManager.hasPreset(name)) {
                    await this.modalManager.showError(`Preset "${name}" already exists. Choose a different name.`);
                    return this.saveCurrentPreset(); // Re-prompt
                }
                
                // Save preset with all random caches for exact layout reproduction
                const presetData = this.collectPresetData();
                result = this.presetManager.savePreset(name, presetData);
            }
        }
        
        if (result && result.success) {
            this.updatePresetList();
            const presetDropdownText = document.querySelector('.preset-dropdown-text');
            const presetDropdownMenu = document.getElementById('presetDropdownMenu');
            // Display shortened name in dropdown
            const displayName = name === 'New' ? 'New' : this.getDisplayName(name);
            presetDropdownText.textContent = displayName;
            this.currentPresetName = name;
            this.hasUnsavedChanges = false;
            this.updateSaveDeleteButtons();
            const newItem = Array.from(presetDropdownMenu.children).find(item => item.dataset.value === name);
            if (newItem) {
                presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                newItem.classList.add('selected');
            }
        } else if (result && !result.success) {
            await this.modalManager.showError(result.error || 'Failed to save preset.');
        }
    }

    /**
     * Collect all preset data including random caches for exact layout reproduction
     * @returns {Object} Complete preset data object
     */
    collectPresetData() {
        // Use deep copy for caches to avoid reference issues
        let alternativeGlyphCache = {};
        let moduleTypeCache = {};
        let moduleValueCache = {};
        
        if (this.renderer?.alternativeGlyphCache) {
            alternativeGlyphCache = JSON.parse(JSON.stringify(this.renderer.alternativeGlyphCache));
        }
        if (this.renderer?.moduleTypeCache) {
            moduleTypeCache = JSON.parse(JSON.stringify(this.renderer.moduleTypeCache));
        }
        if (this.renderer?.moduleValueCache) {
            moduleValueCache = JSON.parse(JSON.stringify(this.renderer.moduleValueCache));
        }
        
        return {
            ...this.settings.values,
            // Alternative glyph cache (which alternative is selected for each letter position)
            alternativeGlyphCache,
            // Module type cache (random values for each module type in byType mode)
            moduleTypeCache,
            // Module value cache (random values for each module in full random mode)
            moduleValueCache,
            // Color palette for Color Chaos mode
            colorPalette: this.colorPalette ? [...this.colorPalette] : [],
            // Module color cache (which color from palette is assigned to each module)
            moduleColorCache: this.moduleColorCache ? Object.fromEntries(this.moduleColorCache) : {}
        };
    }

    /**
     * Generate preset name: full text + mode
     * If name already exists, adds sequential number
     */
    generatePresetName() {
        const text = this.settings.get('text') || '';
        const mode = this.getDerivedMode();
        
        // Full text (without spaces and line breaks)
        const fullText = text.replace(/\s+/g, ' ').trim();
        
        // Map mode to display name (matching button labels)
        const modeNameMap = {
            'fill': 'Monoline',
            'stripes': 'Stripes',
            'dash': 'Dash',
            'sd': 'Dashed Stripes',
            'random': 'Random'
        };
        const modeName = modeNameMap[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);
        
        let baseName = `${fullText} ${modeName}`;
        const existingNames = this.presetManager.getPresetNames();
        
        // If name already exists, add sequential number
        if (existingNames.includes(baseName)) {
            let counter = 1;
            let newName = `${baseName} ${counter}`;
            while (existingNames.includes(newName)) {
                counter++;
                newName = `${baseName} ${counter}`;
            }
            return newName;
        }
        
        return baseName;
    }

    /**
     * Get display name for preset (max 24 characters total, including mode)
     */
    getDisplayName(fullName) {
        if (fullName == null || fullName === '') return 'New';
        const s = String(fullName);
        const parts = s.split(' ');
        if (parts.length < 2) {
            return s.length > 24 ? s.substring(0, 21) + '...' : s;
        }
        
        // Last part is mode
        const mode = parts[parts.length - 1];
        // Everything else is text
        const textPart = parts.slice(0, -1).join(' ');
        
        // Format: "text... mode" or "text mode"
        // Max length: 24 characters
        
        // Try without ellipsis
        const withoutEllipsis = `${textPart} ${mode}`;
        if (withoutEllipsis.length <= 24) {
            return withoutEllipsis;
        }
        
        // Need ellipsis: "text... mode"
        // Length: text + "..." + " " + mode <= 24
        // Max text length: 24 - 3 - 1 - mode_length
        const maxTextLength = 24 - 3 - 1 - mode.length; // -3 for "...", -1 for space
        
        if (maxTextLength <= 0) {
            // If mode is too long, just return mode
            return mode.length > 24 ? mode.substring(0, 21) + '...' : mode;
        }
        
        const truncatedText = textPart.substring(0, maxTextLength) + '...';
        const result = `${truncatedText} ${mode}`;
        
        // Final check: strictly limit to 24 characters
        if (result.length > 24) {
            // If still longer, hard cut to 24
            const excess = result.length - 24;
            const newTruncatedText = textPart.substring(0, Math.max(0, maxTextLength - excess));
            return `${newTruncatedText}... ${mode}`;
        }
        
        return result;
    }

    /**
     * Setup change tracking
     */
    setupChangeTracking() {
        // Track changes to all settings
        const originalSet = this.settings.set.bind(this.settings);
        const self = this;
        this.settings.set = function(key, value) {
            const oldValue = self.settings.values[key];
            const result = originalSet(key, value);
            const changed = oldValue !== value;
            if (changed && !self.isLoadingPreset && !self.isInitializing && !self.isRestoringState && self.currentPresetName) {
                self.markAsChanged();
                self._scheduleAutoSnapshot(`set ${key}`);
            }
            return result;
        };
        
        // Track text changes through renderer
        const originalSetText = this.renderer.setText.bind(this.renderer);
        let lastRendererText = null;
        this.renderer.setText = (text) => {
            const oldText = lastRendererText;
            originalSetText(text);
            lastRendererText = text;
            const changed = oldText !== null && oldText !== text;
            if (changed && !this.isLoadingPreset && !this.isInitializing && !this.isRestoringState && this.currentPresetName) {
                this.markAsChanged();
                this._scheduleAutoSnapshot('setText');
            }
        };
    }

    /**
     * Mark that there were changes
     */
    markAsChanged() {
        // Don't track changes in editor mode, during preset loading or initialization
        const currentMode = this.settings.get('currentMode') || 'normal';
        if (currentMode === 'editor') return;
        
        if (!this.isLoadingPreset && !this.isInitializing && !this.isRestoringState) {
            this.hasUnsavedChanges = true;
            this.updateSaveDeleteButtons();
        }
    }

    // ============================================
    // History (Undo/Redo)
    // ============================================

    /**
     * Снэпшот текущего состояния приложения для истории.
     * Включает settings + кэши рендера + Color Chaos состояние.
     */
    getStateSnapshot() {
        const renderer = this.renderer;
        return {
            settings: JSON.parse(JSON.stringify(this.settings.values)),
            renderer: {
                alternativeGlyphCache: renderer?.alternativeGlyphCache
                    ? JSON.parse(JSON.stringify(renderer.alternativeGlyphCache)) : {},
                moduleTypeCache: renderer?.moduleTypeCache
                    ? JSON.parse(JSON.stringify(renderer.moduleTypeCache)) : {},
                moduleValueCache: renderer?.moduleValueCache
                    ? JSON.parse(JSON.stringify(renderer.moduleValueCache)) : {}
            },
            colorChaos: {
                colorPalette: Array.isArray(this.colorPalette) ? [...this.colorPalette] : [],
                moduleColorCache: this.moduleColorCache instanceof Map
                    ? Array.from(this.moduleColorCache.entries())
                    : [],
                globalModuleIndex: this.globalModuleIndex || 0,
                globalGradientIndex: this.globalGradientIndex || 0
            }
        };
    }

    /**
     * Применить снэпшот состояния. Все промежуточные set/изменения UI происходят
     * под флагом isRestoringState — они не пишутся в историю и не помечают пресет
     * как изменённый.
     */
    applyStateSnapshot(snapshot) {
        if (!snapshot) return;

        this.isRestoringState = true;
        this.historyManager.setRestoring(true);

        try {
            // 1. Прямое восстановление settings.values, минуя обёртку set()
            //    (иначе пойдут лишние markAsChanged + auto-snapshot)
            if (snapshot.settings) {
                Object.assign(this.settings.values, snapshot.settings);
            }

            // 2. Восстановление кэшей Color Chaos
            if (snapshot.colorChaos) {
                this.colorPalette = Array.isArray(snapshot.colorChaos.colorPalette)
                    ? [...snapshot.colorChaos.colorPalette] : [];
                this.moduleColorCache = new Map(snapshot.colorChaos.moduleColorCache || []);
                this.globalModuleIndex = snapshot.colorChaos.globalModuleIndex || 0;
                this.globalGradientIndex = snapshot.colorChaos.globalGradientIndex || 0;
            }

            // 3. Подготовка кэшей рендера к восстановлению
            //    pendingCacheRestore используется внутри updateRenderer()
            if (snapshot.renderer) {
                this.pendingCacheRestore = {
                    moduleTypeCache: snapshot.renderer.moduleTypeCache || null,
                    moduleValueCache: snapshot.renderer.moduleValueCache || null,
                    alternativeGlyphCache: snapshot.renderer.alternativeGlyphCache || null
                };
                if (this.renderer) {
                    if (snapshot.renderer.alternativeGlyphCache) {
                        this.renderer.alternativeGlyphCache = JSON.parse(JSON.stringify(snapshot.renderer.alternativeGlyphCache));
                    }
                    if (snapshot.renderer.moduleTypeCache) {
                        this.renderer.moduleTypeCache = JSON.parse(JSON.stringify(snapshot.renderer.moduleTypeCache));
                    }
                    if (snapshot.renderer.moduleValueCache) {
                        this.renderer.moduleValueCache = JSON.parse(JSON.stringify(snapshot.renderer.moduleValueCache));
                    }
                }
            }

            // 4. Очистка layout-кэшей и обновление UI/рендера
            if (this.renderer && this.renderer.clearLayoutCache) {
                this.renderer.clearLayoutCache();
            }
            this.updateUIFromSettings();
            this.updateRenderer(true);

            this.pendingCacheRestore = null;
        } finally {
            this.isRestoringState = false;
            this.historyManager.setRestoring(false);
        }
    }

    /**
     * Запланировать автоматический snapshot после серии изменений.
     * Дебаунс — чтобы быстрая последовательность set'ов превратилась в один шаг истории.
     * Не пишет, если идёт активная транзакция (её закроет commitAction).
     */
    _scheduleAutoSnapshot(label = '') {
        if (this.isRestoringState || this.isLoadingPreset || this.isInitializing) return;
        if (this.settings.get('currentMode') === 'editor') return;
        if (this.historyManager.currentTransaction) return;

        if (this.snapshotDebounceTimer) {
            clearTimeout(this.snapshotDebounceTimer);
        }
        this.snapshotDebounceTimer = setTimeout(() => {
            this.snapshotDebounceTimer = null;
            if (this.historyManager.currentTransaction) return;
            this.historyManager.saveSnapshot(this.getStateSnapshot(), label);
        }, 250);
    }

    /**
     * Принудительно сбросить отложенный snapshot (например, перед началом транзакции).
     */
    _flushAutoSnapshot() {
        if (this.snapshotDebounceTimer) {
            clearTimeout(this.snapshotDebounceTimer);
            this.snapshotDebounceTimer = null;
        }
    }

    /**
     * Сохранить начальный снэпшот в историю текущего пресета.
     * Вызывается после загрузки/создания пресета, когда история пуста.
     */
    saveInitialHistorySnapshot(label = 'initial') {
        this._flushAutoSnapshot();
        this.historyManager.saveSnapshot(this.getStateSnapshot(), label);
    }

    /**
     * Cmd/Ctrl+Z
     */
    undo() {
        if (this.settings.get('currentMode') === 'editor') return;
        // Закрываем активный input (его blur закоммитит транзакцию текстового поля)
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            activeEl.blur();
        }
        this._flushAutoSnapshot();
        const previousState = this.historyManager.undo();
        if (previousState) {
            this.applyStateSnapshot(previousState);
            this._afterHistoryNav();
        }
    }

    /**
     * Cmd/Ctrl+Shift+Z
     */
    redo() {
        if (this.settings.get('currentMode') === 'editor') return;
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            activeEl.blur();
        }
        this._flushAutoSnapshot();
        const nextState = this.historyManager.redo();
        if (nextState) {
            this.applyStateSnapshot(nextState);
            this._afterHistoryNav();
        }
    }

    /**
     * Сделать вид, что после undo/redo нужно отметить пресет как изменённый
     * (если индекс не на стартовой позиции истории пресета).
     */
    _afterHistoryNav() {
        // hasUnsavedChanges вычисляем относительно стартового снэпшота истории (index 0)
        const idx = this.historyManager.historyIndex;
        const hasChanges = idx > 0;
        this.hasUnsavedChanges = hasChanges;
        this.updateSaveDeleteButtons();
    }

    /**
     * Привязать к каждому слайдеру/range-слайдеру обработчики транзакций:
     *  - mousedown на ползунке  → beginAction (snapshot "до")
     *  - глобальный mouseup     → commitAction (snapshot "после")
     *  - focus  на value-input  → beginAction
     *  - blur   на value-input  → commitAction
     * Это превращает один drag/один сеанс ввода в один шаг истории.
     */
    initSliderHistoryHandlers() {
        // ---- SliderController (одиночные слайдеры) ----
        if (this.sliderController?.sliders) {
            this.sliderController.sliders.forEach((sliderData, sliderId) => {
                const slider = sliderData.element;
                const valueInput = sliderData.valueInput;

                if (slider) {
                    slider.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        this._flushAutoSnapshot();
                        this.historyManager.beginAction(`adjust ${sliderId}`, this.getStateSnapshot());
                        this.activeSliderTransactions.set(sliderId, true);
                    });
                }

                if (valueInput) {
                    valueInput.addEventListener('focus', () => {
                        if (this.activeInputTransactions.has(sliderId)) return;
                        this._flushAutoSnapshot();
                        this.historyManager.beginAction(`type ${sliderId}`, this.getStateSnapshot());
                        this.activeInputTransactions.add(sliderId);
                    });
                    valueInput.addEventListener('blur', () => {
                        if (!this.activeInputTransactions.has(sliderId)) return;
                        this.historyManager.commitAction(this.getStateSnapshot());
                        this.activeInputTransactions.delete(sliderId);
                    });
                }
            });
        }

        // ---- RangeSliderController (двойные ползунки) ----
        if (this.rangeSliderController?.ranges) {
            this.rangeSliderController.ranges.forEach((rangeData, rangeId) => {
                const beginRange = (label) => {
                    if (this.activeSliderTransactions.has(rangeId)) return;
                    this._flushAutoSnapshot();
                    this.historyManager.beginAction(label, this.getStateSnapshot());
                    this.activeSliderTransactions.set(rangeId, true);
                };

                if (rangeData.minThumb) {
                    rangeData.minThumb.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        beginRange(`adjust ${rangeId} (min)`);
                    });
                }
                if (rangeData.maxThumb) {
                    rangeData.maxThumb.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        beginRange(`adjust ${rangeId} (max)`);
                    });
                }

                // Текстовые поля min/max
                const cfg = rangeData.config || {};
                ['minValueId', 'maxValueId'].forEach(idKey => {
                    const inputId = cfg[idKey];
                    if (!inputId) return;
                    const input = document.getElementById(inputId);
                    if (!input) return;
                    const txKey = `${rangeId}:${inputId}`;
                    input.addEventListener('focus', () => {
                        if (this.activeInputTransactions.has(txKey)) return;
                        this._flushAutoSnapshot();
                        this.historyManager.beginAction(`type ${inputId}`, this.getStateSnapshot());
                        this.activeInputTransactions.add(txKey);
                    });
                    input.addEventListener('blur', () => {
                        if (!this.activeInputTransactions.has(txKey)) return;
                        this.historyManager.commitAction(this.getStateSnapshot());
                        this.activeInputTransactions.delete(txKey);
                    });
                });
            });
        }

        // Глобальный mouseup закрывает все активные slider/range-транзакции
        document.addEventListener('mouseup', (e) => {
            if (e.button !== 0) return;
            if (this.activeSliderTransactions.size === 0) return;
            this.activeSliderTransactions.forEach((_, id) => {
                this.historyManager.commitAction(this.getStateSnapshot());
            });
            this.activeSliderTransactions.clear();
        });
    }

    /**
     * Update Save and Delete buttons visibility and dropdown state
     */
    updateSaveDeleteButtons() {
        // Don't show buttons in editor mode
        const currentMode = this.settings.get('currentMode') || 'normal';
        if (currentMode === 'editor') {
            const savePresetBtn = document.getElementById('savePresetBtn');
            const deletePresetBtn = document.getElementById('deletePresetBtn');
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            return;
        }
        
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');
        const presetDropdownToggle = document.getElementById('presetDropdownToggle');
        const presetDropdownText = document.querySelector('.preset-dropdown-text');
        const isDefaultPreset = this.currentPresetName === 'New';
        const isDefaultWithoutChanges = isDefaultPreset && !this.hasUnsavedChanges;
        const names = this.presetManager.getPresetNames();
        const hasCustomPresets = names.length > 1; // More than just New
        
        // Update dropdown text: show "Unsaved" if in New with changes, otherwise show current preset name
        if (presetDropdownText) {
            if (isDefaultPreset && this.hasUnsavedChanges) {
                presetDropdownText.textContent = 'Unsaved';
            } else {
                const displayName = this.currentPresetName === 'New' ? 'New' : this.getDisplayName(this.currentPresetName || 'New');
                presetDropdownText.textContent = displayName;
            }
        }
        
        // Disable dropdown if no custom presets and we're in New without changes
        if (presetDropdownToggle) {
            const shouldDisable = !hasCustomPresets && isDefaultWithoutChanges;
            presetDropdownToggle.disabled = shouldDisable;
        }
        
        // In Default without changes - NEVER show Save and Delete
        if (isDefaultWithoutChanges) {
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            return;
        }
        
        // Show Save if there are unsaved changes
        if (savePresetBtn) {
            savePresetBtn.style.display = this.hasUnsavedChanges ? 'inline-flex' : 'none';
        }
        
        // Show Delete only if it's NOT Default preset
        // (custom presets can be deleted)
        if (deletePresetBtn) {
            deletePresetBtn.style.display = !isDefaultPreset ? 'inline-flex' : 'none';
        }
        
        // Update preset list to reflect Unsaved state
        this.updatePresetList();
    }
    
    /**
     * Initialize editor hotkey (Cmd+G)
     */
    initEditorHotkey() {
        document.addEventListener('keydown', (e) => {
            // Cmd+G (Mac) or Ctrl+G (Windows/Linux) - toggle editor mode
            if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
                e.preventDefault();
                const currentMode = this.settings.get('currentMode') || 'normal';
                const newMode = currentMode === 'normal' ? 'editor' : 'normal';
                this.switchMode(newMode);
            }
        });
    }
    
    /**
     * Switch mode (Normal/Editor)
     */
    switchMode(mode) {
        this.settings.set('currentMode', mode);
        
        const controlsPanel = document.getElementById('controlsPanel');
        const variabilityPanel = document.getElementById('variabilityPanel');
        const viewColorsPanel = document.getElementById('viewColorsPanel');
        const editorPanel = document.getElementById('editorPanel');
        const presetDropdown = document.getElementById('presetDropdown');
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');
        const copyBtn = document.getElementById('copyBtn');
        const exportBtn = document.getElementById('exportBtn');
        const aboutVoidLink = document.getElementById('aboutVoidLink');
        const editorHint = document.getElementById('editorHint');
        
        if (mode === 'editor') {
            // Activate editor mode
            
            // Hide regular panels
            if (controlsPanel) controlsPanel.style.display = 'none';
            if (variabilityPanel) variabilityPanel.style.display = 'none';
            if (viewColorsPanel) viewColorsPanel.style.display = 'none';
            
            // Hide presets and buttons
            if (presetDropdown) presetDropdown.style.display = 'none';
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            if (copyBtn) copyBtn.style.display = 'none';
            if (exportBtn) exportBtn.style.display = 'none';
            if (aboutVoidLink) aboutVoidLink.style.display = 'none';
            
            // Show editor panel
            if (editorPanel) editorPanel.style.display = 'block';
            
            // Show editor hint
            if (editorHint) editorHint.style.display = 'block';
            
            // Deactivate renderer and activate editor
            if (this.glyphEditor) {
                this.glyphEditor.activate();
            }
        } else {
            // Activate normal mode
            
            // Hide editor hint
            const editorHint = document.getElementById('editorHint');
            if (editorHint) editorHint.style.display = 'none';
            
            // Show regular panels
            if (controlsPanel) controlsPanel.style.display = 'block';
            if (variabilityPanel) variabilityPanel.style.display = 'block';
            if (viewColorsPanel) viewColorsPanel.style.display = 'block';
            
            // Show presets and buttons
            if (presetDropdown) presetDropdown.style.display = 'flex';
            if (copyBtn) copyBtn.style.display = 'inline-flex';
            if (exportBtn) exportBtn.style.display = 'inline-flex';
            if (aboutVoidLink) aboutVoidLink.style.display = 'inline-flex';
            this.updateSaveDeleteButtons();
            
            // Hide editor panel
            if (editorPanel) editorPanel.style.display = 'none';
            
            // Deactivate editor and activate renderer
            if (this.glyphEditor) {
                this.glyphEditor.deactivate();
            }
            
            // Force update canvas dimensions after DOM update
            requestAnimationFrame(() => {
                // Force reflow to ensure container dimensions updated
                const canvas = document.getElementById('mainCanvas');
                if (canvas) {
                    canvas.offsetHeight; // Force reflow
                }
                
                // Update canvas dimensions and render
                if (this.renderer && this.renderer.setupCanvas) {
                    this.renderer.setupCanvas();
                }
                this.updateRenderer();
            });
        }
    }
    
    /**
     * Инициализация редактора глифов
     */
    initGlyphEditor() {
        const canvas = document.getElementById('mainCanvas');
        if (!canvas || !this.renderer || !this.renderer.moduleDrawer) return;
        
        this.glyphEditor = new GlyphEditor(canvas, this.renderer.moduleDrawer);
        
        // Save button handler
        const saveBtn = document.getElementById('editorSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.glyphEditor) {
                    this.glyphEditor.saveGlyph();
                }
            });
        }
        
        // Copy button handler
        const copyBtn = document.getElementById('editorCopyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                if (this.glyphEditor) {
                    this.glyphEditor.copySavedGlyphs();
                }
            });
        }
    }

    /**
     * Initialize cursor-following tooltips system
     * Creates a global tooltip element that follows the cursor
     */
    initCursorTooltips() {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'cursor-tooltip';
        tooltip.id = 'cursorTooltip';
        document.body.appendChild(tooltip);
        
        this.tooltipElement = tooltip;
        this.tooltipVisible = false;
        
        // Track mouse position
        let mouseX = 0;
        let mouseY = 0;
        
        // Update tooltip position on mouse move
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            if (this.tooltipVisible) {
                this.positionTooltip(mouseX, mouseY);
            }
        });
        
        const getTooltipText = (target) => {
            const unavailable =
                target.classList.contains('inactive') ||
                target.classList.contains('controls-disabled') ||
                (target.querySelector && target.querySelector('input:disabled'));
            if (unavailable && target.hasAttribute('data-tooltip-disabled')) {
                return target.getAttribute('data-tooltip-disabled');
            }
            return target.getAttribute('data-tooltip') || null;
        };

        const tooltipHostSelector = '[data-tooltip], [data-tooltip-disabled]';

        // Delegate event listeners for elements with tooltips
        document.addEventListener('mouseenter', (e) => {
            const target = e.target.closest(tooltipHostSelector);
            if (target) {
                const text = getTooltipText(target);
                if (text) {
                    this.showTooltip(text, mouseX, mouseY);
                }
            }
        }, true);
        
        document.addEventListener('mouseleave', (e) => {
            const target = e.target.closest(tooltipHostSelector);
            if (target) {
                this.hideTooltip();
            }
        }, true);
        
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest(tooltipHostSelector);
            if (target) {
                const text = getTooltipText(target);
                if (text) {
                    this.showTooltip(text, mouseX, mouseY);
                }
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            const target = e.target;
            const relatedTarget = e.relatedTarget;
            
            if (target.closest && target.closest(tooltipHostSelector)) {
                const targetTooltipEl = target.closest(tooltipHostSelector);
                const relatedTooltipEl = relatedTarget?.closest?.(tooltipHostSelector);
                
                if (targetTooltipEl !== relatedTooltipEl) {
                    this.hideTooltip();
                }
            }
        });
    }
    
    /**
     * Show tooltip with text at cursor position
     */
    showTooltip(text, x, y) {
        if (!this.tooltipElement) return;
        
        this.tooltipElement.textContent = text;
        this.tooltipVisible = true;
        this.positionTooltip(x, y);
        this.tooltipElement.classList.add('visible');
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (!this.tooltipElement) return;
        
        this.tooltipVisible = false;
        this.tooltipElement.classList.remove('visible');
    }
    
    /**
     * Position tooltip near cursor
     */
    positionTooltip(x, y) {
        if (!this.tooltipElement) return;
        
        const offset = 12; // Offset from cursor
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        
        let left = x + offset;
        let top = y + offset;
        
        // Keep tooltip within viewport
        if (left + tooltipRect.width > window.innerWidth) {
            left = x - tooltipRect.width - offset;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = y - tooltipRect.height - offset;
        }
        if (left < 0) left = offset;
        if (top < 0) top = offset;
        
        this.tooltipElement.style.left = `${left}px`;
        this.tooltipElement.style.top = `${top}px`;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new VoidTypeface();
});

