/**
 * ParametricRenderer — renders module skeleton paths with parametric styling.
 * Supports modes: fill, stripes, dash, sd (stripes+dash).
 * Applies stem width, wobble, and gradient effects to arbitrary SVG paths.
 */

import { PathGeometry } from './geometry/PathGeometry.js';
import { SVGPathParser } from './SVGPathParser.js';
import { JointDetector } from './JointDetector.js';
import { MathUtils } from '../utils/MathUtils.js';

export class ParametricRenderer {
    constructor() {
        this.mode = 'fill';
        this.stemMultiplier = 0.15;
        this.strokesNum = 1;
        this.strokeGapRatio = 1.0;
        this.roundedCaps = false;
        this.closeEnds = false;

        this.dashEnabled = false;
        this.dashLength = 0.10;
        this.gapLength = 0.30;
        this.dashChess = false;

        this.wobblyEnabled = false;
        this.wobblyAmount = 0.5;
        this.wobblyFrequency = 0.1;
        this._noiseOffset = 0;

        this.color = '#ffffff';
        this.bgColor = '#1a1a1a';
    }

    /**
     * Derive the rendering mode from current settings.
     */
    getDerivedMode() {
        const hasStripes = this.strokesNum > 1;
        const hasDash = this.dashEnabled;
        if (hasStripes && hasDash) return 'sd';
        if (hasStripes) return 'stripes';
        if (hasDash) return 'dash';
        return 'fill';
    }

    /**
     * Apply all current settings from a settings object.
     */
    applySettings(settings) {
        if (settings.stemMultiplier !== undefined) this.stemMultiplier = settings.stemMultiplier;
        if (settings.strokesNum !== undefined) this.strokesNum = settings.strokesNum;
        if (settings.strokeGapRatio !== undefined) this.strokeGapRatio = settings.strokeGapRatio;
        if (settings.roundedCaps !== undefined) this.roundedCaps = settings.roundedCaps;
        if (settings.closeEnds !== undefined) this.closeEnds = settings.closeEnds;
        if (settings.dashEnabled !== undefined) this.dashEnabled = settings.dashEnabled;
        if (settings.dashLength !== undefined) this.dashLength = settings.dashLength;
        if (settings.gapLength !== undefined) this.gapLength = settings.gapLength;
        if (settings.dashChess !== undefined) this.dashChess = settings.dashChess;
        if (settings.wobblyEnabled !== undefined) this.wobblyEnabled = settings.wobblyEnabled;
        if (settings.wobblyAmount !== undefined) this.wobblyAmount = settings.wobblyAmount;
        if (settings.wobblyFrequency !== undefined) this.wobblyFrequency = settings.wobblyFrequency;
        if (settings.color !== undefined) this.color = settings.color;
        if (settings.bgColor !== undefined) this.bgColor = settings.bgColor;
        this.mode = this.getDerivedMode();
    }

    /**
     * Render a single module path onto a canvas context.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} commands - Normalized path commands [0,1]x[0,1]
     * @param {number} cellX - Cell top-left X in pixels
     * @param {number} cellY - Cell top-left Y in pixels
     * @param {number} cellW - Cell width in pixels
     * @param {number} cellH - Cell height in pixels
     * @param {object} [options] - Additional options
     * @param {object} [options.endpointSides] - Which sides have endpoints {top, right, bottom, left}
     */
    drawPath(ctx, commands, cellX, cellY, cellW, cellH, options = {}) {
        const stem = cellW * this.stemMultiplier * 2;
        const polyline = PathGeometry.toPolyline(commands, 48);

        if (polyline.length < 2) return;

        const scaledPoints = polyline.map(p => ({
            x: p.x * cellW + cellX,
            y: p.y * cellH + cellY
        }));

        const mode = this.getDerivedMode();

        if (mode === 'fill') {
            this._drawFill(ctx, scaledPoints, stem);
        } else if (mode === 'stripes') {
            this._drawStripes(ctx, scaledPoints, stem);
        } else if (mode === 'dash') {
            this._drawDash(ctx, scaledPoints, stem);
        } else if (mode === 'sd') {
            this._drawStripeDash(ctx, scaledPoints, stem);
        }
    }

    /**
     * Render a complete glyph (all cells in the grid).
     */
    drawGlyph(ctx, cells, cols, rows, registry, x, y, cellSize) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const index = r * cols + c;
                const cell = cells[index];
                if (!cell || !cell.module) continue;

                const mod = registry.get(cell.module);
                if (!mod || !mod.paths || mod.paths.length === 0) continue;

                const cellX = x + c * cellSize;
                const cellY = y + r * cellSize;

                for (const pathDef of mod.paths) {
                    const rotated = SVGPathParser.rotateCommands(
                        pathDef.commands,
                        cell.rotation
                    );
                    this.drawPath(ctx, rotated, cellX, cellY, cellSize, cellSize);
                }
            }
        }
    }

    /**
     * Render text using the glyph store.
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {import('./GlyphStore.js').GlyphStore} glyphStore
     * @param {import('./ModuleRegistry.js').ModuleRegistry} registry
     * @param {number} x - Starting X
     * @param {number} y - Starting Y
     * @param {number} cellSize - Size of each cell
     * @param {object} [options]
     * @param {number} [options.letterSpacing] - Spacing between letters (in cellSize units)
     * @param {number} [options.lineHeight] - Line height multiplier
     * @param {object} [options.alternativeMap] - Char → variant index mapping
     */
    drawText(ctx, text, glyphStore, registry, x, y, cellSize, options = {}) {
        const letterSpacing = (options.letterSpacing ?? 0.2) * cellSize;
        const lineHeight = (options.lineHeight ?? 1.5) * cellSize * glyphStore.gridRows;
        const cols = glyphStore.gridCols;
        const rows = glyphStore.gridRows;
        const alternativeMap = options.alternativeMap || {};

        const lines = text.split('\n');
        let curY = y;

        for (const line of lines) {
            let curX = x;

            for (const char of line) {
                const variantIndex = alternativeMap[char] || 0;
                const cells = glyphStore.getVariant(char, variantIndex);

                if (cells) {
                    this.drawGlyph(ctx, cells, cols, rows, registry, curX, curY, cellSize);
                    curX += cols * cellSize + letterSpacing;
                } else if (char === ' ') {
                    curX += cols * cellSize * 0.6 + letterSpacing;
                } else {
                    curX += cols * cellSize + letterSpacing;
                }
            }

            curY += lineHeight;
        }
    }

    // --- Private drawing methods ---

    _drawFill(ctx, points, stem) {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = stem;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        ctx.lineJoin = 'round';

        if (this.wobblyEnabled) {
            this._drawWobblyPolyline(ctx, points, stem);
        } else {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawStripes(ctx, points, stem) {
        const n = this.strokesNum;
        const totalWidth = stem;
        const gapRatio = this.strokeGapRatio;

        const stripWidth = totalWidth / (n + (n - 1) * gapRatio);
        const gapWidth = stripWidth * gapRatio;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stripWidth;

        for (let i = 0; i < n; i++) {
            const offset = -totalWidth / 2 + stripWidth / 2 + i * (stripWidth + gapWidth);
            const offsetPoints = PathGeometry.offsetPolyline(points, offset);

            if (this.wobblyEnabled) {
                this._drawWobblyPolyline(ctx, offsetPoints, stripWidth);
            } else {
                ctx.beginPath();
                ctx.moveTo(offsetPoints[0].x, offsetPoints[0].y);
                for (let j = 1; j < offsetPoints.length; j++) {
                    ctx.lineTo(offsetPoints[j].x, offsetPoints[j].y);
                }
                ctx.stroke();
            }
        }

        if (this.closeEnds) {
            this._drawCloseEnds(ctx, points, totalWidth, stripWidth);
        }

        ctx.restore();
    }

    _drawDash(ctx, points, stem) {
        const totalLength = PathGeometry.polylineLength(points);
        if (totalLength <= 0) return;

        const dashPx = this.dashLength * stem;
        const gapPx = this.gapLength * stem;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = stem;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        ctx.lineJoin = 'round';
        ctx.setLineDash([dashPx, gapPx]);
        ctx.lineDashOffset = 0;

        if (this.wobblyEnabled) {
            this._drawWobblyPolyline(ctx, points, stem);
        } else {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
    }

    _drawStripeDash(ctx, points, stem) {
        const n = this.strokesNum;
        const totalWidth = stem;
        const gapRatio = this.strokeGapRatio;

        const stripWidth = totalWidth / (n + (n - 1) * gapRatio);
        const gapWidth = stripWidth * gapRatio;

        const dashPx = this.dashLength * stem;
        const gapPx = this.gapLength * stem;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stripWidth;
        ctx.setLineDash([dashPx, gapPx]);

        for (let i = 0; i < n; i++) {
            const offset = -totalWidth / 2 + stripWidth / 2 + i * (stripWidth + gapWidth);
            const offsetPoints = PathGeometry.offsetPolyline(points, offset);

            ctx.lineDashOffset = this.dashChess && i % 2 ? dashPx + gapPx : 0;

            if (this.wobblyEnabled) {
                this._drawWobblyPolyline(ctx, offsetPoints, stripWidth);
            } else {
                ctx.beginPath();
                ctx.moveTo(offsetPoints[0].x, offsetPoints[0].y);
                for (let j = 1; j < offsetPoints.length; j++) {
                    ctx.lineTo(offsetPoints[j].x, offsetPoints[j].y);
                }
                ctx.stroke();
            }
        }

        ctx.setLineDash([]);
        ctx.restore();
    }

    _drawWobblyPolyline(ctx, points, lineWidth) {
        const amplitude = this.wobblyAmount * lineWidth;
        const freq = this.wobblyFrequency;

        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const wx = p.x + amplitude * (Math.sin(p.x * freq * 50 + p.y * freq * 30) +
                Math.sin(p.y * freq * 40 + this._noiseOffset));
            const wy = p.y + amplitude * (Math.cos(p.y * freq * 50 + p.x * freq * 30) +
                Math.cos(p.x * freq * 40 + this._noiseOffset + 1.5));

            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
    }

    _drawCloseEnds(ctx, points, totalWidth, stripWidth) {
        if (points.length < 2) return;

        ctx.lineWidth = stripWidth;

        const first = points[0];
        const second = points[1];
        const dx1 = second.x - first.x;
        const dy1 = second.y - first.y;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
        const nx1 = -dy1 / len1;
        const ny1 = dx1 / len1;

        ctx.beginPath();
        ctx.moveTo(first.x + nx1 * totalWidth / 2, first.y + ny1 * totalWidth / 2);
        ctx.lineTo(first.x - nx1 * totalWidth / 2, first.y - ny1 * totalWidth / 2);
        ctx.stroke();

        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        const dx2 = last.x - prev.x;
        const dy2 = last.y - prev.y;
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
        const nx2 = -dy2 / len2;
        const ny2 = dx2 / len2;

        ctx.beginPath();
        ctx.moveTo(last.x + nx2 * totalWidth / 2, last.y + ny2 * totalWidth / 2);
        ctx.lineTo(last.x - nx2 * totalWidth / 2, last.y - ny2 * totalWidth / 2);
        ctx.stroke();
    }

    /**
     * Draw the grid overlay (for editor).
     */
    drawGrid(ctx, x, y, cols, rows, cellSize, color = 'rgba(255,255,255,0.08)') {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        for (let c = 0; c <= cols; c++) {
            const lx = x + c * cellSize;
            ctx.beginPath();
            ctx.moveTo(lx, y);
            ctx.lineTo(lx, y + rows * cellSize);
            ctx.stroke();
        }

        for (let r = 0; r <= rows; r++) {
            const ly = y + r * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, ly);
            ctx.lineTo(x + cols * cellSize, ly);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Draw joint indicators.
     */
    drawJoints(ctx, joints, x, y, cellSize, color = 'rgba(100, 200, 255, 0.6)') {
        ctx.save();
        ctx.fillStyle = color;
        const dotSize = 4;

        for (const joint of joints) {
            let jx, jy;
            if (joint.orientation === 'vertical') {
                jx = x + (joint.cell1.col + 1) * cellSize;
                jy = y + (joint.cell1.row + 0.5) * cellSize;
            } else {
                jx = x + (joint.cell1.col + 0.5) * cellSize;
                jy = y + (joint.cell1.row + 1) * cellSize;
            }

            ctx.beginPath();
            ctx.arc(jx, jy, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw free endpoint indicators.
     */
    drawEndpoints(ctx, endpoints, x, y, cellSize, color = 'rgba(255, 100, 100, 0.6)') {
        ctx.save();
        ctx.fillStyle = color;
        const dotSize = 3;

        for (const ep of endpoints) {
            let ex, ey;
            switch (ep.side) {
                case 'top':
                    ex = x + (ep.col + 0.5) * cellSize;
                    ey = y + ep.row * cellSize;
                    break;
                case 'bottom':
                    ex = x + (ep.col + 0.5) * cellSize;
                    ey = y + (ep.row + 1) * cellSize;
                    break;
                case 'left':
                    ex = x + ep.col * cellSize;
                    ey = y + (ep.row + 0.5) * cellSize;
                    break;
                case 'right':
                    ex = x + (ep.col + 1) * cellSize;
                    ey = y + (ep.row + 0.5) * cellSize;
                    break;
            }

            ctx.beginPath();
            ctx.arc(ex, ey, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
