/**
 * RandomPanelController
 *
 * Owns everything specific to the Random panel:
 *   - per-parameter dice (◆) toggles via DICE_CONFIG
 *   - per-effect pill (◆) toggles via EFFECT_RANDOM_CONFIG
 *   - the active-params list / pills inside Random
 *   - 🎲 Shuffle (full re-roll) and ↺ Reset All
 *   - Random panel visibility/badge
 *
 * Receives the main `VoidTypeface` instance (as `app`) for shared
 * state and cross-cutting helpers (settings, sliders, history,
 * renderer, color UI). Methods are extracted verbatim from main.js;
 * call sites in main.js delegate via thin wrappers.
 */

import { DICE_CONFIG, EFFECT_RANDOM_CONFIG, syncRandomDiceTitle } from '../config/randomConfig.js';

export class RandomPanelController {
    constructor(app) {
        this.app = app;
    }

    // -------- per-parameter helpers --------

    resetDiceForParam(param) {
        const app = this.app;
        if (param === 'paletteColors') {
            app.settings.set('randomizeColor', false);
            app.syncPaletteSwatchDice();
            app.updatePaletteSizeGroupState();
            return;
        }
        const cfg = DICE_CONFIG[param];
        if (!cfg) return;
        app.settings.set(cfg.flag, false);
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
        const min = app.settings.get(cfg.minSetting);
        const max = app.settings.get(cfg.maxSetting);
        let val = (min + max) / 2;
        if (Number.isInteger(cfg.min) && Number.isInteger(cfg.max)) {
            val = Math.round(val);
        }
        app.settings.set(cfg.singleSetting, val);
        if (app.sliderController && app.sliderController.setValue) {
            app.sliderController.setValue(cfg.singleSlider, val, false);
        }
    }

    resetEffectRandomParam(key) {
        const cfg = EFFECT_RANDOM_CONFIG[key];
        if (!cfg) return;
        this.app.settings.set(cfg.flag, false);
    }

    /**
     * Re-roll effect pill values when their randomize flags are on (Randomize button)
     */
    rollEffectRandomValues() {
        const app = this.app;
        const coin = () => Math.random() < 0.5;
        for (const cfg of Object.values(EFFECT_RANDOM_CONFIG)) {
            if (!app.settings.get(cfg.flag)) continue;
            if (cfg.type === 'chaos') {
                const mode = coin() ? 'full' : 'byType';
                app.settings.set('randomModeType', mode);
                const chaosCb = document.getElementById('chaosCheckbox');
                if (chaosCb) chaosCb.checked = mode === 'full';
                if (app.renderer.clearModuleTypeCache) app.renderer.clearModuleTypeCache();
            } else {
                const v = coin();
                app.settings.set(cfg.setting, v);
                const cb = document.getElementById(cfg.checkboxId);
                if (cb) cb.checked = v;
            }
        }
    }

    // -------- dice / effect dice buttons --------

    initDiceButtons() {
        const app = this.app;
        const toggleDice = (param) => {
            const cfg = DICE_CONFIG[param];
            if (!cfg) return;
            const enabled = !app.settings.get(cfg.flag);
            app.settings.set(cfg.flag, enabled);
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
                app.settings.set(cfg.minSetting, dMin);
                app.settings.set(cfg.maxSetting, dMax);
                if (app.rangeSliderController && app.rangeSliderController.ranges.has(cfg.rangeSlider)) {
                    app.rangeSliderController.setValues(cfg.rangeSlider, dMin, dMax, false);
                }
            } else {
                const min = app.settings.get(cfg.minSetting);
                const max = app.settings.get(cfg.maxSetting);
                let val = (min + max) / 2;
                if (Number.isInteger(cfg.min) && Number.isInteger(cfg.max)) {
                    val = Math.round(val);
                }
                app.settings.set(cfg.singleSetting, val);
                app.sliderController.setValue(cfg.singleSlider, val, false);
            }
            if (param === 'paletteColors') {
                const cm = app.getDerivedColorMode();
                app.settings.set('colorMode', cm);
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    app.generateColorPalette();
                }
                app.updateColorModeUI();
            }
            this.updateRandomParamsList();
            this.updateRandomSectionVisibility();
            if (param === 'strokes') {
                app.updateStyleDimmedState();
                app.updateRoundedCapsVisibility();
                app.updateCloseEndsState();
            }
            app.updateRenderer();
            app.markAsChanged();
        };

        for (const param of Object.keys(DICE_CONFIG)) {
            if (param === 'paletteColors') {
                app.updatePaletteSizeGroupState();
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

            const enabled = app.settings.get(cfg.flag);
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

    initEffectDiceButtons() {
        const app = this.app;
        for (const key of Object.keys(EFFECT_RANDOM_CONFIG)) {
            const btn = document.querySelector(`.dice-btn--pill[data-effect="${key}"]`);
            if (!btn) continue;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cfg = EFFECT_RANDOM_CONFIG[key];
                if (!cfg) return;
                app.settings.set(cfg.flag, !app.settings.get(cfg.flag));
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                app.updateRenderer();
                app.markAsChanged();
            });
        }
        this.syncEffectDiceButtons();
    }

    syncEffectDiceButtons() {
        const app = this.app;
        for (const key of Object.keys(EFFECT_RANDOM_CONFIG)) {
            const cfg = EFFECT_RANDOM_CONFIG[key];
            const btn = document.querySelector(`.dice-btn--pill[data-effect="${key}"]`);
            if (btn) {
                const enabled = !!app.settings.get(cfg.flag);
                btn.classList.toggle('active', enabled);
                syncRandomDiceTitle(btn, enabled);
            }
        }
    }

    // -------- panel scaffolding --------

    initRandomSection() {
        const randomPanel = document.getElementById('randomPanel');
        if (!randomPanel) return;
        this.app.initChaosToggle();
        this.initShuffle();
        this.updateRandomParamsList();
        this.updateRandomSectionVisibility();
    }

    updateRandomParamsList() {
        const app = this.app;
        const container = document.getElementById('randomParamsList');
        if (!container) return;
        container.innerHTML = '';

        const showEmptyHint = () => {
            const hint = document.createElement('p');
            hint.className = 'random-params-empty-hint';
            hint.textContent = 'No parameters selected. Use ◇ to add sliders, effects, or colors to Random, then press Randomize.';
            container.appendChild(hint);
        };

        for (const [param, cfg] of Object.entries(DICE_CONFIG)) {
            if (!app.settings.get(cfg.flag)) continue;
            if (param === 'paletteColors' && app.settings.get('randomizeColor')) continue;

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
                app.updateRenderer();
                app.markAsChanged();
            });

            item.append(text, closeBtn);
            container.appendChild(item);
        }

        for (const [key, cfg] of Object.entries(EFFECT_RANDOM_CONFIG)) {
            if (!app.settings.get(cfg.flag)) continue;

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
                app.updateRenderer();
                app.markAsChanged();
            });

            item.append(text, closeBtn);
            container.appendChild(item);
        }

        if (app.settings.get('randomizeColor')) {
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
                app.settings.set('randomizeColor', false);
                app.syncPaletteSwatchDice();
                app.updatePaletteSizeGroupState();
                const cm = app.getDerivedColorMode();
                app.settings.set('colorMode', cm);
                app.updateColorModeUI();
                this.updateRandomParamsList();
                this.updateRandomSectionVisibility();
                app.updateRenderer();
                app.markAsChanged();
            });

            item.append(text, closeBtn);
            container.appendChild(item);
        }

        if (container.children.length === 0) {
            showEmptyHint();
        }
        this.syncEffectDiceButtons();
    }

    initShuffle() {
        const app = this.app;
        const btn = document.getElementById('shuffleBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const rand = (min, max) => min + Math.random() * (max - min);
            const coin = () => Math.random() < 0.5;

            for (const [, cfg] of Object.entries(DICE_CONFIG)) {
                const useRange = coin();
                app.settings.set(cfg.flag, useRange);

                if (useRange) {
                    let rMin = rand(cfg.min, cfg.max);
                    let rMax = rand(cfg.min, cfg.max);
                    if (rMin > rMax) [rMin, rMax] = [rMax, rMin];
                    if (Number.isInteger(cfg.min)) { rMin = Math.round(rMin); rMax = Math.round(rMax); }
                    app.settings.set(cfg.minSetting, rMin);
                    app.settings.set(cfg.maxSetting, rMax);
                    if (app.rangeSliderController && app.rangeSliderController.ranges.has(cfg.rangeSlider)) {
                        app.rangeSliderController.setValues(cfg.rangeSlider, rMin, rMax, false);
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
                    app.settings.set(cfg.singleSetting, val);
                    if (app.sliderController) app.sliderController.setValue(cfg.singleSlider, val, false);
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

            app.settings.set('dashEnabled', coin());
            const dashCb = document.getElementById('dashEnabledCheckbox');
            if (dashCb) dashCb.checked = app.settings.get('dashEnabled');

            app.settings.set('wobblyEnabled', coin());
            const wobblyCb = document.getElementById('wobblyCheckbox');
            if (wobblyCb) wobblyCb.checked = app.settings.get('wobblyEnabled');

            for (const cfg of Object.values(EFFECT_RANDOM_CONFIG)) {
                const on = coin();
                app.settings.set(cfg.flag, on);
                if (!on) continue;
                if (cfg.type === 'chaos') {
                    const mode = coin() ? 'full' : 'byType';
                    app.settings.set('randomModeType', mode);
                    const chaosCb = document.getElementById('chaosCheckbox');
                    if (chaosCb) chaosCb.checked = mode === 'full';
                } else {
                    const v = coin();
                    app.settings.set(cfg.setting, v);
                    const cb = document.getElementById(cfg.checkboxId);
                    if (cb) cb.checked = v;
                }
            }

            const randColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            app.settings.set('colorSource', coin() ? 'gradient' : 'solid');
            app.settings.set('paletteDiceLetter', coin());
            app.settings.set('paletteDiceGradientStart', coin());
            app.settings.set('paletteDiceGradientEnd', coin());
            app.settings.set('paletteDiceBg', coin());
            app.settings.set('paletteDiceGrid', coin());
            if (app.settings.get('randomizeColor')) {
                app.settings.set('colorChaosColors', Math.floor(Math.random() * 29) + 4);
                app.settings.set('randomizePaletteColors', true);
            } else {
                app.settings.set('randomizePaletteColors', false);
            }
            app.settings.set('letterColor', randColor());
            app.settings.set('bgColor', randColor());
            app.settings.set('gridColor', randColor());
            app.settings.set('gradientStartColor', randColor());
            app.settings.set('gradientEndColor', randColor());

            if (app.renderer.clearModuleTypeCache) app.renderer.clearModuleTypeCache();
            if (app.renderer.clearAlternativeGlyphCache) app.renderer.clearAlternativeGlyphCache();

            const shuffleColorMode = app.getDerivedColorMode();
            app.settings.set('colorMode', shuffleColorMode);
            if (shuffleColorMode === 'randomChaos' || shuffleColorMode === 'randomGradient') {
                app.generateColorPalette();
            }

            app.updateStyleDimmedState();
            app.updateRoundedCapsVisibility();
            app.updateWobblyVisibility();
            app.updateColorModeUI();
            app.updateUIFromSettings();
            this.updateRandomParamsList();
            this.updateRandomSectionVisibility();
            app.updateRenderer();
            app.markAsChanged();
        });
    }

    /**
     * Show/hide Random panel based on isRandom and update dice count badge
     */
    updateRandomSectionVisibility() {
        const app = this.app;
        const panel = document.getElementById('randomPanel');
        if (!panel) return;
        panel.style.display = '';

        let total = Object.values(DICE_CONFIG).filter(cfg => app.settings.get(cfg.flag)).length;
        total += Object.values(EFFECT_RANDOM_CONFIG).filter(cfg => app.settings.get(cfg.flag)).length;
        if (app.settings.get('randomizeColor')) total++;

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
        const app = this.app;
        const btn = document.getElementById('resetAllDiceBtn');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            const confirmed = await app.modalManager.show({
                title: 'Reset Random Settings?',
                text: 'All randomization parameters will be cleared and settings will return to defaults.',
                buttons: [
                    { id: 'reset', text: 'Reset', type: 'danger' },
                    { id: 'cancel', text: 'No', type: 'ghost' }
                ]
            });
            if (confirmed.action !== 'reset') return;

            app._flushAutoSnapshot();
            app.historyManager.beginAction('reset all', app.getStateSnapshot());

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
                app.settings.set(key, val);
            }

            app.sliderController.setValue('stemSlider', 0.5, false);
            app.sliderController.setValue('strokesSlider', 1, false);
            app.sliderController.setValue('strokeGapRatioSlider', 1.0, false);
            app.sliderController.setValue('dashLengthSlider', 1.00, false);
            app.sliderController.setValue('gapLengthSlider', 1.50, false);
            app.sliderController.setValue('wobblyAmountSlider', 3, false);
            app.sliderController.setValue('wobblyFrequencySlider', 0.1, false);
            app.sliderController.setValue('paletteColorsSlider', app.settings.get('colorChaosColors') || 16, false);

            app.updateColorModeUI();

            if (app.renderer.clearModuleTypeCache) app.renderer.clearModuleTypeCache();
            if (app.renderer.clearAlternativeGlyphCache) app.renderer.clearAlternativeGlyphCache();

            app.updateStyleDimmedState();
            app.updateRoundedCapsVisibility();
            app.updateWobblyVisibility();
            app.updateColorModeUI();
            app.updateUIFromSettings();
            this.updateRandomParamsList();
            this.updateRandomSectionVisibility();
            app.updateRenderer();
            app.markAsChanged();
            app.historyManager.commitAction(app.getStateSnapshot());
        });
    }
}
