/**
 * GlyphStore — manages glyphs (characters) for a font project.
 * Each glyph is a grid of module placements with optional alternatives.
 */

export class GlyphStore {
    constructor(gridCols = 5, gridRows = 5) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.glyphs = new Map(); // char → { base: Array, alternatives: Array<Array> }
    }

    /**
     * Set grid dimensions. Existing glyphs are NOT resized (use resizeGlyphs for that).
     */
    setGridSize(cols, rows) {
        this.gridCols = cols;
        this.gridRows = rows;
    }

    /**
     * Create an empty cell array for the current grid size.
     */
    createEmptyCells() {
        const size = this.gridCols * this.gridRows;
        return Array.from({ length: size }, () => ({ module: null, rotation: 0 }));
    }

    /**
     * Add or replace the base glyph for a character.
     * @param {string} char - Unicode character
     * @param {Array<{module: string|null, rotation: number}>} cells - Grid cells
     */
    setGlyph(char, cells) {
        const existing = this.glyphs.get(char);
        if (existing) {
            existing.base = cells;
        } else {
            this.glyphs.set(char, { base: cells, alternatives: [] });
        }
    }

    /**
     * Get the base glyph for a character.
     */
    getGlyph(char) {
        const entry = this.glyphs.get(char);
        return entry ? entry.base : null;
    }

    /**
     * Get glyph entry (base + alternatives).
     */
    getEntry(char) {
        return this.glyphs.get(char) || null;
    }

    /**
     * Add an alternative variant for a character.
     * @returns {number} Index of the new alternative
     */
    addAlternative(char, cells) {
        let entry = this.glyphs.get(char);
        if (!entry) {
            entry = { base: this.createEmptyCells(), alternatives: [] };
            this.glyphs.set(char, entry);
        }
        entry.alternatives.push(cells);
        return entry.alternatives.length - 1;
    }

    /**
     * Update an alternative by index.
     */
    setAlternative(char, index, cells) {
        const entry = this.glyphs.get(char);
        if (!entry || index < 0 || index >= entry.alternatives.length) return false;
        entry.alternatives[index] = cells;
        return true;
    }

    /**
     * Remove an alternative by index.
     */
    removeAlternative(char, index) {
        const entry = this.glyphs.get(char);
        if (!entry || index < 0 || index >= entry.alternatives.length) return false;
        entry.alternatives.splice(index, 1);
        return true;
    }

    /**
     * Get a specific variant (0 = base, 1+ = alternatives).
     */
    getVariant(char, variantIndex = 0) {
        const entry = this.glyphs.get(char);
        if (!entry) return null;
        if (variantIndex === 0) return entry.base;
        return entry.alternatives[variantIndex - 1] || null;
    }

    /**
     * Get the number of variants for a character (1 base + N alternatives).
     */
    getVariantCount(char) {
        const entry = this.glyphs.get(char);
        if (!entry) return 0;
        return 1 + entry.alternatives.length;
    }

    /**
     * Check if a character has been defined.
     */
    hasGlyph(char) {
        return this.glyphs.has(char);
    }

    /**
     * Remove a character entirely.
     */
    removeGlyph(char) {
        return this.glyphs.delete(char);
    }

    /**
     * Get all defined characters.
     */
    getChars() {
        return Array.from(this.glyphs.keys());
    }

    /**
     * Get character count.
     */
    get size() {
        return this.glyphs.size;
    }

    /**
     * Check if a glyph is empty (all cells are null module).
     */
    isGlyphEmpty(cells) {
        return cells.every(cell => cell.module === null);
    }

    /**
     * Duplicate a glyph's base as a new alternative.
     */
    duplicateAsAlternative(char) {
        const entry = this.glyphs.get(char);
        if (!entry) return -1;
        const copy = entry.base.map(cell => ({ ...cell }));
        entry.alternatives.push(copy);
        return entry.alternatives.length - 1;
    }

    /**
     * Set a single cell in a glyph.
     */
    setCell(char, row, col, moduleId, rotation, variantIndex = 0) {
        const cells = this.getVariant(char, variantIndex);
        if (!cells) return false;
        const index = row * this.gridCols + col;
        if (index < 0 || index >= cells.length) return false;
        cells[index] = { module: moduleId, rotation };
        return true;
    }

    /**
     * Get a single cell from a glyph.
     */
    getCell(char, row, col, variantIndex = 0) {
        const cells = this.getVariant(char, variantIndex);
        if (!cells) return null;
        const index = row * this.gridCols + col;
        return cells[index] || null;
    }

    /**
     * Resize all glyphs to a new grid size, preserving content where possible.
     */
    resizeGlyphs(newCols, newRows) {
        const oldCols = this.gridCols;
        const oldRows = this.gridRows;

        for (const [char, entry] of this.glyphs) {
            entry.base = this._resizeCells(entry.base, oldCols, oldRows, newCols, newRows);
            entry.alternatives = entry.alternatives.map(
                alt => this._resizeCells(alt, oldCols, oldRows, newCols, newRows)
            );
        }

        this.gridCols = newCols;
        this.gridRows = newRows;
    }

    _resizeCells(cells, oldCols, oldRows, newCols, newRows) {
        const newCells = Array.from(
            { length: newCols * newRows },
            () => ({ module: null, rotation: 0 })
        );

        const minCols = Math.min(oldCols, newCols);
        const minRows = Math.min(oldRows, newRows);

        for (let r = 0; r < minRows; r++) {
            for (let c = 0; c < minCols; c++) {
                const oldIndex = r * oldCols + c;
                const newIndex = r * newCols + c;
                newCells[newIndex] = { ...cells[oldIndex] };
            }
        }

        return newCells;
    }

    /**
     * Serialize to plain object for JSON export.
     */
    serialize() {
        const result = {};
        for (const [char, entry] of this.glyphs) {
            result[char] = {
                base: entry.base.map(c => c.module ? { module: c.module, rotation: c.rotation } : { module: null }),
                alternatives: entry.alternatives.map(alt =>
                    alt.map(c => c.module ? { module: c.module, rotation: c.rotation } : { module: null })
                )
            };
        }
        return result;
    }

    /**
     * Load from serialized data.
     */
    deserialize(data, gridCols, gridRows) {
        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.glyphs.clear();

        for (const [char, entry] of Object.entries(data)) {
            this.glyphs.set(char, {
                base: entry.base.map(c => ({
                    module: c.module || null,
                    rotation: c.rotation || 0
                })),
                alternatives: (entry.alternatives || []).map(alt =>
                    alt.map(c => ({
                        module: c.module || null,
                        rotation: c.rotation || 0
                    }))
                )
            });
        }
    }

    /**
     * Clear all glyphs.
     */
    clear() {
        this.glyphs.clear();
    }
}
