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
import { ColorUtils } from './utils/ColorUtils.js';
import { MathUtils } from './utils/MathUtils.js';
import GlyphEditor from './core/GlyphEditor.js';
import MIDIController from './ui/MIDIController.js';

class VoidTypeface {
    constructor() {
        // Settings storage
        this.settings = {
            values: {
                stemMultiplier: 0.5,
                moduleSize: 24,
                letterSpacingMultiplier: 1,
                lineHeightMultiplier: 2,
                strokesNum: 2,
                strokeGapRatio: 1.0,
                mode: 'fill',
                letterColor: '#ffffff',
                bgColor: '#000000',
                gridColor: '#333333',
                text: 'Void\nTypeface\nCode',
                textAlign: 'center',
                showGrid: true,
                randomStemMin: 0.5,
                randomStemMax: 1.0,
                randomStrokesMin: 1,
                randomStrokesMax: 8,
                randomContrastMin: 0.5,
                randomContrastMax: 1.0,
                randomDashLengthMin: 1.0,
                randomDashLengthMax: 1.5,
                randomGapLengthMin: 1.0,
                randomGapLengthMax: 1.5,
                randomModeType: 'byType',
                randomRounded: false,
                randomCloseEnds: true,
                randomDash: false,
                roundedCaps: false,
                closeEnds: false,
                dashLength: 0.10,
                gapLength: 0.30,
                dashChess: false,
                useAlternativesInRandom: true,
                currentMode: 'normal'
            },
            get(key) { return this.values[key]; },
            set(key, value) { 
                this.values[key] = value;
                return value;
            }
        };

        // Color pickers
        this.unifiedColorPicker = null;
        this.activeColorType = 'letter'; // 'letter', 'bg', 'grid'
        
        // Glyph Editor
        this.glyphEditor = null;
        
        // MIDI Controller
        this.midiController = null;

        this.isMobile = this.checkIsMobile();
        
        this.initCanvas();
        this.initExporter();
        this.initPresetManager();
        
        if (this.isMobile) {
            this.initMobileView();
        } else {
            this.initPanels();
            this.initSliders();
            this.initRangeSliders();
            this.initColorPickers();
            this.initTextInput();
            this.initTextAlign();
            this.initModeToggle();
            this.initRoundedCapsToggle();
            this.initCloseEndsToggle();
            this.initDashChessToggle();
            this.initGridToggle();
            // this.initGlyphEditor(); // DISABLED - use editor.html
            // this.initEditorHotkey(); // DISABLED
            this.initAlternativeGlyphs();
            
            this.updateRoundedCapsVisibility();
            this.updateRandomRoundedVisibility();
            this.updateAlternativeGlyphsVisibility();
            
            this.hasUnsavedChanges = false;
            this.currentPresetName = 'Default';
            this.isLoadingPreset = false;
            this.isInitializing = true;
            
            this.setupChangeTracking();
            this.initPresets();
            this.initExport();
            this.initResize();
            this.initMIDI();
            
            if (this.renderer && this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            
            this.updateRenderer();
            
            this.isInitializing = false;
            this.hasUnsavedChanges = false;
            if (this.currentPresetName === 'Default') {
                this.updateSaveDeleteButtons();
            }
        }
    }

    /**
     * Check if device is mobile
     * Returns true if screen width < 768px AND it's a touch device
     * OR if it's a mobile phone (not tablet) by User Agent
     */
    checkIsMobile() {
        const width = window.innerWidth;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const userAgent = navigator.userAgent.toLowerCase();
        
        const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
        
        const isMobilePhone = /mobile|iphone|ipod|android.*mobile|blackberry|windows phone/i.test(userAgent);
        
        return (width < 768 && isTouchDevice && !isTablet) || (isMobilePhone && width < 1024);
    }

    /**
     * Initialize mobile view
     */
    initMobileView() {
        const panels = document.querySelectorAll('.controls-panel');
        panels.forEach(panel => {
            panel.style.display = 'none';
        });
        
        const presetDropdown = document.getElementById('presetDropdown');
        const saveBtn = document.getElementById('savePresetBtn');
        const deleteBtn = document.getElementById('deletePresetBtn');
        if (presetDropdown) presetDropdown.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        
        const exportBtn = document.getElementById('exportBtn');
        const copyBtn = document.getElementById('copyBtn');
        if (exportBtn) exportBtn.style.display = 'none';
        if (copyBtn) copyBtn.style.display = 'none';
        
        const renewBtn = document.getElementById('renewBtn');
        if (renewBtn) {
            renewBtn.style.display = 'inline-flex';
            renewBtn.addEventListener('click', () => {
                this.renderer.clearModuleTypeCache();
                if (this.renderer.clearAlternativeGlyphCache) {
                    this.renderer.clearAlternativeGlyphCache();
                }
                this.calculateMobileModuleSize();
            });
        }
        
        this.settings.set('mode', 'random');
        this.settings.set('text', 'DESK\nTOP\nONLY');
        
        const canvas = document.getElementById('mainCanvas');
        if (canvas) {
            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                
                const rect = canvas.getBoundingClientRect();
                const touch = e.changedTouches[0];
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                const position = this.renderer.getLetterPositionAt(touchX, touchY);
                if (position) {
                    const char = position.char.toUpperCase();
                    const hasAlternatives = VOID_ALPHABET_ALTERNATIVES && VOID_ALPHABET_ALTERNATIVES[char] && VOID_ALPHABET_ALTERNATIVES[char].length > 0;
                    
                    if (hasAlternatives) {
                        const toggled = this.renderer.toggleLetterAlternative(position.lineIndex, position.charIndex);
                        if (toggled) {
                            this.updateRenderer();
                            this.markAsChanged();
                        }
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
     * Вычислить оптимальный размер модуля для мобильного устройства
     * чтобы текст "DESK\nTOP\nONLY" влезал в окно без обрезки
     */
    calculateMobileModuleSize() {
        requestAnimationFrame(() => {
            const canvasContainer = document.getElementById('canvasContainer');
            const canvas = document.getElementById('mainCanvas');
            
            const containerRect = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
            const availableWidth = containerRect ? containerRect.width : window.innerWidth;
            const availableHeight = containerRect ? containerRect.height : window.innerHeight;
            
            const maxLineLength = 4;
            const numLines = 3;
            
            const cols = 5;
            const rows = 5;
            
            const letterSpacingMultiplier = this.settings.get('letterSpacingMultiplier') || 1;
            const lineHeightMultiplier = this.settings.get('lineHeightMultiplier') || 2;
            
            const padding = 0.1;
            const maxWidth = availableWidth * (1 - 2 * padding);
            const maxHeight = availableHeight * (1 - 2 * padding);
            
            const moduleSizeByWidth = maxWidth / (maxLineLength * cols + (maxLineLength - 1) * letterSpacingMultiplier);
            const moduleSizeByHeight = maxHeight / (numLines * rows + (numLines - 1) * lineHeightMultiplier);
            
            const optimalModuleSize = Math.floor(Math.min(moduleSizeByWidth, moduleSizeByHeight));
            const finalModuleSize = Math.max(8, Math.min(128, optimalModuleSize));
            this.settings.set('moduleSize', finalModuleSize);
            
            this.updateRenderer();
        });
    }

    /**
     * Initialize canvas and renderer
     */
    initCanvas() {
        const canvas = document.getElementById('mainCanvas');
        this.renderer = new VoidRenderer(canvas);
        this.renderer.updateParams(this.settings.values);
    }

    /**
     * Initialize exporter
     */
    initExporter() {
        this.exporter = new VoidExporter(this.renderer, this.settings);
    }

    /**
     * Initialize preset manager
     */
    initPresetManager() {
        this.presetManager = new PresetManager();
    }

    /**
     * Initialize control panels
     */
    initPanels() {
        this.panelManager = new PanelManager();
        
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

        this.sliderController.initSlider('moduleSizeSlider', {
            valueId: 'moduleSizeValue',
            setting: 'moduleSize',
            min: 4,
            max: 128,
            decimals: 0,
            baseStep: 1,
            shiftStep: 4,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });

        this.sliderController.initSlider('stemSlider', {
            valueId: 'stemValue',
            setting: 'stemMultiplier',
            min: 0.1,
            max: 3.0,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.1,
            onUpdate: (value) => {
                this.updateRenderer();
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

        this.sliderController.initSlider('strokesSlider', {
            valueId: 'strokesValue',
            setting: 'strokesNum',
            min: 1,
            max: 64,
            decimals: 0,
            baseStep: 1,
            shiftStep: 1,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });

        this.sliderController.initSlider('strokeGapRatioSlider', {
            valueId: 'strokeGapRatioValue',
            setting: 'strokeGapRatio',
            min: 0.1,
            max: 8.0,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 0.5,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });

        this.sliderController.initSlider('dashLengthSlider', {
            valueId: 'dashLengthValue',
            setting: 'dashLength',
            min: 0.01,
            max: 8.0,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.1,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });

        this.sliderController.initSlider('gapLengthSlider', {
            valueId: 'gapLengthValue',
            setting: 'gapLength',
            min: 0.01,
            max: 8.0,
            decimals: 2,
            baseStep: 0.01,
            shiftStep: 0.1,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });
    }

    /**
     * Инициализация компактных number-инпутов (Figma-style)
     */
    initCompactInput(inputId, config) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const { setting, min, max, step } = config;
        
        input.value = this.settings.get(setting);
        const handleChange = () => {
            let value = parseInt(input.value, 10);
            if (isNaN(value)) value = min;
            value = Math.max(min, Math.min(max, value));
            input.value = value;
            this.settings.set(setting, value);
            this.updateRenderer();
            this.markAsChanged();
        };
        
        input.addEventListener('change', handleChange);
        input.addEventListener('input', handleChange);
        
        if (!this.compactInputs) this.compactInputs = {};
        this.compactInputs[inputId] = { input, setting, min, max };
    }

    /**
     * Initialize range sliders (for Random mode)
     */
    initRangeSliders() {
        this.rangeSliderController = new RangeSliderController(this.settings);

        // Stem Weight Range
        this.rangeSliderController.initRangeSlider('randomStemRangeSlider', {
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
                this.updateRenderer();
            }
        });

        // Strokes Range (Lines in Random mode)
        this.rangeSliderController.initRangeSlider('randomStrokesRangeSlider', {
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
                this.updateRenderer();
            }
        });

        // Contrast Range
        this.rangeSliderController.initRangeSlider('randomContrastRangeSlider', {
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
                this.updateRenderer();
            }
        });

        // Dash Length Range
        this.rangeSliderController.initRangeSlider('randomDashLengthRangeSlider', {
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
                this.updateRenderer();
            }
        });

        // Gap Length Range
        this.rangeSliderController.initRangeSlider('randomGapLengthRangeSlider', {
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
                this.updateRenderer();
            }
        });

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
            
            // Determine text color based on background brightness
            const label = preview.querySelector('.color-label-inside');
            if (label) {
                const luminance = ColorUtils.getLuminance(color);
                label.style.color = luminance > 0.5 ? '#000000' : '#ffffff';
                
                if (!label.dataset.originalText) {
                    const text = label.textContent.trim();
                    label.dataset.originalText = text.startsWith('●') ? text.substring(1).trim() : text;
                }
            }
        }
    }

    /**
     * Обновление индикатора активного цвета (символ ●)
     * @param {boolean} show - показывать ли индикатор (true - показать у активного, false - убрать у всех)
     */
    updateColorIndicator(show) {
        const previewMap = {
            'letter': document.getElementById('letterColorPreview'),
            'bg': document.getElementById('bgColorPreview'),
            'grid': document.getElementById('gridColorPreview')
        };
        
        Object.keys(previewMap).forEach(colorType => {
            const preview = previewMap[colorType];
            if (!preview) return;
            
            const label = preview.querySelector('.color-label-inside');
            if (!label) return;
            
            if (!label.dataset.originalText) {
                const text = label.textContent.trim();
                label.dataset.originalText = text.startsWith('●') ? text.substring(1).trim() : text;
            }
            
            const originalText = label.dataset.originalText;
            const isActive = colorType === this.activeColorType;
            
            if (show && isActive) {
                if (!label.textContent.trim().startsWith('●')) {
                    label.textContent = '● ' + originalText;
                }
            } else {
                const currentText = label.textContent.trim();
                if (currentText.startsWith('●')) {
                    label.textContent = originalText;
                }
            }
        });
    }

    initColorPickers() {
        const letterPreview = document.getElementById('letterColorPreview');
        const bgPreview = document.getElementById('bgColorPreview');
        const gridPreview = document.getElementById('gridColorPreview');
        
        const updatePreview = (preview, color) => this.updateColorPreview(preview, color);
        
        updatePreview(letterPreview, this.settings.get('letterColor'));
        updatePreview(bgPreview, this.settings.get('bgColor'));
        updatePreview(gridPreview, this.settings.get('gridColor'));
        
        this.unifiedColorPicker = new ColorPicker({
            containerId: 'unifiedColorPickerContainer',
            initialColor: this.settings.get('letterColor'),
            onChange: (color) => {
                const settingMap = {
                    'letter': 'letterColor',
                    'bg': 'bgColor',
                    'grid': 'gridColor'
                };
                const previewMap = {
                    'letter': letterPreview,
                    'bg': bgPreview,
                    'grid': gridPreview
                };
                
                const setting = settingMap[this.activeColorType];
                const preview = previewMap[this.activeColorType];
                
                if (setting) {
                    this.settings.set(setting, color);
                    this.updateColorPreview(preview, color);
                    this.updateRenderer();
                }
            }
        });
        this.unifiedColorPicker.init();
        
        const switchColor = (colorType, openPicker = true) => {
            const previewMap = {
                'letter': letterPreview,
                'bg': bgPreview,
                'grid': gridPreview
            };
            const activePreview = previewMap[colorType];
            
            const pickerElement = this.unifiedColorPicker.elements?.picker;
            const isCurrentlyActive = this.activeColorType === colorType && 
                pickerElement && pickerElement.style.display !== 'none';
            if (isCurrentlyActive && openPicker) {
                this.unifiedColorPicker.toggle();
                this.updateColorIndicator(false);
                return;
            }
            
            this.updateColorIndicator(false);
            
            this.activeColorType = colorType;
            
            const colorMap = {
                'letter': this.settings.get('letterColor'),
                'bg': this.settings.get('bgColor'),
                'grid': this.settings.get('gridColor')
            };
            this.unifiedColorPicker.setColor(colorMap[colorType]);
            
            if (openPicker) {
                const pickerElement = this.unifiedColorPicker.elements?.picker;
                if (pickerElement && pickerElement.style.display === 'none') {
                    this.unifiedColorPicker.toggle();
                    this.updateColorIndicator(true);
                } else if (pickerElement && pickerElement.style.display !== 'none') {
                    this.updateColorIndicator(true);
                }
            }
        };
        
        if (letterPreview) {
            letterPreview.addEventListener('click', () => switchColor('letter'));
        }
        if (bgPreview) {
            bgPreview.addEventListener('click', () => switchColor('bg'));
        }
        if (gridPreview) {
            gridPreview.addEventListener('click', () => switchColor('grid'));
        }
        
        this.activeColorType = 'letter';
        const colorMap = {
            'letter': this.settings.get('letterColor'),
            'bg': this.settings.get('bgColor'),
            'grid': this.settings.get('gridColor')
        };
        this.unifiedColorPicker.setColor(colorMap['letter']);
        this.updateColorIndicator(false);
    }

    /**
     * Инициализация text input с debounce
     */
    initTextInput() {
        const textarea = document.getElementById('textInput');
        
        const debouncedUpdate = MathUtils.debounce(() => {
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
     * Инициализация контрола выравнивания текста
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
        
        alternativeGlyphsCheckbox.checked = this.settings.get('useAlternativesInRandom') ?? true;
        
        alternativeGlyphsCheckbox.addEventListener('change', () => {
            this.settings.set('useAlternativesInRandom', alternativeGlyphsCheckbox.checked);
            if (!alternativeGlyphsCheckbox.checked && this.renderer.clearAlternativeGlyphCache) {
                this.renderer.clearAlternativeGlyphCache();
            }
            this.updateRenderer();
            this.markAsChanged();
        });
        
        const canvas = document.getElementById('mainCanvas');
        if (canvas && !canvas.hasAttribute('data-alternatives-initialized')) {
            canvas.setAttribute('data-alternatives-initialized', 'true');
            
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
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const position = this.renderer.getLetterPositionAt(mouseX, mouseY);
                
                if (position) {
                    const char = position.char.toUpperCase();
                    const hasAlternatives = VOID_ALPHABET_ALTERNATIVES && VOID_ALPHABET_ALTERNATIVES[char] && VOID_ALPHABET_ALTERNATIVES[char].length > 0;
                    canvas.style.cursor = hasAlternatives ? 'pointer' : 'default';
                    
                    const positionChanged = !this.renderer.hoveredLetter || 
                        this.renderer.hoveredLetter.lineIndex !== position.lineIndex ||
                        this.renderer.hoveredLetter.charIndex !== position.charIndex;
                    
                    if (positionChanged) {
                        this.renderer.setHoveredLetter(position);
                        if (hasAlternatives && !rafPending) {
                            rafPending = true;
                            requestAnimationFrame(updateHover);
                        }
                    }
                } else {
                    canvas.style.cursor = 'default';
                    if (this.renderer.hoveredLetter) {
                        this.renderer.setHoveredLetter(null);
                        if (!rafPending) {
                            rafPending = true;
                            requestAnimationFrame(updateHover);
                        }
                    }
                }
            });
            
            canvas.addEventListener('mouseleave', () => {
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
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                const rect = canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                const position = this.renderer.getLetterPositionAt(clickX, clickY);
                if (position) {
                    const toggled = this.renderer.toggleLetterAlternative(position.lineIndex, position.charIndex);
                    if (toggled) {
                        this.updateRenderer();
                        this.markAsChanged();
                    }
                }
            });
        }
    }

    /**
     * Update alternative glyphs controls visibility
     */
    updateAlternativeGlyphsVisibility() {
        // Alternative glyphs are now merged with randomControlGroup, this function is no longer needed
        // Kept empty for compatibility
        return;
        alternativeGlyphsGroup.style.display = shouldShow ? 'block' : 'none';
    }

    /**
     * Initialize Rounded toggle
     * Round and Close Ends work independently
     */
    initRoundedCapsToggle() {
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (!roundedCapsCheckbox) return;
        
        roundedCapsCheckbox.checked = this.settings.get('roundedCaps') || false;
        
 — просто меняем Rounded Caps, не трогая Close Ends
        roundedCapsCheckbox.addEventListener('change', () => {
                this.settings.set('roundedCaps', roundedCapsCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Initialize Close Ends toggle
     * Round and Close Ends work independently
     */
    initCloseEndsToggle() {
        const closeEndsCheckbox = document.getElementById('closeEndsCheckbox');
        if (!closeEndsCheckbox) return;
        
        closeEndsCheckbox.checked = this.settings.get('closeEnds') || false;
        
 — просто меняем Close Ends, не трогая Round
        closeEndsCheckbox.addEventListener('change', () => {
            this.settings.set('closeEnds', closeEndsCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Initialize Dash Chess toggle
     */
    initDashChessToggle() {
        const dashChessCheckboxPD = document.getElementById('dashChessCheckboxPD');
        const dashChessCheckboxRandom = document.getElementById('dashChessCheckboxRandom');
        
        if (!dashChessCheckboxPD || !dashChessCheckboxRandom) {
            console.warn('[Main] dashChessCheckbox not found');
            return;
        }
        
        const syncCheckboxes = (sourceCheckbox, targetCheckbox) => {
            targetCheckbox.checked = sourceCheckbox.checked;
        };
        
        const updateDashChess = (checked) => {
            this.settings.set('dashChess', checked);
            this.updateRenderer();
            this.markAsChanged();
        };
        
        const initialValue = this.settings.get('dashChess') || false;
        dashChessCheckboxPD.checked = initialValue;
        dashChessCheckboxRandom.checked = initialValue;
        
 для PD checkbox
        dashChessCheckboxPD.addEventListener('change', (e) => {
            syncCheckboxes(e.target, dashChessCheckboxRandom);
            updateDashChess(e.target.checked);
        });
        
 для Random checkbox
        dashChessCheckboxRandom.addEventListener('change', (e) => {
            syncCheckboxes(e.target, dashChessCheckboxPD);
            updateDashChess(e.target.checked);
        });
    }

    /**
     * Update Rounded visibility (for Solid, Stripes and Dash styles)
     */
    updateRoundedCapsVisibility() {
        const roundedCapsGroup = document.getElementById('roundedCapsControlGroup');
        if (!roundedCapsGroup) return;
        
        const mode = this.settings.get('mode') || 'fill';
        
        const shouldShow = mode === 'fill' || mode === 'stripes' || mode === 'dash' || mode === 'sd' || mode === 'random';
        roundedCapsGroup.style.display = shouldShow ? 'flex' : 'none';
        
        const roundedCapsLabel = document.getElementById('roundedCapsLabel');
        if (roundedCapsLabel) {
            if (mode === 'random') {
                roundedCapsLabel.classList.add('hidden');
            } else {
                roundedCapsLabel.classList.remove('hidden');
            }
        }
        
        const closeEndsLabel = document.getElementById('closeEndsLabel');
        if (closeEndsLabel) {
            if (mode === 'stripes' || mode === 'sd') {
                closeEndsLabel.classList.remove('hidden');
            } else {
                closeEndsLabel.classList.add('hidden');
            }
        }
        
        const dashChessLabel = document.getElementById('dashChessLabel');
        if (dashChessLabel) {
            if (mode === 'sd') {
                dashChessLabel.classList.remove('hidden');
            } else {
                dashChessLabel.classList.add('hidden');
            }
        }
        
        const dashChessLabelRandom = document.getElementById('dashChessLabelRandom');
        if (dashChessLabelRandom) {
            if (mode === 'random') {
                dashChessLabelRandom.classList.remove('hidden');
            } else {
                dashChessLabelRandom.classList.add('hidden');
            }
        }
    }

    /**
     * Обновить видимость Rounded в режиме Random
     */
    updateRandomRoundedVisibility() {
        const randomRoundedLabel = document.getElementById('randomRoundedLabel');
        if (!randomRoundedLabel) return;
        
        const mode = this.settings.get('mode') || 'fill';
        
        if (mode === 'random') {
            randomRoundedLabel.classList.remove('hidden');
        } else {
            randomRoundedLabel.classList.add('hidden');
        }
    }

    /**
     * Применить дефолтные значения для режима SD
     * Lines: 3, Contrast: 0.5, Dash Length: 1, Gap Length: 1.5, Round: включен, Close Ends: выключен
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
        
        this.settings.set('roundedCaps', true);
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (roundedCapsCheckbox) roundedCapsCheckbox.checked = true;
        
        this.settings.set('closeEnds', false);
        const closeEndsCheckbox = document.getElementById('closeEndsCheckbox');
        if (closeEndsCheckbox) closeEndsCheckbox.checked = false;
    }

    /**
     * Инициализация переключателя режима отрисовки
     */
    initModeToggle() {
        const fillButton = document.getElementById('modeFill');
        const stripesButton = document.getElementById('modeStripes');
        const dashButton = document.getElementById('modeDash');
        const sdButton = document.getElementById('modeSD');
        const randomButton = document.getElementById('modeRandom');
        const strokesControlGroup = document.getElementById('strokesControlGroup');
        const strokeGapRatioControlGroup = document.getElementById('strokeGapRatioControlGroup');
        const dashLengthControlGroup = document.getElementById('dashLengthControlGroup');
        const gapLengthControlGroup = document.getElementById('gapLengthControlGroup');
        const closeEndsControlGroup = document.getElementById('closeEndsControlGroup');

        const setActiveButton = (activeButton) => {
            [fillButton, stripesButton, dashButton, sdButton, randomButton].forEach(btn => {
                if (btn) btn.classList.remove('active');
            });
            if (activeButton) activeButton.classList.add('active');
        };

        const updateMode = () => {
            let mode = 'fill';
            if (fillButton && fillButton.classList.contains('active')) mode = 'fill';
            else if (stripesButton && stripesButton.classList.contains('active')) mode = 'stripes';
            else if (dashButton && dashButton.classList.contains('active')) mode = 'dash';
            else if (sdButton && sdButton.classList.contains('active')) mode = 'sd';
            else if (randomButton && randomButton.classList.contains('active')) mode = 'random';
            
            this.settings.set('mode', mode);
            
            if (this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            if (this.renderer.clearAlternativeGlyphCache) {
                this.renderer.clearAlternativeGlyphCache();
            }
            const showStripes = mode === 'stripes' || mode === 'sd';
            const showDash = mode === 'dash' || mode === 'sd';
            
            strokesControlGroup.style.display = showStripes ? 'block' : 'none';
            strokeGapRatioControlGroup.style.display = showStripes ? 'block' : 'none';
            dashLengthControlGroup.style.display = showDash ? 'block' : 'none';
            gapLengthControlGroup.style.display = showDash ? 'block' : 'none';
            
            this.updateRoundedCapsVisibility();
            
            const randomGroups = [
                document.getElementById('randomControlGroup'),
                document.getElementById('randomControlGroup4'),
                document.getElementById('randomControlGroupStem'),
                document.getElementById('randomControlGroup2'),
                document.getElementById('randomControlGroup3'),
                document.getElementById('randomControlGroupDashLength'),
                document.getElementById('randomControlGroupGapLength'),
                document.getElementById('randomControlGroup5')
            ];
            randomGroups.forEach(group => {
                if (group) {
                    const isToggleRow = group.id === 'randomControlGroup' || group.id === 'randomControlGroup4';
                    const displayValue = isToggleRow ? 'flex' : 'block';
                    group.style.display = mode === 'random' ? displayValue : 'none';
                }
            });
            
            const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
            if (randomFullRandomCheckbox && mode === 'random') {
                randomFullRandomCheckbox.checked = this.settings.get('randomModeType') === 'full';
            }
            
            const randomRoundedCheckbox = document.getElementById('randomRoundedCheckbox');
            if (randomRoundedCheckbox && mode === 'random') {
                randomRoundedCheckbox.checked = this.settings.get('randomRounded') ?? false;
            }

            const randomCloseEndsCheckbox = document.getElementById('randomCloseEndsCheckbox');
            if (randomCloseEndsCheckbox && mode === 'random') {
                randomCloseEndsCheckbox.checked = this.settings.get('randomCloseEnds') ?? true;
            }

            const randomDashCheckbox = document.getElementById('randomDashCheckbox');
            if (randomDashCheckbox && mode === 'random') {
                randomDashCheckbox.checked = this.settings.get('randomDash') ?? false;
            }

            this.updateRandomDashSlidersState();
            const stemSlider = document.getElementById('stemSlider');
            const stemValue = document.getElementById('stemValue');
            if (stemSlider && stemValue) {
                const isDisabled = mode === 'random';
                stemSlider.disabled = isDisabled;
                stemValue.disabled = isDisabled;
            }
            
            this.updateRoundedCapsVisibility();
            this.updateRandomRoundedVisibility();
            this.updateAlternativeGlyphsVisibility();
            
            this.updateRenderer();
        };

        fillButton.addEventListener('click', () => {
            setActiveButton(fillButton);
            updateMode();
            this.markAsChanged();
        });
        stripesButton.addEventListener('click', () => {
            setActiveButton(stripesButton);
            updateMode();
            this.markAsChanged();
        });
        dashButton.addEventListener('click', () => {
            setActiveButton(dashButton);
            updateMode();
            this.markAsChanged();
        });
        if (sdButton) {
            sdButton.addEventListener('click', () => {
                setActiveButton(sdButton);
                this.applySDDefaults();
                updateMode();
                this.markAsChanged();
            });
        }
        randomButton.addEventListener('click', () => {
            setActiveButton(randomButton);
            updateMode();
            this.markAsChanged();
        });

        const renewBtn = document.getElementById('renewRandomBtn');
        if (renewBtn) {
            renewBtn.addEventListener('click', () => {
                if (this.settings.get('mode') === 'random') {
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    if (this.renderer.clearAlternativeGlyphCache) {
                        this.renderer.clearAlternativeGlyphCache();
                    }
                    this.updateRenderer();
                    this.markAsChanged();
                }
            });
        }

        const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
        if (randomFullRandomCheckbox) {
            randomFullRandomCheckbox.addEventListener('change', () => {
                const isFullRandom = randomFullRandomCheckbox.checked;
                this.settings.set('randomModeType', isFullRandom ? 'full' : 'byType');
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateRenderer();
                this.markAsChanged();
            });
        }

        const randomRoundedCheckbox = document.getElementById('randomRoundedCheckbox');
        if (randomRoundedCheckbox) {
            randomRoundedCheckbox.addEventListener('change', () => {
                this.settings.set('randomRounded', randomRoundedCheckbox.checked);
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateRenderer();
                this.markAsChanged();
            });
        }

        const randomCloseEndsCheckbox = document.getElementById('randomCloseEndsCheckbox');
        if (randomCloseEndsCheckbox) {
            randomCloseEndsCheckbox.addEventListener('change', () => {
                this.settings.set('randomCloseEnds', randomCloseEndsCheckbox.checked);
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateRenderer();
                this.markAsChanged();
            });
        }

        const randomDashCheckbox = document.getElementById('randomDashCheckbox');
        if (randomDashCheckbox) {
            randomDashCheckbox.addEventListener('change', () => {
                this.settings.set('randomDash', randomDashCheckbox.checked);
                this.updateRandomDashSlidersState();
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateRenderer();
                this.markAsChanged();
            });
        }
    }

    /**
     * Update Dash Length and Gap Length sliders state in Random mode
     */
    updateRandomDashSlidersState() {
        const randomDashEnabled = this.settings.get('randomDash') ?? false;
        const mode = this.settings.get('mode');
        const isDisabled = mode !== 'random' || !randomDashEnabled;

        const dashLengthMinInput = document.getElementById('randomDashLengthMinValue');
        const dashLengthMaxInput = document.getElementById('randomDashLengthMaxValue');
        const gapLengthMinInput = document.getElementById('randomGapLengthMinValue');
        const gapLengthMaxInput = document.getElementById('randomGapLengthMaxValue');

        if (dashLengthMinInput) dashLengthMinInput.disabled = isDisabled;
        if (dashLengthMaxInput) dashLengthMaxInput.disabled = isDisabled;
        if (gapLengthMinInput) gapLengthMinInput.disabled = isDisabled;
        if (gapLengthMaxInput) gapLengthMaxInput.disabled = isDisabled;

        const dashLengthGroup = document.getElementById('randomControlGroupDashLength');
        const gapLengthGroup = document.getElementById('randomControlGroupGapLength');
        
        if (dashLengthGroup) {
            dashLengthGroup.style.opacity = isDisabled ? '0.5' : '1';
            dashLengthGroup.style.pointerEvents = isDisabled ? 'none' : 'auto';
            
            const dashLabel = dashLengthGroup.querySelector('label span:first-child');
            if (dashLabel) dashLabel.style.opacity = isDisabled ? '0.5' : '1';
            
            const dashLengthSlider = document.getElementById('randomDashLengthRangeSlider');
            if (dashLengthSlider) {
                const thumbs = dashLengthSlider.querySelectorAll('.range-slider-thumb');
                const track = dashLengthSlider.querySelector('.range-slider-track');
                const activeRange = dashLengthSlider.querySelector('.range-slider-active');
                
                thumbs.forEach(thumb => {
                    thumb.style.pointerEvents = isDisabled ? 'none' : 'auto';
                    thumb.style.opacity = isDisabled ? '0.5' : '1';
                });
                
                if (track) track.style.opacity = isDisabled ? '0.5' : '1';
                if (activeRange) activeRange.style.opacity = isDisabled ? '0.5' : '1';
            }
        }
        
        if (gapLengthGroup) {
            gapLengthGroup.style.opacity = isDisabled ? '0.5' : '1';
            gapLengthGroup.style.pointerEvents = isDisabled ? 'none' : 'auto';
            
            const gapLabel = gapLengthGroup.querySelector('label span:first-child');
            if (gapLabel) gapLabel.style.opacity = isDisabled ? '0.5' : '1';
            
            const gapLengthSlider = document.getElementById('randomGapLengthRangeSlider');
            if (gapLengthSlider) {
                const thumbs = gapLengthSlider.querySelectorAll('.range-slider-thumb');
                const track = gapLengthSlider.querySelector('.range-slider-track');
                const activeRange = gapLengthSlider.querySelector('.range-slider-active');
                
                thumbs.forEach(thumb => {
                    thumb.style.pointerEvents = isDisabled ? 'none' : 'auto';
                    thumb.style.opacity = isDisabled ? '0.5' : '1';
                });
                
                if (track) track.style.opacity = isDisabled ? '0.5' : '1';
                if (activeRange) activeRange.style.opacity = isDisabled ? '0.5' : '1';
            }
        }
    }

    /**
     * Инициализация переключателя сетки
     */
    initGridToggle() {
        const gridCheckbox = document.getElementById('showGridCheckbox');
        const endpointsCheckbox = document.getElementById('showEndpointsCheckbox');
        const testCheckbox = document.getElementById('showTestCheckbox');
        
        gridCheckbox.addEventListener('change', () => {
            this.settings.set('showGrid', gridCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
        
        endpointsCheckbox.addEventListener('change', () => {
            console.log('[Main] Show Endpoints toggled:', endpointsCheckbox.checked);
            this.settings.set('showEndpoints', endpointsCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
        
        testCheckbox.addEventListener('change', () => {
            this.settings.set('showTestCircles', testCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Инициализация preset'ов
     */
    initPresets() {
        const presetDropdown = document.getElementById('presetDropdown');
        const presetDropdownToggle = document.getElementById('presetDropdownToggle');
        const presetDropdownMenu = document.getElementById('presetDropdownMenu');
        const presetDropdownText = presetDropdownToggle.querySelector('.preset-dropdown-text');
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');

        const defaultPreset = this.presetManager.loadPreset('Default');
        if (!defaultPreset) {
            this.presetManager.savePreset('Default', this.settings.values);
        } else {
            if (defaultPreset.text === 'Void\nTypeface\ncoded') {
                defaultPreset.text = 'Void\nTypeface\nCode';
                this.presetManager.presets['Default'] = defaultPreset;
                this.presetManager.savePresets();
            }
            const needsUpdate = 
                defaultPreset.randomStemMin !== 0.5 ||
                defaultPreset.randomStemMax !== 1.0 ||
                defaultPreset.randomStrokesMin !== 1 ||
                defaultPreset.randomStrokesMax !== 8 ||
                defaultPreset.randomContrastMin !== 0.5 ||
                defaultPreset.randomContrastMax !== 1.0 ||
                defaultPreset.randomDashLengthMin !== 1.0 ||
                defaultPreset.randomDashLengthMax !== 1.5 ||
                defaultPreset.randomGapLengthMin !== 1.0 ||
                defaultPreset.randomGapLengthMax !== 1.5 ||
                defaultPreset.randomRounded !== false ||
                defaultPreset.randomCloseEnds !== true ||
                defaultPreset.randomDash !== false ||
                defaultPreset.useAlternativesInRandom !== true;
            
            if (needsUpdate) {
                defaultPreset.randomStemMin = 0.5;
                defaultPreset.randomStemMax = 1.0;
                defaultPreset.randomStrokesMin = 1;
                defaultPreset.randomStrokesMax = 8;
                defaultPreset.randomContrastMin = 0.5;
                defaultPreset.randomContrastMax = 1.0;
                defaultPreset.randomDashLengthMin = 1.0;
                defaultPreset.randomDashLengthMax = 1.5;
                defaultPreset.randomGapLengthMin = 1.0;
                defaultPreset.randomGapLengthMax = 1.5;
                defaultPreset.randomRounded = false;
                defaultPreset.randomCloseEnds = true;
                defaultPreset.randomDash = false;
                defaultPreset.useAlternativesInRandom = true;
                this.presetManager.presets['Default'] = defaultPreset;
                this.presetManager.savePresets();
            }
        }

        this.updatePresetList();
        this.loadPreset('Default', false);
        presetDropdownText.textContent = 'Default';

        presetDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = presetDropdownToggle.getAttribute('aria-expanded') === 'true';
            presetDropdownToggle.setAttribute('aria-expanded', !isExpanded);
            presetDropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!presetDropdown.contains(e.target)) {
                presetDropdownToggle.setAttribute('aria-expanded', 'false');
                presetDropdownMenu.classList.remove('active');
            }
        });

        presetDropdownMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.preset-dropdown-item');
            if (item) {
                const presetName = item.dataset.value;
                
                if (presetName === '__delete_all__') {
                    if (confirm('Delete all saved presets?')) {
                        const names = this.presetManager.getPresetNames();
                        names.forEach(name => {
                            if (name !== 'Default') {
                                this.presetManager.deletePreset(name);
                            }
                        });
                        this.presetManager.presets = this.presetManager.loadPresets();
                        this.loadPreset('Default');
                        presetDropdownText.textContent = 'Default';
                        this.currentPresetName = 'Default';
                        this.hasUnsavedChanges = false;
                        this.updatePresetList();
                        this.updateSaveDeleteButtons();
                        const defaultItem = Array.from(presetDropdownMenu.children).find(item => item.dataset.value === 'Default');
                        if (defaultItem) {
                            presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                            defaultItem.classList.add('selected');
                        }
                        presetDropdownToggle.setAttribute('aria-expanded', 'false');
                        presetDropdownMenu.classList.remove('active');
                    }
                    return;
                }
                
                if (presetName && presetName !== this.currentPresetName) {
                    if (this.hasUnsavedChanges && this.currentPresetName !== 'Default') {
                        const shouldSave = confirm('You have unsaved changes. Save current preset before switching?');
                        if (shouldSave) {
                            this.presetManager.savePreset(this.currentPresetName, this.settings.values);
                            this.updatePresetList();
                        }
                    }
                    this.loadPreset(presetName);
                    const displayName = presetName === 'Default' ? 'Default' : this.getDisplayName(presetName);
                    presetDropdownText.textContent = displayName;
                    presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                    item.classList.add('selected');
                    this.currentPresetName = presetName;
                    this.hasUnsavedChanges = false;
                    this.updateSaveDeleteButtons();
                    presetDropdownToggle.setAttribute('aria-expanded', 'false');
                    presetDropdownMenu.classList.remove('active');
                }
            }
        });

        savePresetBtn.addEventListener('click', () => {
            this.saveCurrentPreset();
        });

        deletePresetBtn.addEventListener('click', () => {
            if (this.currentPresetName === 'Default') {
                alert('Cannot delete "Default" preset');
                return;
            }
            
            if (confirm(`Delete preset "${this.currentPresetName}"?`)) {
                if (this.presetManager.deletePreset(this.currentPresetName)) {
                    this.presetManager.presets = this.presetManager.loadPresets();
                    this.loadPreset('Default');
                    presetDropdownText.textContent = 'Default';
                    this.currentPresetName = 'Default';
                    this.hasUnsavedChanges = false;
                    this.updatePresetList();
                    this.updateSaveDeleteButtons();
                    const defaultItem = Array.from(presetDropdownMenu.children).find(item => item.dataset.value === 'Default');
                    if (defaultItem) {
                        presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                        defaultItem.classList.add('selected');
                    }
                } else {
                    alert('Error deleting preset');
                }
            }
        });
        
        if (this.currentPresetName === 'Default') {
            this.hasUnsavedChanges = false;
        }
        this.updateSaveDeleteButtons();
    }

    /**
     * Update preset list in dropdown
     */
    updatePresetList() {
        const presetDropdownMenu = document.getElementById('presetDropdownMenu');
        const names = this.presetManager.getPresetNames();
        const hasCustomPresets = names.length > 1;
        
        presetDropdownMenu.innerHTML = '';
        names.forEach(name => {
            const item = document.createElement('li');
            item.className = 'preset-dropdown-item';
            item.dataset.value = name;
            const displayName = name === 'Default' ? 'Default' : this.getDisplayName(name);
            item.textContent = displayName;
            item.setAttribute('role', 'option');
            if (name === this.currentPresetName) {
                item.classList.add('selected');
            }
            presetDropdownMenu.appendChild(item);
        });
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

        this.isLoadingPreset = true;
        this.currentPresetName = name;

        Object.keys(preset).forEach(key => {
            if (key !== 'createdAt' && this.settings.values.hasOwnProperty(key)) {
                this.settings.set(key, preset[key]);
            }
        });
        
        this.hasUnsavedChanges = false;
        this.isLoadingPreset = false;
        
        if (updateUI) {
            if (this.renderer && this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            this.updateUIFromSettings();
            this.updateRenderer();
        }
        this.updateSaveDeleteButtons();
    }

    /**
     * Update UI elements from settings
     */
    updateUIFromSettings() {
        this.sliderController.setValue('stemSlider', this.settings.get('stemMultiplier'), false);
        this.sliderController.setValue('moduleSizeSlider', this.settings.get('moduleSize'), false);
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
        }

        const mode = this.settings.get('mode');
        const fillBtn = document.getElementById('modeFill');
        const stripesBtn = document.getElementById('modeStripes');
        const dashBtn = document.getElementById('modeDash');
        const sdBtn = document.getElementById('modeSD');
        const randomBtn = document.getElementById('modeRandom');
        
        [fillBtn, stripesBtn, dashBtn, sdBtn, randomBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        if (mode === 'fill' && fillBtn) fillBtn.classList.add('active');
        else if (mode === 'stripes' && stripesBtn) stripesBtn.classList.add('active');
        else if (mode === 'dash' && dashBtn) dashBtn.classList.add('active');
        else if (mode === 'sd' && sdBtn) sdBtn.classList.add('active');
        else if (mode === 'random' && randomBtn) randomBtn.classList.add('active');
        else if (fillBtn) fillBtn.classList.add('active');
        
        const showStripes = mode === 'stripes' || mode === 'sd';
        const showDash = mode === 'dash' || mode === 'sd';
        
        document.getElementById('strokesControlGroup').style.display = showStripes ? 'block' : 'none';
        document.getElementById('strokeGapRatioControlGroup').style.display = showStripes ? 'block' : 'none';
        const roundedCapsControlGroup = document.getElementById('roundedCapsControlGroup');
        if (roundedCapsControlGroup) {
            roundedCapsControlGroup.style.display = (mode === 'fill' || mode === 'stripes' || mode === 'dash' || mode === 'sd') ? 'flex' : 'none';
        }
        document.getElementById('dashLengthControlGroup').style.display = showDash ? 'block' : 'none';
        document.getElementById('gapLengthControlGroup').style.display = showDash ? 'block' : 'none';
        
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (roundedCapsCheckbox) {
            roundedCapsCheckbox.checked = this.settings.get('roundedCaps') || false;
        }
        this.updateRoundedCapsVisibility();
        this.updateDashVisibility();
        
        const randomGroups = [
            document.getElementById('randomControlGroup'),
            document.getElementById('randomControlGroup4'),
            document.getElementById('randomControlGroupStem'),
            document.getElementById('randomControlGroup2'),
            document.getElementById('randomControlGroup3'),
            document.getElementById('randomControlGroupDashLength'),
            document.getElementById('randomControlGroupGapLength'),
            document.getElementById('randomControlGroup5')
        ];
        randomGroups.forEach(group => {
            if (group) {
                const isToggleRow = group.id === 'randomControlGroup' || group.id === 'randomControlGroup4';
                const displayValue = isToggleRow ? 'flex' : 'block';
                group.style.display = mode === 'random' ? displayValue : 'none';
            }
        });

        this.updateRandomRoundedVisibility();
        const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
        if (randomFullRandomCheckbox) {
            randomFullRandomCheckbox.checked = this.settings.get('randomModeType') === 'full';
        }
        
        const randomRoundedCheckbox = document.getElementById('randomRoundedCheckbox');
        if (randomRoundedCheckbox) {
            randomRoundedCheckbox.checked = this.settings.get('randomRounded') ?? false;
        }

        const randomCloseEndsCheckbox = document.getElementById('randomCloseEndsCheckbox');
        if (randomCloseEndsCheckbox) {
            randomCloseEndsCheckbox.checked = this.settings.get('randomCloseEnds') ?? true;
        }

        const randomDashCheckbox = document.getElementById('randomDashCheckbox');
        if (randomDashCheckbox) {
            randomDashCheckbox.checked = this.settings.get('randomDash') ?? false;
        }

        this.updateRandomDashSlidersState();
        const stemSlider = document.getElementById('stemSlider');
        const stemValue = document.getElementById('stemValue');
        if (stemSlider && stemValue) {
            const isDisabled = mode === 'random';
            stemSlider.disabled = isDisabled;
            stemValue.disabled = isDisabled;
        }

        const letterColor = this.settings.get('letterColor');
        const bgColor = this.settings.get('bgColor');
        const gridColor = this.settings.get('gridColor');
        
        const letterPreview = document.getElementById('letterColorPreview');
        const bgPreview = document.getElementById('bgColorPreview');
        const gridPreview = document.getElementById('gridColorPreview');
        
        this.updateColorPreview(letterPreview, letterColor);
        this.updateColorPreview(bgPreview, bgColor);
        this.updateColorPreview(gridPreview, gridColor);
        if (this.unifiedColorPicker) {
            const colorMap = {
                'letter': letterColor,
                'bg': bgColor,
                'grid': gridColor
            };
            this.unifiedColorPicker.setColor(colorMap[this.activeColorType]);
        }

        const text = this.settings.get('text');
        document.getElementById('textInput').value = text;
        this.renderer.setText(text);

        const textAlign = this.settings.get('textAlign') || 'center';
        document.getElementById('textAlignLeft').checked = textAlign === 'left';
        document.getElementById('textAlignCenter').checked = textAlign === 'center';
        document.getElementById('textAlignRight').checked = textAlign === 'right';

        document.getElementById('showGridCheckbox').checked = this.settings.get('showGrid');
        const dashChessCheckboxPD = document.getElementById('dashChessCheckboxPD');
        const dashChessCheckboxRandom = document.getElementById('dashChessCheckboxRandom');
        const dashChessValue = this.settings.get('dashChess') || false;
        if (dashChessCheckboxPD) {
            dashChessCheckboxPD.checked = dashChessValue;
        }
        if (dashChessCheckboxRandom) {
            dashChessCheckboxRandom.checked = dashChessValue;
        }
        document.getElementById('showEndpointsCheckbox').checked = this.settings.get('showEndpoints') || false;
        document.getElementById('showTestCheckbox').checked = this.settings.get('showTestCircles') || false;
    }

    /**
     * Initialize export
     */
    initExport() {
        const exportBtn = document.getElementById('exportBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        exportBtn.addEventListener('click', () => {
            this.exportSVG();
        });

        copyBtn.addEventListener('click', () => {
            this.copySVG();
        });

        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                e.preventDefault();
                this.exportSVG();
            }
            
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable
                );
                
                if (!isInputFocused) {
                    e.preventDefault();
                    this.copySVG();
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
     */
    updateRenderer() {
        const currentMode = this.settings.get('currentMode') || 'normal';
        if (currentMode === 'editor') return;
        
        const moduleSize = this.settings.get('moduleSize');
        const stem = moduleSize * this.settings.get('stemMultiplier') * 2;
        const letterSpacing = moduleSize * this.settings.get('letterSpacingMultiplier');
        const lineHeight = moduleSize * this.settings.get('lineHeightMultiplier');
        
        const mode = this.settings.get('mode');
        
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
            includeGridToExport: this.settings.get('showGrid'),
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
            randomRounded: this.settings.get('randomRounded') || false,
            randomCloseEnds: this.settings.get('randomCloseEnds') !== undefined ? this.settings.get('randomCloseEnds') : true,
            randomDash: this.settings.get('randomDash') !== undefined ? this.settings.get('randomDash') : false,
            roundedCaps: this.settings.get('roundedCaps') || false,
            closeEnds: this.settings.get('closeEnds') || false,
            dashLength: this.settings.get('dashLength') || 0.10,
            gapLength: this.settings.get('gapLength') || 0.30,
            dashChess: this.settings.get('dashChess') || false,
            useAlternativesInRandom: this.settings.get('useAlternativesInRandom') || false,
            showEndpoints: this.settings.get('showEndpoints') || false,
            showTestCircles: this.settings.get('showTestCircles') || false
        };
        

        this.renderer.updateParams(params);
        
        this.renderer.setText(this.settings.get('text'));
        
        this.renderer.render();
    }

    /**
     * Export to SVG
     */
    exportSVG() {
        this.exporter.exportToSVG();
    }

    /**
     * Copy SVG to clipboard
     */
    async copySVG() {
        await this.exporter.copySVG();
    }

    /**
     * Save current preset
     * If current preset is Default, create new with auto-generated name
     * If current preset is custom, overwrite it
     */
    saveCurrentPreset() {
        let name;
        const isDefaultPreset = this.currentPresetName === 'Default';
        
        if (isDefaultPreset) {
            name = this.generatePresetName();
        } else {
            name = this.currentPresetName;
        }
        
        const result = this.presetManager.savePreset(name, this.settings.values);
        if (result.success) {
            this.updatePresetList();
            const presetDropdownText = document.querySelector('.preset-dropdown-text');
            const presetDropdownMenu = document.getElementById('presetDropdownMenu');
            const displayName = name === 'Default' ? 'Default' : this.getDisplayName(name);
            presetDropdownText.textContent = displayName;
            this.currentPresetName = name;
            this.hasUnsavedChanges = false;
            this.updateSaveDeleteButtons();
            const newItem = Array.from(presetDropdownMenu.children).find(item => item.dataset.value === name);
            if (newItem) {
                presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                newItem.classList.add('selected');
            }
        } else {
            alert(result.error || 'Error saving preset');
        }
    }

    /**
     * Generate preset name: full text + mode
     * If name already exists, adds sequential number
     */
    generatePresetName() {
        const text = this.settings.get('text') || '';
        const mode = this.settings.get('mode') || 'fill';
        
        const fullText = text.replace(/\s+/g, ' ').trim();
        const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
        
        let baseName = `${fullText} ${modeName}`;
        const existingNames = this.presetManager.getPresetNames();
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
        const parts = fullName.split(' ');
        if (parts.length < 2) {
            return fullName.length > 24 ? fullName.substring(0, 21) + '...' : fullName;
        }
        
        const mode = parts[parts.length - 1];
        const textPart = parts.slice(0, -1).join(' ');
        
        const withoutEllipsis = `${textPart} ${mode}`;
        if (withoutEllipsis.length <= 24) {
            return withoutEllipsis;
        }
        
        const maxTextLength = 24 - 3 - 1 - mode.length;
        
        if (maxTextLength <= 0) {
            return mode.length > 24 ? mode.substring(0, 21) + '...' : mode;
        }
        
        const truncatedText = textPart.substring(0, maxTextLength) + '...';
        const result = `${truncatedText} ${mode}`;
        
        if (result.length > 24) {
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
        const originalSet = this.settings.set.bind(this.settings);
        const self = this;
        this.settings.set = function(key, value) {
            const oldValue = self.settings.values[key];
            const result = originalSet(key, value);
            if (!self.isLoadingPreset && !self.isInitializing && self.currentPresetName && oldValue !== value) {
                self.markAsChanged();
            }
            return result;
        };
        const originalSetText = this.renderer.setText.bind(this.renderer);
        this.renderer.setText = (text) => {
            originalSetText(text);
            if (!this.isLoadingPreset && !this.isInitializing && this.currentPresetName) {
                this.markAsChanged();
            }
        };
    }

    /**
     * Mark as changed
     */
    markAsChanged() {
        const currentMode = this.settings.get('currentMode') || 'normal';
        if (currentMode === 'editor') return;
        
        if (!this.isLoadingPreset && !this.isInitializing) {
            this.hasUnsavedChanges = true;
            this.updateSaveDeleteButtons();
        }
    }

    /**
     * Update Save and Delete buttons visibility
     */
    updateSaveDeleteButtons() {
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
        const isDefaultPreset = this.currentPresetName === 'Default';
        const isDefaultWithoutChanges = isDefaultPreset && !this.hasUnsavedChanges;
        
        if (isDefaultWithoutChanges) {
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            return;
        }
        
        if (savePresetBtn) {
            savePresetBtn.style.display = this.hasUnsavedChanges ? 'inline-flex' : 'none';
        }
        if (deletePresetBtn) {
            deletePresetBtn.style.display = !isDefaultPreset ? 'inline-flex' : 'none';
        }
    }
    
    /**
     * Initialize editor hotkey (Cmd+G)
     */
    initEditorHotkey() {
        document.addEventListener('keydown', (e) => {
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
            if (controlsPanel) controlsPanel.style.display = 'none';
            if (variabilityPanel) variabilityPanel.style.display = 'none';
            if (viewColorsPanel) viewColorsPanel.style.display = 'none';
            
            if (presetDropdown) presetDropdown.style.display = 'none';
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            if (copyBtn) copyBtn.style.display = 'none';
            if (exportBtn) exportBtn.style.display = 'none';
            if (aboutVoidLink) aboutVoidLink.style.display = 'none';
            
            if (editorPanel) editorPanel.style.display = 'block';
            if (editorHint) editorHint.style.display = 'block';
            
            if (this.glyphEditor) {
                this.glyphEditor.activate();
            }
        } else {
            const editorHint = document.getElementById('editorHint');
            if (editorHint) editorHint.style.display = 'none';
            
            if (controlsPanel) controlsPanel.style.display = 'block';
            if (variabilityPanel) variabilityPanel.style.display = 'block';
            if (viewColorsPanel) viewColorsPanel.style.display = 'block';
            
            if (presetDropdown) presetDropdown.style.display = 'flex';
            if (copyBtn) copyBtn.style.display = 'inline-flex';
            if (exportBtn) exportBtn.style.display = 'inline-flex';
            if (aboutVoidLink) aboutVoidLink.style.display = 'inline-flex';
            this.updateSaveDeleteButtons();
            
            if (editorPanel) editorPanel.style.display = 'none';
            
            if (this.glyphEditor) {
                this.glyphEditor.deactivate();
            }
            
            requestAnimationFrame(() => {
                const canvas = document.getElementById('mainCanvas');
                if (canvas) {
                    canvas.offsetHeight;
                }
                
                if (this.renderer && this.renderer.setupCanvas) {
                    this.renderer.setupCanvas();
                }
                this.updateRenderer();
            });
        }
    }
    
    /**
     * Initialize glyph editor
     */
    initGlyphEditor() {
        const canvas = document.getElementById('mainCanvas');
        if (!canvas || !this.renderer || !this.renderer.moduleDrawer) return;
        
        this.glyphEditor = new GlyphEditor(canvas, this.renderer.moduleDrawer);
        
        const saveBtn = document.getElementById('editorSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.glyphEditor) {
                    this.glyphEditor.saveGlyph();
                }
            });
        }
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
     * Initialize MIDI controller
     */
    async initMIDI() {
        if (this.isMobile) return;
        
        try {
            this.midiController = new MIDIController(this);
            const success = await this.midiController.init();
            
            if (success) {
                console.log('[VoidTypeface] MIDI controller initialized');
            } else {
                console.log('[VoidTypeface] MIDI controller not available');
            }
        } catch (error) {
            console.error('[VoidTypeface] Failed to initialize MIDI controller:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VoidTypeface();
});

