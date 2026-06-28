/**
 * GradientStrokeEffect — applies color gradients along stroke paths.
 */

import { PathGeometry } from '../core/geometry/PathGeometry.js';
import { ColorUtils } from '../utils/ColorUtils.js';

export class GradientStrokeEffect {
    constructor() {
        this.enabled = false;
        this.startColor = '#ffffff';
        this.endColor = '#888888';
        this.mode = 'linear'; // 'linear' | 'radial'
    }

    setParams(enabled, startColor, endColor, mode = 'linear') {
        this.enabled = enabled;
        this.startColor = startColor;
        this.endColor = endColor;
        this.mode = mode;
    }

    /**
     * Draw a polyline with gradient along its length.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array<{x, y}>} points
     * @param {number} lineWidth
     */
    drawGradientPolyline(ctx, points, lineWidth) {
        if (!this.enabled || points.length < 2) return false;

        const totalLength = PathGeometry.polylineLength(points);
        if (totalLength <= 0) return false;

        const startRgb = ColorUtils.hexToRgb(this.startColor);
        const endRgb = ColorUtils.hexToRgb(this.endColor);

        let accumulated = 0;

        ctx.save();
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            const t1 = accumulated / totalLength;
            const t2 = (accumulated + segLen) / totalLength;
            const tMid = (t1 + t2) / 2;

            const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * tMid);
            const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * tMid);
            const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * tMid);

            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            accumulated += segLen;
        }

        ctx.restore();
        return true;
    }
}
