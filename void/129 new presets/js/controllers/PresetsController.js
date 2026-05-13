/**
 * PresetsController
 *
 * Owns the preset dropdown / save / delete / rename UI as well as
 * the heavy lifting of `loadPreset` (settings + cache restore +
 * per-preset history switching). State that other subsystems also
 * touch (`currentPresetName`, `hasUnsavedChanges`, `historyManager`,
 * `presetHistories`, `isLoadingPreset`, `pendingCacheRestore`,
 * `colorPalette`, `moduleColorCache` …) intentionally stays on the
 * main `app` instance — this controller only encapsulates the
 * preset workflow logic.
 */

import { HistoryManager } from '../history/HistoryManager.js';
import { HISTORY_MAX_SIZE } from '../config/timings.js';
import { DICE_CONFIG, EFFECT_RANDOM_CONFIG } from '../config/randomConfig.js';

export class PresetsController {
    constructor(app) {
        this.app = app;
    }

    initPresets() {
        const app = this.app;
        const presetDropdown = document.getElementById('presetDropdown');
        const presetDropdownToggle = document.getElementById('presetDropdownToggle');
        const presetDropdownMenu = document.getElementById('presetDropdownMenu');
        const presetDropdownText = presetDropdownToggle.querySelector('.preset-dropdown-text');
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');

        const defaultPreset = app.presetManager.loadPreset('New');
        if (!defaultPreset) {
            const presetData = this.collectPresetData({ propagateSeeded: false });
            app.presetManager.savePreset('New', presetData);
        } else {
            if (defaultPreset.text === 'Void\nTypeface\ncoded') {
                defaultPreset.text = 'Void\nTypeface\nCode';
                app.presetManager.presets['New'] = defaultPreset;
                app.presetManager.savePresets();
            }

            const needsUpdate =
                defaultPreset.strokesNum !== 1 ||
                defaultPreset.randomStemMin !== 0.5 ||
                defaultPreset.randomStemMax !== 1.0 ||
                defaultPreset.randomStrokesMin !== 1 ||
                defaultPreset.randomStrokesMax !== 4 ||
                defaultPreset.randomContrastMin !== 0.1 ||
                defaultPreset.randomContrastMax !== 2.0 ||
                defaultPreset.randomDashLengthMin !== 1.0 ||
                defaultPreset.randomDashLengthMax !== 1.5 ||
                defaultPreset.randomGapLengthMin !== 1.0 ||
                defaultPreset.randomGapLengthMax !== 1.5 ||
                defaultPreset.useAlternativesInRandom !== false ||
                defaultPreset.lineHeightMultiplier !== 1;

            // Detect drift either via active random palette state OR via
            // a stale schema (preset saved before per-swatch palette dice
            // existed) — in both cases we want to rewrite a clean default.
            const paletteSchemaMissing =
                defaultPreset.paletteDiceLetter === undefined ||
                defaultPreset.paletteDiceBg === undefined ||
                defaultPreset.paletteDiceGrid === undefined ||
                defaultPreset.paletteDiceGradientStart === undefined ||
                defaultPreset.paletteDiceGradientEnd === undefined;
            const paletteDrift =
                paletteSchemaMissing ||
                defaultPreset.randomizePaletteColors === true ||
                defaultPreset.colorMode === 'randomChaos' ||
                defaultPreset.colorMode === 'randomGradient' ||
                defaultPreset.randomizeColor === true ||
                defaultPreset.paletteDiceLetter === true ||
                defaultPreset.paletteDiceBg === true ||
                defaultPreset.paletteDiceGrid === true ||
                defaultPreset.paletteDiceGradientStart === true ||
                defaultPreset.paletteDiceGradientEnd === true;

            if (needsUpdate || paletteDrift) {
                if (needsUpdate) {
                    defaultPreset.strokesNum = 1;
                    defaultPreset.randomStemMin = 0.5;
                    defaultPreset.randomStemMax = 1.0;
                    defaultPreset.randomStrokesMin = 1;
                    defaultPreset.randomStrokesMax = 4;
                    defaultPreset.randomContrastMin = 0.1;
                    defaultPreset.randomContrastMax = 2.0;
                    defaultPreset.randomDashLengthMin = 1.0;
                    defaultPreset.randomDashLengthMax = 1.5;
                    defaultPreset.randomGapLengthMin = 1.0;
                    defaultPreset.randomGapLengthMax = 1.5;
                    defaultPreset.useAlternativesInRandom = false;
                    defaultPreset.lineHeightMultiplier = 1;
                }
                if (paletteDrift) {
                    defaultPreset.letterColor = '#ffffff';
                    defaultPreset.bgColor = '#000000';
                    defaultPreset.gridColor = '#333333';
                    defaultPreset.colorSource = 'solid';
                    defaultPreset.colorMode = 'manual';
                    defaultPreset.colorChaosColors = 16;
                    defaultPreset.randomizePaletteColors = false;
                    defaultPreset.randomPaletteColorsMin = 3;
                    defaultPreset.randomPaletteColorsMax = 32;
                    defaultPreset.paletteDiceLetter = false;
                    defaultPreset.paletteDiceBg = false;
                    defaultPreset.paletteDiceGrid = false;
                    defaultPreset.paletteDiceGradientStart = false;
                    defaultPreset.paletteDiceGradientEnd = false;
                    defaultPreset.colorBW = false;
                    defaultPreset.randomizeColorBW = false;
                    delete defaultPreset.randomizeColor;
                    delete defaultPreset.colorRandomMode;
                    delete defaultPreset.colorPalette;
                    delete defaultPreset.moduleColorCache;
                }
                app.presetManager.presets['New'] = defaultPreset;
                app.presetManager.savePresets();
            }
        }

        this.updatePresetList();

        // loadPreset will set currentPresetName and hasUnsavedChanges = false
        this.loadPreset('New', false);
        presetDropdownText.textContent = 'New';

        presetDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = presetDropdownToggle.getAttribute('aria-expanded') === 'true';
            presetDropdownToggle.setAttribute('aria-expanded', !isExpanded);
            presetDropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!presetDropdown.contains(e.target)) {
                presetDropdownToggle.setAttribute('aria-expanded', 'false');
                presetDropdownMenu.classList.remove('active');
            }
        });

        presetDropdownMenu.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.preset-dropdown-item-edit');
            if (editBtn) {
                e.stopPropagation();
                const presetName = editBtn.dataset.preset;
                presetDropdownToggle.setAttribute('aria-expanded', 'false');
                presetDropdownMenu.classList.remove('active');

                const renameResult = await app.modalManager.promptRename(presetName);
                if (renameResult.action === 'rename' && renameResult.newName) {
                    if (app.presetManager.hasPreset(renameResult.newName)) {
                        await app.modalManager.showError(`Preset "${renameResult.newName}" already exists.`);
                        return;
                    }
                    const result = app.presetManager.renamePreset(presetName, renameResult.newName);
                    if (result.success) {
                        if (app.currentPresetName === presetName) {
                            app.currentPresetName = renameResult.newName;
                        }
                        this.updatePresetList();
                        if (app.currentPresetName === renameResult.newName) {
                            presetDropdownText.textContent = this.getDisplayName(renameResult.newName);
                        }
                    } else {
                        await app.modalManager.showError(result.error || 'Failed to rename preset.');
                    }
                } else if (renameResult.action === 'delete') {
                    const confirmed = await app.modalManager.confirmDelete(presetName);
                    if (confirmed) {
                        if (app.presetManager.deletePreset(presetName)) {
                            app.presetHistories.delete(presetName);
                            this.updatePresetList();
                            if (app.currentPresetName === presetName) {
                                this.loadPreset('New');
                            }
                            presetDropdownText.textContent = 'New';
                            const defaultItem = Array.from(presetDropdownMenu.children).find(el => el.dataset.value === 'New');
                            if (defaultItem) {
                                presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                                defaultItem.classList.add('selected');
                            }
                        }
                    }
                }
                return;
            }

            const item = e.target.closest('.preset-dropdown-item');
            if (item) {
                const presetName = item.dataset.value;

                if (presetName === '__delete_all__') {
                    presetDropdownToggle.setAttribute('aria-expanded', 'false');
                    presetDropdownMenu.classList.remove('active');

                    const confirmed = await app.modalManager.confirmDeleteAll();
                    if (confirmed) {
                        const names = app.presetManager.getPresetNames();
                        names.forEach(name => {
                            if (name !== 'New') {
                                app.presetManager.deletePreset(name);
                                app.presetHistories.delete(name);
                            }
                        });

                        this.updatePresetList();
                        this.loadPreset('New');

                        presetDropdownText.textContent = 'New';
                        const defaultItem = Array.from(presetDropdownMenu.children).find(el => el.dataset.value === 'New');
                        if (defaultItem) {
                            presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                            defaultItem.classList.add('selected');
                        }
                    }
                    return;
                }

                // While the user is on `New` with unsaved changes, the
                // dropdown shows both `Unsaved` (current state) and `New`
                // (clean defaults). Clicking `New` here means "reset" — so
                // we must NOT bail on `presetName === currentPresetName`.
                const isOnUnsaved = app.currentPresetName === 'New' && app.hasUnsavedChanges;
                const wantsResetToNew = isOnUnsaved && presetName === 'New';

                if (presetName && (presetName !== app.currentPresetName || wantsResetToNew)) {
                    if (presetName === 'Unsaved' && isOnUnsaved) {
                        presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                        item.classList.add('selected');
                        presetDropdownToggle.setAttribute('aria-expanded', 'false');
                        presetDropdownMenu.classList.remove('active');
                        return;
                    }

                    if (app.hasUnsavedChanges) {
                        presetDropdownToggle.setAttribute('aria-expanded', 'false');
                        presetDropdownMenu.classList.remove('active');

                        const presetNameForDialog = app.currentPresetName === 'New' ? 'New' : app.currentPresetName;
                        const action = await app.modalManager.confirmUnsavedChanges(presetNameForDialog);

                        if (action === 'cancel') return;

                        if (action === 'save') {
                            if (app.currentPresetName === 'New') {
                                await this.saveCurrentPreset();
                                if (app.currentPresetName !== 'New') {
                                    this.updatePresetList();
                                    return;
                                }
                            } else {
                                const presetData = this.collectPresetData();
                                app.presetManager.updatePreset(app.currentPresetName, presetData);
                                this.updatePresetList();
                            }
                        }
                    }

                    // Reset to clean defaults: drop both the in-session cached
                    // history for `New` and the live historyManager, otherwise
                    // loadPreset stashes the dirty manager back under `New`
                    // and immediately restores it.
                    if (wantsResetToNew) {
                        app.presetHistories.delete('New');
                        app.historyManager = null;
                        app.hasUnsavedChanges = false;
                    }

                    this.loadPreset(presetName);

                    const displayName = presetName === 'New' ? 'New' : this.getDisplayName(presetName);
                    presetDropdownText.textContent = displayName;
                    presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                    item.classList.add('selected');

                    presetDropdownToggle.setAttribute('aria-expanded', 'false');
                    presetDropdownMenu.classList.remove('active');

                    if (wantsResetToNew) {
                        this.updatePresetList();
                        this.updateSaveDeleteButtons();
                    }
                }
            }
        });

        savePresetBtn.addEventListener('click', async () => {
            await this.saveCurrentPreset();
        });

        deletePresetBtn.addEventListener('click', async () => {
            if (app.currentPresetName === 'New') return;

            const confirmed = await app.modalManager.confirmDelete(app.currentPresetName);
            if (confirmed) {
                if (app.presetManager.deletePreset(app.currentPresetName)) {
                    app.presetHistories.delete(app.currentPresetName);
                    this.updatePresetList();
                    this.loadPreset('New');

                    presetDropdownText.textContent = 'New';
                    const defaultItem = Array.from(presetDropdownMenu.children).find(el => el.dataset.value === 'New');
                    if (defaultItem) {
                        presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                        defaultItem.classList.add('selected');
                    }
                }
            }
        });

        if (app.currentPresetName === 'New') {
            app.hasUnsavedChanges = false;
        }
        this.updateSaveDeleteButtons();
    }

    /** Normalize hex string for comparison (lowercase, trim). */
    normalizeColor(color) {
        if (!color) return '';
        return color.toLowerCase().trim();
    }

    /**
     * Описывает цветовые индикаторы для строки в дропдауне:
     *   { type: { kind, value }, bg: { kind, value } } | null
     * `kind`:
     *   'solid'    — value: hex
     *   'gradient' — value: { start, end }
     *   'random'   — value: null (рандомный из палитры)
     *
     * Возвращает null только если у пресета все цвета дефолтные И нет градиента / рандома —
     * тогда индикаторы скрываются.
     */
    getPresetColors(presetName) {
        const app = this.app;
        const defaultLetterColor = '#ffffff';
        const defaultBgColor = '#000000';

        const buildFrom = (data, derivedMode) => {
            const letterColor = data.letterColor || defaultLetterColor;
            const bgColor = data.bgColor || defaultBgColor;
            const colorSource = data.colorSource || 'solid';
            const mode = derivedMode || data.colorMode || 'manual';

            // BG dot — отдельный канал: bgColor либо random, если палитра рулит фоном.
            const bgRandom = !!data.paletteDiceBg && (
                mode === 'randomChaos' || mode === 'randomGradient' || data.randomizePaletteColors === true
            );
            const bgDot = bgRandom
                ? { kind: 'random', value: null }
                : { kind: 'solid', value: bgColor };

            // Type dot — зависит от colorMode.
            let typeDot;
            if (mode === 'randomChaos' || mode === 'randomGradient') {
                typeDot = { kind: 'random', value: null };
            } else if (mode === 'gradient' || colorSource === 'gradient') {
                typeDot = {
                    kind: 'gradient',
                    value: {
                        start: data.gradientStartColor || '#ff0000',
                        end: data.gradientEndColor || '#0000ff'
                    }
                };
            } else {
                typeDot = { kind: 'solid', value: letterColor };
            }

            // Скрываем индикаторы только если всё дефолтное и нет градиента/рандома.
            const isDefault =
                typeDot.kind === 'solid' &&
                bgDot.kind === 'solid' &&
                this.normalizeColor(typeDot.value) === this.normalizeColor(defaultLetterColor) &&
                this.normalizeColor(bgDot.value) === this.normalizeColor(defaultBgColor);
            if (isDefault) return null;

            return { type: typeDot, bg: bgDot };
        };

        if (presetName === 'Unsaved') {
            const v = app.settings.values;
            return buildFrom(v, app.getDerivedColorMode());
        }

        if (presetName === 'New') return null;

        const preset = app.presetManager.loadPreset(presetName);
        if (!preset) return null;
        return buildFrom(preset, preset.colorMode);
    }

    /**
     * У пресета (или текущего Unsaved-состояния) включён хотя бы один параметр рандома (◇/◆).
     * Используется для метки в дропдауне и пульсации панели Random.
     */
    presetHasRandom(presetName) {
        const app = this.app;
        if (presetName === 'New') return false;
        if (presetName === 'Unsaved') return !!app.settings.get('isRandom');
        const preset = app.presetManager.loadPreset(presetName);
        return this.presetDataHasRandom(preset);
    }

    /**
     * Создаёт цветной круглый индикатор для дропдауна.
     * spec: { kind: 'solid'|'gradient'|'random', value: string | { start, end } | null }
     */
    buildColorDot(spec) {
        const dot = document.createElement('span');
        dot.className = 'preset-dropdown-color-dot';
        if (!spec) return dot;
        if (spec.kind === 'gradient' && spec.value) {
            dot.classList.add('preset-dropdown-color-dot--gradient');
            dot.style.background = `linear-gradient(135deg, ${spec.value.start}, ${spec.value.end})`;
        } else if (spec.kind === 'random') {
            dot.classList.add('preset-dropdown-color-dot--random');
        } else {
            dot.style.background = spec.value || '#000000';
        }
        return dot;
    }

    _clearRandomAttentionTimers() {
        if (this._randomAttentionTimers) {
            for (let i = 0; i < this._randomAttentionTimers.length; i++) {
                clearTimeout(this._randomAttentionTimers[i]);
            }
        }
        this._randomAttentionTimers = [];

        const glareBtn = document.getElementById('renewRandomBtn');
        if (this._randomizeGlareEndHandler && glareBtn) {
            glareBtn.removeEventListener('animationend', this._randomizeGlareEndHandler);
        }
        this._randomizeGlareEndHandler = null;
        if (glareBtn) glareBtn.classList.remove('btn-randomize-attention-glare');
    }

    /**
     * Ненавязчивый блик по кнопке Randomize после последовательности invert.
     */
    _runRandomizeButtonGlare(btn) {
        if (!btn || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        if (this._randomizeGlareEndHandler) {
            btn.removeEventListener('animationend', this._randomizeGlareEndHandler);
            this._randomizeGlareEndHandler = null;
        }
        btn.classList.remove('btn-randomize-attention-glare');
        // Перезапуск анимации
        void btn.offsetWidth;
        btn.classList.add('btn-randomize-attention-glare');

        this._randomizeGlareEndHandler = (e) => {
            if (e.animationName !== 'btn-randomize-glare-slide') return;
            btn.classList.remove('btn-randomize-attention-glare');
            btn.removeEventListener('animationend', this._randomizeGlareEndHandler);
            this._randomizeGlareEndHandler = null;
        };
        btn.addEventListener('animationend', this._randomizeGlareEndHandler);
    }

    /**
     * Резкие инверсии цветов панели Random: два мигания, пауза, два мигания (раз-два, раз-два).
     * Переключение через класс — без интерполяции filter, в отличие от keyframes-анимации invert.
     */
    pulseRandomAttention() {
        const panel = document.getElementById('randomPanel');
        const randomizeBtn = document.getElementById('renewRandomBtn');
        if (!panel) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        this._clearRandomAttentionTimers();

        panel.classList.remove('preset-random-attention-invert');

        const startDelayMs = 520;
        const flashMs = 85;
        const betweenPairsMs = 380;
        const steps = [
            { invert: true, ms: flashMs },
            { invert: false, ms: flashMs },
            { invert: true, ms: flashMs },
            { invert: false, ms: flashMs },
            { invert: false, ms: betweenPairsMs },
            { invert: true, ms: flashMs },
            { invert: false, ms: flashMs },
            { invert: true, ms: flashMs },
            { invert: false, ms: flashMs }
        ];

        let t = startDelayMs;
        for (let i = 0; i < steps.length; i++) {
            const { invert, ms } = steps[i];
            const invertOn = invert;
            const id = window.setTimeout(() => {
                panel.classList.toggle('preset-random-attention-invert', invertOn);
            }, t);
            this._randomAttentionTimers.push(id);
            t += ms;
        }

        const endId = window.setTimeout(() => {
            panel.classList.remove('preset-random-attention-invert');
            this._runRandomizeButtonGlare(randomizeBtn);
            this._randomAttentionTimers = [];
        }, t);
        this._randomAttentionTimers.push(endId);
    }

    /** Проверяет «сырые» данные пресета на любые рандом-флаги. */
    presetDataHasRandom(preset) {
        if (!preset || typeof preset !== 'object') return false;
        for (const cfg of Object.values(DICE_CONFIG)) {
            if (preset[cfg.flag] === true) return true;
        }
        for (const cfg of Object.values(EFFECT_RANDOM_CONFIG)) {
            if (preset[cfg.flag] === true) return true;
        }
        const paletteFlags = [
            'paletteDiceLetter', 'paletteDiceBg', 'paletteDiceGrid',
            'paletteDiceGradientStart', 'paletteDiceGradientEnd'
        ];
        for (const f of paletteFlags) if (preset[f] === true) return true;
        return false;
    }

    /**
     * Invert панели Random + блик на Randomize: только встроенные seed-пресеты
     * (`seeded: true` задаёт loadSeedPresets) и только если в пресете есть рандом.
     */
    shouldPulseRandomTutorialOnLoad(preset) {
        return (
            !!(preset && preset.seeded === true) &&
            this.presetDataHasRandom(preset)
        );
    }

    /** Render the dropdown list of presets (+ Unsaved + delete-all). */
    updatePresetList() {
        const app = this.app;
        const presetDropdownMenu = document.getElementById('presetDropdownMenu');
        const names = app.presetManager.getPresetNames();
        const hasCustomPresets = names.length > 1;

        const showUnsaved = app.currentPresetName === 'New' && app.hasUnsavedChanges;
        const listNames = [...names];
        if (showUnsaved && !listNames.includes('Unsaved')) {
            listNames.push('Unsaved');
        }

        presetDropdownMenu.innerHTML = '';
        listNames.forEach(name => {
            const item = document.createElement('li');
            item.className = 'preset-dropdown-item';
            item.dataset.value = name;
            item.setAttribute('role', 'option');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'preset-dropdown-item-name';
            let displayName;
            if (name === 'New') displayName = 'New';
            else if (name === 'Unsaved') displayName = 'Unsaved';
            else displayName = this.getDisplayName(name);
            nameSpan.textContent = displayName;
            nameSpan.title = name;
            item.appendChild(nameSpan);

            const colors = this.getPresetColors(name);
            const hasRandom = this.presetHasRandom(name);
            if (colors || hasRandom) {
                const colorIndicators = document.createElement('span');
                colorIndicators.className = 'preset-dropdown-item-colors';

                if (colors) {
                    colorIndicators.appendChild(this.buildColorDot(colors.type));
                    colorIndicators.appendChild(this.buildColorDot(colors.bg));
                }

                if (hasRandom) {
                    const randomMark = document.createElement('span');
                    randomMark.className = 'preset-dropdown-item-random';
                    randomMark.textContent = '◇';
                    randomMark.title = 'Содержит рандомные параметры';
                    colorIndicators.appendChild(randomMark);
                }

                nameSpan.appendChild(colorIndicators);
            }

            if (name !== 'New' && name !== 'Unsaved') {
                const editBtn = document.createElement('span');
                editBtn.className = 'preset-dropdown-item-edit';
                editBtn.dataset.action = 'rename';
                editBtn.dataset.preset = name;
                editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                editBtn.title = 'Rename';
                item.appendChild(editBtn);
            }

            if (name === app.currentPresetName ||
                (name === 'Unsaved' && app.currentPresetName === 'New' && app.hasUnsavedChanges)) {
                item.classList.add('selected');
            }
            presetDropdownMenu.appendChild(item);
        });

        if (hasCustomPresets) {
            const deleteAllItem = document.createElement('li');
            deleteAllItem.className = 'preset-dropdown-item preset-dropdown-item-danger';
            deleteAllItem.dataset.value = '__delete_all__';
            deleteAllItem.textContent = '× delete all';
            deleteAllItem.setAttribute('role', 'option');
            presetDropdownMenu.appendChild(deleteAllItem);
        }
    }

    /**
     * Load preset from disk, restoring per-preset undo history if cached
     * in this session.
     */
    loadPreset(name, updateUI = true) {
        const app = this.app;
        const preset = app.presetManager.loadPreset(name);
        if (!preset) {
            alert('Preset not found');
            return;
        }

        // Per-preset history: stash the current preset's manager, switch to the new one
        const oldPresetName = app.currentPresetName;
        if (oldPresetName && app.historyManager) {
            if (app.historyManager.currentTransaction) {
                app.historyManager.cancelAction();
            }
            app._flushAutoSnapshot();
            if (app.historyManager.history.length > 0) {
                app.presetHistories.set(oldPresetName, app.historyManager);
            }
        }

        // Restore from in-session cache if available
        const existingHistory = app.presetHistories.get(name);
        if (existingHistory && existingHistory.history.length > 0) {
            app.historyManager = existingHistory;
            app.currentPresetName = name;

            const currentState = app.historyManager.getCurrentState();
            if (currentState && updateUI) {
                app.applyStateSnapshot(currentState);
            }
            app.hasUnsavedChanges = app.historyManager.historyIndex > 0;
            this.updateSaveDeleteButtons();

            const h0 = existingHistory.history[0]?.state;
            app.presetSessionBaselineSnapshot = h0
                ? JSON.parse(JSON.stringify(h0))
                : app.getStateSnapshot();

            return;
        }

        // Otherwise — fresh history; following code rewrites settings from disk.
        app.historyManager = new HistoryManager({ maxSize: HISTORY_MAX_SIZE });

        app.isLoadingPreset = true;
        app.currentPresetName = name;

        const cacheKeys = ['createdAt', 'updatedAt', 'alternativeGlyphCache', 'moduleTypeCache', 'moduleValueCache', 'colorPalette', 'moduleColorCache'];

        Object.keys(preset).forEach(key => {
            if (!cacheKeys.includes(key) && app.settings.values.hasOwnProperty(key)) {
                app.settings.set(key, preset[key]);
            }
        });

        // Migrate old preset mode → dashEnabled (Phase 5)
        if (preset.mode !== undefined && preset.dashEnabled === undefined) {
            app.settings.set('dashEnabled', preset.mode === 'dash' || preset.mode === 'sd');
        }
        // Migrate mode === 'random' → dice flags (Phase 6)
        if (preset.mode === 'random') {
            app.settings.set('randomizeStem', preset.randomizeStem ?? true);
            app.settings.set('randomizeStrokes', preset.randomizeStrokes ?? true);
            app.settings.set('randomizeContrast', preset.randomizeContrast ?? true);
            app.settings.set('randomizeDashLength', preset.randomizeDashLength ?? (preset.randomDash || false));
            app.settings.set('randomizeGapLength', preset.randomizeGapLength ?? (preset.randomDash || false));
            app.settings.set('randomizeWobblyAmount', preset.randomizeWobblyAmount ?? (preset.randomWobblyEnabled || false));
            app.settings.set('randomizeWobblyFrequency', preset.randomizeWobblyFrequency ?? (preset.randomWobblyEnabled || false));
        }
        // Migrate randomRounded/randomCloseEnds → roundedCaps/closeEnds
        if (preset.randomRounded !== undefined && preset.roundedCaps === undefined) {
            app.settings.set('roundedCaps', preset.randomRounded);
        }
        if (preset.randomCloseEnds !== undefined && preset.closeEnds === undefined) {
            app.settings.set('closeEnds', preset.randomCloseEnds);
        }
        // Migrate colorMode → colorSource + palette
        if (preset.colorMode !== undefined && preset.colorSource === undefined) {
            const modeMap = {
                'manual':         { source: 'solid',    palette: false },
                'random':         { source: 'solid',    palette: true  },
                'chaos':          { source: 'solid',    palette: true  },
                'randomChaos':    { source: 'solid',    palette: true  },
                'gradient':       { source: 'gradient', palette: false },
                'randomGradient': { source: 'gradient', palette: true  }
            };
            const mapped = modeMap[preset.colorMode] || { source: 'solid', palette: false };
            app.settings.set('colorSource', mapped.source);
            if (mapped.palette && (app.settings.get('colorChaosColors') || 3) <= 3) {
                app.settings.set('colorChaosColors', 16);
            }
        }
        // Migrate old randomizeColor flag
        if (preset.randomizeColor && (app.settings.get('colorChaosColors') || 3) <= 3) {
            app.settings.set('colorChaosColors', preset.colorChaosColors || 16);
        }
        // Migrate → per-swatch palette dice (replaces colorRandomMode).
        // NB: do NOT use `colorChaosColors > 3` as an indicator — 16 is the default.
        if (preset.paletteDiceLetter === undefined) {
            const legacyRandom =
                preset.colorRandomMode === true ||
                preset.colorMode === 'random' ||
                preset.colorMode === 'chaos' ||
                preset.colorMode === 'randomChaos' ||
                preset.colorMode === 'randomGradient' ||
                preset.randomizeColor === true;
            if (legacyRandom) {
                app.settings.set('paletteDiceLetter', true);
                app.settings.set('paletteDiceGradientStart', true);
                app.settings.set('paletteDiceGradientEnd', true);
                app.settings.set('paletteDiceBg', true);
                app.settings.set('paletteDiceGrid', true);
                app.settings.set('randomizePaletteColors', true);
                if ((app.settings.get('colorChaosColors') || 3) <= 3) {
                    app.settings.set('colorChaosColors', 16);
                }
            } else {
                app.settings.set('paletteDiceLetter', false);
                app.settings.set('paletteDiceBg', false);
                app.settings.set('paletteDiceGrid', false);
                app.settings.set('paletteDiceGradientStart', false);
                app.settings.set('paletteDiceGradientEnd', false);
                app.settings.set('randomizePaletteColors', false);
            }
        }
        // Migrate old settings names
        if (preset.randomColorChaosGrayscale !== undefined) app.settings.set('colorBW', preset.randomColorChaosGrayscale);
        // showEndpoints (legacy) → Joints + FreeEndpoints
        if (preset.showEndpoints !== undefined && preset.showJoints === undefined) {
            const on = !!preset.showEndpoints;
            app.settings.set('showJoints', on);
            app.settings.set('showFreeEndpoints', on);
        }
        if (preset.randomizeShowEndpoints !== undefined && preset.randomizeShowJoints === undefined) {
            const on = !!preset.randomizeShowEndpoints;
            app.settings.set('randomizeShowJoints', on);
            app.settings.set('randomizeShowFreeEndpoints', on);
        }

        // Restore renderer caches
        if (app.renderer) {
            if (preset.alternativeGlyphCache && typeof preset.alternativeGlyphCache === 'object') {
                app.renderer.alternativeGlyphCache = JSON.parse(JSON.stringify(preset.alternativeGlyphCache));
            } else {
                app.renderer.alternativeGlyphCache = {};
            }
            if (preset.moduleTypeCache && typeof preset.moduleTypeCache === 'object') {
                app.renderer.moduleTypeCache = JSON.parse(JSON.stringify(preset.moduleTypeCache));
            } else {
                app.renderer.moduleTypeCache = {};
            }
            if (preset.moduleValueCache && typeof preset.moduleValueCache === 'object') {
                app.renderer.moduleValueCache = JSON.parse(JSON.stringify(preset.moduleValueCache));
            } else {
                app.renderer.moduleValueCache = {};
            }
        }

        // Restore or clear Color Chaos palette/cache
        const hasColorChaos = !!app.settings.get('randomizeColor');
        if (!hasColorChaos) {
            app.colorPalette = [];
            app.moduleColorCache = new Map();
            app.moduleGradientCache = new Map();
            app.globalModuleIndex = 0;
            app.globalGradientIndex = 0;
        } else if (preset.colorPalette && preset.colorPalette.length > 0) {
            app.colorPalette = [...preset.colorPalette];
            if (preset.moduleColorCache) {
                app.moduleColorCache = new Map(
                    Object.entries(preset.moduleColorCache).map(([k, v]) => [parseInt(k), v])
                );
            } else {
                app.moduleColorCache = new Map();
            }
            app.globalModuleIndex = app.moduleColorCache.size;
        } else {
            app.generateColorPalette();
        }

        // Pass restored caches to updateRenderer
        app.pendingCacheRestore = {
            moduleTypeCache: app.renderer?.moduleTypeCache ? JSON.parse(JSON.stringify(app.renderer.moduleTypeCache)) : null,
            moduleValueCache: app.renderer?.moduleValueCache ? JSON.parse(JSON.stringify(app.renderer.moduleValueCache)) : null,
            alternativeGlyphCache: app.renderer?.alternativeGlyphCache ? JSON.parse(JSON.stringify(app.renderer.alternativeGlyphCache)) : null
        };

        if (updateUI) {
            if (app.renderer && app.renderer.clearLayoutCache) {
                app.renderer.clearLayoutCache();
            }
            app.updateUIFromSettings();
            app.updateRenderer(true);
        }

        app.pendingCacheRestore = null;

        app.isLoadingPreset = false;

        if (app.historyManager.history.length === 0) {
            app.saveInitialHistorySnapshot(`load preset: ${name}`);
            app.hasUnsavedChanges = false;
        } else {
            app.hasUnsavedChanges = app.historyManager.historyIndex > 0;
        }

        app.presetHistories.set(name, app.historyManager);
        this.updateSaveDeleteButtons();

        if (updateUI) {
            app.presetSessionBaselineSnapshot = app.getStateSnapshot();
        }

        // Подсветка Random-панели: только встроенные seed-пресеты из presets/ (+ рандом).
        // `seeded: true` выставляет только loadSeedPresets; пользовательские save/new не получают флаг.
        if (updateUI && !app.isInitializing && this.shouldPulseRandomTutorialOnLoad(preset)) {
            this.pulseRandomAttention();
        }
    }

    async saveCurrentPreset() {
        const app = this.app;
        const isDefaultPreset = app.currentPresetName === 'New';
        let name;
        let result;

        if (isDefaultPreset) {
            const defaultName = this.generatePresetName();
            name = await app.modalManager.promptPresetName(defaultName);
            if (!name) return;

            if (app.presetManager.hasPreset(name)) {
                await app.modalManager.showError(`Preset "${name}" already exists. Choose a different name.`);
                return this.saveCurrentPreset();
            }

            const presetData = this.collectPresetData({ propagateSeeded: false });
            result = app.presetManager.savePreset(name, presetData);
        } else {
            const action = await app.modalManager.confirmSaveOrNew(app.currentPresetName);
            if (action === 'cancel') return;

            if (action === 'update') {
                name = app.currentPresetName;
                const presetData = this.collectPresetData({ propagateSeeded: true });
                result = app.presetManager.updatePreset(name, presetData);
            } else if (action === 'new') {
                const defaultName = this.generatePresetName();
                name = await app.modalManager.promptPresetName(defaultName);
                if (!name) return;

                if (app.presetManager.hasPreset(name)) {
                    await app.modalManager.showError(`Preset "${name}" already exists. Choose a different name.`);
                    return this.saveCurrentPreset();
                }
                const presetData = this.collectPresetData({ propagateSeeded: false });
                result = app.presetManager.savePreset(name, presetData);
            }
        }

        if (result && result.success) {
            this.updatePresetList();
            const presetDropdownText = document.querySelector('.preset-dropdown-text');
            const presetDropdownMenu = document.getElementById('presetDropdownMenu');
            const displayName = name === 'New' ? 'New' : this.getDisplayName(name);
            presetDropdownText.textContent = displayName;
            app.currentPresetName = name;
            app.hasUnsavedChanges = false;
            this.updateSaveDeleteButtons();
            const newItem = Array.from(presetDropdownMenu.children).find(item => item.dataset.value === name);
            if (newItem) {
                presetDropdownMenu.querySelector('.selected')?.classList.remove('selected');
                newItem.classList.add('selected');
            }
        } else if (result && !result.success) {
            await app.modalManager.showError(result.error || 'Failed to save preset.');
        }
    }

    /** Snapshot current settings + renderer caches as a preset blob. */
    collectPresetData(options = {}) {
        const { propagateSeeded = true } = options;
        const app = this.app;
        let alternativeGlyphCache = {};
        let moduleTypeCache = {};
        let moduleValueCache = {};

        if (app.renderer?.alternativeGlyphCache) {
            alternativeGlyphCache = JSON.parse(JSON.stringify(app.renderer.alternativeGlyphCache));
        }
        if (app.renderer?.moduleTypeCache) {
            moduleTypeCache = JSON.parse(JSON.stringify(app.renderer.moduleTypeCache));
        }
        if (app.renderer?.moduleValueCache) {
            moduleValueCache = JSON.parse(JSON.stringify(app.renderer.moduleValueCache));
        }

        const blob = {
            ...app.settings.values,
            alternativeGlyphCache,
            moduleTypeCache,
            moduleValueCache,
            colorPalette: app.colorPalette ? [...app.colorPalette] : [],
            moduleColorCache: app.moduleColorCache ? Object.fromEntries(app.moduleColorCache) : {}
        };

        if (
            propagateSeeded &&
            app.currentPresetName &&
            app.currentPresetName !== 'New'
        ) {
            const existing = app.presetManager.loadPreset(app.currentPresetName);
            if (existing && existing.seeded === true) {
                blob.seeded = true;
            }
        }

        return blob;
    }

    /** Auto-name new presets as "<text> <Mode>" with a counter on collision. */
    generatePresetName() {
        const app = this.app;
        const text = app.settings.get('text') || '';
        const mode = app.getDerivedMode();

        const fullText = text.replace(/\s+/g, ' ').trim();

        const modeNameMap = {
            fill: 'Monoline',
            stripes: 'Stripes',
            dash: 'Dash',
            sd: 'Dashed Stripes',
            random: 'Random'
        };
        const modeName = modeNameMap[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);

        const baseName = `${fullText} ${modeName}`;
        const existingNames = app.presetManager.getPresetNames();

        if (existingNames.includes(baseName)) {
            let counter = 1;
            let newName = `${baseName} ${counter}`;
            while (existingNames.includes(newName)) {
                counter++;
                newName = `${baseName} ${counter}`;
            }
            return newName;
        }

        return baseName;
    }

    /** Truncate preset display name to 24 chars with mode kept on the right. */
    getDisplayName(fullName) {
        if (fullName == null || fullName === '') return 'New';
        const s = String(fullName);
        const parts = s.split(' ');
        if (parts.length < 2) {
            return s.length > 24 ? s.substring(0, 21) + '...' : s;
        }

        const mode = parts[parts.length - 1];
        const textPart = parts.slice(0, -1).join(' ');

        const withoutEllipsis = `${textPart} ${mode}`;
        if (withoutEllipsis.length <= 24) return withoutEllipsis;

        const maxTextLength = 24 - 3 - 1 - mode.length;
        if (maxTextLength <= 0) {
            return mode.length > 24 ? mode.substring(0, 21) + '...' : mode;
        }

        const truncatedText = textPart.substring(0, maxTextLength) + '...';
        const result = `${truncatedText} ${mode}`;

        if (result.length > 24) {
            const excess = result.length - 24;
            const newTruncatedText = textPart.substring(0, Math.max(0, maxTextLength - excess));
            return `${newTruncatedText}... ${mode}`;
        }

        return result;
    }

    updateSaveDeleteButtons() {
        const app = this.app;
        const currentMode = app.settings.get('currentMode') || 'normal';
        const savePresetBtn = document.getElementById('savePresetBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');

        if (currentMode === 'editor') {
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            return;
        }

        const presetDropdownToggle = document.getElementById('presetDropdownToggle');
        const presetDropdownText = document.querySelector('.preset-dropdown-text');
        const isDefaultPreset = app.currentPresetName === 'New';
        const isDefaultWithoutChanges = isDefaultPreset && !app.hasUnsavedChanges;
        const names = app.presetManager.getPresetNames();
        const hasCustomPresets = names.length > 1;

        if (presetDropdownText) {
            if (isDefaultPreset && app.hasUnsavedChanges) {
                presetDropdownText.textContent = 'Unsaved';
            } else {
                const displayName = app.currentPresetName === 'New'
                    ? 'New'
                    : this.getDisplayName(app.currentPresetName || 'New');
                presetDropdownText.textContent = displayName;
            }
        }

        if (presetDropdownToggle) {
            presetDropdownToggle.disabled = !hasCustomPresets && isDefaultWithoutChanges;
        }

        if (isDefaultWithoutChanges) {
            if (savePresetBtn) savePresetBtn.style.display = 'none';
            if (deletePresetBtn) deletePresetBtn.style.display = 'none';
            return;
        }

        if (savePresetBtn) {
            savePresetBtn.style.display = app.hasUnsavedChanges ? 'inline-flex' : 'none';
        }

        if (deletePresetBtn) {
            deletePresetBtn.style.display = !isDefaultPreset ? 'inline-flex' : 'none';
        }

        this.updatePresetList();
    }
}

/**
 * Коллекционные части пресета (не входят в `settings.values`): кэши рендера и палитры.
 * Допускаются в JSON из кнопки «json» и в seed-файлах `/presets/*.json`.
 */
export const EXTRA_PRESET_SNAPSHOT_KEYS = [
    'alternativeGlyphCache',
    'moduleTypeCache',
    'moduleValueCache',
    'colorPalette',
    'moduleColorCache'
];
