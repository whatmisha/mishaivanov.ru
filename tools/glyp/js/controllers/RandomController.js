/**
 * RandomController — manages randomization of parametric values.
 * Supports per-module-type and per-cell-unique randomization.
 */

import { RandomUtils } from '../utils/RandomUtils.js';

export class RandomController {
    constructor() {
        this.enabled = false;
        this.mode = 'byType'; // 'byType' | 'full'
        this.seed = Date.now();
        this.ranges = {
            stemMultiplier: { min: 0.05, max: 0.3, dice: false },
            strokesNum: { min: 1, max: 4, dice: false },
            strokeGapRatio: { min: 0.5, max: 2, dice: false },
            dashLength: { min: 0.05, max: 0.5, dice: false },
            gapLength: { min: 0.1, max: 0.5, dice: false }
        };
        this.cache = new Map();
    }

    /**
     * Enable/disable a parameter for randomization.
     */
    toggleDice(param, enabled) {
        if (this.ranges[param]) {
            this.ranges[param].dice = enabled;
            this.enabled = Object.values(this.ranges).some(r => r.dice);
        }
    }

    /**
     * Set range for a parameter.
     */
    setRange(param, min, max) {
        if (this.ranges[param]) {
            this.ranges[param].min = min;
            this.ranges[param].max = max;
        }
    }

    /**
     * Get randomized value for a parameter at a given cache key.
     */
    getValue(param, cacheKey) {
        if (!this.ranges[param] || !this.ranges[param].dice) return null;

        const fullKey = `${param}_${cacheKey}`;
        if (this.cache.has(fullKey)) return this.cache.get(fullKey);

        RandomUtils.setSeed(this._hashKey(fullKey, this.seed));
        const { min, max } = this.ranges[param];
        const value = param === 'strokesNum'
            ? RandomUtils.randomInt(min, max)
            : RandomUtils.randomRange(min, max);

        this.cache.set(fullKey, value);
        return value;
    }

    /**
     * Reseed and clear cache.
     */
    reseed(seed) {
        this.seed = seed ?? Date.now();
        this.cache.clear();
    }

    _hashKey(str, seed) {
        let hash = seed;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return Math.abs(hash);
    }
}
