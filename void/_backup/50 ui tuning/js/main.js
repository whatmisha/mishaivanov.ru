/**
 * Void Typeface - главный файл инициализации
 */

import { VoidRenderer } from './core/VoidRenderer.js';
import { VoidExporter } from './core/VoidExporter.js';
import { PresetManager } from './core/PresetManager.js';
import { VOID_ALPHABET_ALTERNATIVES } from './core/VoidAlphabet.js';
import { SliderController } from './ui/SliderController.js';
import { RangeSliderController } from './ui/RangeSliderController.js';
import { PanelManager } from './ui/PanelManager.js';
import { ColorPicker } from './ui/ColorPicker.js';
import { MathUtils } from './utils/MathUtils.js';
import GlyphEditor from './core/GlyphEditor.js';

class VoidTypeface {
    constructor() {
        // Settings storage
        this.settings = {
            values: {
                stemMultiplier: 0.5, // множитель размера модуля (реальное значение)
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
                randomStrokesMax: 2,
                randomContrastMin: 0.5,
                randomContrastMax: 1.0,
                randomModeType: 'byType', // 'byType' или 'full'
                randomRounded: false, // скругления на концах линий в режиме Random (Rounded)
                roundedCaps: false, // скругления на концах линий (Rounded)
                closeEnds: false, // закрывающие линии на концах в режиме Stripes
                dashLength: 0.10, // длина штриха для Dash mode (множитель от stem)
                gapLength: 0.30, // длина промежутка для Dash mode (множитель от stem)
                useAlternativesInRandom: true, // использовать альтернативные глифы в режиме Random
                currentMode: 'normal' // 'normal' или 'editor'
            },
            get(key) { return this.values[key]; },
            set(key, value) { 
                this.values[key] = value;
                return value;
            }
        };

        // Color pickers
        this.letterColorPicker = null;
        this.bgColorPicker = null;
        
        // Glyph Editor
        this.glyphEditor = null;

        // Проверка на мобильное устройство
        this.isMobile = this.checkIsMobile();
        
        // Инициализация компонентов
        this.initCanvas();
        this.initExporter();
        this.initPresetManager();
        
        if (this.isMobile) {
            // На мобильных устройствах скрываем панели и показываем сообщение
            this.initMobileView();
        } else {
            // На десктопе инициализируем все как обычно
            this.initPanels();
            this.initSliders();
            this.initRangeSliders();
            this.initColorPickers();
            this.initTextInput();
            this.initTextAlign();
            this.initModeToggle();
            this.initRoundedCapsToggle();
            this.initCloseEndsToggle();
            this.initGridToggle();
            // this.initGlyphEditor(); // Редактор глифов (ОТКЛЮЧЕНО - используйте editor.html)
            // this.initEditorHotkey(); // Хоткей Cmd+G для редактора (ОТКЛЮЧЕНО)
            this.initAlternativeGlyphs(); // Альтернативные глифы
            
            // Установить правильную видимость Rounded при инициализации
            this.updateRoundedCapsVisibility();
            this.updateRandomRoundedVisibility();
            this.updateAlternativeGlyphsVisibility();
            
            // Отслеживание изменений для показа кнопки Save
            this.hasUnsavedChanges = false;
            this.currentPresetName = 'Default';
            this.isLoadingPreset = false;
            this.isInitializing = true; // Флаг инициализации
            
            this.setupChangeTracking();
            this.initPresets();
            this.initExport();
            this.initResize();
            
            // Очистить кэш случайных значений перед первой отрисовкой
            // чтобы использовать правильные значения из settings
            if (this.renderer && this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            
            // Первая отрисовка (с правильным вычислением параметров)
            this.updateRenderer();
            
            // Завершить инициализацию и обновить кнопки
            this.isInitializing = false;
            this.hasUnsavedChanges = false; // Убедиться, что после инициализации нет изменений
            if (this.currentPresetName === 'Default') {
                this.updateSaveDeleteButtons();
            }
        }
    }

    /**
     * Проверка на мобильное устройство
     * Возвращает true если ширина экрана < 768px И это touch-устройство
     * Или если это мобильный телефон (не планшет) по User Agent
     */
    checkIsMobile() {
        const width = window.innerWidth;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Проверка на планшеты (iPad, Android планшеты)
        const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
        
        // Мобильное устройство = маленький экран И touch-устройство И НЕ планшет
        // Или явно мобильный телефон по User Agent
        const isMobilePhone = /mobile|iphone|ipod|android.*mobile|blackberry|windows phone/i.test(userAgent);
        
        return (width < 768 && isTouchDevice && !isTablet) || (isMobilePhone && width < 1024);
    }

    /**
     * Инициализация мобильного вида
     */
    initMobileView() {
        // Скрыть все панели управления
        const panels = document.querySelectorAll('.controls-panel');
        panels.forEach(panel => {
            panel.style.display = 'none';
        });
        
        // Скрыть дропдаун пресетов и кнопки Save/Delete
        const presetDropdown = document.getElementById('presetDropdown');
        const saveBtn = document.getElementById('savePresetBtn');
        const deleteBtn = document.getElementById('deletePresetBtn');
        if (presetDropdown) presetDropdown.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        
        // Скрыть кнопки экспорта
        const exportBtn = document.getElementById('exportBtn');
        const copyBtn = document.getElementById('copyBtn');
        if (exportBtn) exportBtn.style.display = 'none';
        if (copyBtn) copyBtn.style.display = 'none';
        
        // Показать кнопку Renew
        const renewBtn = document.getElementById('renewBtn');
        if (renewBtn) {
            renewBtn.style.display = 'inline-flex';
            renewBtn.addEventListener('click', () => {
                // Очистить кэш случайных значений
                this.renderer.clearModuleTypeCache();
                // Перерисовать графику с новыми случайными значениями
                this.calculateMobileModuleSize();
            });
        }
        
        // Установить режим Random и текст
        this.settings.set('mode', 'random');
        this.settings.set('text', 'DESK\nTOP\nONLY');
        
        // Вычислить оптимальный размер модуля, чтобы текст влезал в окно
        // (updateRenderer будет вызван внутри calculateMobileModuleSize)
        this.calculateMobileModuleSize();
        
        // Обработка изменения размера окна (на случай поворота экрана)
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.checkIsMobile();
            
            // Если перешли с мобильного на десктоп, перезагрузить страницу
            if (wasMobile && !this.isMobile) {
                window.location.reload();
            } else if (this.isMobile) {
                // Пересчитать размер модуля при изменении размера окна
                // (updateRenderer будет вызван внутри calculateMobileModuleSize)
                this.calculateMobileModuleSize();
            }
        });
    }

    /**
     * Вычислить оптимальный размер модуля для мобильного устройства
     * чтобы текст "DESK\nTOP\nONLY" влезал в окно без обрезки
     */
    calculateMobileModuleSize() {
        // Дождаться следующего кадра, чтобы canvas успел получить размеры
        requestAnimationFrame(() => {
            const canvasContainer = document.getElementById('canvasContainer');
            const canvas = document.getElementById('mainCanvas');
            
            // Получить размеры контейнера или окна
            const containerRect = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
            const availableWidth = containerRect ? containerRect.width : window.innerWidth;
            const availableHeight = containerRect ? containerRect.height : window.innerHeight;
            
            // Текст состоит из 3 строк: "DESK", "TOP", "ONLY"
            // Самая длинная строка - "DESK" и "ONLY" (4 символа)
            const maxLineLength = 4;
            const numLines = 3;
            
            // Размеры одного символа: 5 модулей в ширину
            const cols = 5;
            const rows = 5;
            
            // Используем текущие значения multipliers из settings
            const letterSpacingMultiplier = this.settings.get('letterSpacingMultiplier') || 1;
            const lineHeightMultiplier = this.settings.get('lineHeightMultiplier') || 2;
            
            // Учитываем padding (10% с каждой стороны для безопасности)
            const padding = 0.1;
            const maxWidth = availableWidth * (1 - 2 * padding);
            const maxHeight = availableHeight * (1 - 2 * padding);
            
            // Расчет по ширине:
            // Ширина строки = maxLineLength * cols * moduleSize + (maxLineLength - 1) * letterSpacingMultiplier * moduleSize
            // = moduleSize * (maxLineLength * cols + (maxLineLength - 1) * letterSpacingMultiplier)
            const moduleSizeByWidth = maxWidth / (maxLineLength * cols + (maxLineLength - 1) * letterSpacingMultiplier);
            
            // Расчет по высоте:
            // Высота текста = numLines * rows * moduleSize + (numLines - 1) * lineHeightMultiplier * moduleSize
            // = moduleSize * (numLines * rows + (numLines - 1) * lineHeightMultiplier)
            const moduleSizeByHeight = maxHeight / (numLines * rows + (numLines - 1) * lineHeightMultiplier);
            
            // Выбрать минимальный размер, чтобы влезло и по ширине, и по высоте
            const optimalModuleSize = Math.floor(Math.min(moduleSizeByWidth, moduleSizeByHeight));
            
            // Установить размер модуля (но не меньше 8px и не больше 128px)
            const finalModuleSize = Math.max(8, Math.min(128, optimalModuleSize));
            this.settings.set('moduleSize', finalModuleSize);
            
            // Обновить renderer после установки размера модуля
            this.updateRenderer();
        });
    }

    /**
     * Инициализация canvas и renderer
     */
    initCanvas() {
        const canvas = document.getElementById('mainCanvas');
        this.renderer = new VoidRenderer(canvas);
        
        // Установить начальные параметры
        this.renderer.updateParams(this.settings.values);
    }

    /**
     * Инициализация экспортера
     */
    initExporter() {
        this.exporter = new VoidExporter(this.renderer, this.settings);
    }

    /**
     * Инициализация preset manager
     */
    initPresetManager() {
        this.presetManager = new PresetManager();
    }

    /**
     * Инициализация панелей управления
     */
    initPanels() {
        this.panelManager = new PanelManager();
        
        // Регистрация панелей
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
        
        this.panelManager.registerPanel('textPanel', {
            headerId: 'textPanelHeader',
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
     * Инициализация слайдеров
     */
    initSliders() {
        this.sliderController = new SliderController(this.settings);

        // Module (в пикселях)
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

        // Stem Weight (относительно размера модуля)
        this.sliderController.initSlider('stemSlider', {
            valueId: 'stemValue',
            setting: 'stemMultiplier',
            min: 0.1,
            max: 3.0,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 0.5,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });

        // Letter Spacing (относительно размера модуля)
        this.sliderController.initSlider('letterSpacingSlider', {
            valueId: 'letterSpacingValue',
            setting: 'letterSpacingMultiplier',
            min: 0,
            max: 16,
            decimals: 0,
            baseStep: 1,
            shiftStep: 1,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });

        // Line Height (относительно размера модуля)
        this.sliderController.initSlider('lineHeightSlider', {
            valueId: 'lineHeightValue',
            setting: 'lineHeightMultiplier',
            min: 0,
            max: 16,
            decimals: 0,
            baseStep: 1,
            shiftStep: 2,
            onUpdate: (value) => {
                this.updateRenderer();
                this.markAsChanged();
            }
        });

        // Strokes Number (для Stripes mode)
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

        // Contrast (для Stripes mode)
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

        // Dash Length (для Dash mode)
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

        // Gap Length (для Dash mode)
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
     * Инициализация range-слайдеров (для Random mode)
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

        // Strokes Range (Lines в режиме Random)
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

        // Обработчики для текстовых полей Stem Weight
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

        // Обработчики для текстовых полей Strokes
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

        // Обработчики для текстовых полей Contrast
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
    initColorPickers() {
        // Grid Color Picker
        this.gridColorPicker = new ColorPicker({
            containerId: 'gridColorPickerContainer',
            initialColor: this.settings.get('gridColor'),
            onChange: (color) => {
                this.settings.set('gridColor', color);
                this.updateRenderer();
            }
        });
        this.gridColorPicker.init();

        // Letter Color Picker
        this.letterColorPicker = new ColorPicker({
            containerId: 'letterColorPickerContainer',
            initialColor: this.settings.get('letterColor'),
            onChange: (color) => {
                this.settings.set('letterColor', color);
                this.updateRenderer();
            }
        });
        this.letterColorPicker.init();

        // Background Color Picker
        this.bgColorPicker = new ColorPicker({
            containerId: 'bgColorPickerContainer',
            initialColor: this.settings.get('bgColor'),
            onChange: (color) => {
                this.settings.set('bgColor', color);
                this.updateRenderer();
            }
        });
        this.bgColorPicker.init();
    }

    /**
     * Инициализация text input с debounce
     */
    initTextInput() {
        const textarea = document.getElementById('textInput');
        
        const debouncedUpdate = MathUtils.debounce(() => {
            // Убрать пробелы перед переносами строк
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
        
        // Установить начальное значение
        alternativeGlyphsCheckbox.checked = this.settings.get('useAlternativesInRandom') ?? true;
        
        // Обработчик изменения
        alternativeGlyphsCheckbox.addEventListener('change', () => {
            this.settings.set('useAlternativesInRandom', alternativeGlyphsCheckbox.checked);
            // Очистить кэш альтернативных глифов при выключении Alt Glyphs
            if (!alternativeGlyphsCheckbox.checked && this.renderer.clearAlternativeGlyphCache) {
                this.renderer.clearAlternativeGlyphCache();
            }
            this.updateRenderer();
            this.markAsChanged();
        });
        
        // Обработчик клика на канвасе для переключения альтернатив
        const canvas = document.getElementById('mainCanvas');
        if (canvas && !canvas.hasAttribute('data-alternatives-initialized')) {
            canvas.setAttribute('data-alternatives-initialized', 'true');
            
            // Обработчик движения мыши для изменения курсора и эффекта прозрачности
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
                // Не обрабатывать события в режиме редактора
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                const rect = canvas.getBoundingClientRect();
                // Используем CSS размеры, а не физические размеры canvas
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const position = this.renderer.getLetterPositionAt(mouseX, mouseY);
                
                // Обновляем курсор
                if (position) {
                    // Проверяем, есть ли альтернативы для этого символа
                    const char = position.char.toUpperCase();
                    const hasAlternatives = VOID_ALPHABET_ALTERNATIVES && VOID_ALPHABET_ALTERNATIVES[char] && VOID_ALPHABET_ALTERNATIVES[char].length > 0;
                    canvas.style.cursor = hasAlternatives ? 'pointer' : 'default';
                    
                    // Устанавливаем hoveredLetter для эффекта прозрачности
                    const positionChanged = !this.renderer.hoveredLetter || 
                        this.renderer.hoveredLetter.lineIndex !== position.lineIndex ||
                        this.renderer.hoveredLetter.charIndex !== position.charIndex;
                    
                    if (positionChanged) {
                        this.renderer.setHoveredLetter(position);
                        // Перерисовываем только если позиция изменилась и есть альтернативы
                        if (hasAlternatives && !rafPending) {
                            rafPending = true;
                            requestAnimationFrame(updateHover);
                        }
                    }
                } else {
                    canvas.style.cursor = 'default';
                    // Убираем hoveredLetter только если он был установлен
                    if (this.renderer.hoveredLetter) {
                        this.renderer.setHoveredLetter(null);
                        if (!rafPending) {
                            rafPending = true;
                            requestAnimationFrame(updateHover);
                        }
                    }
                }
            });
            
            // Обработчик ухода мыши с канваса
            canvas.addEventListener('mouseleave', () => {
                // Не обрабатывать события в режиме редактора
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
                // Не обрабатывать события в режиме редактора
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                const rect = canvas.getBoundingClientRect();
                // Используем CSS размеры, а не физические размеры canvas
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
     * Обновить видимость элементов управления альтернативными глифами
     */
    updateAlternativeGlyphsVisibility() {
        // Альтернативные глифы теперь объединены с randomControlGroup, поэтому эта функция больше не нужна
        // Оставляем пустой для совместимости
        return;
        alternativeGlyphsGroup.style.display = shouldShow ? 'block' : 'none';
    }

    /**
     * Инициализация тогла Rounded
     */
    initRoundedCapsToggle() {
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        const closeEndsCheckbox = document.getElementById('closeEndsCheckbox');
        if (!roundedCapsCheckbox) return;
        
        // Установить начальное значение
        roundedCapsCheckbox.checked = this.settings.get('roundedCaps') || false;
        
        // Обработчик изменения
        roundedCapsCheckbox.addEventListener('change', () => {
            // Если выключаем Rounded и Close Ends включен, выключаем оба
            if (!roundedCapsCheckbox.checked && this.settings.get('closeEnds')) {
                this.settings.set('closeEnds', false);
                this.settings.set('roundedCaps', false);
                if (closeEndsCheckbox) {
                    closeEndsCheckbox.checked = false;
                }
            } else {
                // Иначе просто меняем Rounded Caps
                this.settings.set('roundedCaps', roundedCapsCheckbox.checked);
            }
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Инициализация тогла Close Ends
     */
    initCloseEndsToggle() {
        const closeEndsCheckbox = document.getElementById('closeEndsCheckbox');
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (!closeEndsCheckbox) return;
        
        // Установить начальное значение
        closeEndsCheckbox.checked = this.settings.get('closeEnds') || false;
        
        // Обработчик изменения
        closeEndsCheckbox.addEventListener('change', () => {
            if (closeEndsCheckbox.checked) {
                // При включении Close Ends автоматически включаем Rounded Caps
                this.settings.set('closeEnds', true);
                this.settings.set('roundedCaps', true);
                if (roundedCapsCheckbox) {
                    roundedCapsCheckbox.checked = true;
                }
            } else {
                // При выключении Close Ends выключаем оба режима
                this.settings.set('closeEnds', false);
                this.settings.set('roundedCaps', false);
                if (roundedCapsCheckbox) {
                    roundedCapsCheckbox.checked = false;
                }
            }
            this.updateRenderer();
            this.markAsChanged();
        });
    }

    /**
     * Обновить видимость Rounded (для стилей Solid, Stripes и Dash)
     */
    updateRoundedCapsVisibility() {
        const roundedCapsGroup = document.getElementById('roundedCapsControlGroup');
        if (!roundedCapsGroup) return;
        
        const mode = this.settings.get('mode') || 'fill';
        
        // Round (roundedCapsControlGroup) показываем для fill, stripes, dash
        const shouldShow = mode === 'fill' || mode === 'stripes' || mode === 'dash';
        roundedCapsGroup.style.display = shouldShow ? 'flex' : 'none';
        
        // Close Ends показываем ТОЛЬКО в режиме Stripes
        // Используем класс hidden т.к. CSS имеет display: flex !important для .checkbox-label
        const closeEndsLabel = document.getElementById('closeEndsLabel');
        if (closeEndsLabel) {
            if (mode === 'stripes') {
                closeEndsLabel.classList.remove('hidden');
            } else {
                closeEndsLabel.classList.add('hidden');
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
        
        // Показывать только в режиме Random
        if (mode === 'random') {
            randomRoundedLabel.classList.remove('hidden');
        } else {
            randomRoundedLabel.classList.add('hidden');
        }
    }

    /**
     * Инициализация переключателя режима отрисовки
     */
    initModeToggle() {
        const fillRadio = document.getElementById('modeFill');
        const stripesRadio = document.getElementById('modeStripes');
        const dashRadio = document.getElementById('modeDash');
        const randomRadio = document.getElementById('modeRandom');
        const strokesControlGroup = document.getElementById('strokesControlGroup');
        const strokeGapRatioControlGroup = document.getElementById('strokeGapRatioControlGroup');
        const dashLengthControlGroup = document.getElementById('dashLengthControlGroup');
        const gapLengthControlGroup = document.getElementById('gapLengthControlGroup');
        const closeEndsControlGroup = document.getElementById('closeEndsControlGroup');

        const updateMode = () => {
            let mode = 'fill';
            if (fillRadio.checked) mode = 'fill';
            else if (stripesRadio.checked) mode = 'stripes';
            else if (dashRadio.checked) mode = 'dash';
            else if (randomRadio.checked) mode = 'random';
            
            this.settings.set('mode', mode);
            
            // Очистить кэш при переключении режима
            if (this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            // Очистить кэш альтернативных глифов при переключении режима
            if (this.renderer.clearAlternativeGlyphCache) {
                this.renderer.clearAlternativeGlyphCache();
            }
            
            // Показать/скрыть контролы в зависимости от режима
            strokesControlGroup.style.display = mode === 'stripes' ? 'block' : 'none';
            strokeGapRatioControlGroup.style.display = mode === 'stripes' ? 'block' : 'none';
            dashLengthControlGroup.style.display = mode === 'dash' ? 'block' : 'none';
            gapLengthControlGroup.style.display = mode === 'dash' ? 'block' : 'none';
            
            // Обновить видимость Round и Close Ends
            this.updateRoundedCapsVisibility();
            
            const randomGroups = [
                document.getElementById('randomControlGroup'),
                document.getElementById('randomControlGroupStem'),
                document.getElementById('randomControlGroup2'),
                document.getElementById('randomControlGroup3'),
                document.getElementById('randomControlGroup5')
            ];
            randomGroups.forEach(group => {
                if (group) {
                    // randomControlGroup - это toggle-group-row, используем flex
                    const displayValue = group.id === 'randomControlGroup' ? 'flex' : 'block';
                    group.style.display = mode === 'random' ? displayValue : 'none';
                }
            });
            
            // Инициализация toggle для режима рандома
            const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
            if (randomFullRandomCheckbox && mode === 'random') {
                randomFullRandomCheckbox.checked = this.settings.get('randomModeType') === 'full';
            }
            
            const randomRoundedCheckbox = document.getElementById('randomRoundedCheckbox');
            if (randomRoundedCheckbox && mode === 'random') {
                randomRoundedCheckbox.checked = this.settings.get('randomRounded') ?? false;
            }
            
            // Отключить/включить Stem Weight в панели Metrics при режиме Random
            const stemSlider = document.getElementById('stemSlider');
            const stemValue = document.getElementById('stemValue');
            if (stemSlider && stemValue) {
                const isDisabled = mode === 'random';
                stemSlider.disabled = isDisabled;
                stemValue.disabled = isDisabled;
            }
            
            // Обновить видимость Rounded
            this.updateRoundedCapsVisibility();
            
            // Обновить видимость Rounded в режиме Random (должно быть после показа randomGroups)
            this.updateRandomRoundedVisibility();
            
            // Обновить видимость Dash
            
            // Обновить видимость альтернативных глифов
            this.updateAlternativeGlyphsVisibility();
            
            this.updateRenderer();
        };

        fillRadio.addEventListener('change', () => {
            updateMode();
            this.markAsChanged();
        });
        stripesRadio.addEventListener('change', () => {
            updateMode();
            this.markAsChanged();
        });
        dashRadio.addEventListener('change', () => {
            updateMode();
            this.markAsChanged();
        });
        randomRadio.addEventListener('change', () => {
            updateMode();
            this.markAsChanged();
        });

        // Кнопка Renew для random mode
        const renewBtn = document.getElementById('renewRandomBtn');
        if (renewBtn) {
            renewBtn.addEventListener('click', () => {
                if (this.settings.get('mode') === 'random') {
                    // Очистить кэш значений по типу модуля
                    if (this.renderer.clearModuleTypeCache) {
                        this.renderer.clearModuleTypeCache();
                    }
                    // Очистить кэш альтернативных глифов (чтобы сгенерировать новые случайные альтернативы)
                    if (this.renderer.clearAlternativeGlyphCache) {
                        this.renderer.clearAlternativeGlyphCache();
                    }
                    this.updateRenderer();
                    this.markAsChanged();
                }
            });
        }

        // Toggle для режима рандома (Full Random)
        const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
        if (randomFullRandomCheckbox) {
            randomFullRandomCheckbox.addEventListener('change', () => {
                const isFullRandom = randomFullRandomCheckbox.checked;
                this.settings.set('randomModeType', isFullRandom ? 'full' : 'byType');
                // Очистить кэш при переключении режима
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateRenderer();
                this.markAsChanged();
            });
        }

        // Toggle для режима рандома (Rounded)
        const randomRoundedCheckbox = document.getElementById('randomRoundedCheckbox');
        if (randomRoundedCheckbox) {
            randomRoundedCheckbox.addEventListener('change', () => {
                this.settings.set('randomRounded', randomRoundedCheckbox.checked);
                // Очистить кэш при переключении режима
                if (this.renderer.clearModuleTypeCache) {
                    this.renderer.clearModuleTypeCache();
                }
                this.updateRenderer();
                this.markAsChanged();
            });
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

        // Создать или обновить дефолтный пресет
        const defaultPreset = this.presetManager.loadPreset('Default');
        if (!defaultPreset) {
            // Создать новый дефолтный пресет
            this.presetManager.savePreset('Default', this.settings.values);
        } else {
            // Обновить существующий пресет Default, если текст устарел
            if (defaultPreset.text === 'Void\nTypeface\ncoded') {
                defaultPreset.text = 'Void\nTypeface\nCode';
                this.presetManager.presets['Default'] = defaultPreset;
                this.presetManager.savePresets();
            }
            
            // Обновить значения random параметров в пресете, если они не соответствуют новым дефолтным
            const needsUpdate = 
                defaultPreset.randomStemMin !== 0.5 ||
                defaultPreset.randomStemMax !== 1.0 ||
                defaultPreset.randomStrokesMin !== 1 ||
                defaultPreset.randomStrokesMax !== 2 ||
                defaultPreset.randomContrastMin !== 0.5 ||
                defaultPreset.randomContrastMax !== 1.0 ||
                defaultPreset.randomRounded !== false ||
                defaultPreset.useAlternativesInRandom !== true;
            
            if (needsUpdate) {
                // Обновить значения в пресете
                defaultPreset.randomStemMin = 0.5;
                defaultPreset.randomStemMax = 1.0;
                defaultPreset.randomStrokesMin = 1;
                defaultPreset.randomStrokesMax = 2;
                defaultPreset.randomContrastMin = 0.5;
                defaultPreset.randomContrastMax = 1.0;
                defaultPreset.randomRounded = false;
                defaultPreset.useAlternativesInRandom = true;
                this.presetManager.presets['Default'] = defaultPreset;
                this.presetManager.savePresets();
            }
        }

        // Обновить список preset'ов
        this.updatePresetList();
        
        // Загрузить дефолтный пресет
        // loadPreset установит currentPresetName и hasUnsavedChanges = false
        this.loadPreset('Default', false);
        presetDropdownText.textContent = 'Default';

        // Открытие/закрытие дропдауна
        presetDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = presetDropdownToggle.getAttribute('aria-expanded') === 'true';
            presetDropdownToggle.setAttribute('aria-expanded', !isExpanded);
            presetDropdownMenu.classList.toggle('active');
        });

        // Закрытие дропдауна при клике вне его
        document.addEventListener('click', (e) => {
            if (!presetDropdown.contains(e.target)) {
                presetDropdownToggle.setAttribute('aria-expanded', 'false');
                presetDropdownMenu.classList.remove('active');
            }
        });

        // Загрузка preset'а при клике на элемент
        presetDropdownMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.preset-dropdown-item');
            if (item) {
                const presetName = item.dataset.value;
                
                // Обработка удаления всех пресетов
                if (presetName === '__delete_all__') {
                    if (confirm('Delete all saved presets?')) {
                        const names = this.presetManager.getPresetNames();
                        names.forEach(name => {
                            if (name !== 'Default') {
                                this.presetManager.deletePreset(name);
                            }
                        });
                        // Переключиться на Default
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
                    // Проверка на несохраненные изменения
                    if (this.hasUnsavedChanges) {
                        const shouldSave = confirm('You have unsaved changes. Save current preset before switching?');
                        if (shouldSave) {
                            this.saveCurrentPreset();
                        }
                    }
                    this.loadPreset(presetName);
                    // Отображать сокращенное имя в дропдауне
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

        // Сохранение preset'а
        savePresetBtn.addEventListener('click', () => {
            this.saveCurrentPreset();
        });

        // Удаление preset'а
        deletePresetBtn.addEventListener('click', () => {
            if (this.currentPresetName === 'Default') {
                alert('Cannot delete "Default" preset');
                return;
            }
            
            // Показать полное название в модальном окне
            if (confirm(`Delete preset "${this.currentPresetName}"?`)) {
                if (this.presetManager.deletePreset(this.currentPresetName)) {
                    // Переключиться на Default
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
        
        // Инициализировать видимость кнопок после загрузки Default
        // Убедиться, что для Default без изменений кнопки скрыты
        if (this.currentPresetName === 'Default') {
            this.hasUnsavedChanges = false;
        }
        this.updateSaveDeleteButtons();
    }

    /**
     * Обновить список preset'ов в дропдауне
     */
    updatePresetList() {
        const presetDropdownMenu = document.getElementById('presetDropdownMenu');
        const names = this.presetManager.getPresetNames();
        const hasCustomPresets = names.length > 1; // Больше чем только Default
        
        presetDropdownMenu.innerHTML = '';
        names.forEach(name => {
            const item = document.createElement('li');
            item.className = 'preset-dropdown-item';
            item.dataset.value = name;
            // Отображать сокращенное имя, но хранить полное в dataset
            const displayName = name === 'Default' ? 'Default' : this.getDisplayName(name);
            item.textContent = displayName;
            item.setAttribute('role', 'option');
            if (name === this.currentPresetName) {
                item.classList.add('selected');
            }
            presetDropdownMenu.appendChild(item);
        });
        
        // Добавить "× delete all" если есть кастомные пресеты
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
     * Загрузить preset
     */
    loadPreset(name, updateUI = true) {
        const preset = this.presetManager.loadPreset(name);
        if (!preset) {
            alert('Preset не найден');
            return;
        }

        // Установить флаг загрузки, чтобы не триггерить отслеживание изменений
        this.isLoadingPreset = true;
        
        // Установить имя пресета ДО применения параметров, чтобы отслеживание знало текущий пресет
        this.currentPresetName = name;

        // Применить все параметры из preset'а
        Object.keys(preset).forEach(key => {
            if (key !== 'createdAt' && this.settings.values.hasOwnProperty(key)) {
                this.settings.set(key, preset[key]);
            }
        });
        
        // Сбросить флаг изменений ДО снятия флага isLoadingPreset
        this.hasUnsavedChanges = false;
        
        this.isLoadingPreset = false;
        
        if (updateUI) {
            // Очистить кэш случайных значений перед обновлением renderer
            // чтобы использовать правильные значения из загруженного пресета
            if (this.renderer && this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            
            // Обновить UI
            this.updateUIFromSettings();
            
            // Обновить renderer
            this.updateRenderer();
        }
        
        // Обновить кнопки после всех изменений
        this.updateSaveDeleteButtons();
    }

    /**
     * Обновить UI элементы из settings
     */
    updateUIFromSettings() {
        // Обновить слайдеры (без вызова коллбэков, чтобы избежать лишних обновлений)
        this.sliderController.setValue('stemSlider', this.settings.get('stemMultiplier'), false);
        this.sliderController.setValue('moduleSizeSlider', this.settings.get('moduleSize'), false);
        this.sliderController.setValue('letterSpacingSlider', this.settings.get('letterSpacingMultiplier'), false);
        this.sliderController.setValue('lineHeightSlider', this.settings.get('lineHeightMultiplier'), false);
        this.sliderController.setValue('strokesSlider', this.settings.get('strokesNum'), false);
        this.sliderController.setValue('strokeGapRatioSlider', this.settings.get('strokeGapRatio'), false);
        this.sliderController.setValue('dashLengthSlider', this.settings.get('dashLength'), false);
        this.sliderController.setValue('gapLengthSlider', this.settings.get('gapLength'), false);
        
        // Обновить range-слайдеры
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
        }

        // Обновить режим отрисовки
        const mode = this.settings.get('mode');
        document.getElementById('modeFill').checked = mode === 'fill';
        document.getElementById('modeStripes').checked = mode === 'stripes';
        document.getElementById('modeDash').checked = mode === 'dash';
        document.getElementById('modeRandom').checked = mode === 'random';
        document.getElementById('strokesControlGroup').style.display = mode === 'stripes' ? 'block' : 'none';
        document.getElementById('strokeGapRatioControlGroup').style.display = mode === 'stripes' ? 'block' : 'none';
        // closeEndsControlGroup теперь объединен с roundedCapsControlGroup
        const roundedCapsControlGroup = document.getElementById('roundedCapsControlGroup');
        if (roundedCapsControlGroup) {
            roundedCapsControlGroup.style.display = (mode === 'fill' || mode === 'stripes' || mode === 'dash') ? 'flex' : 'none';
        }
        document.getElementById('dashLengthControlGroup').style.display = mode === 'dash' ? 'block' : 'none';
        document.getElementById('gapLengthControlGroup').style.display = mode === 'dash' ? 'block' : 'none';
        
        // Обновить Rounded
        const roundedCapsCheckbox = document.getElementById('roundedCapsCheckbox');
        if (roundedCapsCheckbox) {
            roundedCapsCheckbox.checked = this.settings.get('roundedCaps') || false;
        }
        this.updateRoundedCapsVisibility();
        this.updateDashVisibility();
        
        const randomGroups = [
            document.getElementById('randomControlGroup'),
            document.getElementById('randomControlGroupStem'),
            document.getElementById('randomControlGroup2'),
            document.getElementById('randomControlGroup3'),
            document.getElementById('randomControlGroup5')
        ];
        randomGroups.forEach(group => {
            if (group) {
                // randomControlGroup - это toggle-group-row, используем flex
                const displayValue = group.id === 'randomControlGroup' ? 'flex' : 'block';
                group.style.display = mode === 'random' ? displayValue : 'none';
            }
        });

        // Обновить видимость Rounded в режиме Random (после показа групп)
        this.updateRandomRoundedVisibility();

        // Обновить состояние toggle для режима рандома
        const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
        if (randomFullRandomCheckbox) {
            randomFullRandomCheckbox.checked = this.settings.get('randomModeType') === 'full';
        }
        
        const randomRoundedCheckbox = document.getElementById('randomRoundedCheckbox');
        if (randomRoundedCheckbox) {
            randomRoundedCheckbox.checked = this.settings.get('randomRounded') ?? false;
        }

        // Отключить/включить Stem Weight в панели Metrics при режиме Random
        const stemSlider = document.getElementById('stemSlider');
        const stemValue = document.getElementById('stemValue');
        if (stemSlider && stemValue) {
            const isDisabled = mode === 'random';
            stemSlider.disabled = isDisabled;
            stemValue.disabled = isDisabled;
        }

        // Обновить цвета
        const letterColor = this.settings.get('letterColor');
        const bgColor = this.settings.get('bgColor');
        const gridColor = this.settings.get('gridColor');
        if (this.letterColorPicker) {
            this.letterColorPicker.setColor(letterColor);
        }
        if (this.bgColorPicker) {
            this.bgColorPicker.setColor(bgColor);
        }
        if (this.gridColorPicker) {
            this.gridColorPicker.setColor(gridColor);
        }

        // Обновить текст
        const text = this.settings.get('text');
        document.getElementById('textInput').value = text;
        this.renderer.setText(text);

        // Обновить выравнивание текста
        const textAlign = this.settings.get('textAlign') || 'center';
        document.getElementById('textAlignLeft').checked = textAlign === 'left';
        document.getElementById('textAlignCenter').checked = textAlign === 'center';
        document.getElementById('textAlignRight').checked = textAlign === 'right';

        // Обновить сетку и endpoints
        document.getElementById('showGridCheckbox').checked = this.settings.get('showGrid');
        document.getElementById('showEndpointsCheckbox').checked = this.settings.get('showEndpoints') || false;
        document.getElementById('showTestCheckbox').checked = this.settings.get('showTestCircles') || false;
    }

    /**
     * Инициализация экспорта
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

        // Шорткат ⌘E (Cmd на Mac, Ctrl на Windows/Linux)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                // Не экспортировать в режиме редактора
                const currentMode = this.settings.get('currentMode') || 'normal';
                if (currentMode === 'editor') return;
                
                e.preventDefault();
                this.exportSVG();
            }
        });
    }

    /**
     * Инициализация resize handler
     */
    initResize() {
        const debouncedResize = MathUtils.debounce(() => {
            this.renderer.resize();
        }, 100);

        window.addEventListener('resize', debouncedResize);
    }

    /**
     * Обновить renderer с текущими настройками
     */
    updateRenderer() {
        // Не обновлять renderer в режиме редактора
        const currentMode = this.settings.get('currentMode') || 'normal';
        if (currentMode === 'editor') return;
        
        const moduleSize = this.settings.get('moduleSize');
        // Умножаем на 2, так как в ModuleDrawer используется stem / 2
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
            includeGridToExport: this.settings.get('showGrid'), // Автоматически экспортировать сетку, если она видна
            randomStemMin: this.settings.get('randomStemMin'),
            randomStemMax: this.settings.get('randomStemMax'),
            randomStrokesMin: this.settings.get('randomStrokesMin'),
            randomStrokesMax: this.settings.get('randomStrokesMax'),
            randomContrastMin: this.settings.get('randomContrastMin'),
            randomContrastMax: this.settings.get('randomContrastMax'),
            randomModeType: this.settings.get('randomModeType'),
            randomRounded: this.settings.get('randomRounded') || false,
            roundedCaps: this.settings.get('roundedCaps') || false,
            closeEnds: this.settings.get('closeEnds') || false,
            dashLength: this.settings.get('dashLength') || 0.10,
            gapLength: this.settings.get('gapLength') || 0.30,
            useAlternativesInRandom: this.settings.get('useAlternativesInRandom') || false,
            showEndpoints: this.settings.get('showEndpoints') || false,
            showTestCircles: this.settings.get('showTestCircles') || false
        };
        

        this.renderer.updateParams(params);
        
        // Установить текст из settings
        this.renderer.setText(this.settings.get('text'));
        
        this.renderer.render();
    }

    /**
     * Экспорт в SVG
     */
    exportSVG() {
        this.exporter.exportToSVG();
    }

    /**
     * Копировать SVG в буфер обмена
     */
    async copySVG() {
        await this.exporter.copySVG();
    }

    /**
     * Сохранить текущий пресет с автогенерацией имени
     */
    saveCurrentPreset() {
        const name = this.generatePresetName();
        const result = this.presetManager.savePreset(name, this.settings.values);
        if (result.success) {
            this.updatePresetList();
            const presetDropdownText = document.querySelector('.preset-dropdown-text');
            const presetDropdownMenu = document.getElementById('presetDropdownMenu');
            // Отображать сокращенное имя в дропдауне
            const displayName = this.getDisplayName(name);
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
     * Генерация имени пресета: полный текст + режим
     * Если имя уже существует, добавляет порядковый номер
     */
    generatePresetName() {
        const text = this.settings.get('text') || '';
        const mode = this.settings.get('mode') || 'fill';
        
        // Полный текст (без пробелов и переносов строк)
        const fullText = text.replace(/\s+/g, ' ').trim();
        
        // Название режима с заглавной буквы
        const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
        
        let baseName = `${fullText} ${modeName}`;
        const existingNames = this.presetManager.getPresetNames();
        
        // Если имя уже существует, добавляем порядковый номер
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
     * Получить отображаемое имя пресета (максимум 24 символа суммарно, включая режим)
     */
    getDisplayName(fullName) {
        const parts = fullName.split(' ');
        if (parts.length < 2) {
            // Если нет режима, просто обрезаем до 24 символов
            return fullName.length > 24 ? fullName.substring(0, 21) + '...' : fullName;
        }
        
        // Последняя часть - это режим
        const mode = parts[parts.length - 1];
        // Все остальное - это текст
        const textPart = parts.slice(0, -1).join(' ');
        
        // Формат: "текст... режим" или "текст режим"
        // Максимальная длина: 24 символа
        
        // Пробуем без многоточия
        const withoutEllipsis = `${textPart} ${mode}`;
        if (withoutEllipsis.length <= 24) {
            return withoutEllipsis;
        }
        
        // Нужно многоточие: "текст... режим"
        // Длина: текст + "..." + " " + режим <= 24
        // Максимальная длина текста: 24 - 3 - 1 - длина_режима
        const maxTextLength = 24 - 3 - 1 - mode.length; // -3 для "...", -1 для пробела
        
        if (maxTextLength <= 0) {
            // Если режим слишком длинный, просто возвращаем режим
            return mode.length > 24 ? mode.substring(0, 21) + '...' : mode;
        }
        
        const truncatedText = textPart.substring(0, maxTextLength) + '...';
        const result = `${truncatedText} ${mode}`;
        
        // Финальная проверка: строго ограничиваем до 24 символов
        if (result.length > 24) {
            // Если все равно больше, жестко обрезаем до 24
            const excess = result.length - 24;
            const newTruncatedText = textPart.substring(0, Math.max(0, maxTextLength - excess));
            return `${newTruncatedText}... ${mode}`;
        }
        
        return result;
    }

    /**
     * Настроить отслеживание изменений
     */
    setupChangeTracking() {
        // Отслеживать изменения всех настроек
        const originalSet = this.settings.set.bind(this.settings);
        const self = this;
        this.settings.set = function(key, value) {
            const oldValue = self.settings.values[key];
            const result = originalSet(key, value);
            // Если это не загрузка пресета, не инициализация и значение действительно изменилось, отметить изменения
            if (!self.isLoadingPreset && !self.isInitializing && self.currentPresetName && oldValue !== value) {
                self.markAsChanged();
            }
            return result;
        };
        
        // Отслеживать изменения текста через renderer
        const originalSetText = this.renderer.setText.bind(this.renderer);
        this.renderer.setText = (text) => {
            originalSetText(text);
            if (!this.isLoadingPreset && !this.isInitializing && this.currentPresetName) {
                this.markAsChanged();
            }
        };
    }

    /**
     * Отметить что были изменения
     */
    markAsChanged() {
        // Не отслеживать изменения в режиме редактора, во время загрузки пресета или инициализации
        const currentMode = this.settings.get('currentMode') || 'normal';
        if (currentMode === 'editor') return;
        
        if (!this.isLoadingPreset && !this.isInitializing) {
            this.hasUnsavedChanges = true;
            this.updateSaveDeleteButtons();
        }
    }

    /**
     * Обновить видимость кнопок Save и Delete
     */
    updateSaveDeleteButtons() {
        // Не показывать кнопки в режиме редактора
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
        const presetNames = this.presetManager.getPresetNames();
        const hasCustomPresets = presetNames.length > 1; // Больше чем только Default
        const isDefaultPreset = this.currentPresetName === 'Default';
        const isDefaultWithoutChanges = isDefaultPreset && !this.hasUnsavedChanges;
        
        // Показывать Save если есть несохраненные изменения
        if (savePresetBtn) {
            savePresetBtn.style.display = this.hasUnsavedChanges ? 'inline-flex' : 'none';
        }
        
        // Показывать Delete если есть кастомные пресеты И это не Default без изменений
        if (deletePresetBtn) {
            deletePresetBtn.style.display = (hasCustomPresets && !isDefaultWithoutChanges) ? 'inline-flex' : 'none';
        }
    }
    
    /**
     * Инициализация хоткея для редактора (Cmd+G)
     */
    initEditorHotkey() {
        document.addEventListener('keydown', (e) => {
            // Cmd+G (Mac) или Ctrl+G (Windows/Linux) - переключить режим редактора
            if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
                e.preventDefault();
                const currentMode = this.settings.get('currentMode') || 'normal';
                const newMode = currentMode === 'normal' ? 'editor' : 'normal';
                this.switchMode(newMode);
            }
        });
    }
    
    /**
     * Переключение режима (Normal/Editor)
     */
    switchMode(mode) {
        this.settings.set('currentMode', mode);
        
        const controlsPanel = document.getElementById('controlsPanel');
        const variabilityPanel = document.getElementById('variabilityPanel');
        const textPanel = document.getElementById('textPanel');
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
            // Активировать режим редактора
            
            // Скрыть обычные панели
            if (controlsPanel) controlsPanel.style.display = 'none';
            if (variabilityPanel) variabilityPanel.style.display = 'none';
            if (textPanel) textPanel.style.display = 'none';
            if (viewColorsPanel) viewColorsPanel.style.display = 'none';
            
            // Скрыть пресеты и кнопки
            if (presetDropdown) presetDropdown.style.display = 'none';
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            if (copyBtn) copyBtn.style.display = 'none';
            if (exportBtn) exportBtn.style.display = 'none';
            if (aboutVoidLink) aboutVoidLink.style.display = 'none';
            
            // Показать панель редактора
            if (editorPanel) editorPanel.style.display = 'block';
            
            // Показать подсказку редактора
            if (editorHint) editorHint.style.display = 'block';
            
            // Деактивировать рендерер и активировать редактор
            if (this.glyphEditor) {
                this.glyphEditor.activate();
            }
        } else {
            // Активировать обычный режим
            
            // Скрыть подсказку редактора
            const editorHint = document.getElementById('editorHint');
            if (editorHint) editorHint.style.display = 'none';
            
            // Показать обычные панели
            if (controlsPanel) controlsPanel.style.display = 'block';
            if (variabilityPanel) variabilityPanel.style.display = 'block';
            if (textPanel) textPanel.style.display = 'block';
            if (viewColorsPanel) viewColorsPanel.style.display = 'block';
            
            // Показать пресеты и кнопки
            if (presetDropdown) presetDropdown.style.display = 'flex';
            if (copyBtn) copyBtn.style.display = 'inline-flex';
            if (exportBtn) exportBtn.style.display = 'inline-flex';
            if (aboutVoidLink) aboutVoidLink.style.display = 'inline-flex';
            this.updateSaveDeleteButtons();
            
            // Скрыть панель редактора
            if (editorPanel) editorPanel.style.display = 'none';
            
            // Деактивировать редактор и активировать рендерер
            if (this.glyphEditor) {
                this.glyphEditor.deactivate();
            }
            
            // Принудительно обновить размеры canvas после обновления DOM
            requestAnimationFrame(() => {
                // Принудительный reflow для гарантии, что размеры контейнера обновились
                const canvas = document.getElementById('mainCanvas');
                if (canvas) {
                    canvas.offsetHeight; // Force reflow
                }
                
                // Обновить размеры canvas и отрендерить
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
        
        // Обработчик кнопки Save
        const saveBtn = document.getElementById('editorSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.glyphEditor) {
                    this.glyphEditor.saveGlyph();
                }
            });
        }
        
        // Обработчик кнопки Copy
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new VoidTypeface();
});

