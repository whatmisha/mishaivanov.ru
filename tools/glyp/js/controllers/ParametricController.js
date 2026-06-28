/**
 * ParametricController — manages the parametric settings UI.
 * Bridges between UI sliders/toggles and the renderer settings.
 */

export class ParametricController {
    constructor(renderer, settings) {
        this.renderer = renderer;
        this.settings = settings;
        this.onSettingsChange = null;
    }

    /**
     * Update a single setting and propagate to renderer.
     */
    set(key, value) {
        this.settings[key] = value;
        this.renderer.applySettings(this.settings);
        if (this.onSettingsChange) {
            this.onSettingsChange(key, value);
        }
    }

    /**
     * Get current setting value.
     */
    get(key) {
        return this.settings[key];
    }

    /**
     * Reset all settings to defaults.
     */
    resetToDefaults(defaults) {
        Object.assign(this.settings, defaults);
        this.renderer.applySettings(this.settings);
        if (this.onSettingsChange) {
            this.onSettingsChange('*', null);
        }
    }
}
