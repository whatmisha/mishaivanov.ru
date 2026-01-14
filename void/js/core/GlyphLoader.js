/**
 * GlyphLoader - functions for working with glyphs
 * Loads data from VoidAlphabet.js and processes edited versions from localStorage
 */

import { VOID_ALPHABET, VOID_ALPHABET_ALTERNATIVES } from './VoidAlphabet.js';

/**
 * Get edited glyph from localStorage
 * @param {string} char - character
 * @param {number|null} alternativeIndex - alternative index (null = base, 1+ = alternatives)
 * @returns {string|null} - glyph code or null if not found
 */
function getEditedGlyphFromStorage(char, alternativeIndex) {
    try {
        const storageKey = 'voidGlyphEditor_editedGlyphs';
        const stored = localStorage.getItem(storageKey);
        if (!stored) return null;
        
        const editedGlyphs = JSON.parse(stored);
        const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        // Check if glyph exists for character and key
        if (editedGlyphs[char] && editedGlyphs[char][key]) {
            return editedGlyphs[char][key];
        }
    } catch (e) {
        console.error('Error loading edited glyph from storage:', e);
    }
    return null;
}

/**
 * Get glyph code for character
 */
export function getGlyph(char, options = {}) {
    const upperChar = char.toUpperCase();
    const alternativeIndex = options.alternativeIndex;
    
    // Get original data
    const baseGlyph = VOID_ALPHABET[upperChar] || VOID_ALPHABET[" "];
    const alternatives = VOID_ALPHABET_ALTERNATIVES[upperChar];
    
    // If index not specified (null or undefined) - return base glyph
    if (alternativeIndex === null || alternativeIndex === undefined) {
        // First check if there's edited version of base glyph
        const editedGlyph = getEditedGlyphFromStorage(upperChar, null);
        if (editedGlyph) {
            return editedGlyph;
        }
        return baseGlyph;
    }
    
    // Random mode: select random alternative
    if (alternativeIndex === 'random') {
        // Include base glyph in selection (index 0 = base, 1+ = alternatives)
        const allGlyphs = [baseGlyph, ...(alternatives || [])];
        const randomIndex = Math.floor(Math.random() * allGlyphs.length);
        
        // Check if there's edited version for selected index
        const selectedIndex = randomIndex === 0 ? null : randomIndex;
        const editedGlyph = getEditedGlyphFromStorage(upperChar, selectedIndex);
        if (editedGlyph) {
            return editedGlyph;
        }
        
        return allGlyphs[randomIndex];
    }
    
    // Specific index (number)
    if (typeof alternativeIndex === 'number') {
        // Index 0 = base glyph
        if (alternativeIndex === 0) {
            const editedGlyph = getEditedGlyphFromStorage(upperChar, null);
            if (editedGlyph) {
                return editedGlyph;
            }
            return baseGlyph;
        }
        
        // Index 1+ = alternatives
        if (!alternatives || !alternatives.length) {
            return baseGlyph;
        }
        
        const altIndex = alternativeIndex - 1;
        if (altIndex >= 0 && altIndex < alternatives.length) {
            // Check if there's edited version
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
 * Check if glyph exists for character
 * @param {string} char - character
 * @returns {boolean}
 */
export function hasGlyph(char) {
    return VOID_ALPHABET.hasOwnProperty(char.toUpperCase());
}

/**
 * Get list of all available characters
 * @returns {string[]}
 */
export function getAvailableChars() {
    return Object.keys(VOID_ALPHABET);
}

