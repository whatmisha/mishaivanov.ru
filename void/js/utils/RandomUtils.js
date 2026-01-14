/**
 * RandomUtils - утилиты для генерации случайных значений модулей
 */

export class RandomUtils {
    /**
     * Получить случайные значения для модуля (с учетом режима рандома)
     * @param {string} moduleType - тип модуля (S, C, J, L, R, B)
     * @param {string|null} cacheKey - ключ кэша для режима 'full' (null для режима 'byType')
     * @param {Object} params - параметры случайной генерации
     * @param {Object} cache - объект кэша (moduleTypeCache или moduleValueCache)
     * @returns {Object} {stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash}
     */
    static getRandomModuleValues(moduleType, cacheKey, params, cache) {
        const stemMin = params.randomStemMin !== undefined ? params.randomStemMin : 0.5;
        const stemMax = params.randomStemMax !== undefined ? params.randomStemMax : 1.0;
        const strokesMin = params.randomStrokesMin !== undefined ? params.randomStrokesMin : 1;
        const strokesMax = params.randomStrokesMax !== undefined ? params.randomStrokesMax : 8;
        const contrastMin = params.randomContrastMin !== undefined ? params.randomContrastMin : 0.5;
        const contrastMax = params.randomContrastMax !== undefined ? params.randomContrastMax : 1.0;
        const dashLengthMin = params.randomDashLengthMin !== undefined ? params.randomDashLengthMin : 1.0;
        const dashLengthMax = params.randomDashLengthMax !== undefined ? params.randomDashLengthMax : 1.5;
        const gapLengthMin = params.randomGapLengthMin !== undefined ? params.randomGapLengthMin : 1.0;
        const gapLengthMax = params.randomGapLengthMax !== undefined ? params.randomGapLengthMax : 1.5;
        const randomModeType = params.randomModeType || 'byType';

        if (randomModeType === 'byType') {
            // Режим по типу модуля: генерируем значения один раз для каждого типа
            if (!cache[moduleType]) {
                const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
                const stem = params.moduleSize * randomMultiplier * 2;
                const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
                const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
                const dashLength = dashLengthMin + Math.random() * (dashLengthMax - dashLengthMin);
                const gapLength = gapLengthMin + Math.random() * (gapLengthMax - gapLengthMin);
                
                // Определяем useDash для этого типа модуля
                // Dash применяется только если randomDash включен и strokesNum > 1
                const moduleUseDash = params.randomDash && strokesNum > 1 
                    ? Math.random() < 0.5  // 50% вероятность dash
                    : false;
                
                cache[moduleType] = { stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash: moduleUseDash };
            }
            return cache[moduleType];
        } else {
            // Полный рандом: генерируем новые значения для каждого модуля
            // Но используем кэш, чтобы при экспорте использовать те же значения
            if (cacheKey && cache[cacheKey]) {
                return cache[cacheKey];
            }
            
            const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
            const stem = params.moduleSize * randomMultiplier * 2;
            const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
            const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
            const dashLength = dashLengthMin + Math.random() * (dashLengthMax - dashLengthMin);
            const gapLength = gapLengthMin + Math.random() * (gapLengthMax - gapLengthMin);
            
            // Определяем useDash для этого модуля
            // Dash применяется только если randomDash включен и strokesNum > 1
            const moduleUseDash = params.randomDash && strokesNum > 1 
                ? Math.random() < 0.5  // 50% вероятность dash
                : false;
            
            const values = { stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash: moduleUseDash };
            
            if (cacheKey) {
                cache[cacheKey] = values;
            }
            
            return values;
        }
    }
}
