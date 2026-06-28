/**
 * TextPreview — renders preview text using the current font project.
 * Provides a live canvas with typed text rendered in the modular font.
 */

import { ParametricRenderer } from '../core/ParametricRenderer.js';

export class TextPreview {
    constructor(canvas, glyphStore, registry) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.glyphStore = glyphStore;
        this.registry = registry;
        this.renderer = new ParametricRenderer();

        this.text = 'HELLO';
        this.cellSize = 40;
        this.letterSpacing = 0.2;
        this.lineHeight = 1.5;
        this.textAlign = 'left';
        this.alternativeMap = {};

        this.panX = 30;
        this.panY = 30;

        this._isPanning = false;
        this._panStartX = 0;
        this._panStartY = 0;
        this._panStartPanX = 0;
        this._panStartPanY = 0;
    }

    /**
     * Apply settings from project.
     */
    applySettings(settings) {
        this.renderer.applySettings(settings);
        if (settings.letterSpacing !== undefined) this.letterSpacing = settings.letterSpacing;
        if (settings.lineHeight !== undefined) this.lineHeight = settings.lineHeight;
        if (settings.textAlign !== undefined) this.textAlign = settings.textAlign;
    }

    /**
     * Set preview text.
     */
    setText(text) {
        this.text = text;
        this.render();
    }

    /**
     * Set cell size.
     */
    setCellSize(size) {
        this.cellSize = size;
        this.render();
    }

    /**
     * Render the text preview.
     */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.fillStyle = this.renderer.bgColor;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        if (!this.text) return;

        this.renderer.drawText(
            ctx,
            this.text,
            this.glyphStore,
            this.registry,
            this.panX,
            this.panY,
            this.cellSize,
            {
                letterSpacing: this.letterSpacing,
                lineHeight: this.lineHeight,
                alternativeMap: this.alternativeMap
            }
        );
    }

    /**
     * Resize the preview canvas.
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.render();
    }

    /**
     * Enable panning with mouse drag.
     */
    enablePanning() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.altKey)) {
                this._isPanning = true;
                this._panStartX = e.clientX;
                this._panStartY = e.clientY;
                this._panStartPanX = this.panX;
                this._panStartPanY = this.panY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this._isPanning) {
                this.panX = this._panStartPanX + (e.clientX - this._panStartX);
                this.panY = this._panStartPanY + (e.clientY - this._panStartY);
                this.render();
            }
        });

        const endPan = () => {
            this._isPanning = false;
            this.canvas.style.cursor = '';
        };

        this.canvas.addEventListener('mouseup', endPan);
        this.canvas.addEventListener('mouseleave', endPan);
    }
}
