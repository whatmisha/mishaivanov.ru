/**
 * Math utilities and unit conversion
 */
export class MathUtils {
    /**
     * Convert millimeters to points
     * @param {number} mm - value in millimeters
     * @returns {number} - value in points
     */
    static mmToPt(mm) {
        return mm * 2.83465;
    }

    /**
     * Convert points to millimeters
     * @param {number} pt - value in points
     * @returns {number} - value in millimeters
     */
    static ptToMm(pt) {
        return pt / 2.83465;
    }

    /**
     * Round value to specified number of decimal places
     * @param {number} value - value to round
     * @param {number} decimals - number of decimal places
     * @returns {number}
     */
    static roundTo(value, decimals) {
        const multiplier = Math.pow(10, decimals);
        return Math.round(value * multiplier) / multiplier;
    }

    /**
     * Clamp value to specified range
     * @param {number} value - value
     * @param {number} min - minimum
     * @param {number} max - maximum
     * @returns {number}
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Snap value to nearest grid step
     * @param {number} value - value
     * @param {number} gridSize - grid size
     * @returns {number}
     */
    static snapToGrid(value, gridSize) {
        return Math.round(value / gridSize) * gridSize;
    }

    /**
     * Convert Row + BaselineOffset to Y (position in baseline modules)
     * @param {number} row - row number
     * @param {number} baselineOffset - offset in baseline modules
     * @param {number} rowHeight - row height in modules
     * @returns {number}
     */
    static rowBaselineToY(row, baselineOffset, rowHeight) {
        // row * (rowHeight + 1) + baselineOffset
        // +1 is gutter between rows (1 module baseline)
        return row * (rowHeight + 1) + baselineOffset;
    }

    /**
     * Convert Y (position in baseline modules) to Row + BaselineOffset
     * @param {number} y - position in baseline modules
     * @param {number} rowHeight - row height in modules
     * @returns {{row: number, baselineOffset: number}}
     */
    static yToRowBaseline(y, rowHeight) {
        const rowWithGutter = rowHeight + 1;
        const row = Math.floor(y / rowWithGutter);
        const baselineOffset = y % rowWithGutter;
        return { row, baselineOffset };
    }

    /**
     * Debounce function - delays execution until calls stop
     * @param {Function} func - function to debounce
     * @param {number} wait - wait time in ms
     * @returns {Function}
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function - limits call frequency
     * @param {Function} func - function to throttle
     * @param {number} limit - minimum interval between calls in ms
     * @returns {Function}
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Calculate an adaptive dash pattern that lands on a clean endpoint.
     * `half` starts and ends with half a dash; `full` starts and ends with a full dash.
     * Dash and gap are scaled together so their visual ratio stays stable.
     *
     * @param {number} lineLength - line length in pixels
     * @param {number} dashLength - target dash length in pixels
     * @param {number} gapLength - target gap length in pixels
     * @param {'half'|'full'} endMode - endpoint pattern
     * @returns {Object} {dashLength, gapLength, numDashes, dashOffset, endMode}
     */
    static calculateAdaptiveDash(lineLength, dashLength, gapLength, endMode = 'half') {
        const safeLine = Math.max(0, Number.isFinite(lineLength) ? lineLength : 0);
        const safeDash = Math.max(0.001, Number.isFinite(dashLength) ? dashLength : 0.001);
        const safeGap = Math.max(0, Number.isFinite(gapLength) ? gapLength : 0);
        const mode = endMode === 'full' ? 'full' : 'half';

        if (safeLine <= 0) {
            return { dashLength: 0, gapLength: 0, numDashes: 0, dashOffset: 0, endMode: mode };
        }

        const cycle = safeDash + safeGap;
        const candidates = [];
        const addCandidate = (numDashes) => {
            if (numDashes < 1) return;
            let targetLength;
            if (mode === 'full') {
                targetLength = numDashes * safeDash + (numDashes - 1) * safeGap;
            } else {
                if (numDashes < 2) return;
                targetLength = (numDashes - 1) * cycle;
            }
            if (targetLength <= 0) return;
            const scale = safeLine / targetLength;
            candidates.push({
                dashLength: safeDash * scale,
                gapLength: safeGap * scale,
                numDashes,
                dashOffset: mode === 'full' ? 0 : (safeDash * scale) / 2,
                endMode: mode,
                scale
            });
        };

        const ideal = mode === 'full'
            ? Math.max(1, Math.round((safeLine + safeGap) / cycle))
            : Math.max(2, Math.round(safeLine / cycle) + 1);
        for (let n = ideal - 3; n <= ideal + 3; n++) {
            addCandidate(n);
        }

        candidates.sort((a, b) => {
            const da = Math.abs(Math.log(a.scale));
            const db = Math.abs(Math.log(b.scale));
            if (Math.abs(da - db) > 1e-9) return da - db;
            return b.numDashes - a.numDashes;
        });

        const best = candidates[0];
        return {
            dashLength: best.dashLength,
            gapLength: best.gapLength,
            numDashes: best.numDashes,
            dashOffset: best.dashOffset,
            endMode: best.endMode
        };
    }

    /**
     * Walk a 1D dashed path and return visible dash ranges [start, end].
     * Used by both Canvas and SVG renderers so tiny round-cap fragments are
     * filtered consistently.
     */
    static computeDashRanges(totalLength, dashLength, gapLength, dashOffset = 0, minVisibleLength = 0) {
        const out = [];
        if (totalLength <= 0) return out;
        const cycle = dashLength + gapLength;
        if (cycle <= 0 || gapLength <= 0 || dashLength >= totalLength) {
            return [[0, totalLength]];
        }

        const off = ((dashOffset % cycle) + cycle) % cycle;
        let p = 0;
        const eps = 1e-6;
        while (p < totalLength - eps) {
            const cp = (off + p) % cycle;
            if (cp < dashLength - eps) {
                const remaining = dashLength - cp;
                const endP = Math.min(p + remaining, totalLength);
                if (endP > p + eps) out.push([p, endP]);
                p = Math.max(endP, p + eps);
            } else {
                p += Math.max(cycle - cp, eps);
            }
        }

        if (minVisibleLength <= 0 || out.length <= 1) return out;
        return out.filter(([a, b], index) => {
            return index === 0 || index === out.length - 1 || b - a >= minVisibleLength;
        });
    }
}
