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
            const presetData = this.collectPresetData();
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
     * If the preset (or current Unsaved state) has non-default colours,
     * return `{ letterColor, bgColor, hasColorChaos }`. Otherwise null.
     */
    getPresetColors(presetName) {
        const app = this.app;
        const defaultLetterColor = '#ffffff';
        const defaultBgColor = '#000000';

        if (presetName === 'Unsaved') {
            const letterColor = this.normalizeColor(app.settings.get('letterColor'));
            const bgColor = this.normalizeColor(app.settings.get('bgColor'));
            const normalizedDefaultLetter = this.normalizeColor(defaultLetterColor);
            const normalizedDefaultBg = this.normalizeColor(defaultBgColor);

            const currentColorMode = app.getDerivedColorMode();
            const hasColorChaos = currentColorMode === 'randomChaos' || currentColorMode === 'randomGradient';

            if (letterColor !== normalizedDefaultLetter || bgColor !== normalizedDefaultBg) {
                return {
                    letterColor: app.settings.get('letterColor'),
                    bgColor: app.settings.get('bgColor'),
                    hasColorChaos
                };
            }
            return null;
        }

        if (presetName === 'New') return null;

        const preset = app.presetManager.loadPreset(presetName);
        if (!preset) return null;

        const letterColor = this.normalizeColor(preset.letterColor || defaultLetterColor);
        const bgColor = this.normalizeColor(preset.bgColor || defaultBgColor);
        const normalizedDefaultLetter = this.normalizeColor(defaultLetterColor);
        const normalizedDefaultBg = this.normalizeColor(defaultBgColor);

        const presetColorMode = preset.colorMode || 'manual';
        const hasColorChaos = presetColorMode === 'chaos' || presetColorMode === 'randomChaos';

        if (letterColor !== normalizedDefaultLetter || bgColor !== normalizedDefaultBg) {
            return {
                letterColor: preset.letterColor || defaultLetterColor,
                bgColor: preset.bgColor || defaultBgColor,
                hasColorChaos
            };
        }
        return null;
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
            if (colors) {
                const colorIndicators = document.createElement('span');
                colorIndicators.className = 'preset-dropdown-item-colors';

                const typeDot = document.createElement('span');
                if (colors.hasColorChaos) {
                    typeDot.textContent = '◎';
                    typeDot.style.color = '#ffffff';
                } else {
                    typeDot.textContent = '●';
                    typeDot.style.color = colors.letterColor;
                }

                const backDot = document.createElement('span');
                backDot.textContent = '●';
                backDot.style.color = colors.bgColor;

                colorIndicators.appendChild(typeDot);
                colorIndicators.appendChild(backDot);
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

            const presetData = this.collectPresetData();
            result = app.presetManager.savePreset(name, presetData);
        } else {
            const action = await app.modalManager.confirmSaveOrNew(app.currentPresetName);
            if (action === 'cancel') return;

            if (action === 'update') {
                name = app.currentPresetName;
                const presetData = this.collectPresetData();
                result = app.presetManager.updatePreset(name, presetData);
            } else if (action === 'new') {
                const defaultName = this.generatePresetName();
                name = await app.modalManager.promptPresetName(defaultName);
                if (!name) return;

                if (app.presetManager.hasPreset(name)) {
                    await app.modalManager.showError(`Preset "${name}" already exists. Choose a different name.`);
                    return this.saveCurrentPreset();
                }
                const presetData = this.collectPresetData();
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
    collectPresetData() {
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

        return {
            ...app.settings.values,
            alternativeGlyphCache,
            moduleTypeCache,
            moduleValueCache,
            colorPalette: app.colorPalette ? [...app.colorPalette] : [],
            moduleColorCache: app.moduleColorCache ? Object.fromEntries(app.moduleColorCache) : {}
        };
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
