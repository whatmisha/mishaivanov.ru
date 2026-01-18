/**
 * RandomUtils - utilities for generating random module values
 */

export class RandomUtils {
    /**
     * Get random values for module (considering random mode)
     * @param {string} moduleType - module type (S, C, J, L, R, B)
     * @param {string|null} cacheKey - cache key for 'full' mode (null for 'byType' mode)
     * @param {Object} params - random generation parameters
     * @param {Object} cache - cache object (moduleTypeCache or moduleValueCache)
     * @returns {Object} {stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash}
     */
    static getRandomModuleValues(moduleType, cacheKey, params, cache) {
        const stemMin = params.randomStemMin !== undefined ? params.randomStemMin : 0.5;
        const stemMax = params.randomStemMax !== undefined ? params.randomStemMax : 1.0;
        const strokesMin = params.randomStrokesMin !== undefined ? params.randomStrokesMin : 1;
        const strokesMax = params.randomStrokesMax !== undefined ? params.randomStrokesMax : 4;
        const contrastMin = params.randomContrastMin !== undefined ? params.randomContrastMin : 0.5;
        const contrastMax = params.randomContrastMax !== undefined ? params.randomContrastMax : 1.0;
        const dashLengthMin = params.randomDashLengthMin !== undefined ? params.randomDashLengthMin : 1.0;
        const dashLengthMax = params.randomDashLengthMax !== undefined ? params.randomDashLengthMax : 1.5;
        const gapLengthMin = params.randomGapLengthMin !== undefined ? params.randomGapLengthMin : 1.0;
        const gapLengthMax = params.randomGapLengthMax !== undefined ? params.randomGapLengthMax : 1.5;
        const randomModeType = params.randomModeType || 'byType';

        if (randomModeType === 'byType') {
            // By module type mode: generate values once for each type
            if (!cache[moduleType]) {
                const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
                const stem = params.moduleSize * randomMultiplier * 2;
                const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
                const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
                const dashLength = dashLengthMin + Math.random() * (dashLengthMax - dashLengthMin);
                const gapLength = gapLengthMin + Math.random() * (gapLengthMax - gapLengthMin);
                
                // Determine useDash for this module type
                // Dash applied only if randomDash enabled and strokesNum > 1
                const moduleUseDash = params.randomDash && strokesNum > 1 
                    ? Math.random() < 0.5  // 50% dash probability
                    : false;
                
                cache[moduleType] = { stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash: moduleUseDash };
            }
            return cache[moduleType];
        } else {
            // Full random: generate new values for each module
            // But use cache so export uses same values
            if (cacheKey && cache[cacheKey]) {
                return cache[cacheKey];
            }
            
            const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
            const stem = params.moduleSize * randomMultiplier * 2;
            const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
            const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
            const dashLength = dashLengthMin + Math.random() * (dashLengthMax - dashLengthMin);
            const gapLength = gapLengthMin + Math.random() * (gapLengthMax - gapLengthMin);
            
            // Determine useDash for this module
            // Dash applied only if randomDash enabled and strokesNum > 1
            const moduleUseDash = params.randomDash && strokesNum > 1 
                ? Math.random() < 0.5  // 50% dash probability
                : false;
            
            const values = { stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash: moduleUseDash };
            
            if (cacheKey) {
                cache[cacheKey] = values;
            }
            
            return values;
        }
    }
}
