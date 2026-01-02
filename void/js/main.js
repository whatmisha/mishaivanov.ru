/**
 * Void Typeface - главный файл инициализации
 */

import { VoidRenderer } from './core/VoidRenderer.js';
import { VoidExporter } from './core/VoidExporter.js';
import { PresetManager } from './core/PresetManager.js';
import { SliderController } from './ui/SliderController.js';
import { RangeSliderController } from './ui/RangeSliderController.js';
import { PanelManager } from './ui/PanelManager.js';
import { ColorPicker } from './ui/ColorPicker.js';
import { MathUtils } from './utils/MathUtils.js';

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
                text: 'Void\nTypeface\ncoded',
                textAlign: 'center',
                showGrid: true,
                includeGridToExport: false,
                randomStemMin: 0.5,
                randomStemMax: 2.0,
                randomStrokesMin: 1,
                randomStrokesMax: 5,
                randomContrastMin: 0.1,
                randomContrastMax: 8.0,
                randomModeType: 'byType', // 'byType' или 'full'
                cornerRadiusMultiplier: 0
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
            this.initGridToggle();
            
            // Отслеживание изменений для показа кнопки Save
            this.hasUnsavedChanges = false;
            this.currentPresetName = 'Default';
            this.isLoadingPreset = false;
            this.isInitializing = true; // Флаг инициализации
            
            this.setupChangeTracking();
            this.initPresets();
            this.initExport();
            this.initResize();
            
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
        
        // Установить режим Random и текст
        this.settings.set('mode', 'random');
        this.settings.set('text', 'ONLY\nDESK\nTOP');
        
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
     * чтобы текст "ONLY\nDESK\nTOP" влезал в окно без обрезки
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
            
            // Текст состоит из 3 строк: "ONLY", "DESK", "TOP"
            // Самая длинная строка - "ONLY" и "DESK" (4 символа)
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
            
            // Установить размер модуля (но не меньше 8px и не больше 64px)
            const finalModuleSize = Math.max(8, Math.min(64, optimalModuleSize));
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
            max: 64,
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
            max: 16,
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

        // Corner Radius
        this.sliderController.initSlider('cornerRadiusSlider', {
            valueId: 'cornerRadiusValue',
            setting: 'cornerRadiusMultiplier',
            min: 0,
            max: 1,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 1,
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

        // Strokes Range
        this.rangeSliderController.initRangeSlider('randomStrokesRangeSlider', {
            minSetting: 'randomStrokesMin',
            maxSetting: 'randomStrokesMax',
            minValueId: 'randomStrokesMinValue',
            maxValueId: 'randomStrokesMaxValue',
            min: 1,
            max: 5,
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
                    const clampedValue = Math.max(min, Math.min(5, Math.round(value)));
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
     * Инициализация переключателя режима отрисовки
     */
    initModeToggle() {
        const fillRadio = document.getElementById('modeFill');
        const stripesRadio = document.getElementById('modeStripes');
        const randomRadio = document.getElementById('modeRandom');
        const strokesControlGroup = document.getElementById('strokesControlGroup');
        const strokeGapRatioControlGroup = document.getElementById('strokeGapRatioControlGroup');

        const updateMode = () => {
            let mode = 'fill';
            if (fillRadio.checked) mode = 'fill';
            else if (stripesRadio.checked) mode = 'stripes';
            else if (randomRadio.checked) mode = 'random';
            
            this.settings.set('mode', mode);
            
            // Очистить кэш при переключении режима
            if (this.renderer.clearModuleTypeCache) {
                this.renderer.clearModuleTypeCache();
            }
            
            // Показать/скрыть контролы в зависимости от режима
            strokesControlGroup.style.display = mode === 'stripes' ? 'block' : 'none';
            strokeGapRatioControlGroup.style.display = mode === 'stripes' ? 'block' : 'none';
            
            const randomGroups = [
                document.getElementById('randomControlGroup'),
                document.getElementById('randomControlGroupStem'),
                document.getElementById('randomControlGroup2'),
                document.getElementById('randomControlGroup3'),
                document.getElementById('randomControlGroup5')
            ];
            randomGroups.forEach(group => {
                if (group) {
                    group.style.display = mode === 'random' ? 'block' : 'none';
                }
            });
            
            // Инициализация toggle для режима рандома
            const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
            if (randomFullRandomCheckbox && mode === 'random') {
                randomFullRandomCheckbox.checked = this.settings.get('randomModeType') === 'full';
            }
            
            // Отключить/включить Stem Weight в панели Metrics при режиме Random
            const stemSlider = document.getElementById('stemSlider');
            const stemValue = document.getElementById('stemValue');
            if (stemSlider && stemValue) {
                const isDisabled = mode === 'random';
                stemSlider.disabled = isDisabled;
                stemValue.disabled = isDisabled;
            }
            
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
    }

    /**
     * Инициализация переключателя сетки
     */
    initGridToggle() {
        const gridCheckbox = document.getElementById('showGridCheckbox');
        const includeGridToExportCheckbox = document.getElementById('includeGridToExportCheckbox');
        
        gridCheckbox.addEventListener('change', () => {
            this.settings.set('showGrid', gridCheckbox.checked);
            this.updateRenderer();
            this.markAsChanged();
        });

        includeGridToExportCheckbox.addEventListener('change', () => {
            this.settings.set('includeGridToExport', includeGridToExportCheckbox.checked);
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

        // Создать дефолтный пресет если его нет
        if (!this.presetManager.loadPreset('Default')) {
            this.presetManager.savePreset('Default', this.settings.values);
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
        this.sliderController.setValue('cornerRadiusSlider', this.settings.get('cornerRadiusMultiplier'), false);
        
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
        document.getElementById('modeRandom').checked = mode === 'random';
        document.getElementById('strokesControlGroup').style.display = mode === 'stripes' ? 'block' : 'none';
        document.getElementById('strokeGapRatioControlGroup').style.display = mode === 'stripes' ? 'block' : 'none';
        
        const randomGroups = [
            document.getElementById('randomControlGroup'),
            document.getElementById('randomControlGroupStem'),
            document.getElementById('randomControlGroup2'),
            document.getElementById('randomControlGroup3'),
            document.getElementById('randomControlGroup5')
        ];
        randomGroups.forEach(group => {
            if (group) {
                group.style.display = mode === 'random' ? 'block' : 'none';
            }
        });

        // Обновить состояние toggle для режима рандома
        const randomFullRandomCheckbox = document.getElementById('randomFullRandomCheckbox');
        if (randomFullRandomCheckbox) {
            randomFullRandomCheckbox.checked = this.settings.get('randomModeType') === 'full';
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

        // Обновить сетку
        document.getElementById('showGridCheckbox').checked = this.settings.get('showGrid');
        document.getElementById('includeGridToExportCheckbox').checked = this.settings.get('includeGridToExport');
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
        const moduleSize = this.settings.get('moduleSize');
        // Умножаем на 2, так как в ModuleDrawer используется stem / 2
        const stem = moduleSize * this.settings.get('stemMultiplier') * 2;
        const letterSpacing = moduleSize * this.settings.get('letterSpacingMultiplier');
        const lineHeight = moduleSize * this.settings.get('lineHeightMultiplier');
        
        this.renderer.updateParams({
            stem: stem,
            moduleSize: moduleSize,
            letterSpacing: letterSpacing,
            lineHeight: lineHeight,
            strokesNum: this.settings.get('strokesNum'),
            strokeGapRatio: this.settings.get('strokeGapRatio'),
            mode: this.settings.get('mode'),
            color: this.settings.get('letterColor'),
            bgColor: this.settings.get('bgColor'),
            gridColor: this.settings.get('gridColor'),
            textAlign: this.settings.get('textAlign') || 'center',
            showGrid: this.settings.get('showGrid'),
            includeGridToExport: this.settings.get('includeGridToExport'),
            cornerRadius: moduleSize * (this.settings.get('cornerRadiusMultiplier') || 0),
            randomStemMin: this.settings.get('randomStemMin'),
            randomStemMax: this.settings.get('randomStemMax'),
            randomStrokesMin: this.settings.get('randomStrokesMin'),
            randomStrokesMax: this.settings.get('randomStrokesMax'),
            randomContrastMin: this.settings.get('randomContrastMin'),
            randomContrastMax: this.settings.get('randomContrastMax'),
            randomModeType: this.settings.get('randomModeType')
        });
        
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
        // Не отслеживать изменения во время загрузки пресета или инициализации
        if (!this.isLoadingPreset && !this.isInitializing) {
            this.hasUnsavedChanges = true;
            this.updateSaveDeleteButtons();
        }
    }

    /**
     * Обновить видимость кнопок Save и Delete
     */
    updateSaveDeleteButtons() {
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
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new VoidTypeface();
});

