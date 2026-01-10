/**
 * PresetManager - управление preset'ами параметров
 * Сохраняет и загружает наборы параметров в localStorage
 */

export class PresetManager {
    constructor(storageKey = 'voidTypefacePresets') {
        this.storageKey = storageKey;
        this.presets = this.loadPresets();
    }

    /**
     * Загрузить все preset'ы из localStorage
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
     * Сохранить все preset'ы в localStorage
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
     * Сохранить текущие параметры как preset
     * @param {string} name - имя preset'а
     * @param {object} params - объект с параметрами
     */
    savePreset(name, params) {
        if (!name || name.trim() === '') {
            return { success: false, error: 'Имя preset\'а не может быть пустым' };
        }

        // Очистить имя от лишних пробелов
        name = name.trim();

        // Проверить, не существует ли уже preset с таким именем
        if (this.presets[name]) {
            return { success: false, error: 'Preset с таким именем уже существует' };
        }

        // Сохранить preset
        this.presets[name] = {
            ...params,
            createdAt: new Date().toISOString()
        };

        if (this.savePresets()) {
            return { success: true };
        } else {
            return { success: false, error: 'Ошибка сохранения' };
        }
    }

    /**
     * Загрузить preset
     * @param {string} name - имя preset'а
     * @returns {object|null} - параметры preset'а или null
     */
    loadPreset(name) {
        return this.presets[name] || null;
    }

    /**
     * Удалить preset
     * @param {string} name - имя preset'а
     */
    deletePreset(name) {
        if (this.presets[name]) {
            delete this.presets[name];
            return this.savePresets();
        }
        return false;
    }

    /**
     * Получить список всех preset'ов
     * @returns {string[]} - массив имен preset'ов
     */
    getPresetNames() {
        return Object.keys(this.presets).sort();
    }

    /**
     * Проверить, существует ли preset
     * @param {string} name - имя preset'а
     * @returns {boolean}
     */
    hasPreset(name) {
        return name in this.presets;
    }
}

