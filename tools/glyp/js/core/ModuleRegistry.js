/**
 * ModuleRegistry — stores and manages the collection of modules for a font project.
 * Each module defines skeleton paths and connection points.
 */

export class ModuleRegistry {
    constructor() {
        this.modules = new Map();
        this._nextId = 1;
    }

    /**
     * Add a module to the registry.
     * @param {object} moduleDef - Module definition
     * @param {string} moduleDef.name - Display name
     * @param {string} [moduleDef.id] - Unique ID (auto-generated if omitted)
     * @param {string} [moduleDef.shortcut] - Keyboard shortcut character
     * @param {Array<{d: string, commands: Array}>} moduleDef.paths - Skeleton paths (normalized [0,1]x[0,1])
     * @param {object} moduleDef.connections - Edge connections {top, right, bottom, left}
     * @param {string} [moduleDef.svgSource] - Original SVG source (for re-editing)
     * @returns {string} Module ID
     */
    add(moduleDef) {
        const id = moduleDef.id || `module_${this._nextId++}`;
        const module = {
            id,
            name: moduleDef.name || 'Untitled',
            shortcut: moduleDef.shortcut || null,
            paths: moduleDef.paths || [],
            connections: {
                top: false,
                right: false,
                bottom: false,
                left: false,
                ...moduleDef.connections
            },
            svgSource: moduleDef.svgSource || null
        };

        this.modules.set(id, module);
        return id;
    }

    /**
     * Update an existing module.
     */
    update(id, updates) {
        const existing = this.modules.get(id);
        if (!existing) throw new Error(`Module "${id}" not found`);

        if (updates.name !== undefined) existing.name = updates.name;
        if (updates.shortcut !== undefined) existing.shortcut = updates.shortcut;
        if (updates.paths !== undefined) existing.paths = updates.paths;
        if (updates.connections !== undefined) {
            existing.connections = { ...existing.connections, ...updates.connections };
        }
        if (updates.svgSource !== undefined) existing.svgSource = updates.svgSource;
    }

    /**
     * Remove a module by ID.
     */
    remove(id) {
        return this.modules.delete(id);
    }

    /**
     * Get a module by ID.
     */
    get(id) {
        return this.modules.get(id) || null;
    }

    /**
     * Get all modules as an array.
     */
    getAll() {
        return Array.from(this.modules.values());
    }

    /**
     * Find module by shortcut key.
     */
    getByShortcut(key) {
        for (const mod of this.modules.values()) {
            if (mod.shortcut && mod.shortcut.toLowerCase() === key.toLowerCase()) {
                return mod;
            }
        }
        return null;
    }

    /**
     * Get connections for a module at a given rotation.
     * Rotation: 0=0°, 1=90°CW, 2=180°, 3=270°CW
     */
    getRotatedConnections(moduleId, rotation) {
        const mod = this.modules.get(moduleId);
        if (!mod) return { top: false, right: false, bottom: false, left: false };

        const { top, right, bottom, left } = mod.connections;
        const sides = [top, right, bottom, left];
        const offset = ((rotation % 4) + 4) % 4;

        return {
            top: sides[(0 - offset + 4) % 4],
            right: sides[(1 - offset + 4) % 4],
            bottom: sides[(2 - offset + 4) % 4],
            left: sides[(3 - offset + 4) % 4]
        };
    }

    /**
     * Get module count.
     */
    get size() {
        return this.modules.size;
    }

    /**
     * Serialize registry to a plain array for JSON export.
     */
    serialize() {
        return this.getAll().map(mod => ({
            id: mod.id,
            name: mod.name,
            shortcut: mod.shortcut,
            paths: mod.paths.map(p => ({
                d: p.d,
                commands: p.commands
            })),
            connections: { ...mod.connections },
            svgSource: mod.svgSource
        }));
    }

    /**
     * Load modules from a serialized array.
     */
    deserialize(modulesArray) {
        this.modules.clear();
        this._nextId = 1;

        for (const mod of modulesArray) {
            this.modules.set(mod.id, {
                id: mod.id,
                name: mod.name,
                shortcut: mod.shortcut || null,
                paths: mod.paths || [],
                connections: {
                    top: false, right: false, bottom: false, left: false,
                    ...mod.connections
                },
                svgSource: mod.svgSource || null
            });

            const numericPart = parseInt(mod.id.replace('module_', ''));
            if (!isNaN(numericPart) && numericPart >= this._nextId) {
                this._nextId = numericPart + 1;
            }
        }
    }

    /**
     * Clear all modules.
     */
    clear() {
        this.modules.clear();
        this._nextId = 1;
    }
}
