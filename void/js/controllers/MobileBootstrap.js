/**
 * Mobile-specific bootstrap.
 *
 * Detects mobile phones (touch + viewport heuristics + UA), then:
 * - hides desktop panels and the Save/Delete preset bar,
 * - removes preset toolbar (dropdown + share) and the bottom-bar help (?) button,
 * - removes the PNG export button (desktop-only feature),
 * - enables compact preset / text / PNG controls,
 * - sizes the module grid so the "TRY / DESK / TOP" text fits.
 *
 * Listens to window resize: switches to desktop on widening.
 */

import { VOID_ALPHABET_ALTERNATIVES } from '../core/VoidAlphabet.js';
import {
    MOBILE_BREAKPOINT_PX,
    TABLET_BREAKPOINT_PX
} from '../config/timings.js';

const MOBILE_FIXED_TEXT = 'TRY\nDESK\nTOP';
const MOBILE_PRESETS_BASE_PATH = 'presets/';
const MOBILE_TEXT_MAX_CHARS = 48;
const MOBILE_MIN_MODULE_SIZE = 8;
const MOBILE_CANVAS_PADDING_RATIO = 0.1;

/** Detect a mobile phone (not tablet) by viewport + touch + User Agent. */
export function isMobileDevice() {
    const width = window.innerWidth;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const userAgent = navigator.userAgent.toLowerCase();

    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    const isMobilePhone = /mobile|iphone|ipod|android.*mobile|blackberry|windows phone/i.test(userAgent);

    return (
        (width < MOBILE_BREAKPOINT_PX && isTouchDevice && !isTablet) ||
        (isMobilePhone && width < TABLET_BREAKPOINT_PX)
    );
}

export class MobileBootstrap {
    /**
     * @param {object} app — VoidTypeface instance (provides renderer, settings,
     *   updateRenderer()).
     */
    constructor(app) {
        this.app = app;
        this.viewportUpdateFrame = null;
        this.pendingTextRefit = false;
        this.mobileTextEditing = false;
    }

    /** Initialise mobile UI; called once when the app starts on a mobile device. */
    init() {
        const panels = document.querySelectorAll('.controls-panel');
        panels.forEach((panel) => { panel.style.display = 'none'; });

        document.querySelector('.preset-toolbar-cluster')?.remove();
        document.getElementById('introHelpBtn')?.remove();

        const saveBtn = document.getElementById('savePresetBtn');
        const deleteBtn = document.getElementById('deletePresetBtn');
        if (saveBtn) saveBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';

        // PNG export is desktop-only. SVG / Copy buttons are hidden via CSS.
        document.getElementById('exportPngBtn')?.remove();
        document.getElementById('exportJsonBtn')?.remove();

        const renewBtn = document.getElementById('renewBtn');
        renewBtn?.remove();

        this.updateMobileViewportVars();
        this.applyMobileText(MOBILE_FIXED_TEXT, { updateInput: true });

        this.initMobilePresetSelect();
        this.initMobileTextInput();
        this.initMobileTextApply();
        this.initMobileRandomize();
        this.initMobilePngExport();

        // Touch: tap a letter to cycle its alternative
        const canvas = document.getElementById('mainCanvas');
        if (canvas) {
            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touch = e.changedTouches[0];
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                const position = this.app.renderer.getLetterPositionAt(touchX, touchY);
                if (!position) return;
                const char = position.char.toUpperCase();
                const hasAlternatives =
                    VOID_ALPHABET_ALTERNATIVES &&
                    VOID_ALPHABET_ALTERNATIVES[char] &&
                    VOID_ALPHABET_ALTERNATIVES[char].length > 0;
                if (hasAlternatives) {
                    const toggled = this.app.renderer.toggleLetterAlternative(
                        position.lineIndex,
                        position.charIndex
                    );
                    if (toggled) this.app.updateRenderer();
                }
            });
        }

        this.calculateMobileModuleSize();

        // Reload when crossing back to a desktop viewport so the user sees the
        // full UI; otherwise just re-fit the module size on rotation/resize.
        const handleViewportChange = () => {
            const wasMobile = this.app.isMobile;
            this.app.isMobile = isMobileDevice();
            if (wasMobile && !this.app.isMobile) {
                window.location.reload();
            } else if (this.app.isMobile) {
                if (this.mobileTextEditing) return;
                this.scheduleMobileViewportUpdate({ refitText: true });
            }
        };

        window.addEventListener('resize', handleViewportChange);
        window.visualViewport?.addEventListener('resize', handleViewportChange);
        window.visualViewport?.addEventListener('scroll', handleViewportChange);
    }

    updateMobileViewportVars() {
        const viewport = window.visualViewport;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        const offsetLeft = viewport?.offsetLeft || 0;
        const offsetTop = viewport?.offsetTop || 0;
        const rootStyle = document.documentElement.style;

        rootStyle.setProperty('--mobile-vw', `${width}px`);
        rootStyle.setProperty('--mobile-vh', `${height}px`);
        rootStyle.setProperty('--mobile-vx', `${offsetLeft}px`);
        rootStyle.setProperty('--mobile-vy', `${offsetTop}px`);
    }

    scheduleMobileViewportUpdate(options = {}) {
        this.pendingTextRefit = this.pendingTextRefit || !!options.refitText;
        if (this.viewportUpdateFrame) return;

        this.viewportUpdateFrame = requestAnimationFrame(() => {
            this.viewportUpdateFrame = null;
            if (this.mobileTextEditing) {
                this.pendingTextRefit = false;
                return;
            }

            const refitText = this.pendingTextRefit;
            this.pendingTextRefit = false;

            this.updateMobileViewportVars();

            if (this.app.renderer?.resize) {
                this.app.renderer.resize();
            }

            if (refitText) {
                this.applyMobileText(this.app.settings.get('text') || MOBILE_FIXED_TEXT, {
                    updateInput: true
                });
            } else {
                this.calculateMobileModuleSize();
            }
        });
    }

    initMobileTextInput() {
        const input = document.getElementById('mobileTextInput');
        if (!input) return;

        input.value = this.flattenMobileText(this.app.settings.get('text') || MOBILE_FIXED_TEXT);
        input.addEventListener('focus', () => {
            this.mobileTextEditing = true;
        });
        input.addEventListener('input', () => {
            input.value = input.value.toUpperCase();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            this.confirmMobileText();
        });
    }

    initMobileTextApply() {
        const btn = document.getElementById('mobileTextApplyBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.confirmMobileText();
        });
    }

    confirmMobileText() {
        const input = document.getElementById('mobileTextInput');
        if (!input) return;

        this.mobileTextEditing = false;
        this.applyMobileText(input.value, { updateInput: true });
        input.blur();
        this.scheduleMobileViewportUpdate();
    }

    initMobilePngExport() {
        const btn = document.getElementById('mobileExportPngBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.app.exportViewportPng?.();
        });
    }

    initMobileRandomize() {
        const btn = document.getElementById('mobileRandomizeBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.rerollMobileRandomLook();
        });
    }

    rerollMobileRandomLook() {
        if (this.app.renderer?.clearModuleTypeCache) {
            this.app.renderer.clearModuleTypeCache();
        }
        if (this.app.renderer?.clearAlternativeGlyphCache) {
            this.app.renderer.clearAlternativeGlyphCache();
        }

        const wobblyEffect = this.app.renderer?.moduleDrawer?.getWobblyEffect?.();
        if (wobblyEffect) wobblyEffect.reseed();

        if (this.app.settings.get('isRandom')) {
            this.app.rollEffectRandomValues();
            const colorMode = this.app.getDerivedColorMode?.();
            if (colorMode === 'randomChaos' || colorMode === 'randomGradient') {
                this.app.generateColorPalette?.();
            }
        } else {
            this.refreshMobileRandomLook();
        }

        this.calculateMobileModuleSize();
    }

    async initMobilePresetSelect() {
        const select = document.getElementById('mobilePresetSelect');
        if (!select) {
            this.refreshMobileRandomLook();
            return;
        }

        select.disabled = true;
        select.innerHTML = '<option>Loading...</option>';

        let presets = [];
        try {
            presets = await this.fetchBundledPresets();
        } catch (error) {
            console.warn('[MobileBootstrap] failed to load mobile presets:', error);
        }

        if (presets.length === 0) {
            select.innerHTML = '<option>Presets unavailable</option>';
            this.refreshMobileRandomLook();
            this.calculateMobileModuleSize();
            return;
        }

        select.innerHTML = '';
        presets.forEach((preset, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = preset.name;
            select.appendChild(option);
        });

        select.disabled = false;
        select.addEventListener('change', () => {
            const preset = presets[Number(select.value)];
            if (preset) this.applyMobilePreset(preset);
        });

        this.applyMobilePreset(presets[0]);
    }

    async fetchBundledPresets() {
        const manifestResponse = await fetch(`${MOBILE_PRESETS_BASE_PATH}index.json`, { cache: 'no-cache' });
        if (!manifestResponse.ok) return [];

        const manifest = await manifestResponse.json();
        const files = Array.isArray(manifest?.presets) ? manifest.presets : [];
        const presets = [];

        for (const entry of files) {
            const file = typeof entry === 'string' ? entry : entry?.file;
            if (!file || typeof file !== 'string') continue;

            try {
                const response = await fetch(`${MOBILE_PRESETS_BASE_PATH}${file}`, { cache: 'no-cache' });
                if (!response.ok) continue;

                const raw = await response.json();
                const settings = raw?.settings && typeof raw.settings === 'object'
                    ? raw.settings
                    : raw;
                const name = String(raw?.name || file.replace(/\.json$/i, '')).trim();
                presets.push({ name, settings, raw });
            } catch (error) {
                console.warn(`[MobileBootstrap] failed to load preset "${file}":`, error);
            }
        }

        return presets.sort((a, b) => a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base'
        }));
    }

    applyMobilePreset(preset) {
        const s = this.app.settings;
        const settings = preset?.settings || {};
        const cacheSource = preset?.raw || {};

        Object.entries(settings).forEach(([key, value]) => {
            if (key === 'text') return;
            if (Object.prototype.hasOwnProperty.call(s.values, key)) {
                s.set(key, value);
            }
        });

        this.applyMobileText(s.get('text') || MOBILE_FIXED_TEXT, { updateInput: true });
        s.set('textAlign', settings.textAlign || 'center');

        if (this.app.renderer) {
            this.app.renderer.moduleTypeCache = this.cloneCache(cacheSource.moduleTypeCache) || {};
            this.app.renderer.moduleValueCache = this.cloneCache(cacheSource.moduleValueCache) || {};
            this.app.renderer.alternativeGlyphCache = this.cloneCache(cacheSource.alternativeGlyphCache) || {};
            this.app.renderer.clearLayoutCache?.();
        }

        this.app.colorPalette = Array.isArray(cacheSource.colorPalette)
            ? [...cacheSource.colorPalette]
            : [];
        this.app.gradientPairs = Array.isArray(cacheSource.gradientPairs)
            ? this.cloneCache(cacheSource.gradientPairs)
            : [];
        this.app.moduleColorCache = cacheSource.moduleColorCache
            ? new Map(Object.entries(cacheSource.moduleColorCache).map(([k, v]) => [parseInt(k, 10), v]))
            : new Map();
        this.app.moduleGradientCache = cacheSource.moduleGradientCache
            ? new Map(Object.entries(cacheSource.moduleGradientCache).map(([k, v]) => [parseInt(k, 10), this.cloneCache(v)]))
            : new Map();
        this.app.globalModuleIndex = this.app.moduleColorCache.size;
        this.app.globalGradientIndex = this.app.moduleGradientCache.size;

        this.calculateMobileModuleSize();
    }

    applyMobileText(text, options = {}) {
        const nextText = this.normalizeMobileText(text);
        this.app.settings.set('text', nextText);

        if (options.updateInput) {
            const input = document.getElementById('mobileTextInput');
            if (input) input.value = this.flattenMobileText(nextText);
        }

        this.calculateMobileModuleSize();
    }

    normalizeMobileText(text) {
        const raw = String(text || '')
            .replace(/\r/g, '\n')
            .replace(/[^\S\n]+/g, ' ')
            .trim();

        if (!raw) return MOBILE_FIXED_TEXT;
        if (raw.includes('\n')) {
            return raw
                .split('\n')
                .map((line) => line.trim().toUpperCase())
                .filter(Boolean)
                .flatMap((line) => this.wrapMobileLine(line))
                .join('\n') || MOBILE_FIXED_TEXT;
        }

        return this.formatMobileText(raw);
    }

    formatMobileText(value) {
        const clean = String(value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase()
            .slice(0, MOBILE_TEXT_MAX_CHARS);
        if (!clean) return MOBILE_FIXED_TEXT;

        return this.wrapMobileLine(clean).join('\n') || MOBILE_FIXED_TEXT;
    }

    wrapMobileLine(value) {
        const clean = String(value || '').replace(/\s+/g, ' ').trim();
        if (!clean) return [];

        const maxLineLength = this.getMobileWrapLimit();
        const lines = [];
        let current = '';

        clean.split(' ').filter(Boolean).forEach((word) => {
            const chunks = this.splitMobileWord(word, maxLineLength);
            chunks.forEach((chunk) => {
                if (!current) {
                    current = chunk;
                    return;
                }
                if (`${current} ${chunk}`.length <= maxLineLength) {
                    current = `${current} ${chunk}`;
                } else {
                    lines.push(current);
                    current = chunk;
                }
            });
        });

        if (current) lines.push(current);
        return lines;
    }

    splitMobileWord(word, maxLineLength) {
        if (word.length <= maxLineLength) return [word];

        const chunks = [];
        for (let i = 0; i < word.length; i += maxLineLength) {
            chunks.push(word.slice(i, i + maxLineLength));
        }
        return chunks;
    }

    getMobileWrapLimit() {
        const canvasContainer = document.getElementById('canvasContainer');
        const rect = canvasContainer?.getBoundingClientRect?.();
        const availableWidth = rect?.width || window.innerWidth;
        const letterSpacingMultiplier = this.app.settings.get('letterSpacingMultiplier') || 1;
        const usableModules = (
            availableWidth *
            (1 - 2 * MOBILE_CANVAS_PADDING_RATIO)
        ) / MOBILE_MIN_MODULE_SIZE;
        const charModules = 5 + letterSpacingMultiplier;

        return Math.max(
            4,
            Math.floor((usableModules + letterSpacingMultiplier) / charModules)
        );
    }

    flattenMobileText(text) {
        return String(text || '').replace(/\s*\n\s*/g, ' ').trim();
    }

    cloneCache(value) {
        if (!value || typeof value !== 'object') return null;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_) {
            return null;
        }
    }

    /**
     * Apply a safe, performance-friendly randomisation preset for mobile, then run
     * one effect-dice roll (same logic as desktop Randomize) for flags that stay on.
     * Fixed 3-colour palette (white letters / black bg / grey grid).
     * Alt glyphs dice on: each Randomize recomputes whether alternatives participate and reshuffles selections.
     * No Wobble, no Dashes, no per-module Full Chaos,
     * no colour randomisation — heavier stuff stays off on weak hardware.
     */
    refreshMobileRandomLook() {
        this.applyMobileChaos();
        this.app.rollEffectRandomValues();
    }

    /**
     * Baseline flags + colours for mobile random mode (before effect-dice roll).
     * @see refreshMobileRandomLook
     */
    applyMobileChaos() {
        const s = this.app.settings;

        // colours: always fixed, never randomised
        s.set('letterColor', '#ffffff');
        s.set('bgColor', '#000000');
        s.set('gridColor', '#333333');
        s.set('colorMode', 'manual');
        s.set('colorSource', 'solid');
        s.set('randomizeColor', false);
        s.set('randomizePaletteColors', false);

        // cheap shape randomisers
        s.set('randomizeStem', true);
        s.set('randomizeStrokes', true);
        s.set('randomizeContrast', true);

        // off: dashes add heavy path-subdivision per module
        s.set('dashEnabled', false);
        s.set('randomizeDashLength', false);
        s.set('randomizeGapLength', false);

        // off: Perlin noise recomputed per module every frame
        s.set('wobblyEnabled', false);
        s.set('randomizeWobblyAmount', false);
        s.set('randomizeWobblyFrequency', false);

        // off: per-module full-chaos cache is very large
        s.set('randomModeType', 'byType');
        s.set('randomizeChaosMode', false);

        // Dice on: participates in Randomize; canonical `useAlternativesInRandom` is applied after rollEffectRandomValues().
        s.set('randomizeAltGlyphs', true);

        // cosmetic extras off
        s.set('roundedCaps', false);
        s.set('closeEnds', false);
        s.set('randomizeRoundedCaps', false);
        s.set('randomizeCloseEnds', false);
        s.set('randomizeDashChess', false);
        s.set('randomizeShowGrid', false);
        s.set('randomizeShowJoints', false);
        s.set('randomizeShowFreeEndpoints', false);
        s.set('randomizeColorBW', false);
        s.set('colorBW', false);
        s.set('showGrid', true);
        s.set('showJoints', false);
        s.set('showFreeEndpoints', false);
    }

    /**
     * Calculate optimal module size for mobile device so the text
     * Current mobile text fits in window without clipping.
     */
    calculateMobileModuleSize() {
        // Wait for next frame so canvas gets dimensions.
        requestAnimationFrame(() => {
            const canvasContainer = document.getElementById('canvasContainer');
            const containerRect = canvasContainer
                ? canvasContainer.getBoundingClientRect()
                : null;
            const availableWidth = containerRect ? containerRect.width : window.innerWidth;
            const availableHeight = containerRect ? containerRect.height : window.innerHeight;

            const lines = String(this.app.settings.get('text') || MOBILE_FIXED_TEXT).split('\n');
            const MAX_LINE_LENGTH = Math.max(1, ...lines.map((line) => line.length));
            const NUM_LINES = Math.max(1, lines.length);
            const COLS = 5;
            const ROWS = 5;
            const PADDING_RATIO = MOBILE_CANVAS_PADDING_RATIO; // 10 % on each side

            const letterSpacingMultiplier = this.app.settings.get('letterSpacingMultiplier') || 1;
            const lineHeightMultiplier = this.app.settings.get('lineHeightMultiplier') || 1;

            const maxWidth = availableWidth * (1 - 2 * PADDING_RATIO);
            const maxHeight = availableHeight * (1 - 2 * PADDING_RATIO);

            const moduleSizeByWidth = maxWidth / (
                MAX_LINE_LENGTH * COLS + (MAX_LINE_LENGTH - 1) * letterSpacingMultiplier
            );
            const moduleSizeByHeight = maxHeight / (
                NUM_LINES * ROWS + (NUM_LINES - 1) * lineHeightMultiplier
            );

            const optimalModuleSize = Math.floor(Math.min(moduleSizeByWidth, moduleSizeByHeight));
            const finalModuleSize = Math.max(8, Math.min(128, optimalModuleSize));

            this.app.settings.set('moduleSize', finalModuleSize);
            this.app.updateRenderer();
        });
    }
}
