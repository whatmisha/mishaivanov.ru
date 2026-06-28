/**
 * ZoomManager — handles canvas zoom and pan interactions.
 */

export class ZoomManager {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.scale = options.initialScale ?? 1;
        this.minScale = options.minScale ?? 0.25;
        this.maxScale = options.maxScale ?? 4;
        this.panX = 0;
        this.panY = 0;

        this._isPanning = false;
        this._startX = 0;
        this._startY = 0;
        this._startPanX = 0;
        this._startPanY = 0;

        this.onTransformChange = options.onTransformChange ?? (() => {});
    }

    /**
     * Enable mouse wheel zoom and middle-click pan.
     */
    enable() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));

            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            this.panX = mx - (mx - this.panX) * (newScale / this.scale);
            this.panY = my - (my - this.panY) * (newScale / this.scale);
            this.scale = newScale;

            this.onTransformChange();
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && (e.altKey || e.spaceKey))) {
                this._isPanning = true;
                this._startX = e.clientX;
                this._startY = e.clientY;
                this._startPanX = this.panX;
                this._startPanY = this.panY;
                this.canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this._isPanning) {
                this.panX = this._startPanX + (e.clientX - this._startX);
                this.panY = this._startPanY + (e.clientY - this._startY);
                this.onTransformChange();
            }
        });

        const endPan = () => {
            if (this._isPanning) {
                this._isPanning = false;
                this.canvas.style.cursor = '';
            }
        };
        this.canvas.addEventListener('mouseup', endPan);
        this.canvas.addEventListener('mouseleave', endPan);
    }

    /**
     * Apply current transform to context.
     */
    applyTransform(ctx) {
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);
    }

    /**
     * Convert screen coords to world coords.
     */
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.panX) / this.scale,
            y: (sy - this.panY) / this.scale
        };
    }

    /**
     * Reset zoom and pan.
     */
    reset() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.onTransformChange();
    }
}
