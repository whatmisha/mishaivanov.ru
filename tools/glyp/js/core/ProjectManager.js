/**
 * ProjectManager — handles loading, saving, and managing font project files.
 * Projects are serialized as JSON and can be saved to file or localStorage.
 */

import { ModuleRegistry } from './ModuleRegistry.js';
import { GlyphStore } from './GlyphStore.js';

const PROJECT_VERSION = 1;
const STORAGE_KEY = 'glyp_currentProject';
const AUTOSAVE_KEY = 'glyp_autosave';

export class ProjectManager {
    constructor() {
        this.moduleRegistry = new ModuleRegistry();
        this.glyphStore = new GlyphStore();
        this.projectName = 'Untitled';
        this.gridCols = 5;
        this.gridRows = 5;
        this.settings = ProjectManager.defaultSettings();
        this._dirty = false;
    }

    static defaultSettings() {
        return {
            stemMultiplier: 0.15,
            strokesNum: 1,
            strokeGapRatio: 1.0,
            roundedCaps: false,
            closeEnds: false,
            dashEnabled: false,
            dashLength: 0.10,
            gapLength: 0.30,
            dashChess: false,
            wobblyEnabled: false,
            wobblyAmount: 0.5,
            wobblyFrequency: 0.5,
            letterSpacing: 0.2,
            lineHeight: 1.5,
            textAlign: 'left',
            colorMode: 'solid',
            color: '#ffffff',
            bgColor: '#1a1a1a'
        };
    }

    /**
     * Create a new empty project.
     */
    newProject(name = 'Untitled', cols = 5, rows = 5) {
        this.projectName = name;
        this.gridCols = cols;
        this.gridRows = rows;
        this.moduleRegistry.clear();
        this.glyphStore = new GlyphStore(cols, rows);
        this.settings = ProjectManager.defaultSettings();
        this._dirty = false;
    }

    /**
     * Set grid dimensions and resize all existing glyphs.
     */
    setGridSize(cols, rows) {
        this.gridCols = cols;
        this.gridRows = rows;
        this.glyphStore.resizeGlyphs(cols, rows);
        this._dirty = true;
    }

    /**
     * Serialize the entire project to a JSON-compatible object.
     */
    serialize() {
        return {
            version: PROJECT_VERSION,
            name: this.projectName,
            grid: { cols: this.gridCols, rows: this.gridRows },
            modules: this.moduleRegistry.serialize(),
            glyphs: this.glyphStore.serialize(),
            settings: { ...this.settings }
        };
    }

    /**
     * Load a project from a deserialized JSON object.
     */
    deserialize(data) {
        if (!data || !data.version) {
            throw new Error('Invalid project format');
        }

        this.projectName = data.name || 'Untitled';
        this.gridCols = data.grid?.cols || 5;
        this.gridRows = data.grid?.rows || 5;

        this.moduleRegistry.deserialize(data.modules || []);
        this.glyphStore.deserialize(data.glyphs || {}, this.gridCols, this.gridRows);
        this.settings = { ...ProjectManager.defaultSettings(), ...data.settings };
        this._dirty = false;
    }

    /**
     * Export project as a JSON string.
     */
    exportJSON() {
        return JSON.stringify(this.serialize(), null, 2);
    }

    /**
     * Import project from a JSON string.
     */
    importJSON(jsonString) {
        const data = JSON.parse(jsonString);
        this.deserialize(data);
    }

    /**
     * Save project to a downloadable file.
     */
    saveToFile(filename) {
        const json = this.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `${this.projectName.replace(/\s+/g, '_')}.glyp.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this._dirty = false;
    }

    /**
     * Load project from a File object (from file input).
     * @returns {Promise<void>}
     */
    async loadFromFile(file) {
        const text = await file.text();
        this.importJSON(text);
    }

    /**
     * Save current project to localStorage (autosave).
     */
    autosave() {
        try {
            const data = this.serialize();
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[ProjectManager] Autosave failed:', e.message);
        }
    }

    /**
     * Load project from localStorage autosave.
     * @returns {boolean} True if autosave was found and loaded
     */
    loadAutosave() {
        try {
            const saved = localStorage.getItem(AUTOSAVE_KEY);
            if (!saved) return false;
            const data = JSON.parse(saved);
            this.deserialize(data);
            return true;
        } catch (e) {
            console.warn('[ProjectManager] Failed to load autosave:', e.message);
            return false;
        }
    }

    /**
     * Clear autosave data.
     */
    clearAutosave() {
        localStorage.removeItem(AUTOSAVE_KEY);
    }

    /**
     * Check if project has unsaved changes.
     */
    get isDirty() {
        return this._dirty;
    }

    /**
     * Mark project as modified.
     */
    markDirty() {
        this._dirty = true;
    }

    /**
     * Mark project as saved (clean).
     */
    markClean() {
        this._dirty = false;
    }
}
