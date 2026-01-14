/**
 * VoidRenderer - render Void typeface text on canvas
 */

import { VOID_ALPHABET_ALTERNATIVES, VOID_ALPHABET } from './VoidAlphabet.js';
import { getGlyph } from './GlyphLoader.js';
import { ModuleDrawer } from './ModuleDrawer.js';
import { EndpointDetector } from '../utils/EndpointDetector.js';
import { RandomUtils } from '../utils/RandomUtils.js';

export class VoidRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.moduleDrawer = new ModuleDrawer('stroke');
        this.endpointDetector = new EndpointDetector();
        
        this.params = {
            text: 'VOID TYPEFACE',
            stem: 24,
            moduleSize: 24,
            letterSpacing: 24,
            lineHeight: 144,
            strokesNum: 2,
            strokeGapRatio: 1.0,
            mode: 'fill',
            color: '#ffffff',
            bgColor: '#000000',
            gridColor: '#333333',
            showGrid: true,
            textAlign: 'center',
            cornerRadius: 0,
            roundedCaps: false,
            showEndpoints: false,
            showTestCircles: false
        };
        
        this.cols = 5;
        this.rows = 5;
        
        this.moduleTypeCache = {};
        this.moduleValueCache = {};
        
        // Cache of selected alternative glyphs for each letter
        // Key: `${lineIndex}_${charIndex}`, value: alternative index (0 = base, 1+ = alternatives)
        this.alternativeGlyphCache = {};
        
        this.hoveredLetter = null;
        
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        
        this.setupCanvas();
    }

    /**
     * Очистить кэш значений по типу модуля
     */
    clearModuleTypeCache() {
        this.moduleTypeCache = {};
        this.moduleValueCache = {};
    }

    /**
     * Очистить кэш альтернативных глифов (при Update в режиме Random)
     */
    clearAlternativeGlyphCache() {
        this.alternativeGlyphCache = {};
    }

    /**
     * Получить случайные значения для модуля (с учетом режима рандома)
     */
    getRandomModuleValues(moduleType, cacheKey = null) {
        const cache = this.params.randomModeType === 'full' ? this.moduleValueCache : this.moduleTypeCache;
        return RandomUtils.getRandomModuleValues(moduleType, cacheKey, this.params, cache);
    }

    /**
     * Настройка canvas с учетом devicePixelRatio
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    /**
     * Обновить параметры
     */
    updateParams(newParams) {
        const oldStemMin = this.params.randomStemMin;
        const oldStemMax = this.params.randomStemMax;
        const oldStrokesMin = this.params.randomStrokesMin;
        const oldStrokesMax = this.params.randomStrokesMax;
        const oldContrastMin = this.params.randomContrastMin;
        const oldContrastMax = this.params.randomContrastMax;
        const oldRandomDash = this.params.randomDash;
        
        Object.assign(this.params, newParams);
        
        if (this.params.mode === 'random' && (
            oldStemMin !== this.params.randomStemMin ||
            oldStemMax !== this.params.randomStemMax ||
            oldStrokesMin !== this.params.randomStrokesMin ||
            oldStrokesMax !== this.params.randomStrokesMax ||
            oldContrastMin !== this.params.randomContrastMin ||
            oldContrastMax !== this.params.randomContrastMax ||
            oldRandomDash !== this.params.randomDash
        )) {
            this.clearModuleTypeCache();
        }
        
        let actualMode;
        if (this.params.mode === 'fill') {
            actualMode = 'stripes';
        } else if (this.params.mode === 'random') {
            actualMode = 'stripes';
        } else {
            actualMode = this.params.mode;
        }
        const actualStrokesNum = this.params.mode === 'fill' ? 1 : this.params.strokesNum;
        
        this.moduleDrawer.setMode(actualMode);
        this.moduleDrawer.setStripesParams(actualStrokesNum, this.params.strokeGapRatio);
        this.moduleDrawer.setCornerRadius(this.params.cornerRadius || 0);
        
        const shouldUseRounded = this.params.mode === 'random' 
            ? (this.params.randomRounded || false)
            : (this.params.roundedCaps || false);
        this.moduleDrawer.setRoundedCaps(shouldUseRounded);
        
        const shouldUseCloseEnds = this.params.mode === 'random'
            ? (this.params.randomCloseEnds || false)
            : (this.params.closeEnds || false);
        this.moduleDrawer.setCloseEnds(shouldUseCloseEnds);
        
        
        this.moduleDrawer.setDashParams(
            this.params.dashLength || 0.10, 
            this.params.gapLength || 0.30,
            this.params.dashChess || false
        );
    }

    /**
     * Установить текст
     */
    setText(text) {
        this.params.text = text;
    }

    /**
     * Отрисовать весь текст
     */
    render() {
        const rect = this.canvas.getBoundingClientRect();
        if (this.canvasWidth !== rect.width || this.canvasHeight !== rect.height) {
            this.setupCanvas();
        }
        
        const canvasW = this.canvasWidth;
        const canvasH = this.canvasHeight;
        
        this.ctx.fillStyle = this.params.bgColor;
        this.ctx.fillRect(0, 0, canvasW, canvasH);
        
        if (this.params.showGrid) {
            this.drawGrid(canvasW, canvasH);
        }
        
        const text = this.params.text;
        if (!text) return;
        
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        
        const letterW = this.cols * this.params.moduleSize;
        const letterH = this.rows * this.params.moduleSize;
        
        let totalWidth = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * this.params.moduleSize;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * this.params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            totalWidth = Math.max(totalWidth, lineWidth);
        }
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        const startY = (canvasH - totalHeight) / 2;
        
        const textAlign = this.params.textAlign || 'center';
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * this.params.moduleSize;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * this.params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            
            let lineX;
            if (textAlign === 'left') {
                lineX = (canvasW - totalWidth) / 2;
            } else if (textAlign === 'right') {
                lineX = (canvasW + totalWidth) / 2 - lineWidth;
            } else { // center
                lineX = (canvasW - lineWidth) / 2;
            }
            
            const lineY = startY + lineIndex * (letterH + this.params.lineHeight);
            
            let currentX = lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (charIndex > 0 && line[charIndex - 1] === ' ') {
                        charWidth = 2 * this.params.moduleSize;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * this.params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                
                this.drawLetter(char, currentX, lineY, lineIndex, charIndex);
                currentX += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
        }
    }

    /**
     * Отрисовать сетку модулей на весь фон
     * Сетка выравнивается по позиции букв
     */
    drawGrid(canvasW, canvasH) {
        const moduleSize = this.params.moduleSize;
        const letterW = this.cols * moduleSize;
        const letterH = this.rows * moduleSize;
        
        const text = this.params.text;
        if (!text) return;
        
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const totalWidth = maxLineLength * (letterW + this.params.letterSpacing) - this.params.letterSpacing;
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        const startX = (canvasW - totalWidth) / 2;
        const startY = (canvasH - totalHeight) / 2;
        
        const offsetX = startX % moduleSize;
        const offsetY = startY % moduleSize;
        
        this.ctx.strokeStyle = this.params.gridColor || '#333333';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        
        for (let x = offsetX; x <= canvasW; x += moduleSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, canvasH);
        }
        
        for (let y = offsetY; y <= canvasH; y += moduleSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(canvasW, y);
        }
        
        this.ctx.stroke();
    }

    /**
     * Отрисовать одну букву
     */
    drawLetter(char, x, y, lineIndex = null, charIndex = null) {
        let alternativeIndex = null;
        const cacheKey = lineIndex !== null && charIndex !== null ? `${lineIndex}_${charIndex}` : null;
        
        if (cacheKey && this.alternativeGlyphCache.hasOwnProperty(cacheKey)) {
            alternativeIndex = this.alternativeGlyphCache[cacheKey];
        } else if (this.params.mode === 'random' && this.params.useAlternativesInRandom && cacheKey) {
            const charUpper = char.toUpperCase();
            const alternatives = VOID_ALPHABET_ALTERNATIVES[charUpper];
            if (alternatives && alternatives.length > 0) {
                const baseGlyph = VOID_ALPHABET[charUpper] || VOID_ALPHABET[" "];
                const allGlyphs = [baseGlyph, ...alternatives];
                const randomIndex = Math.floor(Math.random() * allGlyphs.length);
                this.alternativeGlyphCache[cacheKey] = randomIndex;
                alternativeIndex = randomIndex;
            }
        }
        
        const glyphCode = getGlyph(char, {
            alternativeIndex: alternativeIndex
        });
        
        const moduleW = this.params.moduleSize;
        const moduleH = this.params.moduleSize;
        const letterCols = char === ' ' ? 3 : this.cols;
        const letterW = letterCols * moduleW;
        const letterH = this.rows * moduleH;
        
        const isHovered = this.hoveredLetter && 
            this.hoveredLetter.lineIndex === lineIndex && 
            this.hoveredLetter.charIndex === charIndex;
        
        const originalAlpha = this.ctx.globalAlpha;
        if (isHovered) {
            this.ctx.globalAlpha = 0.8;
        }
        
        const baseStem = this.params.stem;
        
        const shouldUseRounded = this.params.mode === 'random' 
            ? (this.params.randomRounded || false)
            : (this.params.roundedCaps || false);
        
        const shouldUseCloseEnds = this.params.mode === 'random'
            ? (this.params.randomCloseEnds || false)
            : (this.params.closeEnds || false);
        
        const shouldUseEndpoints = shouldUseRounded || shouldUseCloseEnds;
        
        let endpointMap = null;
        if (shouldUseEndpoints) {
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.rows);
                endpointMap = {};
                analysis.endpoints.forEach(ep => {
                    const key = `${ep.col}_${ep.row}`;
                    if (!endpointMap[key]) {
                        endpointMap[key] = { top: false, right: false, bottom: false, left: false };
                    }
                    endpointMap[key][ep.side] = true;
                });
            } catch (error) {
                console.error('Error analyzing glyph for endpoints:', error);
            }
        }
        
        for (let i = 0; i < letterCols; i++) {
            for (let j = 0; j < this.rows; j++) {
                const index = (i + j * this.cols) * 2;
                const moduleType = glyphCode.charAt(index);
                const rotation = parseInt(glyphCode.charAt(index + 1));
                
                const moduleX = x + i * moduleW;
                const moduleY = y + j * moduleH;
                
                let stem = baseStem;
                let strokesNum = this.params.strokesNum;
                let strokeGapRatio = this.params.strokeGapRatio;
                
                if (this.params.mode === 'random') {
                    const cacheKey = this.params.randomModeType === 'full' && lineIndex !== null && charIndex !== null
                        ? `${lineIndex}_${charIndex}_${i}_${j}` 
                        : null;
                    const randomValues = this.getRandomModuleValues(moduleType, cacheKey);
                    stem = randomValues.stem;
                    strokesNum = randomValues.strokesNum;
                    strokeGapRatio = randomValues.strokeGapRatio;
                }
                
                const originalStrokeGapRatio = this.moduleDrawer.strokeGapRatio;
                const originalDashLength = this.moduleDrawer.dashLength;
                const originalGapLength = this.moduleDrawer.gapLength;
                const originalMode = this.moduleDrawer.mode;
                let moduleUseDash = false;
                
                if (this.params.mode === 'random') {
                    this.moduleDrawer.strokeGapRatio = strokeGapRatio;
                    const cacheKey = this.params.randomModeType === 'full' && lineIndex !== null && charIndex !== null
                        ? `${lineIndex}_${charIndex}_${i}_${j}` 
                        : null;
                    const randomValues = this.getRandomModuleValues(moduleType, cacheKey);
                    this.moduleDrawer.dashLength = randomValues.dashLength;
                    this.moduleDrawer.gapLength = randomValues.gapLength;
                    moduleUseDash = randomValues.useDash || false;
                    
                    if (moduleUseDash) {
                        this.moduleDrawer.mode = 'sd';
                    }
                }
                
                const moduleKey = `${i}_${j}`;
                const endpointSides = endpointMap && endpointMap[moduleKey];
                const hasEndpoints = endpointSides ? true : false;
                const originalRoundedCaps = this.moduleDrawer.roundedCaps;
                const originalEndpointSides = this.moduleDrawer.endpointSides;
                
                if (shouldUseEndpoints) {
                    this.moduleDrawer.endpointSides = endpointSides || null;
                }
                
                if (shouldUseRounded) {
                    const isDashMode = this.params.mode === 'dash' || this.params.mode === 'sd' || moduleUseDash;
                    this.moduleDrawer.roundedCaps = isDashMode ? true : hasEndpoints;
                }
                
                this.moduleDrawer.drawModule(
                    this.ctx,
                    moduleType,
                    rotation,
                    moduleX,
                    moduleY,
                    moduleW,
                    moduleH,
                    stem,
                    this.params.color,
                    this.params.mode === 'random' ? strokesNum : null
                );
                
                if (this.params.mode === 'random') {
                    this.moduleDrawer.strokeGapRatio = originalStrokeGapRatio;
                    this.moduleDrawer.dashLength = originalDashLength;
                    this.moduleDrawer.gapLength = originalGapLength;
                    this.moduleDrawer.mode = originalMode;
                }
                if (shouldUseEndpoints) {
                    this.moduleDrawer.endpointSides = originalEndpointSides;
                }
                if (shouldUseRounded) {
                    this.moduleDrawer.roundedCaps = originalRoundedCaps;
                }
            }
        }
        
        this.ctx.globalAlpha = originalAlpha;
        
        if (this.params.showEndpoints) {
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.rows);
                this.endpointDetector.renderPoints(
                    this.ctx, 
                    analysis.connections, 
                    analysis.endpoints, 
                    moduleW,
                    x,
                    y,
                    this.params.color,      // Letter Color
                    this.params.bgColor     // Background Color
                );
                
                if (this.params.showTestCircles) {
                    this.renderTestCircles(glyphCode, letterCols, analysis.endpoints, moduleW, x, y, baseStem);
                }
            } catch (error) {
                console.error('Error rendering endpoints:', error);
            }
        } else if (this.params.showTestCircles) {
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.rows);
                this.renderTestCircles(glyphCode, letterCols, analysis.endpoints, moduleW, x, y, baseStem);
            } catch (error) {
                console.error('Error rendering test circles:', error);
            }
        }
    }

    /**
     * Отрисовать окружности на концевых точках (Test режим)
     */
    renderTestCircles(glyphCode, letterCols, endpoints, moduleW, x, y, stem) {
        if (!endpoints || endpoints.length === 0) return;
        
        const grid = [];
        for (let row = 0; row < this.rows; row++) {
            grid[row] = [];
            for (let col = 0; col < letterCols; col++) {
                const index = (row * letterCols + col) * 2;
                if (index < glyphCode.length) {
                    const type = glyphCode.charAt(index);
                    const rotation = parseInt(glyphCode.charAt(index + 1));
                    grid[row][col] = { type, rotation };
                } else {
                    grid[row][col] = { type: 'E', rotation: 0 };
                }
            }
        }
        
        this.ctx.save();
        this.ctx.strokeStyle = this.params.color || '#ffffff';
        this.ctx.fillStyle = 'transparent';
        this.ctx.lineWidth = 1;
        
        endpoints.forEach(ep => {
            try {
                const module = grid[ep.row] && grid[ep.row][ep.col];
                if (!module || module.type === 'E') return;
                
                const point = this.endpointDetector.getLineEndPointCoordinates(
                    module.type,
                    module.rotation,
                    ep.side,
                    moduleW,
                    stem
                );
                
                if (!point || (point.x === 0 && point.y === 0 && module.type !== 'C')) {
                    const fallbackPoint = this.endpointDetector.getPointCoordinates(ep.col, ep.row, ep.side, moduleW);
                    const moduleX = x + ep.col * moduleW;
                    const moduleY = y + ep.row * moduleW;
                    const relativeX = fallbackPoint.x - (ep.col * moduleW);
                    const relativeY = fallbackPoint.y - (ep.row * moduleW);
                    
                    const radius = stem / 4;
                    this.ctx.beginPath();
                    this.ctx.arc(moduleX + relativeX, moduleY + relativeY, radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    return;
                }
                
                const moduleX = x + ep.col * moduleW;
                const moduleY = y + ep.row * moduleW;
                
                const radius = stem / 4;
                this.ctx.beginPath();
                this.ctx.arc(moduleX + point.x, moduleY + point.y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            } catch (error) {
                console.error('Error rendering test circle:', error, ep);
            }
        });
        
        this.ctx.restore();
    }

    /**
     * Resize canvas
     */
    resize() {
        this.setupCanvas();
        this.render();
    }

    /**
     * Determine letter position by click coordinates
     * @param {number} clickX - click X coordinate
     * @param {number} clickY - click Y coordinate
     * @returns {Object|null} - object with lineIndex, charIndex, char or null if click didn't hit a letter
     */
    getLetterPositionAt(clickX, clickY) {
        const text = this.params.text;
        if (!text) return null;
        
        if (this.canvasWidth === 0 || this.canvasHeight === 0) {
            const rect = this.canvas.getBoundingClientRect();
            this.canvasWidth = rect.width;
            this.canvasHeight = rect.height;
        }
        
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        const moduleW = this.params.moduleSize;
        const moduleH = this.params.moduleSize;
        const letterW = this.cols * moduleW;
        const letterH = this.rows * moduleH;
        
        let totalWidth = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * moduleW;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * moduleW;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            totalWidth = Math.max(totalWidth, lineWidth);
        }
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        const startY = (this.canvasHeight - totalHeight) / 2;
        const textAlign = this.params.textAlign || 'center';
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * moduleW;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * moduleW;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            
            let lineX;
            if (textAlign === 'left') {
                lineX = (this.canvasWidth - totalWidth) / 2;
            } else if (textAlign === 'right') {
                lineX = (this.canvasWidth + totalWidth) / 2 - lineWidth;
            } else {
                lineX = (this.canvasWidth - lineWidth) / 2;
            }
            
            const lineY = startY + lineIndex * (letterH + this.params.lineHeight);
            
            let currentX = lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (charIndex > 0 && line[charIndex - 1] === ' ') {
                        charWidth = 2 * moduleW;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * moduleW;
                    }
                } else {
                    charWidth = letterW;
                }
                
                if (clickX >= currentX && clickX < currentX + charWidth &&
                    clickY >= lineY && clickY < lineY + letterH) {
                    return { lineIndex, charIndex, char };
                }
                
                currentX += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
        }
        
        return null;
    }

    /**
     * Toggle alternative for letter
     * @param {number} lineIndex - line index
     * @param {number} charIndex - character index in line
     * @returns {boolean} - true if alternative was toggled, false if character has no alternatives
     */
    toggleLetterAlternative(lineIndex, charIndex) {
        const text = this.params.text;
        if (!text) return false;
        
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        if (lineIndex < 0 || lineIndex >= lines.length) return false;
        
        const line = lines[lineIndex];
        if (charIndex < 0 || charIndex >= line.length) return false;
        
        const char = line[charIndex].toUpperCase();
        
        const alternatives = VOID_ALPHABET_ALTERNATIVES[char];
        if (!alternatives || !alternatives.length) return false;
        
        const cacheKey = `${lineIndex}_${charIndex}`;
        
        const currentIndex = this.alternativeGlyphCache.hasOwnProperty(cacheKey) 
            ? this.alternativeGlyphCache[cacheKey] 
            : 0;
        
        const maxIndex = alternatives.length;
        const nextIndex = (currentIndex + 1) % (maxIndex + 1);
        
        if (nextIndex === 0) {
            delete this.alternativeGlyphCache[cacheKey];
        } else {
            this.alternativeGlyphCache[cacheKey] = nextIndex;
        }
        
        return true;
    }

    /**
     * Установить букву под курсором (для эффекта прозрачности)
     * @param {Object|null} position - {lineIndex, charIndex} или null
     */
    setHoveredLetter(position) {
        this.hoveredLetter = position;
    }
}

