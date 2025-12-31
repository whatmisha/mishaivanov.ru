/**
 * Void Typeface - главный файл инициализации
 */

import { VoidRenderer } from './core/VoidRenderer.js';
import { VoidExporter } from './core/VoidExporter.js';
import { PresetManager } from './core/PresetManager.js';
import { SliderController } from './ui/SliderController.js';
import { RangeSliderController } from './ui/RangeSliderController.js';
import { PanelManager } from './ui/PanelManager.js';
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
                text: 'Void\nTypeface\n2k26',
                showGrid: true,
                randomStemMin: 0.5,
                randomStemMax: 2.0,
                randomStrokesMin: 1,
                randomStrokesMax: 5,
                randomContrastMin: 0.1,
                randomContrastMax: 8.0,
                randomModeType: 'byType', // 'byType' или 'full'
                cornerRadiusMultiplier: 0,
                gradientType: 'none',
                gradientColor1: '#ffffff',
                gradientColor2: '#000000',
                gradientAngle: 0
            },
            get(key) { return this.values[key]; },
            set(key, value) { 
                this.values[key] = value;
                return value;
            }
        };

        // Инициализация компонентов
        this.initCanvas();
        this.initExporter();
        this.initPresetManager();
        this.initPanels();
        this.initSliders();
        this.initRangeSliders();
        this.initColorPickers();
        this.initTextInput();
        this.initModeToggle();
        this.initGridToggle();
        this.initPresets();
        this.initExport();
        this.initResize();
        
        // Первая отрисовка (с правильным вычислением параметров)
        this.updateRenderer();
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
        this.exporter = new VoidExporter(this.renderer);
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
            onUpdate: (value) => this.updateRenderer()
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
            onUpdate: (value) => this.updateRenderer()
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
            onUpdate: (value) => this.updateRenderer()
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
            onUpdate: (value) => this.updateRenderer()
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
            onUpdate: (value) => this.updateRenderer()
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
            onUpdate: (value) => this.updateRenderer()
        });

        // Corner Radius
        this.sliderController.initSlider('cornerRadiusSlider', {
            valueId: 'cornerRadiusValue',
            setting: 'cornerRadiusMultiplier',
            min: 0,
            max: 12,
            decimals: 1,
            baseStep: 0.5,
            shiftStep: 1,
            onUpdate: (value) => this.updateRenderer()
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
            onUpdate: (minValue, maxValue) => this.updateRenderer()
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
            onUpdate: (minValue, maxValue) => this.updateRenderer()
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
            onUpdate: (minValue, maxValue) => this.updateRenderer()
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
                }
            });
        }
    }

    /**
     * Инициализация color pickers
     */
    initColorPickers() {
        // Letter Color
        const letterColorInput = document.getElementById('letterColorInput');
        const letterColorPreview = document.getElementById('letterColorPreview');
        
        letterColorInput.addEventListener('input', (e) => {
            const value = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(value)) {
                this.settings.set('letterColor', value);
                letterColorPreview.style.backgroundColor = value;
                this.updateRenderer();
            }
        });

        letterColorPreview.addEventListener('click', () => {
            letterColorInput.focus();
            letterColorInput.select();
        });

        // Background Color
        const bgColorInput = document.getElementById('bgColorInput');
        const bgColorPreview = document.getElementById('bgColorPreview');
        
        bgColorInput.addEventListener('input', (e) => {
            const value = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(value)) {
                this.settings.set('bgColor', value);
                bgColorPreview.style.backgroundColor = value;
                this.updateRenderer();
            }
        });

        bgColorPreview.addEventListener('click', () => {
            bgColorInput.focus();
            bgColorInput.select();
        });

        // Gradient Color 1
        const gradientColor1Input = document.getElementById('gradientColor1Input');
        const gradientColor1Preview = document.getElementById('gradientColor1Preview');
        
        if (gradientColor1Input && gradientColor1Preview) {
            gradientColor1Input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(value)) {
                    this.settings.set('gradientColor1', value);
                    gradientColor1Preview.style.backgroundColor = value;
                    this.updateRenderer();
                }
            });

            gradientColor1Preview.addEventListener('click', () => {
                gradientColor1Input.focus();
                gradientColor1Input.select();
            });
        }

        // Gradient Color 2
        const gradientColor2Input = document.getElementById('gradientColor2Input');
        const gradientColor2Preview = document.getElementById('gradientColor2Preview');
        
        if (gradientColor2Input && gradientColor2Preview) {
            gradientColor2Input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(value)) {
                    this.settings.set('gradientColor2', value);
                    gradientColor2Preview.style.backgroundColor = value;
                    this.updateRenderer();
                }
            });

            gradientColor2Preview.addEventListener('click', () => {
                gradientColor2Input.focus();
                gradientColor2Input.select();
            });
        }

        // Gradient Type Select
        const gradientTypeSelect = document.getElementById('gradientTypeSelect');
        if (gradientTypeSelect) {
            gradientTypeSelect.addEventListener('change', (e) => {
                const gradientType = e.target.value;
                this.settings.set('gradientType', gradientType);
                this.updateGradientUI(gradientType);
                this.updateRenderer();
            });
        }

        // Gradient Angle Slider
        const gradientAngleSlider = document.getElementById('gradientAngleSlider');
        if (gradientAngleSlider) {
            this.sliderController.initSlider('gradientAngleSlider', {
                valueId: 'gradientAngleValue',
                setting: 'gradientAngle',
                min: 0,
                max: 360,
                decimals: 0,
                baseStep: 1,
                shiftStep: 15,
                onUpdate: (value) => this.updateRenderer()
            });
        }
    }

    /**
     * Обновить видимость UI элементов градиента
     */
    updateGradientUI(gradientType) {
        const gradientColor1Group = document.getElementById('gradientColor1Group');
        const gradientColor2Group = document.getElementById('gradientColor2Group');
        const gradientAngleGroup = document.getElementById('gradientAngleGroup');
        
        const showColors = gradientType !== 'none';
        const showAngle = gradientType === 'linear';
        
        if (gradientColor1Group) gradientColor1Group.style.display = showColors ? 'block' : 'none';
        if (gradientColor2Group) gradientColor2Group.style.display = showColors ? 'block' : 'none';
        if (gradientAngleGroup) gradientAngleGroup.style.display = showAngle ? 'block' : 'none';
    }

    /**
     * Инициализация text input с debounce
     */
    initTextInput() {
        const textarea = document.getElementById('textInput');
        
        const debouncedUpdate = MathUtils.debounce(() => {
            this.settings.set('text', textarea.value);
            this.renderer.setText(textarea.value);
            this.renderer.render();
        }, 300);

        textarea.addEventListener('input', debouncedUpdate);
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

        fillRadio.addEventListener('change', updateMode);
        stripesRadio.addEventListener('change', updateMode);
        randomRadio.addEventListener('change', updateMode);

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
            });
        }
    }

    /**
     * Инициализация переключателя сетки
     */
    initGridToggle() {
        const gridCheckbox = document.getElementById('showGridCheckbox');
        
        gridCheckbox.addEventListener('change', () => {
            this.settings.set('showGrid', gridCheckbox.checked);
            this.updateRenderer();
        });
    }

    /**
     * Инициализация preset'ов
     */
    initPresets() {
        const presetSelect = document.getElementById('presetSelect');
        const presetNameInput = document.getElementById('presetNameInput');
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');

        // Обновить список preset'ов
        this.updatePresetList();

        // Загрузка preset'а
        presetSelect.addEventListener('change', () => {
            const presetName = presetSelect.value;
            if (presetName) {
                this.loadPreset(presetName);
            }
        });

        // Сохранение preset'а
        const savePreset = () => {
            const name = presetNameInput.value.trim();
            if (!name) {
                alert('Введите имя preset\'а');
                return;
            }

            const result = this.presetManager.savePreset(name, this.settings.values);
            if (result.success) {
                presetNameInput.value = '';
                this.updatePresetList();
                alert(`Preset "${name}" сохранен`);
            } else {
                alert(result.error || 'Ошибка сохранения');
            }
        };

        savePresetBtn.addEventListener('click', savePreset);
        presetNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                savePreset();
            }
        });

        // Удаление preset'а
        deletePresetBtn.addEventListener('click', () => {
            const presetName = presetSelect.value;
            if (!presetName) {
                alert('Выберите preset для удаления');
                return;
            }

            if (confirm(`Удалить preset "${presetName}"?`)) {
                if (this.presetManager.deletePreset(presetName)) {
                    this.updatePresetList();
                    alert(`Preset "${presetName}" удален`);
                } else {
                    alert('Ошибка удаления');
                }
            }
        });
    }

    /**
     * Обновить список preset'ов в select
     */
    updatePresetList() {
        const presetSelect = document.getElementById('presetSelect');
        const names = this.presetManager.getPresetNames();
        
        presetSelect.innerHTML = '<option value="">Select preset</option>';
        names.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            presetSelect.appendChild(option);
        });
    }

    /**
     * Загрузить preset
     */
    loadPreset(name) {
        const preset = this.presetManager.loadPreset(name);
        if (!preset) {
            alert('Preset не найден');
            return;
        }

        // Применить все параметры из preset'а
        Object.keys(preset).forEach(key => {
            if (key !== 'createdAt' && this.settings.values.hasOwnProperty(key)) {
                this.settings.set(key, preset[key]);
            }
        });

        // Обновить UI
        this.updateUIFromSettings();
        
        // Обновить renderer
        this.updateRenderer();
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

        // Обновить градиенты
        const gradientTypeSelect = document.getElementById('gradientTypeSelect');
        if (gradientTypeSelect) {
            gradientTypeSelect.value = this.settings.get('gradientType') || 'none';
            this.updateGradientUI(this.settings.get('gradientType') || 'none');
        }
        
        const gradientColor1Input = document.getElementById('gradientColor1Input');
        const gradientColor1Preview = document.getElementById('gradientColor1Preview');
        if (gradientColor1Input && gradientColor1Preview) {
            const color1 = this.settings.get('gradientColor1') || '#ffffff';
            gradientColor1Input.value = color1;
            gradientColor1Preview.style.backgroundColor = color1;
        }
        
        const gradientColor2Input = document.getElementById('gradientColor2Input');
        const gradientColor2Preview = document.getElementById('gradientColor2Preview');
        if (gradientColor2Input && gradientColor2Preview) {
            const color2 = this.settings.get('gradientColor2') || '#000000';
            gradientColor2Input.value = color2;
            gradientColor2Preview.style.backgroundColor = color2;
        }
        
        const gradientAngleSlider = document.getElementById('gradientAngleSlider');
        if (gradientAngleSlider) {
            this.sliderController.setValue('gradientAngleSlider', this.settings.get('gradientAngle') || 0, false);
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
        document.getElementById('letterColorInput').value = letterColor;
        document.getElementById('letterColorPreview').style.backgroundColor = letterColor;
        document.getElementById('bgColorInput').value = bgColor;
        document.getElementById('bgColorPreview').style.backgroundColor = bgColor;

        // Обновить текст
        document.getElementById('textInput').value = this.settings.get('text');
        this.renderer.setText(this.settings.get('text'));

        // Обновить сетку
        document.getElementById('showGridCheckbox').checked = this.settings.get('showGrid');
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
            showGrid: this.settings.get('showGrid'),
            cornerRadius: moduleSize * (this.settings.get('cornerRadiusMultiplier') || 0),
            gradientType: this.settings.get('gradientType') || 'none',
            gradientColor1: this.settings.get('gradientColor1') || '#ffffff',
            gradientColor2: this.settings.get('gradientColor2') || '#000000',
            gradientAngle: this.settings.get('gradientAngle') || 0,
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
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new VoidTypeface();
});

