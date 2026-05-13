/**
 * ColorController
 *
 * Owns everything specific to colour UI and palette generation:
 *   - swatch dots / hex inputs / unified color picker docking
 *   - Solid / Gradient source switching
 *   - palette swatch ◆ dice (live palette participation)
 *   - colour-mode UI (solid/gradient/randomChaos/randomGradient)
 *   - random palette generation, per-module colour & gradient lookup
 *   - B/W effect toggle
 *
 * State (`unifiedColorPicker`, `activeColorType`, `colorPalette`,
 * `gradientPairs`, `moduleColorCache`, `moduleGradientCache`,
 * `globalModuleIndex`, `globalGradientIndex`) intentionally lives on
 * the main `app` instance so renderer / presets / undo–redo can read
 * and reset it without going through the controller.
 */

import { ColorPicker } from '../ui/ColorPicker.js';
import { ColorUtils } from '../utils/ColorUtils.js';
import { syncRandomDiceTitle } from '../config/randomConfig.js';

const PALETTE_DICE_MAP = {
    letter: 'paletteDiceLetter',
    bg: 'paletteDiceBg',
    grid: 'paletteDiceGrid',
    gradientStart: 'paletteDiceGradientStart',
    gradientEnd: 'paletteDiceGradientEnd'
};

export class ColorController {
    constructor(app) {
        this.app = app;
    }

    // -------- swatch UI primitives --------

    updateColorPreview(preview, color) {
        if (preview) preview.style.backgroundColor = color;
    }

    highlightActiveSwatch(activeType) {
        const map = this.app.colorTypeMap;
        for (const [type, info] of Object.entries(map)) {
            const item = document.getElementById(info.itemId);
            if (item) {
                item.classList.toggle('active', type === activeType);
                const row = item.closest('.color-swatch-row');
                if (row) row.classList.toggle('active', type === activeType);
            }
        }
    }

    updateColorIndicator(show) {
        this.highlightActiveSwatch(show ? this.app.activeColorType : null);
    }

    dockUnifiedColorPickerForType(colorType) {
        const info = this.app.colorTypeMap[colorType];
        if (!info?.hsbSlotId) return;
        const slot = document.getElementById(info.hsbSlotId);
        const container = document.getElementById('unifiedColorPickerContainer');
        if (slot && container && container.parentElement !== slot) {
            slot.appendChild(container);
        }
    }

    /** Apply hex from swatch row input; returns true if valid and applied */
    applySwatchHexInput(colorType, raw) {
        const app = this.app;
        const info = app.colorTypeMap[colorType];
        if (!info) return false;
        let v = (raw || '').trim();
        if (v && !v.startsWith('#')) v = '#' + v;
        if (!/^#[0-9A-F]{6}$/i.test(v)) return false;
        const hex = v.toLowerCase();
        if (!ColorUtils.hexToRgb(hex)) return false;
        app.settings.set(info.setting, hex);
        this.updateSwatchDisplay(colorType, hex);
        if (colorType === 'bg') this.updateSwatchDisplay('gradientBg', hex);
        else if (colorType === 'gradientBg') this.updateSwatchDisplay('bg', hex);
        else if (colorType === 'grid') this.updateSwatchDisplay('gradientGrid', hex);
        else if (colorType === 'gradientGrid') this.updateSwatchDisplay('grid', hex);
        if (app.unifiedColorPicker && app.activeColorType === colorType) {
            app.unifiedColorPicker.setColor(hex);
        }
        app.updateRenderer();
        app.markAsChanged();
        return true;
    }

    /** Update a compact swatch dot + hex input value */
    updateSwatchDisplay(colorType, color) {
        const info = this.app.colorTypeMap[colorType];
        if (!info) return;
        const dot = document.getElementById(info.dotId);
        const hexEl = document.getElementById(info.hexId);
        if (dot) dot.style.background = color;
        if (hexEl) {
            if (hexEl.tagName === 'INPUT') hexEl.value = color;
            else hexEl.textContent = color;
        }
    }

    // -------- main picker init --------

    initColorPickers() {
        const app = this.app;
        for (const [type, info] of Object.entries(app.colorTypeMap)) {
            const color = app.settings.get(info.setting);
            this.updateSwatchDisplay(type, color);
        }

        app.unifiedColorPicker = new ColorPicker({
            containerId: 'unifiedColorPickerContainer',
            initialColor: app.settings.get('letterColor'),
            onChange: (color) => {
                const info = app.colorTypeMap[app.activeColorType];
                if (!info) return;
                app.settings.set(info.setting, color);
                this.updateSwatchDisplay(app.activeColorType, color);
                if (app.activeColorType === 'bg') this.updateSwatchDisplay('gradientBg', color);
                else if (app.activeColorType === 'gradientBg') this.updateSwatchDisplay('bg', color);
                else if (app.activeColorType === 'grid') this.updateSwatchDisplay('gradientGrid', color);
                else if (app.activeColorType === 'gradientGrid') this.updateSwatchDisplay('grid', color);
                app.updateRenderer();
                app.markAsChanged();
            }
        });
        app.unifiedColorPicker.init();

        for (const [type, info] of Object.entries(app.colorTypeMap)) {
            const toggleUnifiedPicker = () => {
                const pickerElement = app.unifiedColorPicker.elements?.picker;
                const isCurrentlyActive = app.activeColorType === type &&
                    pickerElement && pickerElement.style.display !== 'none';
                if (isCurrentlyActive) {
                    app.unifiedColorPicker.close();
                    this.highlightActiveSwatch(null);
                    return;
                }
                app.activeColorType = type;
                this.dockUnifiedColorPickerForType(type);
                app.unifiedColorPicker.setColor(app.settings.get(info.setting));
                app.unifiedColorPicker.open();
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
                        hexIn.value = app.settings.get(info.setting);
                    }
                });
            }
        }

        app.activeColorType = 'letter';
        app.unifiedColorPicker.setColor(app.settings.get('letterColor'));
        this.updateColorIndicator(false);

        this.initColorSourceButtons();
        this.initPaletteSwatchDice();
        this.updateColorModeUI();
    }

    // -------- mode + source --------

    /** Compute colorMode from colorSource + randomizeColor */
    getDerivedColorMode() {
        const source = this.app.settings.get('colorSource') || 'solid';
        const random = !!this.app.settings.get('randomizeColor');
        if (source === 'gradient') return random ? 'randomGradient' : 'gradient';
        return random ? 'randomChaos' : 'manual';
    }

    /** Apply actions when color mode changes (generate palette, render). */
    applyColorMode(mode) {
        if (mode === 'randomChaos' || mode === 'randomGradient') {
            this.generateColorPalette();
        }
        this.app.updateRenderer();
    }

    initColorSourceButtons() {
        const app = this.app;
        const buttons = document.querySelectorAll('#colorSourceButtons .style-button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const newSource = btn.dataset.colorSource;
                if (!newSource) return;
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                app.settings.set('colorSource', newSource);
                if (app.unifiedColorPicker) app.unifiedColorPicker.close();
                this.highlightActiveSwatch(null);
                const colorMode = this.getDerivedColorMode();
                app.settings.set('colorMode', colorMode);
                this.applyColorMode(colorMode);
                this.updateColorModeUI();
                app.markAsChanged();
            });
        });
    }

    /** ◆ on each color swatch — include in live palette / regen */
    initPaletteSwatchDice() {
        const app = this.app;
        document.querySelectorAll('button.palette-swatch-dice[data-palette-dice]').forEach(btn => {
            const key = PALETTE_DICE_MAP[btn.dataset.paletteDice];
            if (!key) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                app.settings.set(key, !app.settings.get(key));
                const active = app.settings.get('randomizeColor');
                app.settings.set('randomizePaletteColors', active);
                const cm = this.getDerivedColorMode();
                app.settings.set('colorMode', cm);
                if (cm === 'randomChaos' || cm === 'randomGradient') {
                    this.generateColorPalette();
                }
                this.syncPaletteSwatchDice();
                this.updatePaletteSizeGroupState();
                app.updateRandomParamsList();
                app.updateRandomSectionVisibility();
                app.updateRenderer();
                app.markAsChanged();
            });
        });
        this.syncPaletteSwatchDice();
    }

    syncPaletteSwatchDice() {
        const app = this.app;
        document.querySelectorAll('button.palette-swatch-dice[data-palette-dice]').forEach(btn => {
            const key = PALETTE_DICE_MAP[btn.dataset.paletteDice];
            if (!key) return;
            const enabled = !!app.settings.get(key);
            btn.classList.toggle('active', enabled);
            syncRandomDiceTitle(btn, enabled);
        });
    }

    /** Palette size: always visible; enabled when at least one swatch ◆ is on. Range only. */
    updatePaletteSizeGroupState() {
        const app = this.app;
        const active = !!app.settings.get('randomizeColor');
        app.settings.set('randomizePaletteColors', active);
        const group = document.getElementById('paletteColorsDiceGroup');
        if (group) group.classList.toggle('palette-size-group--disabled', !active);
        const singleWrap = document.getElementById('paletteColorsSingleWrap');
        const rangeWrap = document.getElementById('paletteColorsRangeWrap');
        const singleVal = document.getElementById('paletteColorsValue');
        if (singleWrap) singleWrap.style.display = 'none';
        if (rangeWrap) rangeWrap.style.display = 'block';
        if (singleVal) singleVal.style.display = 'none';
    }

    updateColorModeUI() {
        const app = this.app;
        const colorSource = app.settings.get('colorSource') || 'solid';
        const isGradient = colorSource === 'gradient';

        const solidControls = document.getElementById('colorSolidControls');
        const gradientControls = document.getElementById('colorGradientControls');
        if (solidControls) solidControls.style.display = isGradient ? 'none' : '';
        if (gradientControls) gradientControls.style.display = isGradient ? '' : 'none';

        if (isGradient) {
            const gradBg = document.getElementById('gradientBgColorPreview');
            const gradGrid = document.getElementById('gradientGridColorPreview');
            if (gradBg) gradBg.style.background = app.settings.get('bgColor');
            if (gradGrid) gradGrid.style.background = app.settings.get('gridColor');
            const gradBgHex = document.getElementById('gradientBgColorHex');
            const gradGridHex = document.getElementById('gradientGridColorHex');
            if (gradBgHex) gradBgHex.textContent = app.settings.get('bgColor');
            if (gradGridHex) gradGridHex.textContent = app.settings.get('gridColor');
        }

        const sourceButtons = document.querySelectorAll('#colorSourceButtons .style-button');
        sourceButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.colorSource === colorSource);
        });

        this.syncPaletteSwatchDice();
        this.updatePaletteSizeGroupState();
    }

    // -------- random colours --------

    randomizeColors() {
        const app = this.app;
        app._flushAutoSnapshot();
        app.historyManager.beginAction('randomize colors', app.getStateSnapshot());

        const letterColor = this.generateRandomColor();
        const bgColor = this.generateRandomColor();
        const gridColor = this.generateRandomColor();

        app.settings.set('letterColor', letterColor);
        app.settings.set('bgColor', bgColor);
        app.settings.set('gridColor', gridColor);

        this.updateSwatchDisplay('letter', letterColor);
        this.updateSwatchDisplay('bg', bgColor);
        this.updateSwatchDisplay('grid', gridColor);
        this.updateSwatchDisplay('gradientBg', bgColor);
        this.updateSwatchDisplay('gradientGrid', gridColor);

        if (app.unifiedColorPicker) {
            const colorMap = { letter: letterColor, bg: bgColor, grid: gridColor };
            app.unifiedColorPicker.setColor(colorMap[app.activeColorType]);
        }

        app.updateRenderer();
        app.markAsChanged();
        app.historyManager.commitAction(app.getStateSnapshot());
    }

    generateRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    generateRandomGrayscaleColor() {
        const gray = Math.floor(Math.random() * 256);
        return '#' + [gray, gray, gray].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    /** Generate color palette for randomChaos / randomGradient modes */
    generateColorPalette() {
        const app = this.app;
        const colorMode = this.getDerivedColorMode();
        const minN = app.settings.get('randomPaletteColorsMin') ?? 3;
        const maxN = app.settings.get('randomPaletteColorsMax') ?? 32;
        let numColors = app.settings.get('colorChaosColors') || 16;
        if (app.settings.get('randomizePaletteColors')) {
            const lo = Math.min(minN, maxN);
            const hi = Math.max(minN, maxN);
            numColors = lo + Math.floor(Math.random() * (hi - lo + 1));
        }

        const isGrayscale = app.settings.get('colorBW');
        const generateColor = isGrayscale
            ? () => this.generateRandomGrayscaleColor()
            : () => this.generateRandomColor();

        const diceL = !!app.settings.get('paletteDiceLetter');
        const diceBg = !!app.settings.get('paletteDiceBg');
        const diceGrid = !!app.settings.get('paletteDiceGrid');
        const diceGS = !!app.settings.get('paletteDiceGradientStart');
        const diceGE = !!app.settings.get('paletteDiceGradientEnd');

        app.colorPalette = [];
        if (colorMode === 'randomChaos' && diceL) {
            for (let i = 0; i < numColors; i++) {
                app.colorPalette.push(generateColor());
            }
        }

        let bgColor = app.settings.get('bgColor');
        if (diceBg) {
            bgColor = generateColor();
            app.settings.set('bgColor', bgColor);
        }
        let gridColor = app.settings.get('gridColor');
        if (diceGrid) {
            gridColor = generateColor();
            app.settings.set('gridColor', gridColor);
        }

        if (colorMode === 'randomGradient') {
            if (diceGS) {
                app.settings.set('gradientStartColor', generateColor());
                this.updateSwatchDisplay('gradientStart', app.settings.get('gradientStartColor'));
            }
            if (diceGE) {
                app.settings.set('gradientEndColor', generateColor());
                this.updateSwatchDisplay('gradientEnd', app.settings.get('gradientEndColor'));
            }
            app.gradientPairs = [];
            if (diceGS || diceGE) {
                const pairCount = Math.max(1, Math.floor(numColors / 2));
                for (let i = 0; i < pairCount; i++) {
                    app.gradientPairs.push({
                        start: diceGS ? generateColor() : app.settings.get('gradientStartColor'),
                        end: diceGE ? generateColor() : app.settings.get('gradientEndColor')
                    });
                }
            }
        }

        this.updateSwatchDisplay('bg', bgColor);
        this.updateSwatchDisplay('grid', gridColor);
        this.updateSwatchDisplay('gradientBg', bgColor);
        this.updateSwatchDisplay('gradientGrid', gridColor);

        if (app.unifiedColorPicker) {
            const colorMap = {
                letter: app.settings.get('letterColor'),
                bg: bgColor,
                grid: gridColor,
                gradientStart: app.settings.get('gradientStartColor'),
                gradientEnd: app.settings.get('gradientEndColor'),
                gradientBg: bgColor,
                gradientGrid: gridColor
            };
            if (app.activeColorType && colorMap[app.activeColorType] !== undefined) {
                app.unifiedColorPicker.setColor(colorMap[app.activeColorType]);
            }
        }

        app.moduleColorCache = new Map();
        app.moduleGradientCache = new Map();
        app.globalModuleIndex = 0;
        app.globalGradientIndex = 0;
    }

    /** Get gradient pair for a module in randomGradient multi-pair mode */
    getModuleGradient(moduleIndex) {
        const app = this.app;
        if (!app.gradientPairs || app.gradientPairs.length === 0) {
            return {
                start: app.settings.get('gradientStartColor'),
                end: app.settings.get('gradientEndColor')
            };
        }
        return app.gradientPairs[moduleIndex % app.gradientPairs.length];
    }

    /**
     * Per-module gradient pair (called by renderer for each module).
     * Returns null when not in randomGradient mode.
     */
    getGradientForModule() {
        const app = this.app;
        if (this.getDerivedColorMode() !== 'randomGradient') return null;
        if (!app.gradientPairs || app.gradientPairs.length === 0) return null;
        if (!app.globalGradientIndex) app.globalGradientIndex = 0;
        const idx = app.globalGradientIndex++;
        if (!app.moduleGradientCache) app.moduleGradientCache = new Map();
        if (!app.moduleGradientCache.has(idx)) {
            const pairIdx = Math.floor(Math.random() * app.gradientPairs.length);
            app.moduleGradientCache.set(idx, app.gradientPairs[pairIdx]);
        }
        return app.moduleGradientCache.get(idx);
    }

    /** Color for a specific module from palette (Color Chaos mode) */
    getModuleColor() {
        const app = this.app;
        const colorMode = this.getDerivedColorMode();
        if (colorMode === 'randomChaos' && !app.settings.get('paletteDiceLetter')) {
            return app.settings.get('letterColor');
        }
        const colorChaosEnabled = colorMode === 'randomChaos' || colorMode === 'randomGradient';
        if (!colorChaosEnabled || !app.colorPalette || app.colorPalette.length === 0) {
            return app.settings.get('letterColor');
        }

        if (!app.globalModuleIndex) app.globalModuleIndex = 0;
        const currentIndex = app.globalModuleIndex++;

        if (!app.moduleColorCache.has(currentIndex)) {
            const colorIndex = Math.floor(Math.random() * app.colorPalette.length);
            app.moduleColorCache.set(currentIndex, app.colorPalette[colorIndex]);
        }

        return app.moduleColorCache.get(currentIndex);
    }

    // -------- B/W effect --------

    initColorBWToggle() {
        const app = this.app;
        const cb = document.getElementById('colorBWCheckbox');
        if (!cb) return;
        cb.checked = app.settings.get('colorBW') || false;
        cb.addEventListener('change', () => {
            app.settings.set('colorBW', cb.checked);
            const cm = this.getDerivedColorMode();
            if (cm === 'randomChaos' || cm === 'randomGradient') {
                this.generateColorPalette();
            }
            app.updateRenderer();
            app.markAsChanged();
        });
    }
}
