/**
 * VoidExporter - export Void typeface to SVG
 */

import { VOID_ALPHABET_ALTERNATIVES, VOID_ALPHABET } from './VoidAlphabet.js';
import { getGlyph } from './GlyphLoader.js';
import { EndpointDetector } from '../utils/EndpointDetector.js';
import { RandomUtils } from '../utils/RandomUtils.js';
import { MathUtils } from '../utils/MathUtils.js';
import { ColorUtils } from '../utils/ColorUtils.js';
import {
    computeStripeLayout,
    closeEndsLineCap,
    stripeBandWidth,
    stripeOffset,
    stripeArcRadius
} from './geometry/StrokeGeometry.js';

export class VoidExporter {
    constructor(renderer, settings = null) {
        this.renderer = renderer;
        this.settings = settings;
        // Cache for values by module type (for random byType mode)
        this.moduleTypeCache = {};
        this.endpointDetector = new EndpointDetector();
        // Wobbly effect reference (shared with renderer's ModuleDrawer)
        this.wobblyEffect = null;
    }

    /**
     * Clear cache of values by module type
     */
    clearModuleTypeCache() {
        this.moduleTypeCache = {};
    }

    /**
     * Get random values for module (considering random mode)
     * Uses cache from renderer for value consistency
     */
    getRandomModuleValues(moduleType, params, cacheKey = null) {
        // Use cache from renderer if available
        const cache = this.renderer && this.renderer.moduleTypeCache 
            ? (params.randomModeType === 'full' ? this.renderer.moduleValueCache : this.renderer.moduleTypeCache)
            : this.moduleTypeCache;
        
        return RandomUtils.getRandomModuleValues(moduleType, cacheKey, params, cache);
    }

    /**
     * Calculate adaptive Gap for Dash mode (similar to ModuleDrawer)
     * @param {number} lineLength - line length in pixels
     * @param {number} dashLength - dash length in pixels
     * @param {number} gapLength - initial gap length
     * @returns {Object} {dashLength, gapLength, numDashes}
     */
    calculateAdaptiveDash(lineLength, dashLength, gapLength, endMode = 'half') {
        return MathUtils.calculateAdaptiveDash(lineLength, dashLength, gapLength, endMode);
    }

    calculateEndpointDash(lineLength, dashLength, gapLength, options = {}) {
        return MathUtils.calculateEndpointDash(lineLength, dashLength, gapLength, options);
    }

    getDashEndModeForIndex(index, dashChess) {
        return dashChess && index % 2 === 1 ? 'full' : 'half';
    }

    getDashBaseOffsetForIndex(index, dashChess, dashLength) {
        return dashChess && index % 2 === 1 ? 0 : dashLength / 2;
    }

    _dashPhaseAt(localX, localY, localDirX, localDirY) {
        const ctx = this._dashPhaseContext;
        if (!ctx) return 0;
        const cos = Math.cos(ctx.angleRad);
        const sin = Math.sin(ctx.angleRad);
        const globalX = ctx.centerX + localX * cos - localY * sin;
        const globalY = ctx.centerY + localX * sin + localY * cos;
        const dirX = localDirX * cos - localDirY * sin;
        const dirY = localDirX * sin + localDirY * cos;
        const originX = Number.isFinite(ctx.originX) ? ctx.originX : 0;
        const originY = Number.isFinite(ctx.originY) ? ctx.originY : 0;
        return (globalX - originX) * dirX + (globalY - originY) * dirY;
    }

    _getDashPattern(lineLength, dashLength, gapLength, options = {}) {
        const index = options.index || 0;
        const dashChess = !!options.dashChess;
        const phaseOffset = (Number.isFinite(options.phaseOffset) ? options.phaseOffset : 0) +
            this.getDashBaseOffsetForIndex(index, dashChess, dashLength);
        return this.calculateEndpointDash(lineLength, dashLength, gapLength, {
            startEndpoint: options.startEndpoint,
            endEndpoint: options.endEndpoint,
            endMode: this.getDashEndModeForIndex(index, dashChess),
            phaseOffset
        });
    }

    /**
     * Walk a 1D path of a given length and yield visible dash sub-segments [startD, endD]
     * given a (dashLength, gapLength) pattern with an initial dashOffset (mirroring SVG's
     * stroke-dashoffset semantics: at path position 0 we are at pattern position offset).
     * Returns an array of [startD, endD] pairs (both in path-distance units).
     */
    _minVisibleDashLength(strokeWidth, lineCap) {
        return lineCap === 'round' ? strokeWidth * 0.35 : 0;
    }

    _effectiveDashGapLength(gapLength, strokeWidth, lineCap) {
        return gapLength + (lineCap === 'round' ? strokeWidth : 0);
    }

    _computeDashRanges(totalLength, dashLength, gapLength, dashOffset, minVisibleLength = 0) {
        return MathUtils.computeDashRanges(totalLength, dashLength, gapLength, dashOffset, minVisibleLength);
    }

    _roundCoord(v) {
        return Math.round(v * 1000) / 1000;
    }

    /**
     * Emit a dashed straight line as individual <line> segments so renderers that
     * ignore stroke-dashoffset (notably Figma) still preserve the visual pattern.
     * When more than one segment is produced, they are wrapped in <g class="dl">
     * carrying the original endpoints as data-l-* attributes so that
     * _applyGradientToSVG can attach a single gradient that spans the whole logical line.
     */
    _emitDashedLine(x1, y1, x2, y2, strokeWidth, dashLength, gapLength, dashOffset, lineCap, extraAttrs = '') {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len === 0) return '';
        const r = (v) => this._roundCoord(v);
        const ranges = this._computeDashRanges(len, dashLength, gapLength, dashOffset, this._minVisibleDashLength(strokeWidth, lineCap));
        if (ranges.length === 0) return '';

        const nx = dx / len, ny = dy / len;
        const pointAt = (d) => ({ x: x1 + nx * d, y: y1 + ny * d });

        if (ranges.length === 1) {
            const a = pointAt(ranges[0][0]);
            const b = pointAt(ranges[0][1]);
            return `        <line x1="${r(a.x)}" y1="${r(a.y)}" x2="${r(b.x)}" y2="${r(b.y)}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"${extraAttrs}/>\n`;
        }

        let inner = '';
        for (const [d1, d2] of ranges) {
            const a = pointAt(d1);
            const b = pointAt(d2);
            inner += `          <line x1="${r(a.x)}" y1="${r(a.y)}" x2="${r(b.x)}" y2="${r(b.y)}" stroke="inherit"/>\n`;
        }
        return `        <g class="dl" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"${extraAttrs} data-l-x1="${r(x1)}" data-l-y1="${r(y1)}" data-l-x2="${r(x2)}" data-l-y2="${r(y2)}">\n${inner}        </g>\n`;
    }

    /**
     * Emit a dashed L-shaped path (two straight legs meeting at a corner) as a
     * collection of <line> / <path> segments. The dash phase carries across the corner.
     */
    _emitDashedLPath(x1, y1, xC, yC, x3, y3, strokeWidth, dashLength, gapLength, dashOffset, lineCap, lineJoin, extraAttrs = '') {
        const len1 = Math.hypot(xC - x1, yC - y1);
        const len2 = Math.hypot(x3 - xC, y3 - yC);
        const total = len1 + len2;
        if (total === 0) return '';
        const r = (v) => this._roundCoord(v);
        const ranges = this._computeDashRanges(total, dashLength, gapLength, dashOffset, this._minVisibleDashLength(strokeWidth, lineCap));
        if (ranges.length === 0) return '';

        const pointAt = (d) => {
            if (d <= len1) {
                const t = len1 > 0 ? d / len1 : 0;
                return { x: x1 + (xC - x1) * t, y: y1 + (yC - y1) * t };
            }
            const t = len2 > 0 ? (d - len1) / len2 : 0;
            return { x: xC + (x3 - xC) * t, y: yC + (y3 - yC) * t };
        };

        const renderRange = (d1, d2, indent) => {
            const eps = 1e-6;
            const a = pointAt(d1);
            const c = pointAt(len1);
            const b = pointAt(d2);
            const spansCorner = d1 < len1 - eps && d2 > len1 + eps;
            if (spansCorner) {
                const path = `M ${r(a.x)} ${r(a.y)} L ${r(c.x)} ${r(c.y)} L ${r(b.x)} ${r(b.y)}`;
                if (indent) {
                    return `          <path d="${path}" fill="none" stroke="inherit"/>\n`;
                }
                return `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" fill="none"${extraAttrs}/>\n`;
            }
            if (indent) {
                return `          <line x1="${r(a.x)}" y1="${r(a.y)}" x2="${r(b.x)}" y2="${r(b.y)}" stroke="inherit"/>\n`;
            }
            return `        <line x1="${r(a.x)}" y1="${r(a.y)}" x2="${r(b.x)}" y2="${r(b.y)}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"${extraAttrs}/>\n`;
        };

        if (ranges.length === 1) {
            return renderRange(ranges[0][0], ranges[0][1], false);
        }

        let inner = '';
        for (const [d1, d2] of ranges) {
            inner += renderRange(d1, d2, true);
        }
        return `        <g class="dl" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" fill="none"${extraAttrs} data-l-x1="${r(x1)}" data-l-y1="${r(y1)}" data-l-x2="${r(x3)}" data-l-y2="${r(y3)}">\n${inner}        </g>\n`;
    }

    /**
     * Emit a dashed circular arc (constant radius) as individual <path> arc segments.
     * Gradient axis (when wrapped) goes from the arc's start point to its end point —
     * matches the chord-based gradient extraction used for non-dashed arcs.
     */
    _emitDashedArc(centerX, centerY, radius, startAngle, endAngle, strokeWidth, dashLength, gapLength, dashOffset, lineCap, extraAttrs = '') {
        const arcAngle = endAngle - startAngle;
        const arcLength = Math.abs(radius * arcAngle);
        if (arcLength === 0 || radius <= 0) return '';
        const r = (v) => this._roundCoord(v);
        const sign = arcAngle >= 0 ? 1 : -1;
        const sweepFlag = sign > 0 ? 1 : 0;
        const ranges = this._computeDashRanges(arcLength, dashLength, gapLength, dashOffset, this._minVisibleDashLength(strokeWidth, lineCap));
        if (ranges.length === 0) return '';

        const startX = centerX + radius * Math.cos(startAngle);
        const startY = centerY + radius * Math.sin(startAngle);
        const endX = centerX + radius * Math.cos(endAngle);
        const endY = centerY + radius * Math.sin(endAngle);
        const angleAt = (d) => startAngle + sign * (d / radius);

        const arcPath = (d1, d2) => {
            const a1 = angleAt(d1);
            const a2 = angleAt(d2);
            const x1 = centerX + radius * Math.cos(a1);
            const y1 = centerY + radius * Math.sin(a1);
            const x2 = centerX + radius * Math.cos(a2);
            const y2 = centerY + radius * Math.sin(a2);
            const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
            return `M ${r(x1)} ${r(y1)} A ${r(radius)} ${r(radius)} 0 ${largeArc} ${sweepFlag} ${r(x2)} ${r(y2)}`;
        };

        if (ranges.length === 1) {
            const path = arcPath(ranges[0][0], ranges[0][1]);
            return `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" fill="none"${extraAttrs}/>\n`;
        }

        let inner = '';
        for (const [d1, d2] of ranges) {
            inner += `          <path d="${arcPath(d1, d2)}" fill="none" stroke="inherit"/>\n`;
        }
        return `        <g class="dl" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" fill="none"${extraAttrs} data-l-x1="${r(startX)}" data-l-y1="${r(startY)}" data-l-x2="${r(endX)}" data-l-y2="${r(endY)}">\n${inner}        </g>\n`;
    }

    /**
     * Get SVG content (without downloading)
     */
    getSVGContent() {
        // DON'T clear cache - use same values as during rendering
        // this.clearModuleTypeCache();
        
        // Reset gradient counter for fresh gradient IDs
        this._gradientCounter = 0;
        
        const params = this.renderer.params;
        // Get current values from settings if available
        if (this.settings) {
            // Grid is exported automatically if visible
            params.includeGridToExport = this.settings.get('showGrid') || false;
            // Get textAlign from settings
            if (this.settings.get('textAlign')) {
                params.textAlign = this.settings.get('textAlign');
            }
            // Get roundedCaps and closeEnds from settings (Effects panel)
            if (this.settings.get('roundedCaps') !== undefined) {
                params.roundedCaps = this.settings.get('roundedCaps');
            }
            if (this.settings.get('closeEnds') !== undefined) {
                params.closeEnds = this.settings.get('closeEnds');
            }
            if (this.settings.get('dashEnabled') !== undefined) {
                params.dashEnabled = this.settings.get('dashEnabled');
            }
            // Get dashChess from settings for PD and Random modes
            if (this.settings.get('dashChess') !== undefined) {
                params.dashChess = this.settings.get('dashChess');
            }
            if (this.settings.get('showJoints') !== undefined) {
                params.showJoints = this.settings.get('showJoints');
            }
            if (this.settings.get('showFreeEndpoints') !== undefined) {
                params.showFreeEndpoints = this.settings.get('showFreeEndpoints');
            }
            // Get closeEnds from settings
            if (this.settings.get('closeEnds') !== undefined) {
                params.closeEnds = this.settings.get('closeEnds');
            }
            // Get custom module color mode (chaos only; gradient handled separately)
            const colorMode = this.settings.get('colorMode') || 'manual';
            params.useCustomModuleColor = ['chaos', 'randomChaos'].includes(colorMode);
        } else if (params.includeGridToExport === undefined) {
            // If settings unavailable, use showGrid from params
            params.includeGridToExport = params.showGrid || false;
        }
        if (params.showJoints === undefined) {
            params.showJoints = false;
        }
        if (params.showFreeEndpoints === undefined) {
            params.showFreeEndpoints = false;
        }
        // Ensure closeEnds is set
        if (params.closeEnds === undefined) {
            params.closeEnds = false;
        }
        // Ensure textAlign is set
        if (!params.textAlign) {
            params.textAlign = 'center';
        }
        // Ensure roundedCaps is set
        if (params.roundedCaps === undefined) {
            params.roundedCaps = false;
        }
        // Get wobbly settings
        if (this.settings) {
            params.wobblyEnabled = this.settings.get('wobblyEnabled') || false;
            params.wobblyAmount = this.settings.get('wobblyAmount') || 0;
            params.wobblyFrequency = this.settings.get('wobblyFrequency') || 0.1;
        }
        // Get wobbly effect from renderer's ModuleDrawer (shared noise state)
        if (this.renderer && this.renderer.moduleDrawer) {
            this.wobblyEffect = this.renderer.moduleDrawer.getWobblyEffect();
        }
        const text = params.text;
        
        if (!text) {
            return null;
        }

        const lines = text.split('\n');
        const letterW = this.renderer.cols * params.moduleSize;
        const letterH = this.renderer.rows * params.moduleSize;
        
        // Calculate content dimensions considering different space width
        let contentWidth = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // Double space (and more) has width of 5 modules (3+2) without letter spacing between spaces
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // If previous character is also space, this space = 2 modules and WITHOUT letter spacing before it
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false; // Don't add spacing between spaces
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
            // Remove last spacing (if last character is not space after space)
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= params.letterSpacing;
            }
            contentWidth = Math.max(contentWidth, lineWidth);
        }
        const contentHeight = lines.length * (letterH + params.lineHeight) - params.lineHeight;
        
        // Square SVG: side = max(width, height) + 2*moduleSize (one module on each side)
        const moduleSize = params.moduleSize;
        const maxDimension = Math.max(contentWidth, contentHeight);
        const svgSize = maxDimension + 2 * moduleSize;
        
        // Content offset for centering in square
        const offsetX = (svgSize - contentWidth) / 2;
        const offsetY = (svgSize - contentHeight) / 2;
        
        // Create SVG document
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
`;

        // Background (always add)
        svgContent += `  <g id="back">\n`;
        svgContent += `    <rect width="${svgSize}" height="${svgSize}" fill="${params.bgColor || '#000000'}"/>\n`;
        svgContent += `  </g>\n`;

        // Grid (if enabled for export)
        if (params.includeGridToExport === true) {
            svgContent += this.renderGridToSVG(svgSize, svgSize, params, offsetX, offsetY);
        }

        // Group for letters (use color from settings, unless custom module color or gradient is enabled)
        const colorMode = this.settings ? (this.settings.get('colorMode') || 'manual') : 'manual';
        const isGradientMode = colorMode === 'gradient' || colorMode === 'randomGradient';
        if (params.useCustomModuleColor || isGradientMode) {
            // In custom color/gradient mode, each element will have its own stroke
            svgContent += `  <g id="typo" fill="none">\n`;
        } else {
            svgContent += `  <g id="typo" stroke="${params.color || '#ffffff'}" fill="none">\n`;
        }

        // Arrays for collecting all points (if endpoints enabled)
        const allConnections = [];
        const allEndpoints = [];

        // Render each line
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            // Calculate line width considering different space width
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // Double space (and more) has width of 5 modules (3+2) without letter spacing between spaces
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // If previous character is also space, this space = 2 modules and WITHOUT letter spacing before it
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false; // Don't add spacing between spaces
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
            // Remove last spacing (if last character is not space after space)
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= params.letterSpacing;
            }
            
            // Calculate line position depending on alignment
            const textAlign = params.textAlign || 'center';
            let lineX;
            if (textAlign === 'left') {
                lineX = 0; // Align to left edge of content
            } else if (textAlign === 'right') {
                lineX = contentWidth - lineWidth; // Align to right edge of content
            } else { // center
                lineX = (contentWidth - lineWidth) / 2; // Centering
            }
            
            const lineY = lineIndex * (letterH + params.lineHeight);
            
            // Render each letter
            let currentX = offsetX + lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                // Double space (and more) has width of 5 modules (3+2) without letter spacing between spaces
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // If previous character is also space, this space = 2 modules and WITHOUT letter spacing before it
                    if (charIndex > 0 && line[charIndex - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false; // Don't add spacing between spaces
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                const y = offsetY + lineY;
                
                if (params.showJoints || params.showFreeEndpoints) {
                    const glyphCode = getGlyph(char, {
                        alternativeIndex: this.getAlternativeIndex(char, params, lineIndex, charIndex)
                    });
                    let letterCols;
                    if (char === ' ') {
                        const text = params.text || '';
                        const lines = text.split('\n');
                        if (lineIndex < lines.length) {
                            const line = lines[lineIndex];
                            letterCols = (charIndex > 0 && line[charIndex - 1] === ' ') ? 2 : 3;
                        } else {
                            letterCols = 3;
                        }
                    } else {
                        letterCols = this.renderer.cols;
                    }
                    const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.renderer.rows);
                    
                    // Add offset to point coordinates (for endpoints)
                    analysis.connections.forEach(conn => {
                        allConnections.push({
                            ...conn,
                            offsetX: currentX,
                            offsetY: y
                        });
                    });
                    analysis.endpoints.forEach(ep => {
                        allEndpoints.push({
                            ...ep,
                            offsetX: currentX,
                            offsetY: y
                        });
                    });
                }
                
                svgContent += this.renderLetterToSVG(char, currentX, y, params, lineIndex, charIndex);
                currentX += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
        }

        svgContent += `  </g>\n`;

        const hasJoints = params.showJoints && allConnections.length > 0;
        const hasFree = params.showFreeEndpoints && allEndpoints.length > 0;
        if (hasJoints || hasFree) {
            svgContent += `  <g id="points">\n`;
            let el = params.color || '#ffffff';
            let eb = params.bgColor || '#000000';
            if (params.colorBW) {
                el = ColorUtils.toGrayscaleHex(el);
                eb = ColorUtils.toGrayscaleHex(eb);
            }
            svgContent += this.renderEndpointsToSVG(
                allConnections,
                allEndpoints,
                moduleSize,
                el,
                eb,
                { showJoints: !!params.showJoints, showFreeEndpoints: !!params.showFreeEndpoints },
                params.stem !== undefined ? params.stem : moduleSize
            );
            svgContent += `  </g>\n`;
        }

        svgContent += `</svg>`;

        return svgContent;
    }

    /**
     * Render grid to SVG
     */
    renderGridToSVG(svgWidth, svgHeight, params, contentOffsetX = 0, contentOffsetY = 0) {
        const moduleSize = params.moduleSize;
        
        // Calculate grid offset - grid should be multiple of moduleSize
        // Use content offset as base point
        const offsetX = contentOffsetX % moduleSize;
        const offsetY = contentOffsetY % moduleSize;
        
        let gridColor = params.gridColor || '#333333';
        if (params.colorBW) {
            gridColor = ColorUtils.toGrayscaleHex(gridColor);
        }
        let gridSVG = `  <g id="grid" stroke="${gridColor}" stroke-width="0.5" opacity="1">\n`;
        
        // Vertical lines
        for (let x = offsetX; x <= svgWidth; x += moduleSize) {
            gridSVG += `    <line x1="${x}" y1="0" x2="${x}" y2="${svgHeight}"/>\n`;
        }
        
        // Horizontal lines
        for (let y = offsetY; y <= svgHeight; y += moduleSize) {
            gridSVG += `    <line x1="0" y1="${y}" x2="${svgWidth}" y2="${y}"/>\n`;
        }
        
        gridSVG += `  </g>\n`;
        return gridSVG;
    }

    /**
     * Export current text to SVG
     */
    exportToSVG() {
        const svgContent = this.getSVGContent();
        
        if (!svgContent) {
            alert('Enter text to export');
            return;
        }

        // Generate filename: void_sample_text_260101_184230.svg
        const text = this.renderer.params.text || '';
        // Take first 12 characters of text, replace spaces and special characters with underscores
        const textPart = text.substring(0, 12)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || 'text';
        
        // Date and time
        const now = new Date();
        const year = now.getFullYear().toString().substring(2); // last 2 digits of year
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const filename = `void_${textPart}_${year}${month}${day}_${hours}${minutes}${seconds}.svg`;

        // Download file
        this.downloadSVG(svgContent, filename);
    }

    /**
     * Copy SVG to clipboard
     */
    async copySVG() {
        const svgContent = this.getSVGContent();
        
        if (!svgContent) {
            alert('Enter text to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(svgContent);
            // Show success notification
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1000);
        } catch (err) {
            console.error('Copy error:', err);
            alert('Failed to copy to clipboard');
        }
    }
    
    /**
     * Render one letter to SVG
     */
    renderLetterToSVG(char, x, y, params, lineIndex = null, charIndex = null) {
        // Determine whether to use alternative (use cache from renderer)
        let alternativeIndex = null;
        const cacheKey = lineIndex !== null && charIndex !== null ? `${lineIndex}_${charIndex}` : null;
        
        if (cacheKey && params.useAlternativesInRandom && this.renderer.alternativeGlyphCache && this.renderer.alternativeGlyphCache.hasOwnProperty(cacheKey)) {
            // Use saved alternative
            alternativeIndex = this.renderer.alternativeGlyphCache[cacheKey];
        } else if (params.isRandom && params.useAlternativesInRandom && cacheKey) {
            // In Random mode with alternatives enabled - generate random alternative once
            // and save it to cache for stability during export
            const charUpper = char.toUpperCase();
            const alternatives = VOID_ALPHABET_ALTERNATIVES[charUpper];
            if (alternatives && alternatives.length > 0) {
                // Generate random index (0 = base, 1+ = alternatives)
                const baseGlyph = VOID_ALPHABET[charUpper] || VOID_ALPHABET[" "];
                const allGlyphs = [baseGlyph, ...alternatives];
                const randomIndex = Math.floor(Math.random() * allGlyphs.length);
                // Save to renderer cache
                if (!this.renderer.alternativeGlyphCache) {
                    this.renderer.alternativeGlyphCache = {};
                }
                this.renderer.alternativeGlyphCache[cacheKey] = randomIndex;
                alternativeIndex = randomIndex;
            }
        }
        
        const glyphCode = getGlyph(char, {
            alternativeIndex: alternativeIndex
        });
        const moduleW = params.moduleSize;
        const moduleH = params.moduleSize;
        // Space has width of 3 modules (first) or 2 modules (second and further in sequence)
        let letterCols;
        if (char === ' ') {
            // Need to check previous character in line
            const text = params.text || '';
            const lines = text.split('\n');
            if (lineIndex !== null && charIndex !== null && lineIndex < lines.length) {
                const line = lines[lineIndex];
                // If previous character is also space, this space = 2 modules
                letterCols = (charIndex > 0 && line[charIndex - 1] === ' ') ? 2 : 3;
            } else {
                letterCols = 3; // Default 3 modules
            }
        } else {
            letterCols = this.renderer.cols;
        }
        let svg = '';

        // Group for letter
        svg += `    <g>\n`;
        const previousDashPhaseOriginX = this._dashPhaseOriginX;
        const previousDashPhaseOriginY = this._dashPhaseOriginY;
        this._dashPhaseOriginX = x;
        this._dashPhaseOriginY = y;

        // Round Caps / Close Ends from params (Effects panel)
        const shouldUseRounded = params.roundedCaps || false;
        const shouldUseCloseEnds = params.closeEnds !== undefined ? params.closeEnds : true;
        const usesDashRhythm = params.mode === 'dash' || params.mode === 'sd' || params.isRandom;
        
        // Endpoints are also needed by dash rendering: only real free ends are fitted.
        const shouldUseEndpoints = shouldUseRounded || shouldUseCloseEnds || usesDashRhythm;
        
        // Analyze glyph to determine endpoints (if needed for Round or Close Ends)
        let endpointMap = null; // Map: "i_j" -> {top, right, bottom, left}
        if (shouldUseEndpoints) {
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.renderer.rows);
                endpointMap = {};
                // Create map of modules with endpoints, indicating sides
                analysis.endpoints.forEach(ep => {
                    const key = `${ep.col}_${ep.row}`;
                    if (!endpointMap[key]) {
                        endpointMap[key] = { top: false, right: false, bottom: false, left: false };
                    }
                    endpointMap[key][ep.side] = true;
                });
            } catch (error) {
                console.error('Error analyzing glyph for endpoints in export:', error);
            }
        }

        // Render each module in 5×5 grid (or 3×5/2×5 for space)
        for (let i = 0; i < letterCols; i++) {
            for (let j = 0; j < this.renderer.rows; j++) {
                const index = (i + j * this.renderer.cols) * 2;
                const moduleType = glyphCode.charAt(index);
                const rotation = parseInt(glyphCode.charAt(index + 1));
                
                const moduleX = x + i * moduleW;
                const moduleY = y + j * moduleH;
                
                // For random mode use same values as during rendering
                let stem = params.stem;
                let strokesNum = params.strokesNum;
                let strokeGapRatio = params.strokeGapRatio || 1.0;
                
                // Values for dashLength and gapLength
                let dashLength = params.dashLength || 0.10;
                let gapLength = params.gapLength || 0.30;
                
                let moduleUseDash = false;
                if (params.isRandom) {
                    // Use cache from renderer instead of generating new values
                    // Use same key as during rendering (position in text + position in module)
                    const cacheKey = params.randomModeType === 'full' && lineIndex !== null && charIndex !== null
                        ? `${lineIndex}_${charIndex}_${i}_${j}` 
                        : null;
                    const randomValues = this.renderer.getRandomModuleValues(moduleType, cacheKey);
                    stem = randomValues.stem;
                    strokesNum = randomValues.strokesNum;
                    strokeGapRatio = randomValues.strokeGapRatio;
                    dashLength = randomValues.dashLength;
                    gapLength = randomValues.gapLength;
                    moduleUseDash = randomValues.useDash || false;
                }
                
                // roundedCaps applied ONLY to end modules (those with endpointSides)
                // EXCEPTION: in Dash, SD modes roundedCaps applied to ALL modules
                // For Random rounding applied to all modules if dash enabled
                const moduleKey = `${i}_${j}`;
                const endpointSides = endpointMap && endpointMap[moduleKey];
                // For dash/sd/random with dash use logic (roundedCaps for all)
                const isDashMode = params.mode === 'sd' || params.mode === 'dash' || moduleUseDash;
                const moduleRoundedCaps = isDashMode ? shouldUseRounded : (shouldUseRounded && endpointSides);
                
                // Solid mode is now Stripes with Lines=1
                // Random mode uses 'stripes' by default, dash applied randomly for each module
                let actualMode;
                if (params.mode === 'fill') {
                    actualMode = 'stripes';
                } else if (params.isRandom) {
                    // Use 'sd' only if module should use dash
                    actualMode = moduleUseDash ? 'sd' : 'stripes';
                } else {
                    actualMode = params.mode;
                }
                // Match VoidRenderer.drawLetter: global "fill" (Lines slider = 1) means single stripe —
                // unless Random is on and per-module cache supplies strokesNum/contrast for export.
                const actualStrokesNum = params.isRandom
                    ? strokesNum
                    : (params.mode === 'fill' ? 1 : strokesNum);
                
                // Get color for this module if custom module color is enabled (Color Chaos)
                let moduleColor = null;
                if (params.useCustomModuleColor && this.renderer && this.renderer.getColorForModule) {
                    moduleColor = this.renderer.getColorForModule();
                }

                // Per-module gradient pair (randomGradient mode)
                let moduleGradientPair = null;
                if (this.renderer && this.renderer.getGradientForModule) {
                    moduleGradientPair = this.renderer.getGradientForModule();
                }

                const linkElbowAllowRound = moduleType !== 'L' ||
                    this.endpointDetector.shouldRoundLinkElbow(glyphCode, letterCols, this.renderer.rows, i, j);
                
                const moduleSVG = this.renderModuleToSVG(
                    moduleType, 
                    rotation, 
                    moduleX, 
                    moduleY, 
                    moduleW, 
                    moduleH, 
                    stem,
                    actualMode,
                    actualStrokesNum,
                    strokeGapRatio,
                    params.cornerRadius || 0,
                    moduleRoundedCaps,
                    dashLength,
                    gapLength,
                    endpointSides,
                    shouldUseCloseEnds,
                    params.dashChess !== undefined ? params.dashChess : false,
                    moduleColor,
                    moduleGradientPair,
                    shouldUseRounded,
                    linkElbowAllowRound
                );
                
                if (moduleSVG) {
                    svg += moduleSVG;
                }
            }
        }

        svg += `    </g>\n`;
        this._dashPhaseOriginX = previousDashPhaseOriginX;
        this._dashPhaseOriginY = previousDashPhaseOriginY;
        return svg;
    }

    /**
     * Render module to SVG
     */
    renderModuleToSVG(type, rotation, x, y, w, h, stem, mode, strokesNum, strokeGapRatio, cornerRadius = 0, roundedCaps = false, dashLength = 0.10, gapLength = 0.30, endpointSides = null, closeEnds = false, dashChess = false, color = null, gradientPairOverride = null, roundedCapsPreference = false, linkElbowAllowRound = true) {
        if (type === 'E') return ''; // Empty
        
        // Helper function: get local endpoint sides considering rotation
        const getLocalEndpointSides = (rotation, endpointSides) => {
            if (!endpointSides) return null;
            
            const sides = ['top', 'right', 'bottom', 'left'];
            const local = { top: false, right: false, bottom: false, left: false };
            
            Object.keys(endpointSides).forEach(globalSide => {
                if (endpointSides[globalSide]) {
                    const globalIndex = sides.indexOf(globalSide);
                    const localIndex = (globalIndex - rotation + 4) % 4;
                    const localSide = sides[localIndex];
                    local[localSide] = true;
                }
            });
            
            return local;
        };
        
        const localEndpoints = getLocalEndpointSides(rotation, endpointSides);

        // Match ModuleDrawer.drawLink: round join at L elbow only if UI round caps and
        // no third stroke meets the inner corner (linkElbowAllowRound).
        const linkJoinRound = roundedCaps || (roundedCapsPreference && linkElbowAllowRound);
        const linkCapRound = roundedCaps;

        const angle = rotation * 90;
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const previousDashPhaseContext = this._dashPhaseContext;
        this._dashPhaseContext = {
            centerX,
            centerY,
            angleRad: rotation * Math.PI / 2,
            originX: this._dashPhaseOriginX,
            originY: this._dashPhaseOriginY
        };

        let paths = '';

            if (mode === 'fill') {
            // Solid mode
                switch (type) {
                    case 'S':
                    paths = this.renderStraightSVGStroke(0, 0, w, h, stem, roundedCaps, localEndpoints);
                        break;
                    case 'C':
                    paths = this.renderCentralSVGStroke(0, 0, w, h, stem, roundedCaps, localEndpoints);
                        break;
                    case 'J':
                        paths = this.renderJointSVGStroke(0, 0, w, h, stem, roundedCaps);
                        break;
                    case 'L':
                        paths = this.renderLinkSVGStroke(0, 0, w, h, stem, linkCapRound, linkJoinRound);
                        break;
                    case 'R':
                    paths = this.renderRoundSVGStroke(0, 0, w, h, stem, roundedCaps, localEndpoints);
                        break;
                    case 'B':
                    paths = this.renderBendSVGStroke(0, 0, w, h, stem, roundedCaps, localEndpoints);
                        break;
                }
            } else if (mode === 'stripes') {
            // Stripes mode
                switch (type) {
                    case 'S':
                    paths = this.renderStraightSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, roundedCaps, localEndpoints, closeEnds);
                        break;
                    case 'C':
                    paths = this.renderCentralSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, roundedCaps, localEndpoints, closeEnds);
                        break;
                    case 'J':
                        paths = this.renderJointSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, roundedCaps);
                        break;
                    case 'L':
                        paths = this.renderLinkSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, linkCapRound, linkJoinRound);
                        break;
                    case 'R':
                    paths = this.renderRoundSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, roundedCaps, localEndpoints, closeEnds);
                        break;
                    case 'B':
                    paths = this.renderBendSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, roundedCaps, localEndpoints, closeEnds);
                        break;
                }
            } else if (mode === 'dash') {
            // Dash mode
                switch (type) {
                    case 'S':
                    paths = this.renderStraightSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds);
                        break;
                    case 'C':
                    paths = this.renderCentralSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds);
                        break;
                    case 'J':
                    paths = this.renderJointSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds);
                        break;
                    case 'L':
                    paths = this.renderLinkSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, linkCapRound, localEndpoints, linkJoinRound, closeEnds);
                        break;
                    case 'R':
                    paths = this.renderRoundSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds);
                        break;
                    case 'B':
                    paths = this.renderBendSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds);
                        break;
            }
            } else if (mode === 'sd') {
            // SD mode: stripes + dash
                switch (type) {
                    case 'S':
                    paths = this.renderStraightSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds, dashChess);
                        break;
                    case 'C':
                    paths = this.renderCentralSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds, dashChess);
                        break;
                    case 'J':
                    paths = this.renderJointSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds, dashChess);
                        break;
                    case 'L':
                    paths = this.renderLinkSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, linkCapRound, localEndpoints, closeEnds, dashChess, linkJoinRound);
                        break;
                    case 'R':
                    paths = this.renderRoundSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds, dashChess);
                        break;
                    case 'B':
                    paths = this.renderBendSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds, dashChess);
                        break;
            }
        }

        if (!paths) {
            this._dashPhaseContext = previousDashPhaseContext;
            return '';
        }

        // Apply wobbly effect to SVG paths if enabled
        if (this.wobblyEffect && this.wobblyEffect.enabled && this.wobblyEffect.amplitude > 0) {
            // World-space offset for noise (module center in absolute coords)
            const worldOffsetX = centerX;
            const worldOffsetY = centerY;
            // The angle in degrees for coordinate transformation
            const angleRad = rotation * Math.PI / 2;
            paths = this._applyWobblyToSVG(paths, worldOffsetX, worldOffsetY, angleRad);
        }

        // Apply per-stroke gradient if gradient mode is enabled
        const colorMode = this.settings ? (this.settings.get('colorMode') || 'manual') : 'manual';
        let gradientDefs = '';
        if (colorMode === 'gradient' || colorMode === 'randomGradient') {
            const startColor = gradientPairOverride ? gradientPairOverride.start : (this.settings.get('gradientStartColor') || '#ff0000');
            const endColor = gradientPairOverride ? gradientPairOverride.end : (this.settings.get('gradientEndColor') || '#0000ff');
            const result = this._applyGradientToSVG(paths, startColor, endColor);
            gradientDefs = result.defs;
            paths = result.paths;
        }

        // Wrap in group with transformation
        // Add stroke attribute if color is provided (for Color Chaos mode)
        const strokeAttr = color ? ` stroke="${color}"` : '';
        const svg = `      <g transform="translate(${centerX}, ${centerY}) rotate(${angle})"${strokeAttr}>\n${gradientDefs}${paths}      </g>\n`;
        this._dashPhaseContext = previousDashPhaseContext;
        return svg;
    }

    /**
     * Apply per-stroke linear gradient to SVG elements
     * Creates <linearGradient> defs for each <line> and <path> element
     * @param {string} svgPaths - SVG paths string
     * @param {string} startColor - gradient start color
     * @param {string} endColor - gradient end color
     * @returns {Object} {defs, paths} - gradient defs string and modified paths
     */
    _applyGradientToSVG(svgPaths, startColor, endColor) {
        if (!this._gradientCounter) this._gradientCounter = 0;
        
        let defs = '';
        let paths = svgPaths;

        // Process <g class="dl"> wrapper groups FIRST. These groups bundle the
        // individual visible-dash sub-segments of a single logical line/path, and
        // carry the original endpoints as data-l-* attributes so we can attach a
        // single gradient that spans the whole logical line (rather than one
        // gradient per dash segment, which would clamp at each segment).
        paths = paths.replace(
            /<g\s+class="dl"([^>]*)>([\s\S]*?)<\/g>/g,
            (match, attrs, inner) => {
                const x1m = /data-l-x1="([^"]+)"/.exec(attrs);
                const y1m = /data-l-y1="([^"]+)"/.exec(attrs);
                const x2m = /data-l-x2="([^"]+)"/.exec(attrs);
                const y2m = /data-l-y2="([^"]+)"/.exec(attrs);
                if (!x1m || !y1m || !x2m || !y2m) return match;
                const gradId = `sg${this._gradientCounter++}`;
                defs += `        <defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x1m[1]}" y1="${y1m[1]}" x2="${x2m[1]}" y2="${y2m[1]}"><stop offset="0" stop-color="${startColor}"/><stop offset="1" stop-color="${endColor}"/></linearGradient></defs>\n`;
                const cleanAttrs = attrs
                    .replace(/\s*data-l-[xy][12]="[^"]*"/g, '')
                    .replace(/\s*stroke="[^"]*"/g, '');
                // Avoid stroke="inherit" in exported SVG for Figma compatibility:
                // Figma may drop inherited stroke paint when reserializing and turn
                // some child segments into black strokes. We stamp the same gradient
                // directly on each child segment instead of relying on group inheritance.
                const paintedInner = inner.replace(/\s*stroke="inherit"/g, ` stroke="url(#${gradId})"`);
                return `<g class="dl"${cleanAttrs}>${paintedInner}</g>`;
            }
        );

        // Process <line> elements OUTSIDE wrapper groups (children of wrappers carry
        // stroke="inherit" so they are skipped here and inherit the group's gradient).
        paths = paths.replace(
            /<line\s+x1="([^"]+)"\s+y1="([^"]+)"\s+x2="([^"]+)"\s+y2="([^"]+)"([^/]*?)\/>/g,
            (match, x1, y1, x2, y2, attrs) => {
                if (/stroke="inherit"/.test(attrs)) return match;
                const gradId = `sg${this._gradientCounter++}`;
                defs += `        <defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${startColor}"/><stop offset="1" stop-color="${endColor}"/></linearGradient></defs>\n`;
                // Remove any existing stroke attribute and add gradient stroke
                const cleanAttrs = attrs.replace(/\s*stroke="[^"]*"/g, '');
                return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${cleanAttrs} stroke="url(#${gradId})"/>`;
            }
        );
        
        // Process <path> elements - extract first M and last point for gradient direction
        paths = paths.replace(
            /<path\s+d="([^"]+)"([^/]*?)\/>/g,
            (match, d, attrs) => {
                if (/stroke="inherit"/.test(attrs)) return match;
                const points = this._extractPathEndpoints(d);
                if (!points) return match; // can't determine endpoints
                
                const gradId = `sg${this._gradientCounter++}`;
                defs += `        <defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${points.x1}" y1="${points.y1}" x2="${points.x2}" y2="${points.y2}"><stop offset="0" stop-color="${startColor}"/><stop offset="1" stop-color="${endColor}"/></linearGradient></defs>\n`;
                const cleanAttrs = attrs.replace(/\s*stroke="[^"]*"/g, '');
                return `<path d="${d}"${cleanAttrs} stroke="url(#${gradId})"/>`;
            }
        );

        // Process <polyline> elements - use first and last point of `points` for gradient axis.
        // Without this, polylines (e.g. L modules in stripes mode) have no stroke and disappear,
        // because the parent <g id="typo"> intentionally omits stroke in gradient mode.
        paths = paths.replace(
            /<polyline\s+points="([^"]+)"([^/]*?)\/>/g,
            (match, pointsStr, attrs) => {
                if (/stroke="inherit"/.test(attrs)) return match;
                const pts = pointsStr.trim().split(/\s+/);
                if (pts.length < 2) return match;
                const parsePt = (s) => {
                    const parts = s.split(',');
                    return { x: parseFloat(parts[0]), y: parseFloat(parts[1]) };
                };
                const first = parsePt(pts[0]);
                const last = parsePt(pts[pts.length - 1]);
                if (!isFinite(first.x) || !isFinite(first.y) || !isFinite(last.x) || !isFinite(last.y)) return match;

                const x1 = Math.round(first.x * 100) / 100;
                const y1 = Math.round(first.y * 100) / 100;
                const x2 = Math.round(last.x * 100) / 100;
                const y2 = Math.round(last.y * 100) / 100;

                const gradId = `sg${this._gradientCounter++}`;
                defs += `        <defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${startColor}"/><stop offset="1" stop-color="${endColor}"/></linearGradient></defs>\n`;
                const cleanAttrs = attrs.replace(/\s*stroke="[^"]*"/g, '');
                return `<polyline points="${pointsStr}"${cleanAttrs} stroke="url(#${gradId})"/>`;
            }
        );
        
        return { defs, paths };
    }

    /**
     * Extract first and last coordinates from SVG path data
     * @param {string} d - path d attribute
     * @returns {Object|null} {x1, y1, x2, y2} or null
     */
    _extractPathEndpoints(d) {
        // Find first M command
        const firstM = d.match(/M\s*([-\d.]+)[,\s]+([-\d.]+)/);
        if (!firstM) return null;
        
        // Find all coordinate pairs (from M, L, or space-separated)
        const coords = [];
        const re = /([ML])\s*([-\d.]+)[,\s]+([-\d.]+)/g;
        let m;
        while ((m = re.exec(d)) !== null) {
            coords.push({ x: parseFloat(m[2]), y: parseFloat(m[3]) });
        }
        
        // Also try to find arc endpoints (A command)
        const arcRe = /A\s*[-\d.]+[,\s]+[-\d.]+[,\s]+[-\d.]+[,\s]+[01][,\s]+[01][,\s]+([-\d.]+)[,\s]+([-\d.]+)/g;
        while ((m = arcRe.exec(d)) !== null) {
            coords.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
        }
        
        if (coords.length < 2) {
            // Single point — no gradient possible
            if (coords.length === 1) return null;
            return null;
        }
        
        const first = coords[0];
        const last = coords[coords.length - 1];
        
        return {
            x1: Math.round(first.x * 100) / 100,
            y1: Math.round(first.y * 100) / 100,
            x2: Math.round(last.x * 100) / 100,
            y2: Math.round(last.y * 100) / 100
        };
    }

    /**
     * Apply wobbly displacement to SVG path/line elements
     * Transforms <line> and <path> elements by densifying and displacing points
     * @param {string} svgPaths - SVG path string containing <line> and <path> elements
     * @param {number} worldOffsetX - world-space X offset for noise
     * @param {number} worldOffsetY - world-space Y offset for noise
     * @param {number} rotationAngle - module rotation in radians
     * @returns {string} transformed SVG paths
     */
    _applyWobblyToSVG(svgPaths, worldOffsetX, worldOffsetY, rotationAngle) {
        const effect = this.wobblyEffect;
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);
        
        // Transform local coords to world-space (considering rotation around center)
        const toWorld = (lx, ly) => ({
            x: worldOffsetX + lx * cos - ly * sin,
            y: worldOffsetY + lx * sin + ly * cos
        });

        // Helper: clean attributes - strip fill attr to avoid duplication (keep dash attrs for dashed lines)
        const cleanAttributes = (attrs) => {
            return attrs.replace(/\s*fill="[^"]*"/g, '');
        };

        // Step 1: Replace <path> elements first (before <line> creates new <path> elements)
        let result = svgPaths.replace(
            /<path\s+d="([^"]+)"([^/]*?)\/>/g,
            (match, d, attrs) => {
                const newD = this._wobblySVGPath(d, worldOffsetX, worldOffsetY);
                const cleanAttrs = cleanAttributes(attrs);
                return `<path d="${newD}"${cleanAttrs} fill="none"/>`;
            }
        );

        // Step 2: Replace <line> elements with wobbly <path>
        result = result.replace(
            /<line\s+x1="([^"]+)"\s+y1="([^"]+)"\s+x2="([^"]+)"\s+y2="([^"]+)"([^/]*?)\/>/g,
            (match, x1s, y1s, x2s, y2s, attrs) => {
                const x1 = parseFloat(x1s), y1 = parseFloat(y1s);
                const x2 = parseFloat(x2s), y2 = parseFloat(y2s);
                const pathD = effect.getWobblyLinePath(x1, y1, x2, y2, worldOffsetX, worldOffsetY);
                const cleanAttrs = cleanAttributes(attrs);
                return `<path d="${pathD}"${cleanAttrs} fill="none"/>`;
            }
        );

        // Step 3: Replace <polyline> elements
        result = result.replace(
            /<polyline\s+points="([^"]+)"([^/]*?)\/>/g,
            (match, pointsStr, attrs) => {
                const points = pointsStr.trim().split(/\s+/).map(p => {
                    const [x, y] = p.split(',').map(Number);
                    return { x, y };
                });
                const pathD = effect.getWobblyPolylinePath(points, worldOffsetX, worldOffsetY);
                const cleanAttrs = cleanAttributes(attrs);
                return `<path d="${pathD}"${cleanAttrs} fill="none"/>`;
            }
        );

        return result;
    }

    /**
     * Transform an SVG path d attribute to wobbly version
     * Parses M, L, A commands and densifies/displaces them
     * @param {string} d - SVG path d attribute
     * @param {number} worldOffsetX
     * @param {number} worldOffsetY
     * @returns {string} wobbly path d attribute
     */
    _wobblySVGPath(d, worldOffsetX, worldOffsetY) {
        const effect = this.wobblyEffect;
        const detail = effect.detail;
        const tokens = d.trim().split(/\s+/);
        
        let newD = '';
        let currentX = 0, currentY = 0;
        let i = 0;
        
        while (i < tokens.length) {
            const cmd = tokens[i];
            
            if (cmd === 'M') {
                const x = parseFloat(tokens[i + 1]);
                const y = parseFloat(tokens[i + 2]);
                const offset = effect.getDisplacement(worldOffsetX + x, worldOffsetY + y);
                const rx = Math.round((x + offset.dx) * 100) / 100;
                const ry = Math.round((y + offset.dy) * 100) / 100;
                newD += `M ${rx} ${ry}`;
                currentX = x;
                currentY = y;
                i += 3;
            } else if (cmd === 'L') {
                const x = parseFloat(tokens[i + 1]);
                const y = parseFloat(tokens[i + 2]);
                // Densify line segment
                const dx = x - currentX;
                const dy = y - currentY;
                const len = Math.sqrt(dx * dx + dy * dy);
                const segs = Math.max(2, Math.ceil(len / detail));
                
                for (let s = 1; s <= segs; s++) {
                    const t = s / segs;
                    const px = currentX + dx * t;
                    const py = currentY + dy * t;
                    const offset = effect.getDisplacement(worldOffsetX + px, worldOffsetY + py);
                    const rx = Math.round((px + offset.dx) * 100) / 100;
                    const ry = Math.round((py + offset.dy) * 100) / 100;
                    newD += ` L ${rx} ${ry}`;
                }
                
                currentX = x;
                currentY = y;
                i += 3;
            } else if (cmd === 'A') {
                // A rx ry x-rotation large-arc-flag sweep-flag x y
                const radius = parseFloat(tokens[i + 1]);
                // tokens[i+2] = ry (same as rx for circles)
                // tokens[i+3] = x-rotation
                // tokens[i+4] = large-arc-flag
                // tokens[i+5] = sweep-flag
                const endX = parseFloat(tokens[i + 6]);
                const endY = parseFloat(tokens[i + 7]);
                
                // Calculate arc center and angles from current point and end point
                // For our 90-degree arcs, we can approximate
                const arcPath = this._arcToWobblyPath(
                    currentX, currentY, endX, endY, radius,
                    worldOffsetX, worldOffsetY
                );
                newD += arcPath;
                
                currentX = endX;
                currentY = endY;
                i += 8;
            } else if (cmd === 'Q') {
                // Quadratic Bezier - pass through unchanged (unlikely in our case)
                newD += ` Q ${tokens[i + 1]} ${tokens[i + 2]} ${tokens[i + 3]} ${tokens[i + 4]}`;
                currentX = parseFloat(tokens[i + 3]);
                currentY = parseFloat(tokens[i + 4]);
                i += 5;
            } else if (cmd === 'Z' || cmd === 'z') {
                newD += ' Z';
                i += 1;
            } else {
                // Unknown - try to skip
                i += 1;
            }
        }
        
        return newD;
    }

    /**
     * Convert an SVG arc to wobbly line segments
     * Reconstructs the arc from start/end points and radius, then densifies
     * @param {number} x1 - start X
     * @param {number} y1 - start Y
     * @param {number} x2 - end X
     * @param {number} y2 - end Y
     * @param {number} radius - arc radius
     * @param {number} worldOffsetX
     * @param {number} worldOffsetY
     * @returns {string} SVG path segments (L commands)
     */
    _arcToWobblyPath(x1, y1, x2, y2, radius, worldOffsetX, worldOffsetY) {
        const effect = this.wobblyEffect;
        const detail = effect.detail;
        
        // Find center of the arc (for our specific 90-degree arcs in upper-right quadrant)
        // The arc goes from (x1,y1) to (x2,y2) with given radius
        // For our module arcs, the center is at the corner (w/2, -h/2)
        // Using geometric reconstruction: center is at intersection of two circles
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 0.001 || radius < 0.001) {
            const offset = effect.getDisplacement(worldOffsetX + x2, worldOffsetY + y2);
            const rx = Math.round((x2 + offset.dx) * 100) / 100;
            const ry = Math.round((y2 + offset.dy) * 100) / 100;
            return ` L ${rx} ${ry}`;
        }
        
        // Find midpoint
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        
        // Distance from midpoint to center
        const h = Math.sqrt(Math.max(0, radius * radius - (dist / 2) * (dist / 2)));
        
        // Perpendicular direction
        const px = -dy / dist;
        const py = dx / dist;
        
        // Center (sweep-flag = 1 means counter-clockwise in SVG)
        // For our arcs, center is to the left of the line from start to end
        const cx = mx + h * px;
        const cy = my + h * py;
        
        // Calculate start and end angles
        const startAngle = Math.atan2(y1 - cy, x1 - cx);
        const endAngle = Math.atan2(y2 - cy, x2 - cx);
        
        // Determine arc direction (we use sweep-flag=1 which is clockwise in screen coords)
        let angleDiff = endAngle - startAngle;
        if (angleDiff < 0) angleDiff += 2 * Math.PI;
        if (angleDiff > Math.PI) {
            // Try the other center
            const cx2 = mx - h * px;
            const cy2 = my - h * py;
            const startAngle2 = Math.atan2(y1 - cy2, x1 - cx2);
            const endAngle2 = Math.atan2(y2 - cy2, x2 - cx2);
            let angleDiff2 = endAngle2 - startAngle2;
            if (angleDiff2 < 0) angleDiff2 += 2 * Math.PI;
            
            return this._generateWobblyArcSegments(
                cx2, cy2, radius, startAngle2, angleDiff2,
                worldOffsetX, worldOffsetY, detail
            );
        }
        
        return this._generateWobblyArcSegments(
            cx, cy, radius, startAngle, angleDiff,
            worldOffsetX, worldOffsetY, detail
        );
    }

    /**
     * Generate wobbly L segments for an arc
     */
    _generateWobblyArcSegments(cx, cy, radius, startAngle, angleDiff, worldOffsetX, worldOffsetY, detail) {
        const effect = this.wobblyEffect;
        const arcLength = Math.abs(radius * angleDiff);
        const segments = Math.max(4, Math.ceil(arcLength / detail));
        const angleStep = angleDiff / segments;
        
        let path = '';
        
        for (let i = 1; i <= segments; i++) {
            const angle = startAngle + i * angleStep;
            const px = cx + radius * Math.cos(angle);
            const py = cy + radius * Math.sin(angle);
            const offset = effect.getDisplacement(worldOffsetX + px, worldOffsetY + py);
            const rx = Math.round((px + offset.dx) * 100) / 100;
            const ry = Math.round((py + offset.dy) * 100) / 100;
            path += ` L ${rx} ${ry}`;
        }
        
        return path;
    }

    /**
     * Calculate gap and strokeWidth based on total width
     * @param {number} totalWidth - total width for stroke placement
     * @param {number} strokesNum - number of strokes
     * @param {number} strokeGapRatio - stroke thickness to gap ratio
     * @returns {Object} {gap, strokeWidth}
     */
    calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio) {
        return computeStripeLayout(totalWidth, strokesNum, strokeGapRatio);
    }

    // ============================================
    // STROKE METHOD SVG RENDERING
    // ============================================

    /**
     * S — Straight: vertical line on left (stroke)
     */
    renderStraightSVGStroke(x, y, w, h, stem, roundedCaps = false, localEndpoints = null) {
        // Shortening by 0.5 * stem weight (if roundedCaps enabled and there are endpoints)
        const shortenTop = roundedCaps && localEndpoints && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = roundedCaps && localEndpoints && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const lineX = -w / 2 + stem / 4;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        return `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}"/>\n`;
    }

    /**
     * C — Central: vertical line centered (stroke)
     */
    renderCentralSVGStroke(x, y, w, h, stem, roundedCaps = false, localEndpoints = null) {
        // Shortening by 0.5 * stem weight (if roundedCaps enabled and there are endpoints)
        const shortenTop = roundedCaps && localEndpoints && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = roundedCaps && localEndpoints && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const lineX = 0;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        return `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}"/>\n`;
    }

    /**
     * J — Joint: T-shaped connection (stroke)
     */
    renderJointSVGStroke(x, y, w, h, stem, roundedCaps = false) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = 0;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        const lineJoin = roundedCaps ? 'round' : 'miter';
        let svg = '';
        svg += `        <line x1="${vertLineX}" y1="${-h/2}" x2="${vertLineX}" y2="${h/2}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}"/>\n`;
        svg += `        <line x1="${-w/2}" y1="${horizLineY}" x2="${w/2}" y2="${horizLineY}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}"/>\n`;
        return svg;
    }

    /**
     * L — Link/Corner: L-shaped connection (stroke)
     */
    renderLinkSVGStroke(x, y, w, h, stem, strokeCapRound = false, strokeJoinRound = false) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = h / 2 - stem / 4;
        const lineWidth = stem / 2;
        const lineCap = strokeCapRound ? 'round' : 'butt';
        const lineJoin = strokeJoinRound ? 'round' : 'miter';
        // Draw L-shaped connection as single path
        const path = `M ${vertLineX} ${-h/2} L ${vertLineX} ${horizLineY} L ${w/2} ${horizLineY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" fill="none"/>\n`;
    }

    /**
     * R — Round: smooth arc (stroke)
     */
    renderRoundSVGStroke(x, y, w, h, stem, roundedCaps = false, localEndpoints = null) {
        const arcRadius = w - stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        
        // Arc shortening (for fill mode only if roundedCaps)
        const shortenAmount = stem * 0.25;
        const shouldShorten = roundedCaps && localEndpoints;
        const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
        const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
        
        const startAngle = Math.PI / 2 + deltaAngleRight;
        const endAngle = Math.PI - deltaAngleTop;
        
        // SVG arc: M startX startY A rx ry x-axis-rotation large-arc-flag sweep-flag endX endY
        const startX = centerX + arcRadius * Math.cos(startAngle);
        const startY = centerY + arcRadius * Math.sin(startAngle);
        const endX = centerX + arcRadius * Math.cos(endAngle);
        const endY = centerY + arcRadius * Math.sin(endAngle);
        
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" fill="none"/>\n`;
    }

    /**
     * B — Bend: sharp arc (stroke)
     */
    renderBendSVGStroke(x, y, w, h, stem, roundedCaps = false, localEndpoints = null) {
        const arcRadius = stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        
        // Arc shortening (for fill mode only if roundedCaps)
        const shortenAmount = stem * 0.25;
        const shouldShorten = roundedCaps && localEndpoints;
        const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
        const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
        
        const startAngle = Math.PI / 2 + deltaAngleRight;
        const endAngle = Math.PI - deltaAngleTop;
        
        const startX = centerX + arcRadius * Math.cos(startAngle);
        const startY = centerY + arcRadius * Math.sin(startAngle);
        const endX = centerX + arcRadius * Math.cos(endAngle);
        const endY = centerY + arcRadius * Math.sin(endAngle);
        
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" fill="none"/>\n`;
    }

    // Stripes mode for stroke

    /**
     * S — Straight: multiple parallel lines (stroke stripes)
     */
    renderStraightSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        // For stripes mode shorten by half line width (if roundedCaps or closeEnds)
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? strokeWidth / 2 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? strokeWidth / 2 : 0;
        
        const startX = -w / 2 + strokeWidth / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + stripeOffset(i, strokeWidth, gap);
            svg += `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        // Closing lines at ends
        // Close Ends: square cap when Round disabled, round cap when Round enabled
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + stripeOffset(strokesNum - 1, strokeWidth, gap);
            const closeCap = closeEndsLineCap(roundedCaps);
            
            // Closing line on top
            if (localEndpoints.top) {
                const y = -h / 2 + shortenTop;
                svg += `        <line x1="${firstLineX}" y1="${y}" x2="${lastLineX}" y2="${y}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
            // Closing line on bottom
            if (localEndpoints.bottom) {
                const y = h / 2 - shortenBottom;
                svg += `        <line x1="${firstLineX}" y1="${y}" x2="${lastLineX}" y2="${y}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * C — Central: multiple parallel lines centered (stroke stripes)
     */
    renderCentralSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        // For stripes mode shorten by half line width (if roundedCaps or closeEnds)
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? strokeWidth / 2 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? strokeWidth / 2 : 0;
        
        const totalLineWidth = stripeBandWidth(strokesNum, strokeWidth, gap);
        const startX = -totalLineWidth / 2 + strokeWidth / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + stripeOffset(i, strokeWidth, gap);
            svg += `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        // Closing lines at ends
        // Close Ends: square cap when Round disabled, round cap when Round enabled
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + stripeOffset(strokesNum - 1, strokeWidth, gap);
            const closeCap = closeEndsLineCap(roundedCaps);
            
            // Closing line on top
            if (localEndpoints.top) {
                const y = -h / 2 + shortenTop;
                svg += `        <line x1="${firstLineX}" y1="${y}" x2="${lastLineX}" y2="${y}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
            // Closing line on bottom
            if (localEndpoints.bottom) {
                const y = h / 2 - shortenBottom;
                svg += `        <line x1="${firstLineX}" y1="${y}" x2="${lastLineX}" y2="${y}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * J — Joint: multiple parallel lines for each part (stroke stripes)
     */
    renderJointSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        // Draw T-shaped lines without intersections
        const vertStartX = -w / 2 + strokeWidth / 2;
        const totalLineWidth = stripeBandWidth(strokesNum, strokeWidth, gap);
        const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
        
        // Position of rightmost vertical line - horizontal lines start from it
        const lastVertX = vertStartX + stripeOffset(strokesNum - 1, strokeWidth, gap);
        
        // All vertical lines full height (draw first)
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + stripeOffset(i, strokeWidth, gap);
            // Vertical part: full module height
            svg += `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        // All horizontal lines start from rightmost vertical
        for (let i = 0; i < strokesNum; i++) {
            const lineY = horizStartY + stripeOffset(i, strokeWidth, gap);
            // Horizontal part: from rightmost vertical to right edge
            svg += `        <line x1="${lastVertX}" y1="${lineY}" x2="${w/2}" y2="${lineY}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        return svg;
    }

    /**
     * L — Link: multiple parallel lines for each part (stroke stripes)
     */
    renderLinkSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, strokeCapRound = false, strokeJoinRound = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const lineCap = strokeCapRound ? 'round' : 'butt';
        const lineJoin = strokeJoinRound ? 'round' : 'miter';
        let svg = '';
        
        // Draw L-shaped lines without intersections
        // First line (inner) shortest, last line (outer) longest
        const vertStartX = -w / 2 + strokeWidth / 2;
        const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + stripeOffset(i, strokeWidth, gap);
            const lineY = horizStartY + stripeOffset(i, strokeWidth, gap);
            
            // L-shaped line: go from top down, then right
            // Order reversed - first line goes to last horizontal position
            const reverseIndex = strokesNum - 1 - i;
            const reverseLineY = horizStartY + stripeOffset(reverseIndex, strokeWidth, gap);
            
            svg += `        <polyline points="${lineX},${-h/2} ${lineX},${reverseLineY} ${w/2},${reverseLineY}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" fill="none"/>\n`;
        }
        
        return svg;
    }

    /**
     * R — Round: multiple concentric arcs (stroke stripes)
     */
    renderRoundSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const outerRadius = w - strokeWidth / 2;
        const centerX = w / 2;
        const centerY = -h / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        // For stripes mode shorten by half line width
        const shortenAmount = strokeWidth / 2;
        
        let svg = '';
        
        // Remember first and last radii for closing lines
        let firstRadius = outerRadius;
        let lastRadius = outerRadius;
        
        for (let j = 0; j < strokesNum; j++) {
            const arcRadius = stripeArcRadius(j, outerRadius, strokeWidth, gap);
            if (arcRadius > 0) {
                if (j === strokesNum - 1) {
                    lastRadius = arcRadius;
                }
                
                // Shorten if roundedCaps enabled (for rounding) or closeEnds (for closing lines)
                const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
                const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
                const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
                
                const startAngle = Math.PI / 2 + deltaAngleRight;
                const endAngle = Math.PI - deltaAngleTop;
                
                const startX = centerX + arcRadius * Math.cos(startAngle);
                const startY = centerY + arcRadius * Math.sin(startAngle);
                const endX = centerX + arcRadius * Math.cos(endAngle);
                const endY = centerY + arcRadius * Math.sin(endAngle);
                
                const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
                svg += `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" fill="none"/>\n`;
            }
        }
        
        // Closing lines at ends
        // Close Ends: square cap when Round disabled, round cap when Round enabled
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const deltaAngleFirst_right = localEndpoints.right ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_right = localEndpoints.right ? shortenAmount / lastRadius : 0;
            const deltaAngleFirst_top = localEndpoints.top ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_top = localEndpoints.top ? shortenAmount / lastRadius : 0;
            const closeCap = closeEndsLineCap(roundedCaps);
            
            // Closing line on right
            if (localEndpoints.right) {
                const angle1 = Math.PI / 2 + deltaAngleFirst_right;
                const angle2 = Math.PI / 2 + deltaAngleLast_right;
                
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
            // Closing line on top
            if (localEndpoints.top) {
                const angle1 = Math.PI - deltaAngleFirst_top;
                const angle2 = Math.PI - deltaAngleLast_top;
                
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * B — Bend: multiple concentric arcs (stroke stripes)
     */
    renderBendSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const outerRadius = stem / 2 - strokeWidth / 2;
        const centerX = w / 2;
        const centerY = -h / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        // For stripes mode shorten by half line width
        const shortenAmount = strokeWidth / 2;
        
        let svg = '';
        
        // Remember first and last radii for closing lines
        let firstRadius = outerRadius;
        let lastRadius = outerRadius;
        
        for (let j = 0; j < strokesNum; j++) {
            const arcRadius = stripeArcRadius(j, outerRadius, strokeWidth, gap);
            if (arcRadius > 0) {
                if (j === strokesNum - 1) {
                    lastRadius = arcRadius;
                }
                
                // Shorten if roundedCaps enabled (for rounding) or closeEnds (for closing lines)
                const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
                const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
                const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
                
                const startAngle = Math.PI / 2 + deltaAngleRight;
                const endAngle = Math.PI - deltaAngleTop;
                
                const startX = centerX + arcRadius * Math.cos(startAngle);
                const startY = centerY + arcRadius * Math.sin(startAngle);
                const endX = centerX + arcRadius * Math.cos(endAngle);
                const endY = centerY + arcRadius * Math.sin(endAngle);
                
                const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
                svg += `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" fill="none"/>\n`;
            }
        }
        
        // Closing lines at ends
        // Close Ends: square cap when Round disabled, round cap when Round enabled
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const deltaAngleFirst_right = localEndpoints.right ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_right = localEndpoints.right ? shortenAmount / lastRadius : 0;
            const deltaAngleFirst_top = localEndpoints.top ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_top = localEndpoints.top ? shortenAmount / lastRadius : 0;
            const closeCap = closeEndsLineCap(roundedCaps);
            
            // Closing line on right
            if (localEndpoints.right) {
                const angle1 = Math.PI / 2 + deltaAngleFirst_right;
                const angle2 = Math.PI / 2 + deltaAngleLast_right;
                
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
            // Closing line on top
            if (localEndpoints.top) {
                const angle1 = Math.PI - deltaAngleFirst_top;
                const angle2 = Math.PI - deltaAngleLast_top;
                
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    // ============================================
    // DASH MODE SVG RENDERING
    // ============================================

    /**
     * S — Straight: vertical line on left (dash)
     */
    renderStraightSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const lineX = -w / 2 + stem / 4;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        // Calculate dash for FULL length (without shortening)
        const lineLength = h - shortenTop - shortenBottom;
        const dashPx = stem * dashLength;
        const gapPx = this._effectiveDashGapLength(stem * gapLength, lineWidth, lineCap);
        const phaseOffset = this._dashPhaseAt(lineX, -h/2 + shortenTop, 0, 1);
        const adaptive = this._getDashPattern(lineLength, dashPx, gapPx, {
            startEndpoint: localEndpoints && localEndpoints.top,
            endEndpoint: localEndpoints && localEndpoints.bottom,
            phaseOffset
        });
        
        return this._emitDashedLine(lineX, -h/2 + shortenTop, lineX, h/2 - shortenBottom, lineWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
    }

    /**
     * C — Central: vertical line centered (dash)
     */
    renderCentralSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const lineX = 0;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        // Calculate dash for FULL length (without shortening)
        const lineLength = h - shortenTop - shortenBottom;
        const dashPx = stem * dashLength;
        const gapPx = this._effectiveDashGapLength(stem * gapLength, lineWidth, lineCap);
        const phaseOffset = this._dashPhaseAt(lineX, -h/2 + shortenTop, 0, 1);
        const adaptive = this._getDashPattern(lineLength, dashPx, gapPx, {
            startEndpoint: localEndpoints && localEndpoints.top,
            endEndpoint: localEndpoints && localEndpoints.bottom,
            phaseOffset
        });
        
        return this._emitDashedLine(lineX, -h/2 + shortenTop, lineX, h/2 - shortenBottom, lineWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
    }

    /**
     * J — Joint: T-shaped connection (dash)
     */
    renderJointSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = 0;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        const lineJoin = roundedCaps ? 'round' : 'miter';
        
        // Shortening for vertical line (if roundedCaps enabled and there are endpoints)
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        // Shortening for horizontal line
        const shortenLeft = shouldShorten && localEndpoints.left ? stem * 0.25 : 0;
        const shortenRight = shouldShorten && localEndpoints.right ? stem * 0.25 : 0;
        
        const dashPx = stem * dashLength;
        const gapPx = this._effectiveDashGapLength(stem * gapLength, lineWidth, lineCap);
        
        // Vertical line: calculate dash for SHORTENED length
        const vertLength = h - shortenTop - shortenBottom;
        const vertPhaseOffset = this._dashPhaseAt(vertLineX, -h/2 + shortenTop, 0, 1);
        const vertAdaptive = this._getDashPattern(vertLength, dashPx, gapPx, {
            startEndpoint: localEndpoints && localEndpoints.top,
            endEndpoint: localEndpoints && localEndpoints.bottom,
            phaseOffset: vertPhaseOffset
        });
        
        // Horizontal line: calculate dash for SHORTENED length
        const horizStartX = vertLineX;
        const horizEndX = w / 2 - shortenRight;
        const horizLength = horizEndX - horizStartX;
        const horizPhaseOffset = this._dashPhaseAt(horizStartX, horizLineY, 1, 0);
        const horizAdaptive = this._getDashPattern(horizLength, dashPx, gapPx, {
            startEndpoint: false,
            endEndpoint: localEndpoints && localEndpoints.right,
            phaseOffset: horizPhaseOffset
        });
        
        let svg = '';
        svg += this._emitDashedLine(vertLineX, -h/2 + shortenTop, vertLineX, h/2 - shortenBottom, lineWidth, vertAdaptive.dashLength, vertAdaptive.gapLength, vertAdaptive.dashOffset, lineCap);
        svg += this._emitDashedLine(horizStartX, horizLineY, horizEndX, horizLineY, lineWidth, horizAdaptive.dashLength, horizAdaptive.gapLength, horizAdaptive.dashOffset, lineCap);
        return svg;
    }

    /**
     * L — Link/Corner: L-shaped connection (dash)
     */
    renderLinkSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, strokeCapRound = false, localEndpoints = null, strokeJoinRound = false, closeEnds = false) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = h / 2 - stem / 4;
        const lineWidth = stem / 2;
        const lineCap = strokeCapRound ? 'round' : 'butt';
        const lineJoin = strokeJoinRound ? 'round' : 'miter';
        
        // Shortening (if roundedCaps enabled and there are endpoints)
        const shouldShorten = (strokeCapRound || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenRight = shouldShorten && localEndpoints.right ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const dashPx = stem * dashLength;
        const gapPx = this._effectiveDashGapLength(stem * gapLength, lineWidth, lineCap);
        
        // For L-shaped connection calculate SHORTENED path length
        const vertStartY = -h / 2 + shortenTop;
        const horizEndX = w / 2 - shortenRight;
        
        const vertLength = h / 2 + horizLineY - shortenTop;
        const horizLength = horizEndX - vertLineX;
        const totalLength = vertLength + horizLength;
        
        const phaseOffset = this._dashPhaseAt(vertLineX, vertStartY, 0, 1);
        const adaptive = this._getDashPattern(totalLength, dashPx, gapPx, {
            startEndpoint: localEndpoints && localEndpoints.top,
            endEndpoint: localEndpoints && localEndpoints.right,
            phaseOffset
        });
        
        // Draw L-shaped connection as a series of solid segments (Figma-safe).
        return this._emitDashedLPath(vertLineX, vertStartY, vertLineX, horizLineY, horizEndX, horizLineY, lineWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap, lineJoin);
    }

    /**
     * R — Round: smooth arc (dash)
     */
    renderRoundSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const arcRadius = w - stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        
        // Arc shortening (for dash mode only if roundedCaps)
        const shortenAmount = stem * 0.25;
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
        const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
        
        const startAngle = Math.PI / 2 + deltaAngleRight;
        const endAngle = Math.PI - deltaAngleTop;
        
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        const dashPx = stem * dashLength;
        const gapPx = this._effectiveDashGapLength(stem * gapLength, lineWidth, lineCap);
        
        // Calculate arc length for SHORTENED arc: L = radius * angle
        const arcAngle = endAngle - startAngle;
        const arcLength = arcRadius * arcAngle;
        const phaseOffset = this._dashPhaseAt(
            centerX + arcRadius * Math.cos(startAngle),
            centerY + arcRadius * Math.sin(startAngle),
            -Math.sin(startAngle),
            Math.cos(startAngle)
        );
        const adaptive = this._getDashPattern(arcLength, dashPx, gapPx, {
            startEndpoint: localEndpoints && localEndpoints.right,
            endEndpoint: localEndpoints && localEndpoints.top,
            phaseOffset
        });
        
        return this._emitDashedArc(centerX, centerY, arcRadius, startAngle, endAngle, lineWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
    }

    /**
     * B — Bend: sharp arc (dash)
     */
    renderBendSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const arcRadius = stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        
        // Arc shortening (for dash mode only if roundedCaps)
        const shortenAmount = stem * 0.25;
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
        const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
        
        const startAngle = Math.PI / 2 + deltaAngleRight;
        const endAngle = Math.PI - deltaAngleTop;
        
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        const dashPx = stem * dashLength;
        const gapPx = this._effectiveDashGapLength(stem * gapLength, lineWidth, lineCap);
        
        // Calculate arc length for SHORTENED arc: L = radius * angle
        const arcAngle = endAngle - startAngle;
        const arcLength = arcRadius * arcAngle;
        const phaseOffset = this._dashPhaseAt(
            centerX + arcRadius * Math.cos(startAngle),
            centerY + arcRadius * Math.sin(startAngle),
            -Math.sin(startAngle),
            Math.cos(startAngle)
        );
        const adaptive = this._getDashPattern(arcLength, dashPx, gapPx, {
            startEndpoint: localEndpoints && localEndpoints.right,
            endEndpoint: localEndpoints && localEndpoints.top,
            phaseOffset
        });
        
        return this._emitDashedArc(centerX, centerY, arcRadius, startAngle, endAngle, lineWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
    }

    // ============================================
    // SD MODE SVG RENDERING (stripes + dash)
    // ============================================

    /**
     * S — Straight: multiple parallel dashed lines (SD mode)
     */
    renderStraightSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? strokeWidth / 2 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? strokeWidth / 2 : 0;
        
        const startX = -w / 2 + strokeWidth / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const lineLength = h - shortenTop - shortenBottom;
        // In SD mode dash/gap calculated relative to strokeWidth
        const dashPx = strokeWidth * dashLength;
        const gapPx = this._effectiveDashGapLength(strokeWidth * gapLength, strokeWidth, lineCap);
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + stripeOffset(i, strokeWidth, gap);
            const phaseOffset = this._dashPhaseAt(lineX, -h/2 + shortenTop, 0, 1);
            const adaptive = this._getDashPattern(lineLength, dashPx, gapPx, {
                startEndpoint: localEndpoints && localEndpoints.top,
                endEndpoint: localEndpoints && localEndpoints.bottom,
                phaseOffset,
                index: i,
                dashChess
            });
            svg += this._emitDashedLine(lineX, -h/2 + shortenTop, lineX, h/2 - shortenBottom, strokeWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
        }
        
        // Closing lines at ends (also dashed in SD mode)
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + stripeOffset(strokesNum - 1, strokeWidth, gap);
            const closeLineLength = lastLineX - firstLineX;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            // Close Ends: square cap when Round disabled, round cap when Round enabled
            const closeCap = closeEndsLineCap(roundedCaps);
            
            if (localEndpoints.top) {
                const yClos = -h / 2 + shortenTop;
                svg += this._emitDashedLine(firstLineX, yClos, lastLineX, yClos, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
            
            if (localEndpoints.bottom) {
                const yClos = h / 2 - shortenBottom;
                svg += this._emitDashedLine(firstLineX, yClos, lastLineX, yClos, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
        }
        
        return svg;
    }

    /**
     * C — Central: multiple parallel centered dashed lines (SD mode)
     */
    renderCentralSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const totalLineWidth = stripeBandWidth(strokesNum, strokeWidth, gap);
        const startX = -totalLineWidth / 2 + strokeWidth / 2;
        
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? strokeWidth / 2 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? strokeWidth / 2 : 0;
        
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const lineLength = h - shortenTop - shortenBottom;
        const dashPx = strokeWidth * dashLength;
        const gapPx = this._effectiveDashGapLength(strokeWidth * gapLength, strokeWidth, lineCap);
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + stripeOffset(i, strokeWidth, gap);
            const phaseOffset = this._dashPhaseAt(lineX, -h/2 + shortenTop, 0, 1);
            const adaptive = this._getDashPattern(lineLength, dashPx, gapPx, {
                startEndpoint: localEndpoints && localEndpoints.top,
                endEndpoint: localEndpoints && localEndpoints.bottom,
                phaseOffset,
                index: i,
                dashChess
            });
            svg += this._emitDashedLine(lineX, -h/2 + shortenTop, lineX, h/2 - shortenBottom, strokeWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
        }
        
        // Closing lines at ends (also dashed in SD mode)
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + stripeOffset(strokesNum - 1, strokeWidth, gap);
            const closeLineLength = lastLineX - firstLineX;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            // Close Ends: square cap when Round disabled, round cap when Round enabled
            const closeCap = closeEndsLineCap(roundedCaps);
            
            if (localEndpoints.top) {
                const yClos = -h / 2 + shortenTop;
                svg += this._emitDashedLine(firstLineX, yClos, lastLineX, yClos, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
            
            if (localEndpoints.bottom) {
                const yClos = h / 2 - shortenBottom;
                svg += this._emitDashedLine(firstLineX, yClos, lastLineX, yClos, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
        }
        
        return svg;
    }

    /**
     * J — Joint: T-shaped connection with dashes (SD mode)
     */
    renderJointSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const vertStartX = -w / 2 + strokeWidth / 2;
        const totalLineWidth = stripeBandWidth(strokesNum, strokeWidth, gap);
        const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
        const lastVertX = vertStartX + stripeOffset(strokesNum - 1, strokeWidth, gap);
        
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const dashPx = strokeWidth * dashLength;
        const gapPx = this._effectiveDashGapLength(strokeWidth * gapLength, strokeWidth, lineCap);
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + stripeOffset(i, strokeWidth, gap);
            const vertPhaseOffset = this._dashPhaseAt(lineX, -h/2, 0, 1);
            const vertAdaptive = this._getDashPattern(h, dashPx, gapPx, {
                startEndpoint: localEndpoints && localEndpoints.top,
                endEndpoint: localEndpoints && localEndpoints.bottom,
                phaseOffset: vertPhaseOffset,
                index: i,
                dashChess
            });
            svg += this._emitDashedLine(lineX, -h/2, lineX, h/2, strokeWidth, vertAdaptive.dashLength, vertAdaptive.gapLength, vertAdaptive.dashOffset, lineCap);
        }
        
        // Horizontal lines
        const horizLength = w / 2 - lastVertX;
        for (let i = 0; i < strokesNum; i++) {
            const lineY = horizStartY + stripeOffset(i, strokeWidth, gap);
            const horizPhaseOffset = this._dashPhaseAt(lastVertX, lineY, 1, 0);
            const horizAdaptive = this._getDashPattern(horizLength, dashPx, gapPx, {
                startEndpoint: false,
                endEndpoint: localEndpoints && localEndpoints.right,
                phaseOffset: horizPhaseOffset,
                index: i,
                dashChess
            });
            svg += this._emitDashedLine(lastVertX, lineY, w/2, lineY, strokeWidth, horizAdaptive.dashLength, horizAdaptive.gapLength, horizAdaptive.dashOffset, lineCap);
        }
        
        return svg;
    }

    /**
     * L — Link/Corner: L-shaped connection with dashes (SD mode)
     */
    renderLinkSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, strokeCapRound = false, localEndpoints = null, closeEnds = false, dashChess = false, strokeJoinRound = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const vertStartX = -w / 2 + strokeWidth / 2;
        const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
        
        const lineCap = strokeCapRound ? 'round' : 'butt';
        const lineJoin = strokeJoinRound ? 'round' : 'miter';
        let svg = '';
        
        const dashPx = strokeWidth * dashLength;
        const gapPx = this._effectiveDashGapLength(strokeWidth * gapLength, strokeWidth, lineCap);
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + stripeOffset(i, strokeWidth, gap);
            const reverseIndex = strokesNum - 1 - i;
            const lineY = horizStartY + stripeOffset(reverseIndex, strokeWidth, gap);
            
            const vertLength = h / 2 + lineY;
            const horizLength = w / 2 - lineX;
            const totalLength = vertLength + horizLength;
            
            const phaseOffset = this._dashPhaseAt(lineX, -h/2, 0, 1);
            const adaptive = this._getDashPattern(totalLength, dashPx, gapPx, {
                startEndpoint: localEndpoints && localEndpoints.top,
                endEndpoint: localEndpoints && localEndpoints.right,
                phaseOffset,
                index: i,
                dashChess
            });
            
            svg += this._emitDashedLPath(lineX, -h/2, lineX, lineY, w/2, lineY, strokeWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap, lineJoin);
        }
        
        return svg;
    }

    /**
     * R — Round: multiple dashed arcs (SD mode)
     */
    renderRoundSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const outerRadius = w - strokeWidth / 2;
        const minRadius = Math.max(strokeWidth / 2, 0.1);
        const shortenAmount = strokeWidth / 2;
        
        const centerX = w / 2;
        const centerY = -h / 2;
        
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const dashPx = strokeWidth * dashLength;
        const gapPx = this._effectiveDashGapLength(strokeWidth * gapLength, strokeWidth, lineCap);
        for (let j = 0; j < strokesNum; j++) {
            let arcRadius = stripeArcRadius(j, outerRadius, strokeWidth, gap);
            if (arcRadius < minRadius) arcRadius = minRadius;
            if (arcRadius <= 0) continue;
            
            const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
            const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            const arcLength = arcRadius * (endAngle - startAngle);
            const phaseOffset = this._dashPhaseAt(
                centerX + arcRadius * Math.cos(startAngle),
                centerY + arcRadius * Math.sin(startAngle),
                -Math.sin(startAngle),
                Math.cos(startAngle)
            );
            const adaptive = this._getDashPattern(arcLength, dashPx, gapPx, {
                startEndpoint: localEndpoints && localEndpoints.right,
                endEndpoint: localEndpoints && localEndpoints.top,
                phaseOffset,
                index: j,
                dashChess
            });
            
            svg += this._emitDashedArc(centerX, centerY, arcRadius, startAngle, endAngle, strokeWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
        }
        
        // Closing lines (also dashed in SD mode)
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstRadius = outerRadius;
            let lastRadius = stripeArcRadius(strokesNum - 1, outerRadius, strokeWidth, gap);
            if (lastRadius < minRadius) lastRadius = minRadius;
            
            const closeLineLength = firstRadius - lastRadius;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            // Close Ends: square cap when Round disabled, round cap when Round enabled
            const closeCap = closeEndsLineCap(roundedCaps);
            
            if (localEndpoints.right) {
                const deltaAngleFirst = shortenAmount / firstRadius;
                const deltaAngleLast = shortenAmount / lastRadius;
                const angle1 = Math.PI / 2 + deltaAngleFirst;
                const angle2 = Math.PI / 2 + deltaAngleLast;
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                svg += this._emitDashedLine(x1, y1, x2, y2, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
            
            if (localEndpoints.top) {
                const deltaAngleFirst = shortenAmount / firstRadius;
                const deltaAngleLast = shortenAmount / lastRadius;
                const angle1 = Math.PI - deltaAngleFirst;
                const angle2 = Math.PI - deltaAngleLast;
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                svg += this._emitDashedLine(x1, y1, x2, y2, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
        }
        
        return svg;
    }

    /**
     * B — Bend: multiple small dashed arcs (SD mode)
     */
    renderBendSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const outerRadius = stem / 2 - strokeWidth / 2;
        const minRadius = Math.max(strokeWidth / 2, 0.1);
        const shortenAmount = strokeWidth / 2;
        
        const centerX = w / 2;
        const centerY = -h / 2;
        
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const dashPx = strokeWidth * dashLength;
        const gapPx = this._effectiveDashGapLength(strokeWidth * gapLength, strokeWidth, lineCap);
        for (let j = 0; j < strokesNum; j++) {
            let arcRadius = stripeArcRadius(j, outerRadius, strokeWidth, gap);
            if (arcRadius < minRadius) arcRadius = minRadius;
            if (arcRadius <= 0) continue;
            
            const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
            const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            const arcLength = arcRadius * (endAngle - startAngle);
            const phaseOffset = this._dashPhaseAt(
                centerX + arcRadius * Math.cos(startAngle),
                centerY + arcRadius * Math.sin(startAngle),
                -Math.sin(startAngle),
                Math.cos(startAngle)
            );
            const adaptive = this._getDashPattern(arcLength, dashPx, gapPx, {
                startEndpoint: localEndpoints && localEndpoints.right,
                endEndpoint: localEndpoints && localEndpoints.top,
                phaseOffset,
                index: j,
                dashChess
            });
            
            svg += this._emitDashedArc(centerX, centerY, arcRadius, startAngle, endAngle, strokeWidth, adaptive.dashLength, adaptive.gapLength, adaptive.dashOffset, lineCap);
        }
        
        // Closing lines (also dashed in SD mode)
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstRadius = outerRadius;
            let lastRadius = stripeArcRadius(strokesNum - 1, outerRadius, strokeWidth, gap);
            if (lastRadius < minRadius) lastRadius = minRadius;
            
            const closeLineLength = firstRadius - lastRadius;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            // Close Ends: square cap when Round disabled, round cap when Round enabled
            const closeCap = closeEndsLineCap(roundedCaps);
            
            if (localEndpoints.right) {
                const deltaAngleFirst = shortenAmount / firstRadius;
                const deltaAngleLast = shortenAmount / lastRadius;
                const angle1 = Math.PI / 2 + deltaAngleFirst;
                const angle2 = Math.PI / 2 + deltaAngleLast;
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                svg += this._emitDashedLine(x1, y1, x2, y2, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
            
            if (localEndpoints.top) {
                const deltaAngleFirst = shortenAmount / firstRadius;
                const deltaAngleLast = shortenAmount / lastRadius;
                const angle1 = Math.PI - deltaAngleFirst;
                const angle2 = Math.PI - deltaAngleLast;
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                svg += this._emitDashedLine(x1, y1, x2, y2, strokeWidth, closeAdaptive.dashLength, closeAdaptive.gapLength, closeAdaptive.dashOffset, closeCap);
            }
        }
        
        return svg;
    }

    /**
     * Get alternative index for character (helper method)
     */
    getAlternativeIndex(char, params, lineIndex, charIndex) {
        const cacheKey = lineIndex !== null && charIndex !== null ? `${lineIndex}_${charIndex}` : null;
        
        if (cacheKey && params.useAlternativesInRandom && this.renderer.alternativeGlyphCache && this.renderer.alternativeGlyphCache.hasOwnProperty(cacheKey)) {
            return this.renderer.alternativeGlyphCache[cacheKey];
        } else if (params.isRandom && params.useAlternativesInRandom && cacheKey) {
            const charUpper = char.toUpperCase();
            const alternatives = VOID_ALPHABET_ALTERNATIVES[charUpper];
            if (alternatives && alternatives.length > 0) {
                const baseGlyph = VOID_ALPHABET[charUpper] || VOID_ALPHABET[" "];
                const allGlyphs = [baseGlyph, ...alternatives];
                const randomIndex = Math.floor(Math.random() * allGlyphs.length);
                if (!this.renderer.alternativeGlyphCache) {
                    this.renderer.alternativeGlyphCache = {};
                }
                this.renderer.alternativeGlyphCache[cacheKey] = randomIndex;
                return randomIndex;
            }
        }
        return null;
    }

    /**
     * Render endpoints and joints to SVG
     * Joints (connections) vs free stroke ends, matching canvas. Circles for both; joints use bg + letter stroke.
     */
    renderEndpointsToSVG(
        connections,
        endpoints,
        moduleSize,
        letterColor = '#ffffff',
        backgroundColor = '#000000',
        visibility = { showJoints: true, showFreeEndpoints: true },
        stem = moduleSize
    ) {
        const { showJoints = true, showFreeEndpoints: showFree = true } = visibility || {};
        const pointRadius = 6;
        const strokeWidth = 2;
        let svg = '';

        const axisLocal = (col, row, side, type, rotation) => {
            return (type !== undefined && rotation !== undefined)
                ? this.endpointDetector.getLineEndPointCoordinates(type, rotation, side, moduleSize, stem)
                : this.endpointDetector.getPointCoordinates(col, row, side, moduleSize);
        };

        if (showJoints && connections.length > 0) {
            svg += `    <g id="connections" fill="${backgroundColor}" stroke="${letterColor}" stroke-width="${strokeWidth}">\n`;
            connections.forEach(conn => {
                const l1 = axisLocal(conn.col1, conn.row1, conn.side1, conn.type1, conn.rotation1);
                const a1x = conn.col1 * moduleSize + l1.x;
                const a1y = conn.row1 * moduleSize + l1.y;
                let a2x = a1x;
                let a2y = a1y;
                if (conn.col2 !== undefined) {
                    const l2 = axisLocal(conn.col2, conn.row2, conn.side2, conn.type2, conn.rotation2);
                    a2x = conn.col2 * moduleSize + l2.x;
                    a2y = conn.row2 * moduleSize + l2.y;
                }
                const cx = conn.offsetX + (a1x + a2x) / 2;
                const cy = conn.offsetY + (a1y + a2y) / 2;
                svg += `      <circle cx="${cx}" cy="${cy}" r="${pointRadius}"/>\n`;
            });
            svg += `    </g>\n`;
        }

        if (showFree && endpoints.length > 0) {
            svg += `    <g id="endpoints" fill="${letterColor}" stroke="${letterColor}" stroke-width="${strokeWidth}">\n`;
            endpoints.forEach(ep => {
                const l = axisLocal(ep.col, ep.row, ep.side, ep.type, ep.rotation);
                const cx = ep.offsetX + ep.col * moduleSize + l.x;
                const cy = ep.offsetY + ep.row * moduleSize + l.y;
                svg += `      <circle cx="${cx}" cy="${cy}" r="${pointRadius}"/>\n`;
            });
            svg += `    </g>\n`;
        }

        return svg;
    }

    /**
     * Download SVG file
     */
    downloadSVG(content, filename) {
        const blob = new Blob([content], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
