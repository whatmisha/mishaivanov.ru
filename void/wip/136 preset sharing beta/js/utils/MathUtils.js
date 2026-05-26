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
     * Calculate adaptive Gap for Dash mode
     * Line starts and ends with dash of dashLength
     * @param {number} lineLength - line length in pixels
     * @param {number} dashLength - dash length in pixels
     * @param {number} gapLength - initial gap length (used for estimation)
     * @returns {Object} {dashLength, gapLength, numDashes} - adaptive parameters
     */
    static calculateAdaptiveDash(lineLength, dashLength, gapLength) {
        // Minimum one dash
        if (lineLength <= dashLength) {
            return { dashLength: lineLength, gapLength: 0, numDashes: 1 };
        }

        // Formula for HALF ends:
        // lineLength = dashLength/2 + (n-2)*dashLength + dashLength/2 + (n-1)*gap
        // lineLength = (n-1)*dashLength + (n-1)*gap
        // lineLength = (n-1)*(dashLength + gap)
        // n = lineLength/(dashLength + gap) + 1
        let numDashes = Math.round(lineLength / (dashLength + gapLength)) + 1;
        
        // Minimum 2 dashes (start and end)
        if (numDashes < 2) {
            numDashes = 2;
        }

        // Calculate adaptive gap for half ends:
        // lineLength = (n-1)*(dashLength + gap)
        // gap = lineLength/(n-1) - dashLength
        const adaptiveGap = lineLength / (numDashes - 1) - dashLength;

        // If gap is negative, decrease number of dashes
        if (adaptiveGap < 0 && numDashes > 2) {
            numDashes--;
            const newGap = lineLength / (numDashes - 1) - dashLength;
            return { dashLength, gapLength: Math.max(0, newGap), numDashes };
        }

        return { dashLength, gapLength: Math.max(0, adaptiveGap), numDashes };
    }
}

