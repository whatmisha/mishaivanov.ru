/**
 * Void Typeface - главный файл инициализации
 */

import { VoidRenderer } from './core/VoidRenderer.js';
import { VoidExporter } from './core/VoidExporter.js';
import { PresetManager } from './core/PresetManager.js';
import { SliderController } from './ui/SliderController.js';
import { PanelManager } from './ui/PanelManager.js';
import { MathUtils } from './utils/MathUtils.js';

class VoidTypeface {
    constructor() {
        // Settings storage
        this.settings = {
            values: {
                stemMultiplier: 1.0, // множитель размера модуля
                moduleSize: 12,
                letterSpacingMultiplier: 1,
                lineHeightMultiplier: 6,
                strokesNum: 2,
                mode: 'fill',
                letterColor: '#ffffff',
                bgColor: '#000000',
                text: 'VOID TYPEFACE',
                showGrid: true
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
        this.initColorPickers();
        this.initTextInput();
        this.initModeToggle();
        this.initGridToggle();
        this.initPresets();
        this.initExport();
        this.initResize();
        
        // Первая отрисовка
        this.renderer.render();
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

        // Stem Weight (относительно размера модуля)
        this.sliderController.initSlider('stemSlider', {
            valueId: 'stemValue',
            setting: 'stemMultiplier',
            min: 0.1,
            max: 3,
            decimals: 1,
            baseStep: 0.1,
            shiftStep: 0.5,
            onUpdate: (value) => this.updateRenderer()
        });

        // Letter Size (Module Size)
        this.sliderController.initSlider('moduleSizeSlider', {
            valueId: 'moduleSizeValue',
            setting: 'moduleSize',
            min: 4,
            max: 24,
            decimals: 0,
            baseStep: 1,
            shiftStep: 4,
            onUpdate: (value) => this.updateRenderer()
        });

        // Letter Spacing (относительно размера модуля)
        this.sliderController.initSlider('letterSpacingSlider', {
            valueId: 'letterSpacingValue',
            setting: 'letterSpacingMultiplier',
            min: 0,
            max: 4,
            decimals: 0,
            baseStep: 1,
            shiftStep: 1,
            onUpdate: (value) => this.updateRenderer()
        });

        // Line Height (относительно размера модуля)
        this.sliderController.initSlider('lineHeightSlider', {
            valueId: 'lineHeightValue',
            setting: 'lineHeightMultiplier',
            min: 5,
            max: 12,
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
            max: 5,
            decimals: 0,
            baseStep: 1,
            shiftStep: 1,
            onUpdate: (value) => this.updateRenderer()
        });
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
        const strokesControlGroup = document.getElementById('strokesControlGroup');

        const updateMode = () => {
            const mode = fillRadio.checked ? 'fill' : 'stripes';
            this.settings.set('mode', mode);
            
            // Показать/скрыть контрол количества полосок
            strokesControlGroup.style.display = mode === 'stripes' ? 'block' : 'none';
            
            this.updateRenderer();
        };

        fillRadio.addEventListener('change', updateMode);
        stripesRadio.addEventListener('change', updateMode);
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
        
        presetSelect.innerHTML = '<option value="">-- Select preset --</option>';
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

        // Обновить режим отрисовки
        const mode = this.settings.get('mode');
        document.getElementById('modeFill').checked = mode === 'fill';
        document.getElementById('modeStripes').checked = mode === 'stripes';
        document.getElementById('strokesControlGroup').style.display = mode === 'stripes' ? 'block' : 'none';

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
        
        exportBtn.addEventListener('click', () => {
            this.exportSVG();
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
        const stem = moduleSize * this.settings.get('stemMultiplier');
        const letterSpacing = moduleSize * this.settings.get('letterSpacingMultiplier');
        const lineHeight = moduleSize * this.settings.get('lineHeightMultiplier');
        
        this.renderer.updateParams({
            stem: stem,
            moduleSize: moduleSize,
            letterSpacing: letterSpacing,
            lineHeight: lineHeight,
            strokesNum: this.settings.get('strokesNum'),
            mode: this.settings.get('mode'),
            color: this.settings.get('letterColor'),
            bgColor: this.settings.get('bgColor'),
            showGrid: this.settings.get('showGrid')
        });
        this.renderer.render();
    }

    /**
     * Экспорт в SVG
     */
    exportSVG() {
        this.exporter.exportToSVG();
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new VoidTypeface();
});

