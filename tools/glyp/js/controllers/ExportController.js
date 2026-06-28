/**
 * ExportController — handles SVG and PNG export of the font preview.
 */

import { PathGeometry } from '../core/geometry/PathGeometry.js';
import { SVGPathParser } from '../core/SVGPathParser.js';

export class ExportController {
    constructor(glyphStore, registry, renderer) {
        this.glyphStore = glyphStore;
        this.registry = registry;
        this.renderer = renderer;
    }

    /**
     * Export current text as SVG string.
     */
    exportSVG(text, cellSize = 50, options = {}) {
        const letterSpacing = (options.letterSpacing ?? 0.2) * cellSize;
        const cols = this.glyphStore.gridCols;
        const rows = this.glyphStore.gridRows;
        const lineHeight = (options.lineHeight ?? 1.5) * cellSize * rows;
        const padding = 20;

        const lines = text.split('\n');
        let maxWidth = 0;
        for (const line of lines) {
            let w = 0;
            for (const char of line) {
                w += cols * cellSize + letterSpacing;
            }
            maxWidth = Math.max(maxWidth, w - letterSpacing);
        }
        const totalHeight = lines.length * lineHeight;

        const svgWidth = maxWidth + padding * 2;
        const svgHeight = totalHeight + padding * 2;

        let paths = '';
        let curY = padding;

        for (const line of lines) {
            let curX = padding;

            for (const char of line) {
                const cells = this.glyphStore.getGlyph(char);
                if (cells) {
                    paths += this._glyphToSVGPaths(cells, cols, rows, curX, curY, cellSize);
                    curX += cols * cellSize + letterSpacing;
                } else if (char === ' ') {
                    curX += cols * cellSize * 0.6 + letterSpacing;
                } else {
                    curX += cols * cellSize + letterSpacing;
                }
            }
            curY += lineHeight;
        }

        const stem = cellSize * this.renderer.stemMultiplier * 2;
        const color = this.renderer.color;
        const bgColor = this.renderer.bgColor;

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect width="${svgWidth}" height="${svgHeight}" fill="${bgColor}"/>
  <g fill="none" stroke="${color}" stroke-width="${stem}" stroke-linecap="${this.renderer.roundedCaps ? 'round' : 'butt'}" stroke-linejoin="round">
${paths}  </g>
</svg>`;
    }

    _glyphToSVGPaths(cells, cols, rows, offsetX, offsetY, cellSize) {
        let svg = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const index = r * cols + c;
                const cell = cells[index];
                if (!cell || !cell.module) continue;

                const mod = this.registry.get(cell.module);
                if (!mod || !mod.paths) continue;

                const cellX = offsetX + c * cellSize;
                const cellY = offsetY + r * cellSize;

                for (const pathDef of mod.paths) {
                    const rotated = SVGPathParser.rotateCommands(pathDef.commands, cell.rotation);
                    const scaled = PathGeometry.scaleToCell(rotated, cellSize, cellSize, cellX, cellY);
                    const d = SVGPathParser.commandsToString(scaled);
                    svg += `    <path d="${d}"/>\n`;
                }
            }
        }

        return svg;
    }

    /**
     * Export as PNG via canvas.
     */
    exportPNG(text, cellSize = 50, options = {}) {
        const letterSpacing = (options.letterSpacing ?? 0.2) * cellSize;
        const cols = this.glyphStore.gridCols;
        const rows = this.glyphStore.gridRows;
        const lineHeight = (options.lineHeight ?? 1.5) * cellSize * rows;
        const padding = 20;

        const lines = text.split('\n');
        let maxWidth = 0;
        for (const line of lines) {
            let w = 0;
            for (const char of line) w += cols * cellSize + letterSpacing;
            maxWidth = Math.max(maxWidth, w - letterSpacing);
        }
        const totalHeight = lines.length * lineHeight;

        const canvas = document.createElement('canvas');
        canvas.width = maxWidth + padding * 2;
        canvas.height = totalHeight + padding * 2;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = this.renderer.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.renderer.drawText(
            ctx, text, this.glyphStore, this.registry,
            padding, padding, cellSize, options
        );

        return canvas.toDataURL('image/png');
    }

    /**
     * Download a data URL as a file.
     */
    static download(dataUrl, filename) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Download SVG as file.
     */
    downloadSVG(text, filename, cellSize = 50, options = {}) {
        const svg = this.exportSVG(text, cellSize, options);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        ExportController.download(url, filename);
        URL.revokeObjectURL(url);
    }

    /**
     * Download PNG as file.
     */
    downloadPNG(text, filename, cellSize = 50, options = {}) {
        const dataUrl = this.exportPNG(text, cellSize, options);
        ExportController.download(dataUrl, filename);
    }
}
