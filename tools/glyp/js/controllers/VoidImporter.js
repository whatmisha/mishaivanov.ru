/**
 * VoidImporter — imports VOID typeface modules and alphabet into Glyp project format.
 * Converts VOID's hardcoded module geometries (S, R, B, C, J, L, E) to SVG skeleton paths
 * and imports glyph data from VoidAlphabet.js format.
 */

import { ModuleRegistry } from '../core/ModuleRegistry.js';
import { GlyphStore } from '../core/GlyphStore.js';

export class VoidImporter {
    /**
     * Create VOID's 7 standard modules as normalized path definitions.
     * Each module's skeleton is expressed as normalized [0,1]x[0,1] path commands.
     * @returns {Array<object>} Module definitions ready for ModuleRegistry
     */
    static createVoidModules() {
        return [
            {
                id: 'void_S',
                name: 'Straight',
                shortcut: 'S',
                paths: [{
                    d: 'M 0 0 L 0 1',
                    commands: [
                        { type: 'M', args: [0, 0] },
                        { type: 'L', args: [0, 1] }
                    ]
                }],
                connections: { top: true, right: false, bottom: true, left: false }
            },
            {
                id: 'void_C',
                name: 'Central',
                shortcut: 'C',
                paths: [{
                    d: 'M 0.5 0 L 0.5 1',
                    commands: [
                        { type: 'M', args: [0.5, 0] },
                        { type: 'L', args: [0.5, 1] }
                    ]
                }],
                connections: { top: true, right: false, bottom: true, left: false }
            },
            {
                id: 'void_J',
                name: 'Joint',
                shortcut: 'J',
                paths: [
                    {
                        d: 'M 0 0 L 0 1',
                        commands: [
                            { type: 'M', args: [0, 0] },
                            { type: 'L', args: [0, 1] }
                        ]
                    },
                    {
                        d: 'M 0 0.5 L 1 0.5',
                        commands: [
                            { type: 'M', args: [0, 0.5] },
                            { type: 'L', args: [1, 0.5] }
                        ]
                    }
                ],
                connections: { top: true, right: true, bottom: true, left: false }
            },
            {
                id: 'void_L',
                name: 'Link',
                shortcut: 'L',
                paths: [{
                    d: 'M 0 0 L 0 1 L 1 1',
                    commands: [
                        { type: 'M', args: [0, 0] },
                        { type: 'L', args: [0, 1] },
                        { type: 'L', args: [1, 1] }
                    ]
                }],
                connections: { top: true, right: false, bottom: false, left: false }
            },
            {
                id: 'void_R',
                name: 'Round',
                shortcut: 'R',
                paths: [{
                    d: 'M 0 0 C 0 0.55 0.45 1 1 1',
                    commands: [
                        { type: 'M', args: [0, 0] },
                        { type: 'C', args: [0, 0.55, 0.45, 1, 1, 1] }
                    ]
                }],
                connections: { top: true, right: false, bottom: false, left: false }
            },
            {
                id: 'void_B',
                name: 'Bend',
                shortcut: 'B',
                paths: [{
                    d: 'M 0.5 0 C 0.5 0.28 0.72 0.5 1 0.5',
                    commands: [
                        { type: 'M', args: [0.5, 0] },
                        { type: 'C', args: [0.5, 0.28, 0.72, 0.5, 1, 0.5] }
                    ]
                }],
                connections: { top: true, right: false, bottom: false, left: false }
            }
        ];
    }

    /**
     * Correct the connection points for VOID modules.
     * In VOID, rotation changes which sides have connections.
     * The base (rotation=0) connections are defined above;
     * R and B connect top→right (via curve), L connects top→bottom→right (L-shape).
     */
    static getVoidModuleConnections() {
        return {
            'S': { top: true, right: false, bottom: true, left: false },
            'C': { top: true, right: false, bottom: true, left: false },
            'J': { top: true, right: true, bottom: true, left: false },
            'L': { top: true, right: true, bottom: false, left: false },
            'R': { top: true, right: true, bottom: false, left: false },
            'B': { top: true, right: true, bottom: false, left: false }
        };
    }

    /**
     * Import VOID alphabet string data into a GlyphStore.
     * @param {object} alphabetData - Object like { "A": "E0R1S1...", ... }
     * @param {GlyphStore} glyphStore - Target store
     * @param {number} cols - Grid columns (5 for VOID)
     * @param {number} rows - Grid rows (5 for VOID)
     */
    static importAlphabet(alphabetData, glyphStore, cols = 5, rows = 5) {
        const moduleMap = {
            'S': 'void_S',
            'C': 'void_C',
            'J': 'void_J',
            'L': 'void_L',
            'R': 'void_R',
            'B': 'void_B',
            'E': null
        };

        for (const [char, glyphString] of Object.entries(alphabetData)) {
            const cells = VoidImporter.parseGlyphString(glyphString, moduleMap, cols, rows);
            if (cells) {
                glyphStore.setGlyph(char, cells);
            }
        }
    }

    /**
     * Import VOID alternatives.
     * @param {object} alternativesData - { "A": ["E0R1...", "R1S1..."], ... }
     * @param {GlyphStore} glyphStore
     */
    static importAlternatives(alternativesData, glyphStore, cols = 5, rows = 5) {
        const moduleMap = {
            'S': 'void_S',
            'C': 'void_C',
            'J': 'void_J',
            'L': 'void_L',
            'R': 'void_R',
            'B': 'void_B',
            'E': null
        };

        for (const [char, alts] of Object.entries(alternativesData)) {
            if (!Array.isArray(alts)) continue;
            for (const altString of alts) {
                const cells = VoidImporter.parseGlyphString(altString, moduleMap, cols, rows);
                if (cells) {
                    glyphStore.addAlternative(char, cells);
                }
            }
        }
    }

    /**
     * Parse a VOID glyph string (e.g., "E0R1S1R2E0...") into a cells array.
     * Each module is 2 characters: type + rotation.
     */
    static parseGlyphString(glyphString, moduleMap, cols, rows) {
        const totalCells = cols * rows;
        const cells = [];

        for (let i = 0; i < glyphString.length && cells.length < totalCells; i += 2) {
            const type = glyphString[i];
            const rotation = parseInt(glyphString[i + 1]) || 0;
            const moduleId = moduleMap[type] ?? null;

            cells.push({
                module: moduleId,
                rotation: rotation
            });
        }

        while (cells.length < totalCells) {
            cells.push({ module: null, rotation: 0 });
        }

        return cells;
    }

    /**
     * Full import: create VOID modules in registry + import alphabet.
     * @param {ModuleRegistry} registry
     * @param {GlyphStore} glyphStore
     * @param {object} alphabetData - VOID_ALPHABET object
     * @param {object} [alternativesData] - VOID_ALPHABET_ALTERNATIVES object
     */
    static fullImport(registry, glyphStore, alphabetData, alternativesData = null) {
        const modules = VoidImporter.createVoidModules();
        const connections = VoidImporter.getVoidModuleConnections();

        for (const mod of modules) {
            const shortcut = mod.shortcut;
            if (connections[shortcut]) {
                mod.connections = connections[shortcut];
            }
            registry.add(mod);
        }

        glyphStore.setGridSize(5, 5);
        VoidImporter.importAlphabet(alphabetData, glyphStore, 5, 5);

        if (alternativesData) {
            VoidImporter.importAlternatives(alternativesData, glyphStore, 5, 5);
        }
    }

    /**
     * Parse a VoidAlphabet.js file content and extract alphabet data.
     * @param {string} fileContent - Raw JS file content
     * @returns {{ alphabet: object, alternatives: object }}
     */
    static parseVoidAlphabetFile(fileContent) {
        const alphabet = {};
        const alternatives = {};

        const alphabetMatch = fileContent.match(/export\s+const\s+VOID_ALPHABET\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
        if (alphabetMatch) {
            const entries = alphabetMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g);
            for (const match of entries) {
                alphabet[match[1]] = match[2];
            }
        }

        const altMatch = fileContent.match(/export\s+const\s+VOID_ALPHABET_ALTERNATIVES\s*=\s*\{([\s\S]*?)\n\};/);
        if (altMatch) {
            const charBlocks = altMatch[1].matchAll(/"([^"]+)":\s*\[([\s\S]*?)\]/g);
            for (const block of charBlocks) {
                const char = block[1];
                const altStrings = [...block[2].matchAll(/"([^"]+)"/g)].map(m => m[1]);
                if (altStrings.length > 0) {
                    alternatives[char] = altStrings;
                }
            }
        }

        return { alphabet, alternatives };
    }
}
