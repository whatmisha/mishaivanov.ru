/**
 * PresetManager - preset parameter management
 * Saves and loads parameter sets to/from localStorage
 */

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
     * Save current parameters as preset
     * @param {string} name - preset name
     * @param {object} params - parameters object
     */
    savePreset(name, params) {
        if (!name || name.trim() === '') {
            return { success: false, error: 'Preset name cannot be empty' };
        }

        // Remove extra spaces from name
        name = name.trim();

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
        return Object.keys(this.presets).sort();
    }

    /**
     * Check if preset exists
     * @param {string} name - preset name
     * @returns {boolean}
     */
    hasPreset(name) {
        return name in this.presets;
    }
}

