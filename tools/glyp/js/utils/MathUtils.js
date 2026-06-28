/**
 * MathUtils — math utility functions for Glyp.
 */

export class MathUtils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static roundTo(value, decimals) {
        const m = Math.pow(10, decimals);
        return Math.round(value * m) / m;
    }

    static debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

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

    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static mapRange(value, inMin, inMax, outMin, outMax) {
        return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
    }
}
