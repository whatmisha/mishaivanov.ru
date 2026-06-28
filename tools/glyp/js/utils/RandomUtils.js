/**
 * RandomUtils — random generation utilities.
 */

export class RandomUtils {
    static seed = Date.now();

    static setSeed(s) {
        RandomUtils.seed = s;
    }

    static random() {
        RandomUtils.seed = (RandomUtils.seed * 16807 + 0) % 2147483647;
        return (RandomUtils.seed - 1) / 2147483646;
    }

    static randomRange(min, max) {
        return min + RandomUtils.random() * (max - min);
    }

    static randomInt(min, max) {
        return Math.floor(RandomUtils.randomRange(min, max + 1));
    }

    static pick(array) {
        return array[RandomUtils.randomInt(0, array.length - 1)];
    }

    static shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = RandomUtils.randomInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
