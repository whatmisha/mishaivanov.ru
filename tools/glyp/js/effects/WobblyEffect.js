/**
 * WobblyEffect — applies Perlin-like noise displacement to paths.
 * Adapted from VOID's WobblyEffect for arbitrary polylines.
 */

export class WobblyEffect {
    constructor() {
        this.enabled = false;
        this.amplitude = 3;
        this.frequency = 0.1;
        this.detail = 4;
        this._seed = Math.random() * 1000;
    }

    setParams(enabled, amplitude, frequency) {
        this.enabled = enabled;
        this.amplitude = amplitude;
        this.frequency = frequency;
    }

    reseed(seed) {
        this._seed = seed ?? Math.random() * 1000;
    }

    /**
     * Get displacement at a world-space point.
     */
    getDisplacement(x, y) {
        if (!this.enabled || this.amplitude === 0) return { dx: 0, dy: 0 };

        const f = this.frequency;
        const a = this.amplitude;
        const s = this._seed;

        const dx = a * (Math.sin(x * f * 7.3 + y * f * 4.1 + s) +
                        0.5 * Math.sin(x * f * 13.7 + y * f * 9.3 + s * 2.1));
        const dy = a * (Math.cos(y * f * 6.7 + x * f * 5.3 + s + 1.5) +
                        0.5 * Math.cos(y * f * 11.3 + x * f * 8.7 + s * 1.7));

        return { dx: dx / 1.5, dy: dy / 1.5 };
    }

    /**
     * Apply wobble to a polyline, densifying segments.
     * @param {Array<{x, y}>} points
     * @returns {Array<{x, y}>}
     */
    applyToPolyline(points) {
        if (!this.enabled || this.amplitude === 0 || points.length < 2) {
            return points;
        }

        const result = [];

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const segments = Math.max(2, Math.ceil(len / this.detail));

            for (let j = (i === 0 ? 0 : 1); j <= segments; j++) {
                const t = j / segments;
                const px = p1.x + dx * t;
                const py = p1.y + dy * t;
                const disp = this.getDisplacement(px, py);
                result.push({ x: px + disp.dx, y: py + disp.dy });
            }
        }

        return result;
    }
}
