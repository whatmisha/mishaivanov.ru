/**
 * Void Typeface - main initialization file
 */

import { VoidRenderer } from './core/VoidRenderer.js';
import { VoidExporter } from './core/VoidExporter.js';
import { PresetManager } from './core/PresetManager.js';
import { VOID_ALPHABET_ALTERNATIVES } from './core/VoidAlphabet.js';
import { PanelManager } from './ui/PanelManager.js';
import { ModalManager } from './ui/ModalManager.js';
import { MathUtils } from './utils/MathUtils.js';
import GlyphEditor from './core/GlyphEditor.js';
import { HistoryManager } from './history/HistoryManager.js';
import {
    DICE_CONFIG,
    EFFECT_RANDOM_CONFIG,
    syncRandomDiceTitle
} from './config/randomConfig.js';
import {
    RENDER_THROTTLE_MS,
    RESIZE_DEBOUNCE_MS,
    HISTORY_AUTOSNAPSHOT_DEBOUNCE_MS,
    HISTORY_MAX_SIZE,
    MOBILE_BREAKPOINT_PX,
    TABLET_BREAKPOINT_PX
} from './config/timings.js';
import { TooltipService } from './controllers/TooltipService.js';
import { MobileBootstrap, isMobileDevice } from './controllers/MobileBootstrap.js';
import { HistoryController } from './controllers/HistoryController.js';
import { SlidersSetup } from './controllers/SlidersSetup.js';
import { RandomPanelController } from './controllers/RandomPanelController.js';
import { ColorController } from './controllers/ColorController.js';
import { PresetsController } from './controllers/PresetsController.js';

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
        
        // Throttled updateRenderer for slider dragging (~60fps)
        this.throttledUpdateRenderer = MathUtils.throttle(() => {
            this.updateRenderer();
        }, RENDER_THROTTLE_MS);

        // Check for mobile device
        this.isMobile = isMobileDevice();

        // Initialize components
        this.initCanvas();
        this.initExporter();
        this.initPresetManager();

        if (this.isMobile) {
            // On mobile devices hide panels and show message
            this.mobileBootstrap = new MobileBootstrap(this);
            this.mobileBootstrap.init();
        } else {
            // Preset UI + change tracking must exist before any init that calls markAsChanged (e.g. ColorPicker onChange)
            this.currentPresetName = 'New';
            this.hasUnsavedChanges = false;
            this.isInitializing = true;

            // Undo/Redo: per-preset history. historyManager — текущий менеджер активного пресета.
            this.presetHistories = new Map();
            this.historyManager = new HistoryManager({ maxSize: HISTORY_MAX_SIZE });
            this.isRestoringState = false;
            this.activeSliderTransactions = new Map();
            this.activeInputTransactions = new Set();
            this.snapshotDebounceTimer = null;
            this.historyController = new HistoryController(this);
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

            this.tooltipService = new TooltipService();
            this.tooltipService.init();
            
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

    // Slider initialisation lives in SlidersSetup; the methods below are
    // thin delegates so existing call sites keep their public API.
    _ensureSlidersSetup() {
        if (!this.slidersSetup) this.slidersSetup = new SlidersSetup(this);
        return this.slidersSetup;
    }
    initSliders() { this._ensureSlidersSetup().initSliders(); }
    initCompactInput(inputId, config) { this._ensureSlidersSetup().initCompactInput(inputId, config); }
    initRangeSliders() { this._ensureSlidersSetup().initRangeSliders(); }

    // Random panel — DICE_CONFIG / EFFECT_RANDOM_CONFIG, shuffle, reset.
    // Delegates to RandomPanelController; lazy-init mirrors SlidersSetup pattern.
    _ensureRandomPanel() {
        if (!this.randomPanel) this.randomPanel = new RandomPanelController(this);
        return this.randomPanel;
    }
    resetDiceForParam(param) { this._ensureRandomPanel().resetDiceForParam(param); }
    resetEffectRandomParam(key) { this._ensureRandomPanel().resetEffectRandomParam(key); }
    rollEffectRandomValues() { this._ensureRandomPanel().rollEffectRandomValues(); }
    initDiceButtons() { this._ensureRandomPanel().initDiceButtons(); }
    initEffectDiceButtons() { this._ensureRandomPanel().initEffectDiceButtons(); }
    syncEffectDiceButtons() { this._ensureRandomPanel().syncEffectDiceButtons(); }
    initRandomSection() { this._ensureRandomPanel().initRandomSection(); }
    updateRandomParamsList() { this._ensureRandomPanel().updateRandomParamsList(); }
    initShuffle() { this._ensureRandomPanel().initShuffle(); }
    updateRandomSectionVisibility() { this._ensureRandomPanel().updateRandomSectionVisibility(); }
    initResetAllDice() { this._ensureRandomPanel().initResetAllDice(); }

    // Colour pickers, palette, gradient, B/W — see controllers/ColorController.js.
    _ensureColorController() {
        if (!this.colorController) this.colorController = new ColorController(this);
        return this.colorController;
    }
    updateColorPreview(preview, color) { this._ensureColorController().updateColorPreview(preview, color); }
    highlightActiveSwatch(activeType) { this._ensureColorController().highlightActiveSwatch(activeType); }
    updateColorIndicator(show) { this._ensureColorController().updateColorIndicator(show); }
    dockUnifiedColorPickerForType(colorType) { this._ensureColorController().dockUnifiedColorPickerForType(colorType); }
    applySwatchHexInput(colorType, raw) { return this._ensureColorController().applySwatchHexInput(colorType, raw); }
    updateSwatchDisplay(colorType, color) { this._ensureColorController().updateSwatchDisplay(colorType, color); }
    initColorPickers() { this._ensureColorController().initColorPickers(); }
    getDerivedColorMode() { return this._ensureColorController().getDerivedColorMode(); }
    applyColorMode(mode) { this._ensureColorController().applyColorMode(mode); }
    initColorSourceButtons() { this._ensureColorController().initColorSourceButtons(); }
    initPaletteSwatchDice() { this._ensureColorController().initPaletteSwatchDice(); }
    syncPaletteSwatchDice() { this._ensureColorController().syncPaletteSwatchDice(); }
    updatePaletteSizeGroupState() { this._ensureColorController().updatePaletteSizeGroupState(); }
    updateColorModeUI() { this._ensureColorController().updateColorModeUI(); }
    randomizeColors() { this._ensureColorController().randomizeColors(); }
    generateRandomColor() { return this._ensureColorController().generateRandomColor(); }
    generateRandomGrayscaleColor() { return this._ensureColorController().generateRandomGrayscaleColor(); }
    generateColorPalette() { this._ensureColorController().generateColorPalette(); }
    getModuleGradient(moduleIndex) { return this._ensureColorController().getModuleGradient(moduleIndex); }
    getGradientForModule() { return this._ensureColorController().getGradientForModule(); }
    getModuleColor() { return this._ensureColorController().getModuleColor(); }
    initColorBWToggle() { this._ensureColorController().initColorBWToggle(); }

    // Preset dropdown / save / load / delete — see controllers/PresetsController.js.
    _ensurePresetsController() {
        if (!this.presetsController) this.presetsController = new PresetsController(this);
        return this.presetsController;
    }
    initPresets() { this._ensurePresetsController().initPresets(); }
    normalizeColor(color) { return this._ensurePresetsController().normalizeColor(color); }
    getPresetColors(presetName) { return this._ensurePresetsController().getPresetColors(presetName); }
    updatePresetList() { this._ensurePresetsController().updatePresetList(); }
    loadPreset(name, updateUI = true) { this._ensurePresetsController().loadPreset(name, updateUI); }
    saveCurrentPreset() { return this._ensurePresetsController().saveCurrentPreset(); }
    collectPresetData() { return this._ensurePresetsController().collectPresetData(); }
    generatePresetName() { return this._ensurePresetsController().generatePresetName(); }
    getDisplayName(fullName) { return this._ensurePresetsController().getDisplayName(fullName); }
    updateSaveDeleteButtons() { this._ensurePresetsController().updateSaveDeleteButtons(); }

    /**
     * Инициализация color pickers
     */
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
        }, RESIZE_DEBOUNCE_MS);

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

    /** Wire up settings/text change tracking — see HistoryController. */
    setupChangeTracking() {
        this.historyController.setupChangeTracking();
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
    // History (Undo/Redo) — thin delegates to HistoryController
    // ============================================

    getStateSnapshot() { return this.historyController.getStateSnapshot(); }
    applyStateSnapshot(snapshot) { this.historyController.applyStateSnapshot(snapshot); }
    _scheduleAutoSnapshot(label = '') { this.historyController.scheduleAutoSnapshot(label); }
    _flushAutoSnapshot() { this.historyController.flushAutoSnapshot(); }
    saveInitialHistorySnapshot(label = 'initial') { this.historyController.saveInitialSnapshot(label); }
    undo() { this.historyController.undo(); }
    redo() { this.historyController.redo(); }
    _afterHistoryNav() { this.historyController._afterHistoryNav(); }
    initSliderHistoryHandlers() { this.historyController.initSliderHistoryHandlers(); }

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

}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new VoidTypeface();
});

