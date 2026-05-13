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
                if (safeGap > 0 && numDashes < 2) return;
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
            ? Math.max(safeGap > 0 ? 2 : 1, Math.round((safeLine + safeGap) / cycle))
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

    static positiveModulo(value, modulo) {
        if (!Number.isFinite(modulo) || modulo <= 0) return 0;
        return ((value % modulo) + modulo) % modulo;
    }

    static circularDistance(a, b, modulo) {
        if (!Number.isFinite(modulo) || modulo <= 0) return 0;
        const delta = Math.abs(MathUtils.positiveModulo(a, modulo) - MathUtils.positiveModulo(b, modulo));
        return Math.min(delta, modulo - delta);
    }

    static calculateSymmetricDashOffset(lineLength, dashLength, gapLength, preferredOffset = 0) {
        const pattern = MathUtils.calculateSymmetricDashPattern(lineLength, dashLength, gapLength, preferredOffset);
        return pattern.dashOffset;
    }

    static calculateSymmetricDashPattern(lineLength, dashLength, gapLength, preferredOffset = 0, options = {}) {
        const safeLine = Math.max(0, Number.isFinite(lineLength) ? lineLength : 0);
        const safeDash = Math.max(0.001, Number.isFinite(dashLength) ? dashLength : 0.001);
        const safeGap = Math.max(0, Number.isFinite(gapLength) ? gapLength : 0);
        const requiredEdgeState = options.requiredEdgeState === 'dash' || options.requiredEdgeState === 'gap'
            ? options.requiredEdgeState
            : null;
        const edgeDashTargetRatio = Number.isFinite(options.edgeDashTargetRatio)
            ? MathUtils.clamp(options.edgeDashTargetRatio, 0, 1)
            : null;
        if (safeLine <= 0) {
            return { dashLength: 0, gapLength: 0, dashOffset: 0, scale: 1, endMode: 'symmetric' };
        }
        if (safeGap <= 0) {
            return { dashLength: safeDash, gapLength: 0, dashOffset: 0, scale: 1, endMode: 'symmetric' };
        }

        const scales = new Set([1]);
        for (let i = 1; i <= 50; i++) {
            const delta = i * 0.01;
            scales.add(Math.round((1 - delta) * 10000) / 10000);
            scales.add(Math.round((1 + delta) * 10000) / 10000);
        }
        const baseCycle = safeDash + safeGap;
        const idealCycles = Math.max(1, Math.round(safeLine / baseCycle));
        for (let n = Math.max(1, idealCycles - 3); n <= idealCycles + 3; n++) {
            const scale = safeLine / (baseCycle * n);
            if (scale >= 0.5 && scale <= 1.5) {
                scales.add(Math.round(scale * 1000000) / 1000000);
            }
        }

        const candidates = [];
        const addCandidates = (scale) => {
            if (scale <= 0) return;
            const d = safeDash * scale;
            const g = safeGap * scale;
            const cycle = d + g;
            if (cycle <= 0) return;
            const preferred = MathUtils.positiveModulo(preferredOffset, cycle);
            [
                { dashOffset: MathUtils.positiveModulo(d / 2 - safeLine / 2, cycle), center: 'dash' },
                { dashOffset: MathUtils.positiveModulo(d + g / 2 - safeLine / 2, cycle), center: 'gap' }
            ].forEach(candidate => {
                const start = candidate.dashOffset;
                const end = MathUtils.positiveModulo(candidate.dashOffset + safeLine, cycle);
                const eps = Math.max(1e-6, cycle * 1e-6);
                const stateAt = (position) => {
                    if (position <= eps || Math.abs(position - d) <= eps || Math.abs(position - cycle) <= eps) {
                        return 'boundary';
                    }
                    return position < d ? 'dash' : 'gap';
                };
                const edgeLengthAt = (position, state, isStart) => {
                    if (state === 'dash') {
                        return isStart ? d - position : position;
                    }
                    if (state === 'gap') {
                        return isStart ? cycle - position : position - d;
                    }
                    return 0;
                };
                const startState = stateAt(start);
                const endState = stateAt(end);
                const sameEdgeState = startState !== 'boundary' && startState === endState;
                const edgeState = sameEdgeState ? startState : 'mixed';
                const startEdgeLength = sameEdgeState ? edgeLengthAt(start, startState, true) : 0;
                const endEdgeLength = sameEdgeState ? edgeLengthAt(end, endState, false) : 0;
                const edgeUnit = edgeState === 'dash' ? d : g;
                const edgeDiffPenalty = sameEdgeState && edgeUnit > 0
                    ? Math.abs(startEdgeLength - endEdgeLength) / edgeUnit
                    : 1;
                const boundaryPenalty = startState === 'boundary' || endState === 'boundary' ? 1 : 0;
                const statePenalty = sameEdgeState ? 0 : 10;
                const requiredStatePenalty = requiredEdgeState
                    ? (edgeState === requiredEdgeState ? 0 : 50)
                    : 0;
                const targetEdgeLength = edgeDashTargetRatio !== null && edgeState === 'dash'
                    ? d * edgeDashTargetRatio
                    : null;
                const targetPenalty = targetEdgeLength !== null && d > 0
                    ? Math.abs(((startEdgeLength + endEdgeLength) / 2) - targetEdgeLength) / d
                    : 0;
                const scalePenalty = Math.abs(Math.log(scale)) * 10;
                const phasePenalty = MathUtils.circularDistance(candidate.dashOffset, preferred, cycle) / cycle;
                candidates.push({
                    dashLength: d,
                    gapLength: g,
                    dashOffset: candidate.dashOffset,
                    scale,
                    edgeState,
                    edgeLength: sameEdgeState ? (startEdgeLength + endEdgeLength) / 2 : 0,
                    center: candidate.center,
                    score: statePenalty + requiredStatePenalty + boundaryPenalty +
                        edgeDiffPenalty + targetPenalty * 20 + scalePenalty + phasePenalty
                });
            });
        };

        scales.forEach(addCandidates);

        candidates.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 1e-9) return a.score - b.score;
            return a.center === 'dash' ? -1 : 1;
        });

        const best = candidates[0];
        return {
            dashLength: best.dashLength,
            gapLength: best.gapLength,
            dashOffset: best.dashOffset,
            numDashes: 0,
            endMode: 'symmetric',
            edgeState: best.edgeState,
            edgeLength: best.edgeLength,
            scale: best.scale
        };
    }

    /**
     * Return a dash pattern for one logical stroke segment.
     *
     * Real glyph endpoints never land on a gap. Interior cuts are phase-centered
     * so both local edges land in the same kind of segment: dash/dash or gap/gap.
     */
    static calculateEndpointDash(lineLength, dashLength, gapLength, options = {}) {
        const safeLine = Math.max(0, Number.isFinite(lineLength) ? lineLength : 0);
        const safeDash = Math.max(0.001, Number.isFinite(dashLength) ? dashLength : 0.001);
        const safeGap = Math.max(0, Number.isFinite(gapLength) ? gapLength : 0);
        const mode = options.endMode === 'full' ? 'full' : 'half';
        const startEndpoint = !!options.startEndpoint;
        const endEndpoint = !!options.endEndpoint;

        if (safeLine <= 0) {
            return { dashLength: 0, gapLength: 0, numDashes: 0, dashOffset: 0, endMode: 'free' };
        }

        if (startEndpoint && endEndpoint) {
            return MathUtils.calculateAdaptiveDash(safeLine, safeDash, safeGap, mode);
        }

        const cycle = safeDash + safeGap;
        let dashOffset = Number.isFinite(options.phaseOffset) ? options.phaseOffset : 0;

        if (cycle > 0 && safeGap > 0) {
            if (startEndpoint) {
                dashOffset = mode === 'full' ? 0 : safeDash / 2;
            } else if (endEndpoint) {
                const endpointPosition = mode === 'full' ? safeDash : safeDash / 2;
                dashOffset = endpointPosition - safeLine;
            } else {
                return MathUtils.calculateSymmetricDashPattern(safeLine, safeDash, safeGap, dashOffset);
            }
            return MathUtils.calculateSymmetricDashPattern(safeLine, safeDash, safeGap, dashOffset, {
                requiredEdgeState: 'dash',
                edgeDashTargetRatio: 0.5
            });
        } else {
            dashOffset = 0;
        }

        return {
            dashLength: safeDash,
            gapLength: safeGap,
            numDashes: 0,
            dashOffset,
            endMode: 'free'
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
        if (cycle <= 0 || gapLength <= 0) {
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
