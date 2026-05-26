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

        const randomizeStem = params.randomizeStem || false;
        const randomizeStrokes = params.randomizeStrokes || false;
        const randomizeContrast = params.randomizeContrast || false;
        const randomizeDashLength = params.randomizeDashLength || false;
        const randomizeGapLength = params.randomizeGapLength || false;

        const gen = () => {
            const stem = randomizeStem
                ? params.moduleSize * (stemMin + Math.random() * (stemMax - stemMin)) * 2
                : params.stem;
            const strokesNum = randomizeStrokes
                ? Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1))
                : (params.strokesNum ?? 2);
            const strokeGapRatio = randomizeContrast
                ? contrastMin + Math.random() * (contrastMax - contrastMin)
                : (params.strokeGapRatio ?? 1.0);
            const dashLength = randomizeDashLength
                ? dashLengthMin + Math.random() * (dashLengthMax - dashLengthMin)
                : (params.dashLength ?? 1.0);
            const gapLength = randomizeGapLength
                ? gapLengthMin + Math.random() * (gapLengthMax - gapLengthMin)
                : (params.gapLength ?? 1.5);

            const dashEnabled = params.dashEnabled || false;
            const moduleUseDash = strokesNum > 1 && (
                (dashEnabled && randomizeDashLength) ? true :
                (dashEnabled && !randomizeDashLength) ? true :
                (!dashEnabled && randomizeDashLength) ? Math.random() < 0.5 : false
            );

            return { stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash: moduleUseDash };
        };

        if (randomModeType === 'byType') {
            if (!cache[moduleType]) {
                cache[moduleType] = gen();
            }
            return cache[moduleType];
        } else {
            if (cacheKey && cache[cacheKey]) {
                return cache[cacheKey];
            }
            const values = gen();
            if (cacheKey) {
                cache[cacheKey] = values;
            }
            return values;
        }
    }
}
