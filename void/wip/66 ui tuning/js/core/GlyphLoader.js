/**
 * GlyphLoader - функции для работы с глифами
 * Загружает данные из VoidAlphabet.js и обрабатывает отредактированные версии из localStorage
 */

import { VOID_ALPHABET, VOID_ALPHABET_ALTERNATIVES } from './VoidAlphabet.js';

/**
 * Получить отредактированный глиф из localStorage
 * @param {string} char - символ
 * @param {number|null} alternativeIndex - индекс альтернативы (null = базовый, 1+ = альтернативы)
 * @returns {string|null} - код глифа или null если не найден
 */
function getEditedGlyphFromStorage(char, alternativeIndex) {
    try {
        const storageKey = 'voidGlyphEditor_editedGlyphs';
        const stored = localStorage.getItem(storageKey);
        if (!stored) return null;
        
        const editedGlyphs = JSON.parse(stored);
        const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        // Проверяем наличие глифа для символа и ключа
        if (editedGlyphs[char] && editedGlyphs[char][key]) {
            return editedGlyphs[char][key];
        }
    } catch (e) {
        console.error('Error loading edited glyph from storage:', e);
    }
    return null;
}

/**
 * Получить код глифа для символа
 */
export function getGlyph(char, options = {}) {
    const upperChar = char.toUpperCase();
    const alternativeIndex = options.alternativeIndex;
    
    // Получаем оригинальные данные
    const baseGlyph = VOID_ALPHABET[upperChar] || VOID_ALPHABET[" "];
    const alternatives = VOID_ALPHABET_ALTERNATIVES[upperChar];
    
    // Если индекс не указан (null или undefined) - возвращаем базовый глиф
    if (alternativeIndex === null || alternativeIndex === undefined) {
        // Сначала проверяем, есть ли отредактированная версия базового глифа
        const editedGlyph = getEditedGlyphFromStorage(upperChar, null);
        if (editedGlyph) {
            return editedGlyph;
        }
        return baseGlyph;
    }
    
    // Режим random: выбираем случайную альтернативу
    if (alternativeIndex === 'random') {
        // Включаем базовый глиф в выбор (индекс 0 = базовый, 1+ = альтернативы)
        const allGlyphs = [baseGlyph, ...(alternatives || [])];
        const randomIndex = Math.floor(Math.random() * allGlyphs.length);
        
        // Проверяем, есть ли отредактированная версия для выбранного индекса
        const selectedIndex = randomIndex === 0 ? null : randomIndex;
        const editedGlyph = getEditedGlyphFromStorage(upperChar, selectedIndex);
        if (editedGlyph) {
            return editedGlyph;
        }
        
        return allGlyphs[randomIndex];
    }
    
    // Конкретный индекс (число)
    if (typeof alternativeIndex === 'number') {
        // Индекс 0 = базовый глиф
        if (alternativeIndex === 0) {
            const editedGlyph = getEditedGlyphFromStorage(upperChar, null);
            if (editedGlyph) {
                return editedGlyph;
            }
            return baseGlyph;
        }
        
        // Индекс 1+ = альтернативы
        if (!alternatives || !alternatives.length) {
            return baseGlyph;
        }
        
        const altIndex = alternativeIndex - 1;
        if (altIndex >= 0 && altIndex < alternatives.length) {
            // Проверяем, есть ли отредактированная версия
            const editedGlyph = getEditedGlyphFromStorage(upperChar, alternativeIndex);
            if (editedGlyph) {
                return editedGlyph;
            }
            return alternatives[altIndex];
        }
    }
    
    return baseGlyph;
}

/**
 * Проверить, есть ли глиф для символа
 * @param {string} char - символ
 * @returns {boolean}
 */
export function hasGlyph(char) {
    return VOID_ALPHABET.hasOwnProperty(char.toUpperCase());
}

/**
 * Получить список всех доступных символов
 * @returns {string[]}
 */
export function getAvailableChars() {
    return Object.keys(VOID_ALPHABET);
}

