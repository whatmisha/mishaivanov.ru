/**
 * PresetManager - preset parameter management
 * Saves and loads parameter sets to/from localStorage
 */

import { EXTRA_PRESET_SNAPSHOT_KEYS } from '../controllers/PresetsController.js';

export class PresetManager {
    constructor(storageKey = 'voidTypefacePresets') {
        this.storageKey = storageKey;
        this.presets = this.loadPresets();
    }

    /**
     * Load all presets from localStorage
     */
    loadPresets() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error loading presets:', e);
            return {};
        }
    }

    /**
     * Save all presets to localStorage
     */
    savePresets() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
            return true;
        } catch (e) {
            console.error('Error saving presets:', e);
            return false;
        }
    }

    /**
     * Save current parameters as NEW preset
     * @param {string} name - preset name
     * @param {object} params - parameters object
     */
    savePreset(name, params) {
        if (!name || name.trim() === '') {
            return { success: false, error: 'Preset name cannot be empty' };
        }

        // Remove extra spaces from name
        name = name.trim();

        if (name.startsWith('__')) {
            return { success: false, error: 'Invalid preset name' };
        }

        // Check if preset with this name already exists
        if (this.presets[name]) {
            return { success: false, error: 'Preset with this name already exists' };
        }

        // Save preset
        this.presets[name] = {
            ...params,
            createdAt: new Date().toISOString()
        };

        if (this.savePresets()) {
            return { success: true };
        } else {
            return { success: false, error: 'Save error' };
        }
    }

    /**
     * Update existing preset with new parameters
     * @param {string} name - preset name
     * @param {object} params - parameters object
     */
    updatePreset(name, params) {
        if (!name || name.trim() === '') {
            return { success: false, error: 'Preset name cannot be empty' };
        }

        name = name.trim();

        if (name.startsWith('__')) {
            return { success: false, error: 'Invalid preset name' };
        }

        // Check if preset exists
        if (!this.presets[name]) {
            return { success: false, error: 'Preset not found' };
        }

        // Update preset, keeping original createdAt
        const originalCreatedAt = this.presets[name].createdAt;
        this.presets[name] = {
            ...params,
            createdAt: originalCreatedAt,
            updatedAt: new Date().toISOString()
        };

        if (this.savePresets()) {
            return { success: true };
        } else {
            return { success: false, error: 'Save error' };
        }
    }

    /**
     * Rename preset
     * @param {string} oldName - current preset name
     * @param {string} newName - new preset name
     */
    renamePreset(oldName, newName) {
        if (!oldName || !newName) {
            return { success: false, error: 'Names cannot be empty' };
        }

        oldName = oldName.trim();
        newName = newName.trim();

        if (newName.startsWith('__')) {
            return { success: false, error: 'Invalid preset name' };
        }

        if (oldName === newName) {
            return { success: true }; // No change needed
        }

        if (!this.presets[oldName]) {
            return { success: false, error: 'Preset not found' };
        }

        if (this.presets[newName]) {
            return { success: false, error: 'Preset with this name already exists' };
        }

        // Copy preset with new name
        this.presets[newName] = { ...this.presets[oldName] };
        delete this.presets[oldName];

        if (this.savePresets()) {
            return { success: true };
        } else {
            return { success: false, error: 'Save error' };
        }
    }

    /**
     * Load preset
     * @param {string} name - preset name
     * @returns {object|null} - preset parameters or null
     */
    loadPreset(name) {
        return this.presets[name] || null;
    }

    /**
     * Delete preset
     * @param {string} name - preset name
     */
    deletePreset(name) {
        if (this.presets[name]) {
            delete this.presets[name];
            return this.savePresets();
        }
        return false;
    }

    /**
     * Get list of all presets
     * @returns {string[]} - array of preset names
     */
    getPresetNames() {
        const names = Object.keys(this.presets).filter((n) => !n.startsWith('__'));
        const sorted = names.sort();
        
        // Always put "New" first if it exists
        const newIndex = sorted.indexOf('New');
        if (newIndex > 0) {
            sorted.splice(newIndex, 1);
            sorted.unshift('New');
        }
        
        return sorted;
    }

    /**
     * Check if preset exists
     * @param {string} name - preset name
     * @returns {boolean}
     */
    hasPreset(name) {
        return name in this.presets;
    }

    /**
     * Bootstrap built-in (seed) presets shipped in /presets/*.json.
     *
     * Each browser imports a seed file ONCE: a list of seeded filenames is kept
     * under `${storageKey}__seeded`. Subsequent loads skip already-seeded entries —
     * so if a user deletes a built-in preset, it stays gone, and if they have a
     * preset with the same name we don't overwrite it.
     *
     * @param {object|null} defaults — pristine `settings.values` snapshot used
     *   as the base; seed JSON `settings` are spread on top to form the full
     *   preset blob (this matches `collectPresetData()` shape).
     * @param {string} basePath — prefix for fetch URLs (default: 'presets/').
     */
    async loadSeedPresets(defaults = null, basePath = 'presets/') {
        const seededKey = `${this.storageKey}__seeded`;

        let seeded = [];
        try {
            const raw = localStorage.getItem(seededKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) seeded = parsed;
            }
        } catch (_) { /* ignore corrupt marker */ }

        let manifest;
        try {
            const res = await fetch(`${basePath}index.json`, { cache: 'no-cache' });
            if (!res.ok) return;
            manifest = await res.json();
        } catch (_) {
            // Site served from file:// or no manifest — silently skip.
            return;
        }

        const files = Array.isArray(manifest?.presets) ? manifest.presets : [];
        if (files.length === 0) return;

        const base = defaults && typeof defaults === 'object' ? defaults : {};
        let mutated = false;

        const mergeSnapshotExtras = (target, seed) => {
            for (const key of EXTRA_PRESET_SNAPSHOT_KEYS) {
                if (seed[key] !== undefined && seed[key] !== null) {
                    try {
                        target[key] = JSON.parse(JSON.stringify(seed[key]));
                    } catch (_) { /* skip corrupt */ }
                }
            }
        };

        // One-shot migration: top up already-seeded presets that were imported
        // before gradientPairs / a baked colorPalette became part of the seed
        // payload. Without this, user browsers keep showing the legacy
        // randomGradient look for Bender / Bushy / Ellipsis (and skip them
        // here because their filenames are already in `seeded`).
        const seedPaletteMigrationKey = `${this.storageKey}__seedPalettesV2`;
        let alreadyMigrated = false;
        try {
            alreadyMigrated = localStorage.getItem(seedPaletteMigrationKey) === 'true';
        } catch (_) { /* private mode — try migration anyway */ }

        if (!alreadyMigrated) {
            for (const entry of files) {
                const file = typeof entry === 'string' ? entry : entry?.file;
                if (!file || typeof file !== 'string') continue;
                if (!seeded.includes(file)) continue;
                try {
                    const r = await fetch(`${basePath}${file}`, { cache: 'no-cache' });
                    if (!r.ok) continue;
                    const seed = await r.json();
                    const name = (seed?.name || '').trim();
                    if (!name) continue;
                    const target = this.presets[name];
                    if (!target) continue;
                    const seedHasPairs =
                        Array.isArray(seed.gradientPairs) && seed.gradientPairs.length > 0;
                    const seedHasPalette =
                        Array.isArray(seed.colorPalette) && seed.colorPalette.length > 0;
                    const needsPairs = !Array.isArray(target.gradientPairs) || target.gradientPairs.length === 0;
                    const needsPalette = !Array.isArray(target.colorPalette) || target.colorPalette.length === 0;
                    if ((seedHasPairs && needsPairs) || (seedHasPalette && needsPalette)) {
                        mergeSnapshotExtras(target, seed);
                        mutated = true;
                    }
                } catch (_) { /* ignore individual failures */ }
            }
            try { localStorage.setItem(seedPaletteMigrationKey, 'true'); } catch (_) {}
        }

        for (const entry of files) {
            const file = typeof entry === 'string' ? entry : entry?.file;
            if (!file || typeof file !== 'string') continue;
            if (seeded.includes(file)) continue;

            try {
                const r = await fetch(`${basePath}${file}`, { cache: 'no-cache' });
                if (!r.ok) continue;
                const seed = await r.json();
                const name = (seed?.name || '').trim();
                if (!name) continue;

                // Mark as seeded regardless of whether we wrote it — that way a
                // user-owned preset with the same name is preserved AND we don't
                // keep retrying the same file.
                if (!this.presets[name]) {
                    const overrides = (seed.settings && typeof seed.settings === 'object')
                        ? seed.settings
                        : {};
                    const preset = {
                        ...base,
                        ...overrides,
                        createdAt: new Date().toISOString(),
                        /** Shipped preset JSON manifest flag: enables Random onboarding pulse UX only for seed imports. Ignored when user duplicates via Save-as-new. */
                        seeded: true
                    };
                    mergeSnapshotExtras(preset, seed);
                    this.presets[name] = preset;
                }
                seeded.push(file);
                mutated = true;
            } catch (e) {
                console.warn(`[PresetManager] failed to seed preset "${file}":`, e);
            }
        }

        if (mutated) {
            this.savePresets();
            try {
                localStorage.setItem(seededKey, JSON.stringify(seeded));
            } catch (_) { /* quota — ignore */ }
        }
    }
}

