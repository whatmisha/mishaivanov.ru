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
        const names = Object.keys(this.presets);
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
}

