/**
 * Backend-agnostic stroke geometry helpers.
 *
 * Both ModuleDrawer (Canvas2D) and VoidExporter (SVG) need the same
 * arithmetic to lay out parallel "stripe" lines, decide when to shorten
 * stroke ends for round caps / close-ends, and place the close-ends
 * caps. Putting these helpers in one place removes the formula
 * duplication between the two renderers.
 *
 * Pure functions — no DOM, no canvas, no settings dependency.
 */

/**
 * Compute the spacing for N parallel "stripe" lines packed into a band.
 *
 * Total band width = totalWidth.
 * Layout: stroke, gap, stroke, gap, ..., stroke (no leading/trailing gap).
 * The relationship is: strokeWidth / gap = strokeGapRatio.
 *
 * @param {number} totalWidth      total band width to fill
 * @param {number} strokesNum      number of stripes (≥ 1)
 * @param {number} strokeGapRatio  ratio of stroke thickness to gap width
 * @returns {{ gap: number, strokeWidth: number }}
 */
export function computeStripeLayout(totalWidth, strokesNum, strokeGapRatio) {
    const gap = totalWidth / (strokesNum * (strokeGapRatio + 1) - 1);
    const strokeWidth = gap * strokeGapRatio;
    return { gap, strokeWidth };
}

/**
 * Distance from the line ends a stripe should be shortened by when the
 * effective end is a round cap or a close-ends cap. Returns 0 when no
 * shortening is needed (preserves the original 1:1 behaviour).
 *
 * @param {number}  strokeWidth
 * @param {boolean} roundedCaps
 * @param {boolean} closeEnds
 * @param {boolean} hasEndpoint   — whether the corresponding side has a glyph endpoint
 * @returns {number} amount to shorten (in the same units as strokeWidth)
 */
export function stripeEndShorten(strokeWidth, roundedCaps, closeEnds, hasEndpoint) {
    return ((roundedCaps || closeEnds) && hasEndpoint) ? strokeWidth / 2 : 0;
}

/**
 * Linecap to use for the closing line drawn across the ends of a stripe
 * bundle when `closeEnds` is enabled.
 *
 * Square cap matches the original behaviour when round caps are off
 * (so the closing line tucks flush against the outermost stripes);
 * a round cap matches when round caps are on.
 *
 * @param {boolean} roundedCaps
 * @returns {'round'|'square'}
 */
export function closeEndsLineCap(roundedCaps) {
    return roundedCaps ? 'round' : 'square';
}

