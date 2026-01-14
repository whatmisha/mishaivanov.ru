/**
 * VoidExporter - export Void typeface to SVG
 */

import { VOID_ALPHABET_ALTERNATIVES, VOID_ALPHABET } from './VoidAlphabet.js';
import { getGlyph } from './GlyphLoader.js';
import { EndpointDetector } from '../utils/EndpointDetector.js';
import { RandomUtils } from '../utils/RandomUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class VoidExporter {
    constructor(renderer, settings = null) {
        this.renderer = renderer;
        this.settings = settings;
        this.moduleTypeCache = {};
        this.endpointDetector = new EndpointDetector();
    }

    /**
     * Clear module type cache
     */
    clearModuleTypeCache() {
        this.moduleTypeCache = {};
    }

    /**
     * Get random values for module (considering random mode)
     * Uses renderer cache for value consistency
     */
    getRandomModuleValues(moduleType, params, cacheKey = null) {
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
    calculateAdaptiveDash(lineLength, dashLength, gapLength) {
        return MathUtils.calculateAdaptiveDash(lineLength, dashLength, gapLength);
    }

    /**
     * Get SVG content (without downloading)
     */
    getSVGContent() {
        const params = this.renderer.params;
        
        if (this.settings) {
            params.includeGridToExport = this.settings.get('showGrid') || false;
            if (this.settings.get('textAlign')) {
                params.textAlign = this.settings.get('textAlign');
            }
            if (this.settings.get('roundedCaps') !== undefined) {
                params.roundedCaps = this.settings.get('roundedCaps');
            }
            if (this.settings.get('randomRounded') !== undefined) {
                params.randomRounded = this.settings.get('randomRounded');
            }
            if (this.settings.get('randomCloseEnds') !== undefined) {
                params.randomCloseEnds = this.settings.get('randomCloseEnds');
            }
            if (this.settings.get('randomDash') !== undefined) {
                params.randomDash = this.settings.get('randomDash');
            }
            if (this.settings.get('dashChess') !== undefined) {
                params.dashChess = this.settings.get('dashChess');
            }
            if (this.settings.get('showEndpoints') !== undefined) {
                params.showEndpoints = this.settings.get('showEndpoints');
            }
            if (this.settings.get('showTestCircles') !== undefined) {
                params.showTestCircles = this.settings.get('showTestCircles');
            }
            if (this.settings.get('closeEnds') !== undefined) {
                params.closeEnds = this.settings.get('closeEnds');
            }
        } else if (params.includeGridToExport === undefined) {
            params.includeGridToExport = params.showGrid || false;
        }
        
        if (params.showEndpoints === undefined) {
            params.showEndpoints = false;
        }
        if (params.showTestCircles === undefined) {
            params.showTestCircles = false;
        }
        if (params.closeEnds === undefined) {
            params.closeEnds = false;
        }
        if (!params.textAlign) {
            params.textAlign = 'center';
        }
        if (params.roundedCaps === undefined) {
            params.roundedCaps = false;
        }
        if (params.randomRounded === undefined) {
            params.randomRounded = false;
        }
        if (params.randomCloseEnds === undefined) {
            params.randomCloseEnds = false;
        }
        if (params.randomDash === undefined) {
            params.randomDash = false;
        }
        const text = params.text;
        
        if (!text) {
            return null;
        }

        const lines = text.split('\n');
        const letterW = this.renderer.cols * params.moduleSize;
        const letterH = this.renderer.rows * params.moduleSize;
        
        let contentWidth = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
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
        
        const offsetX = (svgSize - contentWidth) / 2;
        const offsetY = (svgSize - contentHeight) / 2;
        
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
`;

        svgContent += `  <g id="back">\n`;
        svgContent += `    <rect width="${svgSize}" height="${svgSize}" fill="${params.bgColor || '#000000'}"/>\n`;
        svgContent += `  </g>\n`;

        if (params.includeGridToExport === true) {
            svgContent += this.renderGridToSVG(svgSize, svgSize, params, offsetX, offsetY);
        }

        svgContent += `  <g id="typo" stroke="${params.color || '#ffffff'}" fill="none">\n`;

        const allConnections = [];
        const allEndpoints = [];
        const allTestCircles = [];
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= params.letterSpacing;
            }
            
            const textAlign = params.textAlign || 'center';
            let lineX;
            if (textAlign === 'left') {
                lineX = 0;
            } else if (textAlign === 'right') {
                lineX = contentWidth - lineWidth;
            } else {
                lineX = (contentWidth - lineWidth) / 2;
            }
            
            const lineY = lineIndex * (letterH + params.lineHeight);
            
            let currentX = offsetX + lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (charIndex > 0 && line[charIndex - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                const y = offsetY + lineY;
                
                if (params.showEndpoints || params.showTestCircles) {
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
                    
                    if (params.showEndpoints) {
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
                    
                    if (params.showTestCircles && analysis.endpoints.length > 0) {
                        analysis.endpoints.forEach(ep => {
                            const moduleIndex = (ep.row * letterCols + ep.col) * 2;
                            if (moduleIndex < glyphCode.length) {
                                const moduleType = glyphCode.charAt(moduleIndex);
                                const moduleRotation = parseInt(glyphCode.charAt(moduleIndex + 1));
                                
                                allTestCircles.push({
                                    ...ep,
                                    offsetX: currentX,
                                    offsetY: y,
                                    moduleType: moduleType,
                                    moduleRotation: moduleRotation
                                });
                            }
                        });
                    }
                }
                
                svgContent += this.renderLetterToSVG(char, currentX, y, params, lineIndex, charIndex);
                currentX += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
        }

        svgContent += `  </g>\n`;

        if (params.showEndpoints && (allConnections.length > 0 || allEndpoints.length > 0)) {
            svgContent += `  <g id="points">\n`;
            svgContent += this.renderEndpointsToSVG(allConnections, allEndpoints, moduleSize, params.color || '#ffffff');
            svgContent += `  </g>\n`;
        }

        if (params.showTestCircles && allTestCircles.length > 0) {
            svgContent += `  <g id="test-circles">\n`;
            svgContent += this.renderTestCirclesToSVG(allTestCircles, moduleSize, params.stem, params.color || '#ffffff');
            svgContent += `  </g>\n`;
        }

        svgContent += `</svg>`;

        return svgContent;
    }

    /**
     * Отрисовать сетку в SVG
     */
    renderGridToSVG(svgWidth, svgHeight, params, contentOffsetX = 0, contentOffsetY = 0) {
        const moduleSize = params.moduleSize;
        
        // Calculate grid offset - grid must be multiple of moduleSize
        const offsetX = contentOffsetX % moduleSize;
        const offsetY = contentOffsetY % moduleSize;
        
        const gridColor = params.gridColor || '#333333';
        let gridSVG = `  <g id="grid" stroke="${gridColor}" stroke-width="0.5" opacity="1">\n`;
        
        for (let x = offsetX; x <= svgWidth; x += moduleSize) {
            gridSVG += `    <line x1="${x}" y1="0" x2="${x}" y2="${svgHeight}"/>\n`;
        }
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

        const text = this.renderer.params.text || '';
        const textPart = text.substring(0, 12)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || 'text';
        
        const now = new Date();
        const year = now.getFullYear().toString().substring(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const filename = `void_${textPart}_${year}${month}${day}_${hours}${minutes}${seconds}.svg`;

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
        let alternativeIndex = null;
        const cacheKey = lineIndex !== null && charIndex !== null ? `${lineIndex}_${charIndex}` : null;
        
        if (cacheKey && this.renderer.alternativeGlyphCache && this.renderer.alternativeGlyphCache.hasOwnProperty(cacheKey)) {
            alternativeIndex = this.renderer.alternativeGlyphCache[cacheKey];
        } else if (params.mode === 'random' && params.useAlternativesInRandom && cacheKey) {
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
                alternativeIndex = randomIndex;
            }
        }
        
        const glyphCode = getGlyph(char, {
            alternativeIndex: alternativeIndex
        });
        const moduleW = params.moduleSize;
        const moduleH = params.moduleSize;
        let letterCols;
        if (char === ' ') {
            const text = params.text || '';
            const lines = text.split('\n');
            if (lineIndex !== null && charIndex !== null && lineIndex < lines.length) {
                const line = lines[lineIndex];
                letterCols = (charIndex > 0 && line[charIndex - 1] === ' ') ? 2 : 3;
            } else {
                letterCols = 3;
            }
        } else {
            letterCols = this.renderer.cols;
        }
        let svg = '';

        svg += `    <g>\n`;

        const shouldUseRounded = params.mode === 'random' 
            ? (params.randomRounded || false)
            : (params.roundedCaps || false);
        
        const shouldUseCloseEnds = params.mode === 'random'
            ? (params.randomCloseEnds || false)
            : (params.closeEnds || false);
        
        const shouldUseEndpoints = shouldUseRounded || shouldUseCloseEnds;
        
        let endpointMap = null;
        if (shouldUseEndpoints) {
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.renderer.rows);
                endpointMap = {};
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

        for (let i = 0; i < letterCols; i++) {
            for (let j = 0; j < this.renderer.rows; j++) {
                const index = (i + j * this.renderer.cols) * 2;
                const moduleType = glyphCode.charAt(index);
                const rotation = parseInt(glyphCode.charAt(index + 1));
                
                const moduleX = x + i * moduleW;
                const moduleY = y + j * moduleH;
                
                let stem = params.stem;
                let strokesNum = params.strokesNum;
                let strokeGapRatio = params.strokeGapRatio || 1.0;
                
                let dashLength = params.dashLength || 0.10;
                let gapLength = params.gapLength || 0.30;
                
                let moduleUseDash = false;
                if (params.mode === 'random') {
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
                
                const moduleKey = `${i}_${j}`;
                const endpointSides = endpointMap && endpointMap[moduleKey];
                const isDashMode = params.mode === 'sd' || params.mode === 'dash' || moduleUseDash;
                const moduleRoundedCaps = isDashMode ? shouldUseRounded : (shouldUseRounded && endpointSides);
                
                let actualMode;
                if (params.mode === 'fill') {
                    actualMode = 'stripes';
                } else if (params.mode === 'random') {
                    actualMode = moduleUseDash ? 'sd' : 'stripes';
                } else {
                    actualMode = params.mode;
                }
                const actualStrokesNum = params.mode === 'fill' ? 1 : strokesNum;
                
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
                    params.dashChess !== undefined ? params.dashChess : false
                );
                
                if (moduleSVG) {
                    svg += moduleSVG;
                }
            }
        }

        svg += `    </g>\n`;
        return svg;
    }

    /**
     * Отрисовать модуль в SVG
     */
    renderModuleToSVG(type, rotation, x, y, w, h, stem, mode, strokesNum, strokeGapRatio, cornerRadius = 0, roundedCaps = false, dashLength = 0.10, gapLength = 0.30, endpointSides = null, closeEnds = false, dashChess = false) {
        if (type === 'E') return ''; // Empty
        
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

        const angle = rotation * 90;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

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
                        paths = this.renderLinkSVGStroke(0, 0, w, h, stem, roundedCaps);
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
                        paths = this.renderLinkSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, roundedCaps);
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
                    paths = this.renderStraightSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints);
                        break;
                    case 'C':
                    paths = this.renderCentralSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints);
                        break;
                    case 'J':
                    paths = this.renderJointSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints);
                        break;
                    case 'L':
                    paths = this.renderLinkSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints);
                        break;
                    case 'R':
                    paths = this.renderRoundSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints);
                        break;
                    case 'B':
                    paths = this.renderBendSVGStrokeDash(0, 0, w, h, stem, dashLength, gapLength, roundedCaps, localEndpoints);
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
                    paths = this.renderJointSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, dashChess);
                        break;
                    case 'L':
                    paths = this.renderLinkSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, dashChess);
                        break;
                    case 'R':
                    paths = this.renderRoundSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds, dashChess);
                        break;
                    case 'B':
                    paths = this.renderBendSVGStrokeSD(0, 0, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps, localEndpoints, closeEnds, dashChess);
                        break;
            }
        }

        if (!paths) return '';

        return `      <g transform="translate(${centerX}, ${centerY}) rotate(${angle})">\n${paths}      </g>\n`;
    }

    /**
     * Calculate gap and strokeWidth based on total width
     * @param {number} totalWidth - total width for placing strokes
     * @param {number} strokesNum - number of strokes
     * @param {number} strokeGapRatio - ratio of stroke thickness to gap
     * @returns {Object} {gap, strokeWidth}
     */
    calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio) {
        // gap = totalWidth / (strokesNum * (strokeGapRatio + 1) - 1)
        const gap = totalWidth / (strokesNum * (strokeGapRatio + 1) - 1);
        const strokeWidth = gap * strokeGapRatio;
        return { gap, strokeWidth };
    }

    // ============================================
    // STROKE METHOD SVG RENDERING
    // ============================================

    /**
     * S — Straight: вертикальная линия слева (stroke)
     */
    renderStraightSVGStroke(x, y, w, h, stem, roundedCaps = false, localEndpoints = null) {
        const shortenTop = roundedCaps && localEndpoints && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = roundedCaps && localEndpoints && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const lineX = -w / 2 + stem / 4;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        return `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}"/>\n`;
    }

    /**
     * C — Central: вертикальная линия по центру (stroke)
     */
    renderCentralSVGStroke(x, y, w, h, stem, roundedCaps = false, localEndpoints = null) {
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
    renderLinkSVGStroke(x, y, w, h, stem, roundedCaps = false) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = h / 2 - stem / 4;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        const lineJoin = roundedCaps ? 'round' : 'miter';
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
     * B — Bend: steep arc (stroke)
     */
    renderBendSVGStroke(x, y, w, h, stem, roundedCaps = false, localEndpoints = null) {
        const arcRadius = stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        
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


    /**
     * S — Straight: multiple parallel lines (stroke stripes)
     */
    renderStraightSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? strokeWidth / 2 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? strokeWidth / 2 : 0;
        
        const startX = -w / 2 + strokeWidth / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + (strokesNum - 1) * (strokeWidth + gap);
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.top) {
                const y = -h / 2 + shortenTop;
                svg += `        <line x1="${firstLineX}" y1="${y}" x2="${lastLineX}" y2="${y}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
            if (localEndpoints.bottom) {
                const y = h / 2 - shortenBottom;
                svg += `        <line x1="${firstLineX}" y1="${y}" x2="${lastLineX}" y2="${y}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * C — Central: multiple parallel centered lines (stroke stripes)
     */
    renderCentralSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false, localEndpoints = null, closeEnds = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? strokeWidth / 2 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? strokeWidth / 2 : 0;
        
        const totalLineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        const startX = -totalLineWidth / 2 + strokeWidth / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + (strokesNum - 1) * (strokeWidth + gap);
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.top) {
                const y = -h / 2 + shortenTop;
                svg += `        <line x1="${firstLineX}" y1="${y}" x2="${lastLineX}" y2="${y}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
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
        
        const vertStartX = -w / 2 + strokeWidth / 2;
        const totalLineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
        const lastVertX = vertStartX + (strokesNum - 1) * (strokeWidth + gap);
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        for (let i = 0; i < strokesNum; i++) {
            const lineY = horizStartY + i * (strokeWidth + gap);
            svg += `        <line x1="${lastVertX}" y1="${lineY}" x2="${w/2}" y2="${lineY}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        return svg;
    }

    /**
     * L — Link: multiple parallel lines for each part (stroke stripes)
     */
    renderLinkSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, roundedCaps = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const vertStartX = -w / 2 + strokeWidth / 2;
        const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + i * (strokeWidth + gap);
            const lineY = horizStartY + i * (strokeWidth + gap);
            
            const reverseIndex = strokesNum - 1 - i;
            const reverseLineY = horizStartY + reverseIndex * (strokeWidth + gap);
            
            svg += `        <polyline points="${lineX},${-h/2} ${lineX},${reverseLineY} ${w/2},${reverseLineY}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-linejoin="miter" fill="none"/>\n`;
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
        
        const shortenAmount = strokeWidth / 2;
        
        let svg = '';
        
        let firstRadius = outerRadius;
        let lastRadius = outerRadius;
        
        for (let j = 0; j < strokesNum; j++) {
            const arcRadius = outerRadius - j * (strokeWidth + gap);
            if (arcRadius > 0) {
                if (j === strokesNum - 1) {
                    lastRadius = arcRadius;
                }
                
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
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const deltaAngleFirst_right = localEndpoints.right ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_right = localEndpoints.right ? shortenAmount / lastRadius : 0;
            const deltaAngleFirst_top = localEndpoints.top ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_top = localEndpoints.top ? shortenAmount / lastRadius : 0;
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.right) {
                const angle1 = Math.PI / 2 + deltaAngleFirst_right;
                const angle2 = Math.PI / 2 + deltaAngleLast_right;
                
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
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
        
        const shortenAmount = strokeWidth / 2;
        
        let svg = '';
        
        let firstRadius = outerRadius;
        let lastRadius = outerRadius;
        
        for (let j = 0; j < strokesNum; j++) {
            const arcRadius = outerRadius - j * (strokeWidth + gap);
            if (arcRadius > 0) {
                if (j === strokesNum - 1) {
                    lastRadius = arcRadius;
                }
                
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
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const deltaAngleFirst_right = localEndpoints.right ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_right = localEndpoints.right ? shortenAmount / lastRadius : 0;
            const deltaAngleFirst_top = localEndpoints.top ? shortenAmount / firstRadius : 0;
            const deltaAngleLast_top = localEndpoints.top ? shortenAmount / lastRadius : 0;
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.right) {
                const angle1 = Math.PI / 2 + deltaAngleFirst_right;
                const angle2 = Math.PI / 2 + deltaAngleLast_right;
                
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" fill="none"/>\n`;
            }
            
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
     * S — Straight: вертикальная линия слева (dash)
     */
    renderStraightSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null) {
        const shortenTop = roundedCaps && localEndpoints && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = roundedCaps && localEndpoints && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const lineX = -w / 2 + stem / 4;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        const lineLength = h - shortenTop - shortenBottom;
        const dashPx = stem * dashLength;
        const gapPx = stem * gapLength;
        const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
        
        const dashOffset = adaptive.dashLength / 2;
        
        return `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}"/>\n`;
    }

    /**
     * C — Central: вертикальная линия по центру (dash)
     */
    renderCentralSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null) {
        const shortenTop = roundedCaps && localEndpoints && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = roundedCaps && localEndpoints && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const lineX = 0;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        
        const lineLength = h - shortenTop - shortenBottom;
        const dashPx = stem * dashLength;
        const gapPx = stem * gapLength;
        const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
        
        const dashOffset = adaptive.dashLength / 2;
        
        return `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}"/>\n`;
    }

    /**
     * J — Joint: Т-образное соединение (dash)
     */
    renderJointSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = 0;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        const lineJoin = roundedCaps ? 'round' : 'miter';
        
        const shouldShorten = (roundedCaps || false) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const shortenLeft = shouldShorten && localEndpoints.left ? stem * 0.25 : 0;
        const shortenRight = shouldShorten && localEndpoints.right ? stem * 0.25 : 0;
        
        const dashPx = stem * dashLength;
        const gapPx = stem * gapLength;
        const vertLength = h - shortenTop - shortenBottom;
        const vertAdaptive = this.calculateAdaptiveDash(vertLength, dashPx, gapPx);
        const vertDashOffset = vertAdaptive.dashLength / 2;
        
        const horizStartX = vertLineX;
        const horizEndX = w / 2 - shortenRight;
        const horizLength = horizEndX - horizStartX;
        const horizAdaptive = this.calculateAdaptiveDash(horizLength, dashPx, gapPx);
        const horizDashOffset = horizAdaptive.dashLength / 2;
        
        let svg = '';
        svg += `        <line x1="${vertLineX}" y1="${-h/2 + shortenTop}" x2="${vertLineX}" y2="${h/2 - shortenBottom}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${vertAdaptive.dashLength} ${vertAdaptive.gapLength}" stroke-dashoffset="${vertDashOffset}"/>\n`;
        svg += `        <line x1="${horizStartX}" y1="${horizLineY}" x2="${horizEndX}" y2="${horizLineY}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" stroke-dasharray="${horizAdaptive.dashLength} ${horizAdaptive.gapLength}" stroke-dashoffset="${horizDashOffset}"/>\n`;
        return svg;
    }

    /**
     * L — Link/Corner: L-образное соединение (dash)
     */
    renderLinkSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = h / 2 - stem / 4;
        const lineWidth = stem / 2;
        const lineCap = roundedCaps ? 'round' : 'butt';
        const lineJoin = roundedCaps ? 'round' : 'miter';
        
        const shouldShorten = (roundedCaps || false) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenRight = shouldShorten && localEndpoints.right ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        const dashPx = stem * dashLength;
        const gapPx = stem * gapLength;
        
        const vertStartY = -h / 2 + shortenTop;
        const horizEndX = w / 2 - shortenRight;
        
        const vertLength = h / 2 + horizLineY - shortenTop;
        const horizLength = horizEndX - vertLineX;
        const totalLength = vertLength + horizLength;
        
        const adaptive = this.calculateAdaptiveDash(totalLength, dashPx, gapPx);
        
        const dashOffset = adaptive.dashLength / 2;
        const path = `M ${vertLineX} ${vertStartY} L ${vertLineX} ${horizLineY} L ${horizEndX} ${horizLineY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}" fill="none"/>\n`;
    }

    /**
     * R — Round: плавная дуга (dash)
     */
    renderRoundSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null) {
        const arcRadius = w - stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        
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
        
        const dashPx = stem * dashLength;
        const gapPx = stem * gapLength;
        
        const arcAngle = endAngle - startAngle;
        const arcLength = arcRadius * arcAngle;
        const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
        
        const dashOffset = adaptive.dashLength / 2;
        
        const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}" fill="none"/>\n`;
    }

    /**
     * B — Bend: крутая дуга (dash)
     */
    renderBendSVGStrokeDash(x, y, w, h, stem, dashLength, gapLength, roundedCaps = false, localEndpoints = null) {
        const arcRadius = stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        
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
        
        const dashPx = stem * dashLength;
        const gapPx = stem * gapLength;
        
        const arcAngle = endAngle - startAngle;
        const arcLength = arcRadius * arcAngle;
        const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
        
        const dashOffset = adaptive.dashLength / 2;
        
        const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}" fill="none"/>\n`;
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
        const dashPx = strokeWidth * dashLength;
        const gapPx = strokeWidth * gapLength;
        const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
        
        for (let i = 0; i < strokesNum; i++) {
            const dashOffset = dashChess ? ((i % 2 === 0) ? adaptive.dashLength / 2 : 0) : adaptive.dashLength / 2;
            const lineX = startX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}"/>\n`;
        }
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + (strokesNum - 1) * (strokeWidth + gap);
            const closeLineLength = lastLineX - firstLineX;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.top) {
                const yClos = -h / 2 + shortenTop;
                svg += `        <line x1="${firstLineX}" y1="${yClos}" x2="${lastLineX}" y2="${yClos}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
            }
            
            if (localEndpoints.bottom) {
                const yClos = h / 2 - shortenBottom;
                svg += `        <line x1="${firstLineX}" y1="${yClos}" x2="${lastLineX}" y2="${yClos}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * C — Central: несколько параллельных центрированных пунктирных линий (SD mode)
     */
    renderCentralSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, localEndpoints = null, closeEnds = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const totalLineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        const startX = -totalLineWidth / 2 + strokeWidth / 2;
        
        const shouldShorten = (roundedCaps || closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? strokeWidth / 2 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? strokeWidth / 2 : 0;
        
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const lineLength = h - shortenTop - shortenBottom;
        const dashPx = strokeWidth * dashLength;
        const gapPx = strokeWidth * gapLength;
        const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
        
        for (let i = 0; i < strokesNum; i++) {
            const dashOffset = dashChess ? ((i % 2 === 0) ? adaptive.dashLength / 2 : 0) : adaptive.dashLength / 2;
            const lineX = startX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2 + shortenTop}" x2="${lineX}" y2="${h/2 - shortenBottom}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}"/>\n`;
        }
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstLineX = startX;
            const lastLineX = startX + (strokesNum - 1) * (strokeWidth + gap);
            const closeLineLength = lastLineX - firstLineX;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.top) {
                const yClos = -h / 2 + shortenTop;
                svg += `        <line x1="${firstLineX}" y1="${yClos}" x2="${lastLineX}" y2="${yClos}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
            }
            
            if (localEndpoints.bottom) {
                const yClos = h / 2 - shortenBottom;
                svg += `        <line x1="${firstLineX}" y1="${yClos}" x2="${lastLineX}" y2="${yClos}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * J — Joint: Т-образное соединение с пунктиром (SD mode)
     */
    renderJointSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const vertStartX = -w / 2 + strokeWidth / 2;
        const totalLineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
        const lastVertX = vertStartX + (strokesNum - 1) * (strokeWidth + gap);
        
        const lineCap = roundedCaps ? 'round' : 'butt';
        let svg = '';
        
        const dashPx = strokeWidth * dashLength;
        const gapPx = strokeWidth * gapLength;
        
        const vertAdaptive = this.calculateAdaptiveDash(h, dashPx, gapPx);
        
        for (let i = 0; i < strokesNum; i++) {
            const vertDashOffset = dashChess ? ((i % 2 === 0) ? vertAdaptive.dashLength / 2 : 0) : vertAdaptive.dashLength / 2;
            const lineX = vertStartX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${vertAdaptive.dashLength} ${vertAdaptive.gapLength}" stroke-dashoffset="${vertDashOffset}"/>\n`;
        }
        
        const horizLength = w / 2 - lastVertX;
        const horizAdaptive = this.calculateAdaptiveDash(horizLength, dashPx, gapPx);
        
        for (let i = 0; i < strokesNum; i++) {
            const horizDashOffset = dashChess ? ((i % 2 === 0) ? horizAdaptive.dashLength / 2 : 0) : horizAdaptive.dashLength / 2;
            const lineY = horizStartY + i * (strokeWidth + gap);
            svg += `        <line x1="${lastVertX}" y1="${lineY}" x2="${w/2}" y2="${lineY}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${horizAdaptive.dashLength} ${horizAdaptive.gapLength}" stroke-dashoffset="${horizDashOffset}"/>\n`;
        }
        
        return svg;
    }

    /**
     * L — Link/Corner: L-образное соединение с пунктиром (SD mode)
     */
    renderLinkSVGStrokeSD(x, y, w, h, stem, strokesNum, strokeGapRatio, dashLength, gapLength, roundedCaps = false, dashChess = false) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        
        const vertStartX = -w / 2 + strokeWidth / 2;
        const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
        
        const lineCap = roundedCaps ? 'round' : 'butt';
        const lineJoin = roundedCaps ? 'round' : 'miter';
        let svg = '';
        
        const dashPx = strokeWidth * dashLength;
        const gapPx = strokeWidth * gapLength;
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + i * (strokeWidth + gap);
            const reverseIndex = strokesNum - 1 - i;
            const lineY = horizStartY + reverseIndex * (strokeWidth + gap);
            
            const vertLength = h / 2 + lineY;
            const horizLength = w / 2 - lineX;
            const totalLength = vertLength + horizLength;
            
            const adaptive = this.calculateAdaptiveDash(totalLength, dashPx, gapPx);
            const dashOffset = dashChess ? ((i % 2 === 0) ? adaptive.dashLength / 2 : 0) : adaptive.dashLength / 2;
            
            const path = `M ${lineX} ${-h/2} L ${lineX} ${lineY} L ${w/2} ${lineY}`;
            svg += `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}" fill="none"/>\n`;
        }
        
        return svg;
    }

    /**
     * R — Round: несколько пунктирных дуг (SD mode)
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
        const gapPx = strokeWidth * gapLength;
        
        for (let j = 0; j < strokesNum; j++) {
            let arcRadius = outerRadius - j * (strokeWidth + gap);
            if (arcRadius < minRadius) arcRadius = minRadius;
            if (arcRadius <= 0) continue;
            
            const deltaAngleRight = roundedCaps && localEndpoints && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = roundedCaps && localEndpoints && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            const startArcX = centerX + arcRadius * Math.cos(startAngle);
            const startArcY = centerY + arcRadius * Math.sin(startAngle);
            const endArcX = centerX + arcRadius * Math.cos(endAngle);
            const endArcY = centerY + arcRadius * Math.sin(endAngle);
            
            const arcAngle = endAngle - startAngle;
            const arcLength = arcRadius * arcAngle;
            const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
            const dashOffset = dashChess ? ((j % 2 === 0) ? adaptive.dashLength / 2 : 0) : adaptive.dashLength / 2;
            
            const path = `M ${startArcX} ${startArcY} A ${arcRadius} ${arcRadius} 0 0 1 ${endArcX} ${endArcY}`;
            svg += `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}" fill="none"/>\n`;
        }
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstRadius = outerRadius;
            let lastRadius = outerRadius - (strokesNum - 1) * (strokeWidth + gap);
            if (lastRadius < minRadius) lastRadius = minRadius;
            
            const closeLineLength = firstRadius - lastRadius;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.right) {
                const deltaAngleFirst = shortenAmount / firstRadius;
                const deltaAngleLast = shortenAmount / lastRadius;
                const angle1 = Math.PI / 2 + deltaAngleFirst;
                const angle2 = Math.PI / 2 + deltaAngleLast;
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
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
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
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
        const gapPx = strokeWidth * gapLength;
        
        for (let j = 0; j < strokesNum; j++) {
            let arcRadius = outerRadius - j * (strokeWidth + gap);
            if (arcRadius < minRadius) arcRadius = minRadius;
            if (arcRadius <= 0) continue;
            
            const deltaAngleRight = roundedCaps && localEndpoints && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = roundedCaps && localEndpoints && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            const startArcX = centerX + arcRadius * Math.cos(startAngle);
            const startArcY = centerY + arcRadius * Math.sin(startAngle);
            const endArcX = centerX + arcRadius * Math.cos(endAngle);
            const endArcY = centerY + arcRadius * Math.sin(endAngle);
            
            const arcAngle = endAngle - startAngle;
            const arcLength = arcRadius * arcAngle;
            const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
            const dashOffset = dashChess ? ((j % 2 === 0) ? adaptive.dashLength / 2 : 0) : adaptive.dashLength / 2;
            
            const path = `M ${startArcX} ${startArcY} A ${arcRadius} ${arcRadius} 0 0 1 ${endArcX} ${endArcY}`;
            svg += `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-dasharray="${adaptive.dashLength} ${adaptive.gapLength}" stroke-dashoffset="${dashOffset}" fill="none"/>\n`;
        }
        
        if (closeEnds && localEndpoints && strokesNum > 0) {
            const firstRadius = outerRadius;
            let lastRadius = outerRadius - (strokesNum - 1) * (strokeWidth + gap);
            if (lastRadius < minRadius) lastRadius = minRadius;
            
            const closeLineLength = firstRadius - lastRadius;
            const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
            const closeCap = roundedCaps ? 'round' : 'square';
            
            if (localEndpoints.right) {
                const deltaAngleFirst = shortenAmount / firstRadius;
                const deltaAngleLast = shortenAmount / lastRadius;
                const angle1 = Math.PI / 2 + deltaAngleFirst;
                const angle2 = Math.PI / 2 + deltaAngleLast;
                const x1 = centerX + firstRadius * Math.cos(angle1);
                const y1 = centerY + firstRadius * Math.sin(angle1);
                const x2 = centerX + lastRadius * Math.cos(angle2);
                const y2 = centerY + lastRadius * Math.sin(angle2);
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
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
                svg += `        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${strokeWidth}" stroke-linecap="${closeCap}" stroke-dasharray="${closeAdaptive.dashLength} ${closeAdaptive.gapLength}" stroke-dashoffset="${closeAdaptive.dashLength / 2}" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * Получить индекс альтернативы для символа (вспомогательный метод)
     */
    getAlternativeIndex(char, params, lineIndex, charIndex) {
        const cacheKey = lineIndex !== null && charIndex !== null ? `${lineIndex}_${charIndex}` : null;
        
        if (cacheKey && this.renderer.alternativeGlyphCache && this.renderer.alternativeGlyphCache.hasOwnProperty(cacheKey)) {
            return this.renderer.alternativeGlyphCache[cacheKey];
        } else if (params.mode === 'random' && params.useAlternativesInRandom && cacheKey) {
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
     * Отрисовать концевые точки и стыки в SVG
     */
    renderEndpointsToSVG(connections, endpoints, moduleSize, strokeColor = '#ffffff') {
        const pointRadius = 6;
        const strokeWidth = 2;
        let svg = '';
        
        if (connections.length > 0) {
            svg += `    <g id="connections" fill="#0088ff" stroke="${strokeColor}" stroke-width="${strokeWidth}">\n`;
            connections.forEach(conn => {
                const point = this.endpointDetector.getPointCoordinates(conn.col1, conn.row1, conn.side1, moduleSize);
                const cx = conn.offsetX + point.x;
                const cy = conn.offsetY + point.y;
                svg += `      <circle cx="${cx}" cy="${cy}" r="${pointRadius}"/>\n`;
            });
            svg += `    </g>\n`;
        }
        
        if (endpoints.length > 0) {
            svg += `    <g id="endpoints" fill="#ff0044" stroke="${strokeColor}" stroke-width="${strokeWidth}">\n`;
            endpoints.forEach(ep => {
                const point = this.endpointDetector.getPointCoordinates(ep.col, ep.row, ep.side, moduleSize);
                const cx = ep.offsetX + point.x;
                const cy = ep.offsetY + point.y;
                svg += `      <circle cx="${cx}" cy="${cy}" r="${pointRadius}"/>\n`;
            });
            svg += `    </g>\n`;
        }
        
        return svg;
    }

    /**
     * Отрисовать test circles в SVG
     */
    renderTestCirclesToSVG(testCircles, moduleSize, stem, strokeColor = '#ffffff') {
        const radius = stem / 4;
        let svg = '';
        
        svg += `    <g id="test-circles-group" stroke="${strokeColor}" stroke-width="1" fill="transparent">\n`;
        testCircles.forEach(circle => {
            const point = this.endpointDetector.getLineEndPointCoordinates(
                circle.moduleType,
                circle.moduleRotation,
                circle.side,
                moduleSize,
                stem
            );
            
            const moduleX = circle.offsetX + circle.col * moduleSize;
            const moduleY = circle.offsetY + circle.row * moduleSize;
            
            const cx = moduleX + point.x;
            const cy = moduleY + point.y;
            
            svg += `      <circle cx="${cx}" cy="${cy}" r="${radius}"/>\n`;
        });
        svg += `    </g>\n`;
        
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

