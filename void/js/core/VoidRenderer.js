/**
 * VoidRenderer - render text with Void typeface on canvas
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
        
        // Font parameters (default)
        this.params = {
            text: 'VOID TYPEFACE',
            stem: 24,              // stroke width
            moduleSize: 24,        // single module size (in pixels)
            letterSpacing: 24,     // spacing between letters
            lineHeight: 144,       // line height
            strokesNum: 2,         // number of stripes (for stripes mode)
            strokeGapRatio: 1.0,   // stroke to gap ratio
            mode: 'fill',          // 'fill', 'stripes' or 'dash'
            color: '#ffffff',      // letter color
            bgColor: '#000000',    // background color
            gridColor: '#333333',  // grid color
            showGrid: true,        // show grid
            textAlign: 'center',   // text alignment: 'left', 'center', 'right'
            cornerRadius: 0,       // corner radius
            roundedCaps: false,    // rounded line caps in Stroke mode (Rounded)
            showEndpoints: false,   // show endpoints and joints (for debugging)
            showTestCircles: false // show circles on endpoints (Test mode)
        };
        
        this.cols = 5; // columns in grid
        this.rows = 5; // rows in grid
        
        // Cache for values by module type (for random byType mode)
        this.moduleTypeCache = {};
        // Cache for values of each module (for random full mode)
        this.moduleValueCache = {};
        
        // Cache of selected alternative glyphs for each letter
        // Key: `${lineIndex}_${charIndex}`, value: alternative index (0 = base, 1+ = alternatives)
        // If key not in cache, letter uses random alternative (in Random mode)
        this.alternativeGlyphCache = {};
        
        // Current letter under cursor (for transparency effect)
        this.hoveredLetter = null; // {lineIndex, charIndex} or null
        
        // Save canvas dimensions in CSS pixels
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        
        // Cache for glyph endpoint analysis (key: "glyphCode_cols_rows")
        this.glyphAnalysisCache = new Map();
        
        // Cache for text layout (to avoid recalculating on every render)
        this.layoutCache = null;
        this.layoutCacheKey = null;
        
        this.setupCanvas();
    }

    /**
     * Clear cache of values by module type
     */
    clearModuleTypeCache() {
        this.moduleTypeCache = {};
        this.moduleValueCache = {};
    }

    /**
     * Clear alternative glyphs cache (on Update in Random mode)
     */
    clearAlternativeGlyphCache() {
        this.alternativeGlyphCache = {};
    }

    /**
     * Clear layout cache (called when text layout parameters change)
     */
    clearLayoutCache() {
        this.layoutCache = null;
        this.layoutCacheKey = null;
    }
    
    /**
     * Set color getter callback for Color Chaos mode
     * @param {Function} callback - Function() => color
     */
    setColorGetter(callback) {
        this.getColorForModule = callback;
    }

    /**
     * Get cached glyph analysis for endpoints detection
     * @param {string} glyphCode - glyph string
     * @param {number} cols - number of columns
     * @param {number} rows - number of rows
     * @returns {Object} {connections: [], endpoints: []}
     */
    getCachedGlyphAnalysis(glyphCode, cols, rows) {
        const key = `${glyphCode}_${cols}_${rows}`;
        if (!this.glyphAnalysisCache.has(key)) {
            this.glyphAnalysisCache.set(key, 
                this.endpointDetector.analyzeGlyph(glyphCode, cols, rows)
            );
        }
        return this.glyphAnalysisCache.get(key);
    }

    /**
     * Calculate character width considering space logic
     * @param {string} char - character
     * @param {string} prevChar - previous character (or null)
     * @param {number} letterW - standard letter width
     * @param {number} moduleSize - module size
     * @returns {Object} {width, addSpacing}
     */
    getCharWidth(char, prevChar, letterW, moduleSize) {
        if (char === ' ') {
            // If previous character is also space, this space = 2 modules without spacing
            if (prevChar === ' ') {
                return { width: 2 * moduleSize, addSpacing: false };
            }
            return { width: 3 * moduleSize, addSpacing: true };
        }
        return { width: letterW, addSpacing: true };
    }

    /**
     * Calculate line width
     * @param {string} line - line text
     * @param {number} letterW - standard letter width
     * @param {number} moduleSize - module size
     * @param {number} letterSpacing - letter spacing
     * @returns {number} line width in pixels
     */
    calculateLineWidth(line, letterW, moduleSize, letterSpacing) {
        let lineWidth = 0;
        for (let i = 0; i < line.length; i++) {
            const { width, addSpacing } = this.getCharWidth(
                line[i], 
                i > 0 ? line[i - 1] : null,
                letterW,
                moduleSize
            );
            lineWidth += width + (addSpacing ? letterSpacing : 0);
        }
        // Remove last spacing (if last character doesn't follow a space)
        if (line.length > 0) {
            const lastCharInfo = this.getCharWidth(
                line[line.length - 1],
                line.length > 1 ? line[line.length - 2] : null,
                letterW,
                moduleSize
            );
            if (lastCharInfo.addSpacing) {
                lineWidth -= letterSpacing;
            }
        }
        return lineWidth;
    }

    /**
     * Calculate text layout (positions of all letters)
     * Uses caching to avoid recalculation when parameters haven't changed
     * @param {number} canvasW - canvas width
     * @param {number} canvasH - canvas height
     * @returns {Object} {lines, totalWidth, totalHeight, startY, letterW, letterH, lineLayouts}
     */
    calculateTextLayout(canvasW, canvasH) {
        const text = this.params.text;
        if (!text) return null;
        
        // Generate cache key from parameters that affect layout
        const cacheKey = `${text}_${canvasW}_${canvasH}_${this.params.moduleSize}_${this.params.letterSpacing}_${this.params.lineHeight}_${this.params.textAlign}`;
        
        // Return cached layout if parameters haven't changed
        if (this.layoutCacheKey === cacheKey && this.layoutCache) {
            return this.layoutCache;
        }
        
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        const letterW = this.cols * this.params.moduleSize;
        const letterH = this.rows * this.params.moduleSize;
        const moduleSize = this.params.moduleSize;
        const letterSpacing = this.params.letterSpacing;
        const textAlign = this.params.textAlign || 'center';
        
        // Calculate total width (max line width)
        let totalWidth = 0;
        const lineWidths = [];
        for (const line of lines) {
            const lineWidth = this.calculateLineWidth(line, letterW, moduleSize, letterSpacing);
            lineWidths.push(lineWidth);
            totalWidth = Math.max(totalWidth, lineWidth);
        }
        
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        const startY = (canvasH - totalHeight) / 2;
        
        // Calculate layout for each line
        const lineLayouts = [];
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineWidth = lineWidths[lineIndex];
            
            // Calculate line X position based on alignment
            let lineX;
            if (textAlign === 'left') {
                lineX = (canvasW - totalWidth) / 2;
            } else if (textAlign === 'right') {
                lineX = (canvasW + totalWidth) / 2 - lineWidth;
            } else { // center
                lineX = (canvasW - lineWidth) / 2;
            }
            
            const lineY = startY + lineIndex * (letterH + this.params.lineHeight);
            
            // Calculate positions for each character
            const charLayouts = [];
            let currentX = lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const { width, addSpacing } = this.getCharWidth(
                    char,
                    charIndex > 0 ? line[charIndex - 1] : null,
                    letterW,
                    moduleSize
                );
                
                charLayouts.push({
                    char,
                    x: currentX,
                    y: lineY,
                    width,
                    height: letterH
                });
                
                currentX += width + (addSpacing ? letterSpacing : 0);
            }
            
            lineLayouts.push({
                line,
                x: lineX,
                y: lineY,
                width: lineWidth,
                charLayouts
            });
        }
        
        const layout = {
            lines,
            totalWidth,
            totalHeight,
            startY,
            letterW,
            letterH,
            lineLayouts
        };
        
        // Cache the result
        this.layoutCacheKey = cacheKey;
        this.layoutCache = layout;
        
        return layout;
    }

    /**
     * Get random values for module (considering random mode)
     */
    getRandomModuleValues(moduleType, cacheKey = null) {
        const cache = this.params.randomModeType === 'full' ? this.moduleValueCache : this.moduleTypeCache;
        return RandomUtils.getRandomModuleValues(moduleType, cacheKey, this.params, cache);
    }

    /**
     * Setup canvas considering devicePixelRatio
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // Save dimensions in CSS pixels
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    /**
     * Update parameters
     */
    updateParams(newParams) {
        // Check if random parameters changed and clear cache if yes
        const oldStemMin = this.params.randomStemMin;
        const oldStemMax = this.params.randomStemMax;
        const oldStrokesMin = this.params.randomStrokesMin;
        const oldStrokesMax = this.params.randomStrokesMax;
        const oldContrastMin = this.params.randomContrastMin;
        const oldContrastMax = this.params.randomContrastMax;
        const oldRandomDash = this.params.randomDash;
        
        Object.assign(this.params, newParams);
        
        // If random parameters changed, clear cache
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
        
        // Update module parameters
        // Solid mode is now Stripes with Lines=1
        // Random mode uses 'stripes' by default, dash is applied randomly for each module
        let actualMode;
        if (this.params.mode === 'fill') {
            actualMode = 'stripes';
        } else if (this.params.mode === 'random') {
            // In random mode use 'stripes' by default
            // Dash will be applied randomly for each module separately
            actualMode = 'stripes';
        } else {
            actualMode = this.params.mode;
        }
        const actualStrokesNum = this.params.mode === 'fill' ? 1 : this.params.strokesNum;
        
        this.moduleDrawer.setMode(actualMode);
        this.moduleDrawer.setStripesParams(actualStrokesNum, this.params.strokeGapRatio);
        this.moduleDrawer.setCornerRadius(this.params.cornerRadius || 0);
        
        // In Random mode use randomRounded, otherwise roundedCaps
        const shouldUseRounded = this.params.mode === 'random' 
            ? (this.params.randomRounded || false)
            : (this.params.roundedCaps || false);
        this.moduleDrawer.setRoundedCaps(shouldUseRounded);
        
        // In Random mode use randomCloseEnds, otherwise closeEnds
        const shouldUseCloseEnds = this.params.mode === 'random'
            ? (this.params.randomCloseEnds || false)
            : (this.params.closeEnds || false);
        this.moduleDrawer.setCloseEnds(shouldUseCloseEnds);
        
        // shouldUseEndpoints = true if endpoints needed (for Round or Close Ends)
        // This is needed for correct determination of end modules
        
        this.moduleDrawer.setDashParams(
            this.params.dashLength || 0.10, 
            this.params.gapLength || 0.30,
            this.params.dashChess || false
        );
    }

    /**
     * Set text
     */
    setText(text) {
        this.params.text = text;
    }

    /**
     * Render entire text
     */
    render() {
        // Check if container dimensions changed and update canvas if needed
        const rect = this.canvas.getBoundingClientRect();
        if (this.canvasWidth !== rect.width || this.canvasHeight !== rect.height) {
            this.setupCanvas();
        }
        
        // Use saved canvas dimensions
        const canvasW = this.canvasWidth;
        const canvasH = this.canvasHeight;
        
        // Clear canvas
        this.ctx.fillStyle = this.params.bgColor;
        this.ctx.fillRect(0, 0, canvasW, canvasH);
        
        // Draw grid if enabled
        if (this.params.showGrid) {
            this.drawGrid(canvasW, canvasH);
        }
        
        // Calculate text layout
        const layout = this.calculateTextLayout(canvasW, canvasH);
        if (!layout) return;
        
        // Render each line
        for (let lineIndex = 0; lineIndex < layout.lineLayouts.length; lineIndex++) {
            const lineLayout = layout.lineLayouts[lineIndex];
            
            // Render each letter in line
            for (let charIndex = 0; charIndex < lineLayout.charLayouts.length; charIndex++) {
                const charLayout = lineLayout.charLayouts[charIndex];
                this.drawLetter(charLayout.char, charLayout.x, charLayout.y, lineIndex, charIndex);
            }
        }
    }

    /**
     * Draw module grid on entire background
     * Grid aligns to letter positions
     */
    drawGrid(canvasW, canvasH) {
        const moduleSize = this.params.moduleSize;
        const letterW = this.cols * moduleSize;
        const letterH = this.rows * moduleSize;
        
        const text = this.params.text;
        if (!text) return;
        
        // Split text into lines and remove spaces at start and end of each line
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        
        // Calculate text block dimensions (copy logic from render)
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const totalWidth = maxLineLength * (letterW + this.params.letterSpacing) - this.params.letterSpacing;
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        // Initial position of first letter (centering)
        const startX = (canvasW - totalWidth) / 2;
        const startY = (canvasH - totalHeight) / 2;
        
        // Calculate grid offset - grid should be multiple of moduleSize
        // and pass through startX, startY
        const offsetX = startX % moduleSize;
        const offsetY = startY % moduleSize;
        
        this.ctx.strokeStyle = this.params.gridColor || '#333333';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        
        // Vertical lines - start from offsetX
        for (let x = offsetX; x <= canvasW; x += moduleSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, canvasH);
        }
        
        // Horizontal lines - start from offsetY
        for (let y = offsetY; y <= canvasH; y += moduleSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(canvasW, y);
        }
        
        this.ctx.stroke();
    }

    /**
     * Render single letter
     */
    drawLetter(char, x, y, lineIndex = null, charIndex = null) {
        // Determine whether to use alternative
        let alternativeIndex = null;
        const cacheKey = lineIndex !== null && charIndex !== null ? `${lineIndex}_${charIndex}` : null;
        
        if (cacheKey && this.alternativeGlyphCache.hasOwnProperty(cacheKey)) {
            // Letter fixed in cache - use its alternative
            alternativeIndex = this.alternativeGlyphCache[cacheKey];
        } else if (this.params.mode === 'random' && this.params.useAlternativesInRandom && cacheKey) {
            // In Random mode with alternatives enabled - generate random alternative once
            // and save it to cache for stability between renders
            const charUpper = char.toUpperCase();
            const alternatives = VOID_ALPHABET_ALTERNATIVES[charUpper];
            if (alternatives && alternatives.length > 0) {
                // Generate random index (0 = base, 1+ = alternatives)
                const baseGlyph = VOID_ALPHABET[charUpper] || VOID_ALPHABET[" "];
                const allGlyphs = [baseGlyph, ...alternatives];
                const randomIndex = Math.floor(Math.random() * allGlyphs.length);
                // Save to cache
                this.alternativeGlyphCache[cacheKey] = randomIndex;
                alternativeIndex = randomIndex;
            }
        }
        
        const glyphCode = getGlyph(char, {
            alternativeIndex: alternativeIndex
        });
        
        const moduleW = this.params.moduleSize;
        const moduleH = this.params.moduleSize;
        // Space has width of 3 modules instead of 5
        const letterCols = char === ' ' ? 3 : this.cols;
        const letterW = letterCols * moduleW;
        const letterH = this.rows * moduleH;
        
        // Check if mouse is hovering over this letter (for transparency effect)
        const isHovered = this.hoveredLetter && 
            this.hoveredLetter.lineIndex === lineIndex && 
            this.hoveredLetter.charIndex === charIndex;
        
        // Save current globalAlpha
        const originalAlpha = this.ctx.globalAlpha;
        if (isHovered) {
            this.ctx.globalAlpha = 0.8;
        }
        
        // Base stem value for circles (used if module not found)
        const baseStem = this.params.stem;
        
        // Determine if roundedCaps should be applied only to end modules
        const shouldUseRounded = this.params.mode === 'random' 
            ? (this.params.randomRounded || false)
            : (this.params.roundedCaps || false);
        
        // In Random mode use randomCloseEnds, otherwise closeEnds
        const shouldUseCloseEnds = this.params.mode === 'random'
            ? (this.params.randomCloseEnds || false)
            : (this.params.closeEnds || false);
        
        // Endpoints needed if Round OR Close Ends enabled
        const shouldUseEndpoints = shouldUseRounded || shouldUseCloseEnds;
        
        // Analyze glyph to determine endpoints (if needed for Round or Close Ends)
        let endpointMap = null; // Map: "i_j" -> {top, right, bottom, left}
        if (shouldUseEndpoints) {
            try {
                const analysis = this.getCachedGlyphAnalysis(glyphCode, letterCols, this.rows);
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
                console.error('Error analyzing glyph for endpoints:', error);
            }
        }
        
        // Render each module in 5×5 grid (or 3×5 for space)
        for (let i = 0; i < letterCols; i++) {
            for (let j = 0; j < this.rows; j++) {
                const index = (i + j * this.cols) * 2;
                const moduleType = glyphCode.charAt(index);
                const rotation = parseInt(glyphCode.charAt(index + 1));
                
                const moduleX = x + i * moduleW;
                const moduleY = y + j * moduleH;
                
                // For random mode generate random values for each module
                let stem = baseStem;
                let strokesNum = this.params.strokesNum;
                let strokeGapRatio = this.params.strokeGapRatio;
                let randomValues = null;
                
                // Temporarily update parameters in moduleDrawer for this module
                const originalStrokeGapRatio = this.moduleDrawer.strokeGapRatio;
                const originalDashLength = this.moduleDrawer.dashLength;
                const originalGapLength = this.moduleDrawer.gapLength;
                const originalMode = this.moduleDrawer.mode;
                let moduleUseDash = false;
                
                if (this.params.mode === 'random') {
                    // Create unique key for this module (position in text + position in module)
                    const cacheKey = this.params.randomModeType === 'full' && lineIndex !== null && charIndex !== null
                        ? `${lineIndex}_${charIndex}_${i}_${j}` 
                        : null;
                    randomValues = this.getRandomModuleValues(moduleType, cacheKey);
                    stem = randomValues.stem;
                    strokesNum = randomValues.strokesNum;
                    strokeGapRatio = randomValues.strokeGapRatio;
                    
                    // Apply all random values to moduleDrawer
                    this.moduleDrawer.strokeGapRatio = strokeGapRatio;
                    this.moduleDrawer.dashLength = randomValues.dashLength;
                    this.moduleDrawer.gapLength = randomValues.gapLength;
                    moduleUseDash = randomValues.useDash || false;
                    
                    // If module should use dash, temporarily change mode to 'sd'
                    if (moduleUseDash) {
                        this.moduleDrawer.mode = 'sd';
                    }
                }
                
                // Set endpoints for module
                const moduleKey = `${i}_${j}`;
                const endpointSides = endpointMap && endpointMap[moduleKey];
                const hasEndpoints = endpointSides ? true : false;
                const originalRoundedCaps = this.moduleDrawer.roundedCaps;
                const originalEndpointSides = this.moduleDrawer.endpointSides;
                
                // endpointSides needed for Round and Close Ends
                if (shouldUseEndpoints) {
                    this.moduleDrawer.endpointSides = endpointSides || null;
                }
                
                // roundedCaps controls rounding of line ends
                if (shouldUseRounded) {
                    // In dash/sd mode: rounding for all modules, shortening only for end modules
                    // In solid/stripes: rounding and shortening only for end modules
                    // For random mode with dash use sd logic
                    const isDashMode = this.params.mode === 'dash' || this.params.mode === 'sd' || moduleUseDash;
                    this.moduleDrawer.roundedCaps = isDashMode ? true : hasEndpoints;
                }
                
                // Get color for this module (supports Color Chaos mode)
                const moduleColor = (this.params.useColorChaos && this.getColorForModule) 
                    ? this.getColorForModule()
                    : this.params.color;
                
                this.moduleDrawer.drawModule(
                    this.ctx,
                    moduleType,
                    rotation,
                    moduleX,
                    moduleY,
                    moduleW,
                    moduleH,
                    stem,
                    moduleColor,
                    this.params.mode === 'random' ? strokesNum : null
                );
                
                // Restore original values
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
        
        // Restore globalAlpha
        this.ctx.globalAlpha = originalAlpha;
        
        // Render endpoints and joints (if enabled)
        if (this.params.showEndpoints) {
            try {
                const analysis = this.getCachedGlyphAnalysis(glyphCode, letterCols, this.rows);
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
                
                // Render circles on endpoints (Test mode)
                if (this.params.showTestCircles) {
                    this.renderTestCircles(glyphCode, letterCols, analysis.endpoints, moduleW, x, y, baseStem);
                }
            } catch (error) {
                console.error('Error rendering endpoints:', error);
            }
        } else if (this.params.showTestCircles) {
            // If only Test enabled but not Endpoints, still analyze and draw circles
            try {
                const analysis = this.getCachedGlyphAnalysis(glyphCode, letterCols, this.rows);
                this.renderTestCircles(glyphCode, letterCols, analysis.endpoints, moduleW, x, y, baseStem);
            } catch (error) {
                console.error('Error rendering test circles:', error);
            }
        }
    }

    /**
     * Render circles on endpoints (Test mode)
     */
    renderTestCircles(glyphCode, letterCols, endpoints, moduleW, x, y, stem) {
        if (!endpoints || endpoints.length === 0) return;
        
        // Create module grid to get type and rotation
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
                
                // Get point coordinates on curve relative to module start
                const point = this.endpointDetector.getLineEndPointCoordinates(
                    module.type,
                    module.rotation,
                    ep.side,
                    moduleW,
                    stem
                );
                
                // Check that coordinates were calculated (not remained 0,0)
                if (!point || (point.x === 0 && point.y === 0 && module.type !== 'C')) {
                    // Fallback: use coordinates on module side
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
                
                // Point coordinates relative to module, convert to coordinates relative to letter
                const moduleX = x + ep.col * moduleW;
                const moduleY = y + ep.row * moduleW;
                
                // Draw circle with diameter = stem / 2 (line width)
                // In ModuleDrawer lineWidth = stem / 2, so circle diameter = stem / 2
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
     * @returns {Object|null} - object with lineIndex, charIndex, char or null if click didn't hit letter
     */
    getLetterPositionAt(clickX, clickY) {
        // Ensure canvas dimensions are set
        if (this.canvasWidth === 0 || this.canvasHeight === 0) {
            const rect = this.canvas.getBoundingClientRect();
            this.canvasWidth = rect.width;
            this.canvasHeight = rect.height;
        }
        
        // Calculate text layout
        const layout = this.calculateTextLayout(this.canvasWidth, this.canvasHeight);
        if (!layout) return null;
        
        // Check each line
        for (let lineIndex = 0; lineIndex < layout.lineLayouts.length; lineIndex++) {
            const lineLayout = layout.lineLayouts[lineIndex];
            
            // Check each letter in line
            for (let charIndex = 0; charIndex < lineLayout.charLayouts.length; charIndex++) {
                const charLayout = lineLayout.charLayouts[charIndex];
                
                // Check if click hit this letter
                if (clickX >= charLayout.x && clickX < charLayout.x + charLayout.width &&
                    clickY >= charLayout.y && clickY < charLayout.y + charLayout.height) {
                    return { lineIndex, charIndex, char: charLayout.char };
                }
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
        
        // Check if there are alternatives for this character
        const alternatives = VOID_ALPHABET_ALTERNATIVES[char];
        if (!alternatives || !alternatives.length) return false;
        
        const cacheKey = `${lineIndex}_${charIndex}`;
        
        // Determine current alternative index
        // If letter not fixed in cache, base glyph is used (index 0)
        const currentIndex = this.alternativeGlyphCache.hasOwnProperty(cacheKey) 
            ? this.alternativeGlyphCache[cacheKey] 
            : 0;
        
        // Switch to next alternative in order (0 -> 1 -> 2 -> ... -> max -> 0)
        const maxIndex = alternatives.length; // 0 = base, 1..max = alternatives
        const nextIndex = (currentIndex + 1) % (maxIndex + 1);
        
        // Save next index to cache
        if (nextIndex === 0) {
            // If returning to base, remove from cache (to use base glyph directly)
            delete this.alternativeGlyphCache[cacheKey];
        } else {
            // Save alternative index (1, 2, 3, ...)
            this.alternativeGlyphCache[cacheKey] = nextIndex;
        }
        
        return true;
    }

    /**
     * Set letter under cursor (for transparency effect)
     * @param {Object|null} position - {lineIndex, charIndex} or null
     */
    setHoveredLetter(position) {
        this.hoveredLetter = position;
    }
}

