/**
 * Undo/Redo history controller.
 *
 * Owns the snapshot pipeline (capture / apply), the auto-snapshot debounce,
 * and the per-slider/input transaction system that turns a single drag or
 * focus session into a single history step.
 *
 * Reads/writes state on the host VoidTypeface ("app"):
 *   - app.settings, app.renderer, app.historyManager
 *   - app.colorPalette, app.moduleColorCache, app.globalModuleIndex,
 *     app.globalGradientIndex (Color Chaos caches restored alongside settings)
 *   - app.snapshotDebounceTimer, app.isRestoringState, app.pendingCacheRestore,
 *     app.activeSliderTransactions, app.activeInputTransactions
 *   - app.isLoadingPreset, app.isInitializing, app.currentPresetName
 *   - app.hasUnsavedChanges, app.updateSaveDeleteButtons,
 *     app.updateUIFromSettings, app.updateRenderer, app.markAsChanged
 *
 * State lives on the app for backward compatibility with the many existing
 * call sites; the controller centralises only the logic.
 */

import { HISTORY_AUTOSNAPSHOT_DEBOUNCE_MS } from '../config/timings.js';

/** Deep clone via JSON; Maps are converted to entry arrays separately. */
function deepCloneJSON(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class HistoryController {
    constructor(app) {
        this.app = app;
    }

    /**
     * Capture a snapshot of the application: settings + renderer caches +
     * Color Chaos state. Used both as input for undo/redo and as the basis
     * for "before/after" transactions on sliders.
     */
    getStateSnapshot() {
        const app = this.app;
        const renderer = app.renderer;
        return {
            settings: deepCloneJSON(app.settings.values),
            renderer: {
                alternativeGlyphCache: renderer?.alternativeGlyphCache
                    ? deepCloneJSON(renderer.alternativeGlyphCache) : {},
                moduleTypeCache: renderer?.moduleTypeCache
                    ? deepCloneJSON(renderer.moduleTypeCache) : {},
                moduleValueCache: renderer?.moduleValueCache
                    ? deepCloneJSON(renderer.moduleValueCache) : {}
            },
            colorChaos: {
                colorPalette: Array.isArray(app.colorPalette) ? [...app.colorPalette] : [],
                moduleColorCache: app.moduleColorCache instanceof Map
                    ? Array.from(app.moduleColorCache.entries())
                    : [],
                globalModuleIndex: app.globalModuleIndex || 0,
                globalGradientIndex: app.globalGradientIndex || 0
            }
        };
    }

    /**
     * Apply a snapshot. All intermediate set/UI changes happen under
     * isRestoringState so they neither write to history nor mark the preset
     * as dirty.
     */
    applyStateSnapshot(snapshot) {
        if (!snapshot) return;
        const app = this.app;

        app.isRestoringState = true;
        app.historyManager.setRestoring(true);

        try {
            // 1. Restore settings.values directly, bypassing the wrapped set()
            //    (otherwise we'd trigger markAsChanged + auto-snapshot).
            if (snapshot.settings) {
                Object.assign(app.settings.values, snapshot.settings);
            }

            // 2. Restore Color Chaos caches.
            if (snapshot.colorChaos) {
                app.colorPalette = Array.isArray(snapshot.colorChaos.colorPalette)
                    ? [...snapshot.colorChaos.colorPalette] : [];
                app.moduleColorCache = new Map(snapshot.colorChaos.moduleColorCache || []);
                app.globalModuleIndex = snapshot.colorChaos.globalModuleIndex || 0;
                app.globalGradientIndex = snapshot.colorChaos.globalGradientIndex || 0;
            }

            // 3. Stage renderer caches; updateRenderer() reads pendingCacheRestore.
            if (snapshot.renderer) {
                app.pendingCacheRestore = {
                    moduleTypeCache: snapshot.renderer.moduleTypeCache || null,
                    moduleValueCache: snapshot.renderer.moduleValueCache || null,
                    alternativeGlyphCache: snapshot.renderer.alternativeGlyphCache || null
                };
                if (app.renderer) {
                    if (snapshot.renderer.alternativeGlyphCache) {
                        app.renderer.alternativeGlyphCache = deepCloneJSON(snapshot.renderer.alternativeGlyphCache);
                    }
                    if (snapshot.renderer.moduleTypeCache) {
                        app.renderer.moduleTypeCache = deepCloneJSON(snapshot.renderer.moduleTypeCache);
                    }
                    if (snapshot.renderer.moduleValueCache) {
                        app.renderer.moduleValueCache = deepCloneJSON(snapshot.renderer.moduleValueCache);
                    }
                }
            }

            // 4. Drop layout caches and re-render UI.
            if (app.renderer && app.renderer.clearLayoutCache) {
                app.renderer.clearLayoutCache();
            }
            app.updateUIFromSettings();
            app.updateRenderer(true);

            app.pendingCacheRestore = null;
        } finally {
            app.isRestoringState = false;
            app.historyManager.setRestoring(false);
        }
    }

    /**
     * Schedule an auto-snapshot after a burst of changes. Debounced so a
     * fast sequence of set()s collapses into a single history step.
     * Skipped while a slider/input transaction is open — commitAction()
     * will record the post-state when the transaction closes.
     */
    scheduleAutoSnapshot(label = '') {
        const app = this.app;
        if (app.isRestoringState || app.isLoadingPreset || app.isInitializing) return;
        if (app.settings.get('currentMode') === 'editor') return;
        if (app.historyManager.currentTransaction) return;

        if (app.snapshotDebounceTimer) {
            clearTimeout(app.snapshotDebounceTimer);
        }
        app.snapshotDebounceTimer = setTimeout(() => {
            app.snapshotDebounceTimer = null;
            if (app.historyManager.currentTransaction) return;
            app.historyManager.saveSnapshot(this.getStateSnapshot(), label);
        }, HISTORY_AUTOSNAPSHOT_DEBOUNCE_MS);
    }

    /** Force-cancel a pending debounced snapshot (e.g. before a transaction). */
    flushAutoSnapshot() {
        const app = this.app;
        if (app.snapshotDebounceTimer) {
            clearTimeout(app.snapshotDebounceTimer);
            app.snapshotDebounceTimer = null;
        }
    }

    /**
     * Save an initial snapshot for the current preset's history.
     * Called once after a preset is loaded/created and its history is empty.
     */
    saveInitialSnapshot(label = 'initial') {
        this.flushAutoSnapshot();
        this.app.historyManager.saveSnapshot(this.getStateSnapshot(), label);
    }

    /** Cmd/Ctrl+Z. */
    undo() {
        const app = this.app;
        if (app.settings.get('currentMode') === 'editor') return;
        // Blur the active input so its blur listener commits its transaction.
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            activeEl.blur();
        }
        this.flushAutoSnapshot();
        const previousState = app.historyManager.undo();
        if (previousState) {
            this.applyStateSnapshot(previousState);
            this._afterHistoryNav();
        }
    }

    /** Cmd/Ctrl+Shift+Z. */
    redo() {
        const app = this.app;
        if (app.settings.get('currentMode') === 'editor') return;
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            activeEl.blur();
        }
        this.flushAutoSnapshot();
        const nextState = app.historyManager.redo();
        if (nextState) {
            this.applyStateSnapshot(nextState);
            this._afterHistoryNav();
        }
    }

    /** Mark preset as changed if undo/redo moved off the start of history. */
    _afterHistoryNav() {
        const app = this.app;
        const idx = app.historyManager.historyIndex;
        app.hasUnsavedChanges = idx > 0;
        app.updateSaveDeleteButtons();
    }

    /**
     * Wrap settings.set() and renderer.setText() so any change schedules an
     * auto-snapshot and marks the preset as changed (unless we're loading,
     * initialising, or restoring).
     */
    setupChangeTracking() {
        const app = this.app;
        const self = this;

        const originalSet = app.settings.set.bind(app.settings);
        app.settings.set = function(key, value) {
            const oldValue = app.settings.values[key];
            const result = originalSet(key, value);
            const changed = oldValue !== value;
            if (changed && !app.isLoadingPreset && !app.isInitializing && !app.isRestoringState && app.currentPresetName) {
                app.markAsChanged();
                self.scheduleAutoSnapshot(`set ${key}`);
            }
            return result;
        };

        const originalSetText = app.renderer.setText.bind(app.renderer);
        let lastRendererText = null;
        app.renderer.setText = (text) => {
            const oldText = lastRendererText;
            originalSetText(text);
            lastRendererText = text;
            const changed = oldText !== null && oldText !== text;
            if (changed && !app.isLoadingPreset && !app.isInitializing && !app.isRestoringState && app.currentPresetName) {
                app.markAsChanged();
                self.scheduleAutoSnapshot('setText');
            }
        };
    }

    /**
     * Bind transaction handlers to every slider/range slider:
     *   - mousedown on thumb        → beginAction (snapshot "before")
     *   - global mouseup            → commitAction (snapshot "after")
     *   - focus on value input      → beginAction
     *   - blur  on value input      → commitAction
     * This collapses one drag / one typing session into a single history step.
     */
    initSliderHistoryHandlers() {
        const app = this.app;

        // ---- SliderController (single-thumb sliders) ----
        if (app.sliderController?.sliders) {
            app.sliderController.sliders.forEach((sliderData, sliderId) => {
                const slider = sliderData.element;
                const valueInput = sliderData.valueInput;

                if (slider) {
                    slider.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        this.flushAutoSnapshot();
                        app.historyManager.beginAction(`adjust ${sliderId}`, this.getStateSnapshot());
                        app.activeSliderTransactions.set(sliderId, true);
                    });
                }

                if (valueInput) {
                    valueInput.addEventListener('focus', () => {
                        if (app.activeInputTransactions.has(sliderId)) return;
                        this.flushAutoSnapshot();
                        app.historyManager.beginAction(`type ${sliderId}`, this.getStateSnapshot());
                        app.activeInputTransactions.add(sliderId);
                    });
                    valueInput.addEventListener('blur', () => {
                        if (!app.activeInputTransactions.has(sliderId)) return;
                        app.historyManager.commitAction(this.getStateSnapshot());
                        app.activeInputTransactions.delete(sliderId);
                    });
                }
            });
        }

        // ---- RangeSliderController (two-thumb sliders) ----
        if (app.rangeSliderController?.ranges) {
            app.rangeSliderController.ranges.forEach((rangeData, rangeId) => {
                const beginRange = (label) => {
                    if (app.activeSliderTransactions.has(rangeId)) return;
                    this.flushAutoSnapshot();
                    app.historyManager.beginAction(label, this.getStateSnapshot());
                    app.activeSliderTransactions.set(rangeId, true);
                };

                if (rangeData.minThumb) {
                    rangeData.minThumb.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        beginRange(`adjust ${rangeId} (min)`);
                    });
                }
                if (rangeData.maxThumb) {
                    rangeData.maxThumb.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        beginRange(`adjust ${rangeId} (max)`);
                    });
                }

                const cfg = rangeData.config || {};
                ['minValueId', 'maxValueId'].forEach((idKey) => {
                    const inputId = cfg[idKey];
                    if (!inputId) return;
                    const input = document.getElementById(inputId);
                    if (!input) return;
                    const txKey = `${rangeId}:${inputId}`;
                    input.addEventListener('focus', () => {
                        if (app.activeInputTransactions.has(txKey)) return;
                        this.flushAutoSnapshot();
                        app.historyManager.beginAction(`type ${inputId}`, this.getStateSnapshot());
                        app.activeInputTransactions.add(txKey);
                    });
                    input.addEventListener('blur', () => {
                        if (!app.activeInputTransactions.has(txKey)) return;
                        app.historyManager.commitAction(this.getStateSnapshot());
                        app.activeInputTransactions.delete(txKey);
                    });
                });
            });
        }

        // Global mouseup closes all open slider/range transactions.
        document.addEventListener('mouseup', (e) => {
            if (e.button !== 0) return;
            if (app.activeSliderTransactions.size === 0) return;
            app.activeSliderTransactions.forEach(() => {
                app.historyManager.commitAction(this.getStateSnapshot());
            });
            app.activeSliderTransactions.clear();
        });
    }
}

