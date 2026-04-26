/**
 * Mobile-specific bootstrap.
 *
 * Detects mobile phones (touch + viewport heuristics + UA), then:
 * - hides desktop panels and the Save/Delete preset bar,
 * - removes the PNG export button (desktop-only feature),
 * - enables a "renew" button for re-randomising,
 * - applies a performance-friendly random profile (applyMobileChaos),
 * - sizes the module grid so the "DESK / TOP / ONLY" text fits.
 *
 * Listens to window resize: switches to desktop on widening.
 */

import { VOID_ALPHABET_ALTERNATIVES } from '../core/VoidAlphabet.js';
import {
    MOBILE_BREAKPOINT_PX,
    TABLET_BREAKPOINT_PX
} from '../config/timings.js';

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
    }

    /** Initialise mobile UI; called once when the app starts on a mobile device. */
    init() {
        const panels = document.querySelectorAll('.controls-panel');
        panels.forEach((panel) => { panel.style.display = 'none'; });

        const presetDropdown = document.getElementById('presetDropdown');
        const saveBtn = document.getElementById('savePresetBtn');
        const deleteBtn = document.getElementById('deletePresetBtn');
        if (presetDropdown) presetDropdown.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';

        // PNG export is desktop-only. SVG / Copy buttons are hidden via CSS.
        document.getElementById('exportPngBtn')?.remove();

        const renewBtn = document.getElementById('renewBtn');
        if (renewBtn) {
            renewBtn.style.display = 'inline-flex';
            renewBtn.addEventListener('click', () => {
                this.app.renderer.clearModuleTypeCache();
                if (this.app.renderer.clearAlternativeGlyphCache) {
                    this.app.renderer.clearAlternativeGlyphCache();
                }
                this.applyMobileChaos();
                this.calculateMobileModuleSize();
            });
        }

        this.app.settings.set('text', 'DESK\nTOP\nONLY');

        this.applyMobileChaos();

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
        window.addEventListener('resize', () => {
            const wasMobile = this.app.isMobile;
            this.app.isMobile = isMobileDevice();
            if (wasMobile && !this.app.isMobile) {
                window.location.reload();
            } else if (this.app.isMobile) {
                this.calculateMobileModuleSize();
            }
        });
    }

    /**
     * Apply a safe, performance-friendly randomisation preset for mobile.
     * Fixed 3-colour palette (white letters / black bg / grey grid).
     * No Wobble, no Dashes, no Alt Glyphs, no per-module Full Chaos,
     * no colour randomisation — all of which are expensive on weak hardware.
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

        // off: alt-glyph cache lookup per letter
        s.set('useAlternativesInRandom', false);

        // cosmetic extras off
        s.set('roundedCaps', false);
        s.set('closeEnds', false);
        s.set('randomizeRoundedCaps', false);
        s.set('randomizeCloseEnds', false);
        s.set('randomizeDashChess', false);
        s.set('randomizeAltGlyphs', false);
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
     * "DESK\nTOP\nONLY" fits in window without clipping.
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

            // Text is 3 lines, longest is 4 chars. Each char is 5×5 modules.
            const MAX_LINE_LENGTH = 4;
            const NUM_LINES = 3;
            const COLS = 5;
            const ROWS = 5;
            const PADDING_RATIO = 0.1; // 10 % on each side

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

