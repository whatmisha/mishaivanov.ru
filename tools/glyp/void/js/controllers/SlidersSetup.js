/**
 * Slider initialisation.
 *
 * Wires SliderController (single-thumb sliders), RangeSliderController
 * (two-thumb min/max sliders for Random mode) and the compact Figma-style
 * number inputs (letter spacing, line height).
 *
 * onUpdate callbacks intentionally remain inline closures: they reach
 * back into the host app for cross-cutting effects (cache clearing,
 * dimmed-state updates, "params list" refresh) that don't belong on a
 * pure data table.
 */

import { SliderController } from '../ui/SliderController.js';
import { RangeSliderController } from '../ui/RangeSliderController.js';

export class SlidersSetup {
    /**
     * @param {object} app — VoidTypeface instance.
     */
    constructor(app) {
        this.app = app;
    }

    /** Initialise single-thumb sliders + the two compact number inputs. */
    initSliders() {
        const app = this.app;
        app.sliderController = new SliderController(app.settings);

        const renderAndMark = () => {
            app.throttledUpdateRenderer();
            app.markAsChanged();
        };

        // Module size (px)
        app.sliderController.initSlider('moduleSizeSlider', {
            valueId: 'moduleSizeValue',
            setting: 'moduleSize',
            min: 4, max: 128, decimals: 0, baseStep: 1, shiftStep: 4,
            onUpdate: renderAndMark
        });

        // Stem weight (× module)
        app.sliderController.initSlider('stemSlider', {
            valueId: 'stemValue',
            setting: 'stemMultiplier',
            min: 0.1, max: 3.0, decimals: 2, baseStep: 0.01, shiftStep: 0.1,
            onUpdate: renderAndMark
        });

        // Letter Spacing / Line Height — compact integer inputs.
        this.initCompactInput('letterSpacingValue', {
            setting: 'letterSpacingMultiplier', min: 0, max: 16, step: 1
        });
        this.initCompactInput('lineHeightValue', {
            setting: 'lineHeightMultiplier', min: 0, max: 16, step: 1
        });

        // Strokes — also affects "Lines" UI state.
        app.sliderController.initSlider('strokesSlider', {
            valueId: 'strokesValue',
            setting: 'strokesNum',
            min: 1, max: 64, decimals: 0, baseStep: 1, shiftStep: 1,
            onUpdate: (value) => {
                if (value === 1 && !app.linesAllowMultiLineForStyleUI()) {
                    app.resetDiceForParam('contrast');
                    app.updateRandomParamsList();
                    app.updateRandomSectionVisibility();
                }
                app.updateStyleDimmedState();
                app.updateRoundedCapsVisibility();
                app.throttledUpdateRenderer();
                app.markAsChanged();
            }
        });

        app.sliderController.initSlider('strokeGapRatioSlider', {
            valueId: 'strokeGapRatioValue',
            setting: 'strokeGapRatio',
            min: 0.1, max: 8.0, decimals: 1, baseStep: 0.1, shiftStep: 0.5,
            onUpdate: renderAndMark
        });

        app.sliderController.initSlider('dashLengthSlider', {
            valueId: 'dashLengthValue',
            setting: 'dashLength',
            min: 0.01, max: 8.0, decimals: 2, baseStep: 0.01, shiftStep: 0.1,
            onUpdate: renderAndMark
        });

        app.sliderController.initSlider('gapLengthSlider', {
            valueId: 'gapLengthValue',
            setting: 'gapLength',
            min: 0.01, max: 8.0, decimals: 2, baseStep: 0.01, shiftStep: 0.1,
            onUpdate: renderAndMark
        });

        app.sliderController.initSlider('wobblyAmountSlider', {
            valueId: 'wobblyAmountValue',
            setting: 'wobblyAmount',
            min: 0, max: 20, decimals: 1, baseStep: 0.5, shiftStep: 1,
            onUpdate: renderAndMark
        });

        app.sliderController.initSlider('wobblyFrequencySlider', {
            valueId: 'wobblyFrequencyValue',
            setting: 'wobblyFrequency',
            min: 0.01, max: 0.5, decimals: 2, baseStep: 0.01, shiftStep: 0.05,
            onUpdate: renderAndMark
        });

        // Palette Colors — re-derives palette / colour mode.
        app.sliderController.initSlider('paletteColorsSlider', {
            valueId: 'paletteColorsValue',
            setting: 'colorChaosColors',
            min: 3, max: 32, decimals: 0,
            onUpdate: () => {
                if (!app.settings.get('randomizeColor')) return;
                const cm = app.getDerivedColorMode();
                app.settings.set('colorMode', cm);
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    app.generateColorPalette();
                }
                app.updateRandomParamsList();
                app.updateRandomSectionVisibility();
                app.updateRenderer();
                app.markAsChanged();
            }
        });
    }

    /**
     * Init a compact number input (Figma-style). Stores a reference in
     * app.compactInputs so presets can update it later.
     */
    initCompactInput(inputId, config) {
        const app = this.app;
        const input = document.getElementById(inputId);
        if (!input) return;

        const { setting, min, max, onUpdate } = config;

        input.value = app.settings.get(setting);

        const handleChange = () => {
            let value = parseInt(input.value, 10);
            if (isNaN(value)) value = min;
            value = Math.max(min, Math.min(max, value));
            input.value = value;
            app.settings.set(setting, value);
            if (onUpdate) onUpdate();
            else app.updateRenderer();
            app.markAsChanged();
        };

        input.addEventListener('change', handleChange);
        input.addEventListener('input', handleChange);

        if (!app.compactInputs) app.compactInputs = {};
        app.compactInputs[inputId] = { input, setting, min, max };
    }

    /** Init range sliders for Random mode (min/max thumbs + min/max inputs). */
    initRangeSliders() {
        const app = this.app;
        app.rangeSliderController = new RangeSliderController(app.settings);

        const initIfExists = (id, config) => {
            if (document.getElementById(id)) {
                app.rangeSliderController.initRangeSlider(id, config);
            }
        };

        const onShapeRangeChange = () => {
            if (app.renderer.clearModuleTypeCache) app.renderer.clearModuleTypeCache();
            app.throttledUpdateRenderer();
        };
        const onWobblyRangeChange = () => {
            if (app.settings.get('isRandom')) app.updateRenderer();
        };

        initIfExists('randomStemRangeSlider', {
            minSetting: 'randomStemMin', maxSetting: 'randomStemMax',
            minValueId: 'randomStemMinValue', maxValueId: 'randomStemMaxValue',
            min: 0.1, max: 3.0, decimals: 2, baseStep: 0.01, shiftStep: 0.1,
            onUpdate: onShapeRangeChange
        });

        initIfExists('randomStrokesRangeSlider', {
            minSetting: 'randomStrokesMin', maxSetting: 'randomStrokesMax',
            minValueId: 'randomStrokesMinValue', maxValueId: 'randomStrokesMaxValue',
            min: 1, max: 64, decimals: 0, baseStep: 1, shiftStep: 1,
            onUpdate: () => {
                if (app.renderer.clearModuleTypeCache) app.renderer.clearModuleTypeCache();
                app.updateCloseEndsState();
                if (!app.linesAllowMultiLineForStyleUI()) {
                    app.resetDiceForParam('contrast');
                    app.updateRandomParamsList();
                    app.updateRandomSectionVisibility();
                }
                app.updateStyleDimmedState();
                app.updateRoundedCapsVisibility();
                app.throttledUpdateRenderer();
            }
        });

        initIfExists('randomContrastRangeSlider', {
            minSetting: 'randomContrastMin', maxSetting: 'randomContrastMax',
            minValueId: 'randomContrastMinValue', maxValueId: 'randomContrastMaxValue',
            min: 0.1, max: 8.0, decimals: 1, baseStep: 0.1, shiftStep: 0.5,
            onUpdate: onShapeRangeChange
        });

        initIfExists('randomDashLengthRangeSlider', {
            minSetting: 'randomDashLengthMin', maxSetting: 'randomDashLengthMax',
            minValueId: 'randomDashLengthMinValue', maxValueId: 'randomDashLengthMaxValue',
            min: 0.1, max: 5.0, decimals: 1, baseStep: 0.1, shiftStep: 0.5,
            onUpdate: onShapeRangeChange
        });

        initIfExists('randomGapLengthRangeSlider', {
            minSetting: 'randomGapLengthMin', maxSetting: 'randomGapLengthMax',
            minValueId: 'randomGapLengthMinValue', maxValueId: 'randomGapLengthMaxValue',
            min: 0.1, max: 5.0, decimals: 1, baseStep: 0.1, shiftStep: 0.5,
            onUpdate: onShapeRangeChange
        });

        initIfExists('randomPaletteColorsRangeSlider', {
            minSetting: 'randomPaletteColorsMin', maxSetting: 'randomPaletteColorsMax',
            minValueId: 'randomPaletteColorsMinValue', maxValueId: 'randomPaletteColorsMaxValue',
            min: 3, max: 32, decimals: 0, baseStep: 1, shiftStep: 1,
            onUpdate: () => {
                if (!app.settings.get('randomizeColor')) return;
                const cm = app.getDerivedColorMode();
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    app.generateColorPalette();
                    app.updateRenderer();
                }
            }
        });

        initIfExists('randomWobblyAmountRangeSlider', {
            minSetting: 'randomWobblyAmountMin', maxSetting: 'randomWobblyAmountMax',
            minValueId: 'randomWobblyAmountMinValue', maxValueId: 'randomWobblyAmountMaxValue',
            min: 0, max: 20, decimals: 1, baseStep: 0.5, shiftStep: 1,
            onUpdate: onWobblyRangeChange
        });

        initIfExists('randomWobblyFrequencyRangeSlider', {
            minSetting: 'randomWobblyFrequencyMin', maxSetting: 'randomWobblyFrequencyMax',
            minValueId: 'randomWobblyFrequencyMinValue', maxValueId: 'randomWobblyFrequencyMaxValue',
            min: 0.01, max: 0.5, decimals: 2, baseStep: 0.01, shiftStep: 0.05,
            onUpdate: onWobblyRangeChange
        });

        this._initRangeInputBlurHandlers();
    }

    /**
     * Wire blur handlers on the min/max <input>s so typed values clamp
     * and propagate back into the range slider. The original loose-form
     * code had ten near-identical blocks; this collapses them via a config.
     */
    _initRangeInputBlurHandlers() {
        const app = this.app;

        const onShape = () => {
            if (app.renderer.clearModuleTypeCache) app.renderer.clearModuleTypeCache();
            app.updateRenderer();
        };
        const onWobblyIfRandom = () => {
            if (app.settings.get('isRandom')) app.updateRenderer();
        };

        /**
         * Each binding describes a min/max pair of inputs sharing one slider.
         * absMin/absMax are the global bounds; the typed value is also
         * clamped against the OTHER side's current setting so min ≤ max
         * is preserved (matching the original behaviour exactly).
         */
        const bindings = [
            { slider: 'randomStemRangeSlider',
              minSetting: 'randomStemMin',          maxSetting: 'randomStemMax',
              minInput:   'randomStemMinValue',     maxInput:   'randomStemMaxValue',
              absMin: 0.1, absMax: 3.0, onUpdate: onShape },
            { slider: 'randomStrokesRangeSlider',
              minSetting: 'randomStrokesMin',       maxSetting: 'randomStrokesMax',
              minInput:   'randomStrokesMinValue',  maxInput:   'randomStrokesMaxValue',
              absMin: 1, absMax: 64, integer: true, onUpdate: onShape },
            { slider: 'randomContrastRangeSlider',
              minSetting: 'randomContrastMin',      maxSetting: 'randomContrastMax',
              minInput:   'randomContrastMinValue', maxInput:   'randomContrastMaxValue',
              absMin: 0.1, absMax: 8.0, onUpdate: onShape },
            { slider: 'randomWobblyAmountRangeSlider',
              minSetting: 'randomWobblyAmountMin',  maxSetting: 'randomWobblyAmountMax',
              minInput:   'randomWobblyAmountMinValue', maxInput: 'randomWobblyAmountMaxValue',
              absMin: 0, absMax: 20, onUpdate: onWobblyIfRandom },
            { slider: 'randomWobblyFrequencyRangeSlider',
              minSetting: 'randomWobblyFrequencyMin', maxSetting: 'randomWobblyFrequencyMax',
              minInput:   'randomWobblyFrequencyMinValue', maxInput: 'randomWobblyFrequencyMaxValue',
              absMin: 0.01, absMax: 0.5, onUpdate: onWobblyIfRandom }
        ];

        for (const b of bindings) {
            this._wireRangeInput({ side: 'min', binding: b });
            this._wireRangeInput({ side: 'max', binding: b });
        }
    }

    _wireRangeInput({ side, binding }) {
        const app = this.app;
        const inputId = side === 'min' ? binding.minInput : binding.maxInput;
        const input = document.getElementById(inputId);
        if (!input) return;

        input.addEventListener('blur', () => {
            const raw = parseFloat(input.value);
            if (isNaN(raw)) return;
            const value = binding.integer ? Math.round(raw) : raw;

            const otherKey = side === 'min' ? binding.maxSetting : binding.minSetting;
            const other = app.settings.get(otherKey);

            let lo, hi;
            if (side === 'min') { lo = binding.absMin; hi = other; }
            else                { lo = other;          hi = binding.absMax; }

            const clamped = Math.max(lo, Math.min(hi, value));
            const minVal = side === 'min' ? clamped : other;
            const maxVal = side === 'max' ? clamped : other;
            app.rangeSliderController.setValues(binding.slider, minVal, maxVal, true);

            if (binding.onUpdate) binding.onUpdate();
        });
    }
}

