/**
 * Glyp — Modular Font Editor
 * Main application entry point.
 */

import { ProjectManager } from './core/ProjectManager.js';
import { ModuleDesigner } from './editor/ModuleDesigner.js';
import { GridEditor } from './editor/GridEditor.js';
import { TextPreview } from './editor/TextPreview.js';
import { SVGPathParser } from './core/SVGPathParser.js';
import { JointDetector } from './core/JointDetector.js';
import { MathUtils } from './utils/MathUtils.js';

class GlypApp {
    constructor() {
        this.project = new ProjectManager();
        this.moduleDesigner = null;
        this.gridEditor = null;
        this.textPreview = null;

        this._editingModuleId = null;

        this.init();
    }

    init() {
        this.project.newProject('Untitled', 5, 5);

        this._initGridEditor();
        this._initTextPreview();
        this._initModuleDesigner();
        this._initTopBar();
        this._initModulesPanel();
        this._initCharsPanel();
        this._initParamsPanel();
        this._initAlternativesPanel();
        this._initModals();
        this._initKeyboardShortcuts();

        if (!this.project.loadAutosave()) {
            this._addDefaultChars();
        } else {
            this._refreshAll();
        }

        this._startAutosave();
    }

    // --- Grid Editor ---

    _initGridEditor() {
        const canvas = document.getElementById('editorCanvas');
        this.gridEditor = new GridEditor(
            canvas,
            this.project.moduleRegistry,
            this.project.glyphStore
        );
        this.gridEditor.renderer.applySettings(this.project.settings);
        this.gridEditor.activate();

        canvas.addEventListener('glyphchange', () => {
            this.project.markDirty();
            this._updateTextPreview();
            this._updateAlternativesList();
        });

        canvas.addEventListener('rotationchange', (e) => {
            document.getElementById('currentRotation').textContent = `${e.detail.rotation * 90}°`;
        });

        canvas.addEventListener('modulechange', (e) => {
            this._highlightActiveModule(e.detail.moduleId);
        });

        document.getElementById('showGridToggle').addEventListener('change', (e) => {
            this.gridEditor.showGrid = e.target.checked;
            this.gridEditor.render();
        });
        document.getElementById('showJointsToggle').addEventListener('change', (e) => {
            this.gridEditor.showJoints = e.target.checked;
            this.gridEditor.render();
        });
        document.getElementById('showEndpointsToggle').addEventListener('change', (e) => {
            this.gridEditor.showEndpoints = e.target.checked;
            this.gridEditor.render();
        });

        document.getElementById('rotateCWBtn').addEventListener('click', () => {
            this.gridEditor.rotateCW();
            document.getElementById('currentRotation').textContent = `${this.gridEditor.currentRotation * 90}°`;
            this.gridEditor.render();
        });
        document.getElementById('rotateCCWBtn').addEventListener('click', () => {
            this.gridEditor.rotateCCW();
            document.getElementById('currentRotation').textContent = `${this.gridEditor.currentRotation * 90}°`;
            this.gridEditor.render();
        });
        document.getElementById('eraserBtn').addEventListener('click', () => {
            this.gridEditor.currentModuleId = null;
            this._highlightActiveModule(null);
        });

        this._resizeEditorCanvas();
        window.addEventListener('resize', MathUtils.debounce(() => this._resizeEditorCanvas(), 100));
    }

    _resizeEditorCanvas() {
        const area = document.querySelector('.editor-area');
        const rect = area.getBoundingClientRect();
        const size = Math.min(rect.width - 40, rect.height - 60);
        this.gridEditor.resize(Math.max(200, size), Math.max(200, size));
    }

    // --- Text Preview ---

    _initTextPreview() {
        const canvas = document.getElementById('previewCanvas');
        this.textPreview = new TextPreview(
            canvas,
            this.project.glyphStore,
            this.project.moduleRegistry
        );
        this.textPreview.applySettings(this.project.settings);
        this.textPreview.enablePanning();

        const input = document.getElementById('previewText');
        input.addEventListener('input', () => {
            this.textPreview.setText(input.value.toUpperCase());
        });

        this._resizePreviewCanvas();
        window.addEventListener('resize', MathUtils.debounce(() => this._resizePreviewCanvas(), 100));
    }

    _resizePreviewCanvas() {
        const bar = document.querySelector('.preview-bar');
        const canvas = document.getElementById('previewCanvas');
        canvas.width = bar.clientWidth;
        canvas.height = bar.clientHeight - 35;
        this.textPreview.render();
    }

    _updateTextPreview() {
        this.textPreview.render();
    }

    // --- Module Designer ---

    _initModuleDesigner() {
        const canvas = document.getElementById('designerCanvas');
        this.moduleDesigner = new ModuleDesigner(canvas, this.project.moduleRegistry);

        document.getElementById('moduleSvgInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.moduleDesigner.loadSVG(file);
                this._syncDesignerConnections();
            }
        });

        document.getElementById('designerRotateCW').addEventListener('click', () => {
            this.moduleDesigner.previewRotation = (this.moduleDesigner.previewRotation + 1) % 4;
            document.getElementById('designerRotation').textContent = `${this.moduleDesigner.previewRotation * 90}°`;
            this.moduleDesigner.render();
        });
        document.getElementById('designerRotateCCW').addEventListener('click', () => {
            this.moduleDesigner.previewRotation = (this.moduleDesigner.previewRotation + 3) % 4;
            document.getElementById('designerRotation').textContent = `${this.moduleDesigner.previewRotation * 90}°`;
            this.moduleDesigner.render();
        });

        ['connTop', 'connRight', 'connBottom', 'connLeft'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const side = id.replace('conn', '').toLowerCase();
                this.moduleDesigner.setConnection(side, e.target.checked);
            });
        });

        document.getElementById('saveModuleBtn').addEventListener('click', () => {
            this._saveModule();
        });
    }

    _syncDesignerConnections() {
        document.getElementById('connTop').checked = this.moduleDesigner.connections.top;
        document.getElementById('connRight').checked = this.moduleDesigner.connections.right;
        document.getElementById('connBottom').checked = this.moduleDesigner.connections.bottom;
        document.getElementById('connLeft').checked = this.moduleDesigner.connections.left;
    }

    _saveModule() {
        this.moduleDesigner.moduleName = document.getElementById('moduleNameInput').value;
        this.moduleDesigner.moduleShortcut = document.getElementById('moduleShortcutInput').value;

        if (this._editingModuleId) {
            this.moduleDesigner.updateModule(this._editingModuleId);
            this._editingModuleId = null;
        } else {
            this.moduleDesigner.saveModule();
        }

        this._closeModal('moduleDesignerModal');
        this._refreshModuleList();
        this.gridEditor.render();
        this._updateTextPreview();
        this.project.markDirty();
    }

    // --- Top Bar ---

    _initTopBar() {
        document.getElementById('newProjectBtn').addEventListener('click', () => this._newProject());
        document.getElementById('openProjectBtn').addEventListener('click', () => {
            document.getElementById('openProjectInput').click();
        });
        document.getElementById('openProjectInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.project.loadFromFile(file);
                this._refreshAll();
            }
            e.target.value = '';
        });
        document.getElementById('saveProjectBtn').addEventListener('click', () => {
            this.project.saveToFile();
        });
        document.getElementById('exportSvgBtn').addEventListener('click', () => this._exportSVG());
        document.getElementById('exportPngBtn').addEventListener('click', () => this._exportPNG());
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this._openGridSettings();
        });
    }

    _newProject() {
        if (this.project.isDirty && !confirm('Unsaved changes will be lost. Continue?')) return;
        this.project.newProject('Untitled', 5, 5);
        this._addDefaultChars();
        this._refreshAll();
    }

    // --- Modules Panel ---

    _initModulesPanel() {
        document.getElementById('addModuleBtn').addEventListener('click', () => {
            this._editingModuleId = null;
            this.moduleDesigner.reset();
            document.getElementById('moduleNameInput').value = '';
            document.getElementById('moduleShortcutInput').value = '';
            this._syncDesignerConnections();
            this._openModal('moduleDesignerModal');
            this.moduleDesigner.activate();
        });

        this._refreshModuleList();
    }

    _refreshModuleList() {
        const list = document.getElementById('moduleList');
        const modules = this.project.moduleRegistry.getAll();

        if (modules.length === 0) {
            list.innerHTML = '<div class="empty-state">No modules yet.<br>Click + to add an SVG module.</div>';
            return;
        }

        list.innerHTML = '';
        for (const mod of modules) {
            const item = document.createElement('div');
            item.className = 'module-item';
            if (this.gridEditor.currentModuleId === mod.id) item.classList.add('active');
            item.dataset.moduleId = mod.id;

            const preview = document.createElement('div');
            preview.className = 'module-item-preview';
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 32;
            previewCanvas.height = 32;
            this._renderModuleThumbnail(previewCanvas, mod);
            preview.appendChild(previewCanvas);

            const name = document.createElement('span');
            name.className = 'module-item-name';
            name.textContent = mod.name;

            item.appendChild(preview);
            item.appendChild(name);

            if (mod.shortcut) {
                const shortcut = document.createElement('span');
                shortcut.className = 'module-item-shortcut';
                shortcut.textContent = mod.shortcut.toUpperCase();
                item.appendChild(shortcut);
            }

            item.addEventListener('click', () => {
                this.gridEditor.currentModuleId = mod.id;
                this._highlightActiveModule(mod.id);
            });

            item.addEventListener('dblclick', () => {
                this._editingModuleId = mod.id;
                this.moduleDesigner.editModule(mod.id);
                document.getElementById('moduleNameInput').value = mod.name;
                document.getElementById('moduleShortcutInput').value = mod.shortcut || '';
                this._syncDesignerConnections();
                this._openModal('moduleDesignerModal');
                this.moduleDesigner.activate();
            });

            list.appendChild(item);
        }
    }

    _renderModuleThumbnail(canvas, mod) {
        if (!mod.paths || mod.paths.length === 0) return;
        const ctx = canvas.getContext('2d');
        const renderer = this.gridEditor.renderer;
        for (const pathDef of mod.paths) {
            renderer.drawPath(ctx, pathDef.commands, 2, 2, 28, 28);
        }
    }

    _highlightActiveModule(moduleId) {
        const items = document.querySelectorAll('.module-item');
        items.forEach(item => {
            item.classList.toggle('active', item.dataset.moduleId === moduleId);
        });
        const eraserBtn = document.getElementById('eraserBtn');
        eraserBtn.classList.toggle('active', moduleId === null);
    }

    // --- Characters Panel ---

    _initCharsPanel() {
        document.getElementById('addCharBtn').addEventListener('click', () => {
            this._openModal('addCharModal');
        });

        document.getElementById('addCharConfirmBtn').addEventListener('click', () => {
            const input = document.getElementById('newCharInput');
            const char = input.value.trim();
            if (char) {
                this._addChar(char.toUpperCase());
                input.value = '';
                this._closeModal('addCharModal');
            }
        });

        document.querySelectorAll('.char-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const chars = btn.dataset.chars;
                for (const char of chars) {
                    this._addChar(char);
                }
                this._closeModal('addCharModal');
            });
        });

        this._refreshCharGrid();
    }

    _addChar(char) {
        if (!this.project.glyphStore.hasGlyph(char)) {
            this.project.glyphStore.setGlyph(char, this.project.glyphStore.createEmptyCells());
            this.project.markDirty();
        }
        this._refreshCharGrid();
        this.gridEditor.selectChar(char);
        this._highlightActiveChar(char);
        this._updateAlternativesList();
    }

    _addDefaultChars() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const char of chars) {
            if (!this.project.glyphStore.hasGlyph(char)) {
                this.project.glyphStore.setGlyph(char, this.project.glyphStore.createEmptyCells());
            }
        }
        this._refreshCharGrid();
        this.gridEditor.selectChar('A');
        this._highlightActiveChar('A');
    }

    _refreshCharGrid() {
        const grid = document.getElementById('charGrid');
        grid.innerHTML = '';

        const chars = this.project.glyphStore.getChars();
        for (const char of chars) {
            const cell = document.createElement('div');
            cell.className = 'char-cell';
            cell.textContent = char;

            const cells = this.project.glyphStore.getGlyph(char);
            if (cells && !this.project.glyphStore.isGlyphEmpty(cells)) {
                cell.classList.add('has-glyph');
            }
            if (char === this.gridEditor.selectedChar) {
                cell.classList.add('active');
            }

            cell.addEventListener('click', () => {
                this.gridEditor.selectChar(char);
                this._highlightActiveChar(char);
                this._updateAlternativesList();
            });

            grid.appendChild(cell);
        }
    }

    _highlightActiveChar(char) {
        document.querySelectorAll('.char-cell').forEach(cell => {
            cell.classList.toggle('active', cell.textContent === char);
        });
    }

    // --- Parameters Panel ---

    _initParamsPanel() {
        const bind = (id, prop, transform = parseFloat) => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => {
                const val = transform(el.value);
                this.project.settings[prop] = val;
                this.gridEditor.renderer.applySettings(this.project.settings);
                this.textPreview.applySettings(this.project.settings);
                this.gridEditor.render();
                this._updateTextPreview();
                this.project.markDirty();

                const valueEl = document.getElementById(id.replace('Slider', 'Value').replace('Toggle', 'Value'));
                if (valueEl) valueEl.textContent = typeof val === 'boolean' ? '' : val.toFixed ? val.toFixed(2) : val;
            });
        };

        bind('stemSlider', 'stemMultiplier');
        bind('strokesSlider', 'strokesNum', v => parseInt(v));
        bind('contrastSlider', 'strokeGapRatio');

        const boolBind = (id, prop) => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.project.settings[prop] = e.target.checked;
                this.gridEditor.renderer.applySettings(this.project.settings);
                this.textPreview.applySettings(this.project.settings);
                this.gridEditor.render();
                this._updateTextPreview();
                this.project.markDirty();
            });
        };

        boolBind('roundedCapsToggle', 'roundedCaps');
        boolBind('closeEndsToggle', 'closeEnds');

        document.getElementById('dashToggle').addEventListener('change', (e) => {
            this.project.settings.dashEnabled = e.target.checked;
            document.getElementById('dashParams').classList.toggle('visible', e.target.checked);
            this.gridEditor.renderer.applySettings(this.project.settings);
            this.textPreview.applySettings(this.project.settings);
            this.gridEditor.render();
            this._updateTextPreview();
            this.project.markDirty();
        });

        bind('dashLengthSlider', 'dashLength');
        bind('gapLengthSlider', 'gapLength');
        boolBind('dashChessToggle', 'dashChess');

        document.getElementById('wobblyToggle').addEventListener('change', (e) => {
            this.project.settings.wobblyEnabled = e.target.checked;
            document.getElementById('wobbleParams').classList.toggle('visible', e.target.checked);
            this.gridEditor.renderer.applySettings(this.project.settings);
            this.textPreview.applySettings(this.project.settings);
            this.gridEditor.render();
            this._updateTextPreview();
            this.project.markDirty();
        });

        bind('wobblyAmountSlider', 'wobblyAmount');
        bind('wobblyFreqSlider', 'wobblyFrequency');

        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.project.settings.color = e.target.value;
            this.gridEditor.renderer.applySettings(this.project.settings);
            this.textPreview.applySettings(this.project.settings);
            this.gridEditor.render();
            this._updateTextPreview();
            this.project.markDirty();
        });

        document.getElementById('bgColorPicker').addEventListener('input', (e) => {
            this.project.settings.bgColor = e.target.value;
            this.gridEditor.renderer.applySettings(this.project.settings);
            this.textPreview.applySettings(this.project.settings);
            this._updateTextPreview();
            this.project.markDirty();
        });
    }

    _syncParamsUI() {
        const s = this.project.settings;
        document.getElementById('stemSlider').value = s.stemMultiplier;
        document.getElementById('stemValue').textContent = s.stemMultiplier.toFixed(2);
        document.getElementById('strokesSlider').value = s.strokesNum;
        document.getElementById('strokesValue').textContent = s.strokesNum;
        document.getElementById('contrastSlider').value = s.strokeGapRatio;
        document.getElementById('contrastValue').textContent = s.strokeGapRatio.toFixed(1);
        document.getElementById('roundedCapsToggle').checked = s.roundedCaps;
        document.getElementById('closeEndsToggle').checked = s.closeEnds;
        document.getElementById('dashToggle').checked = s.dashEnabled;
        document.getElementById('dashParams').classList.toggle('visible', s.dashEnabled);
        document.getElementById('dashLengthSlider').value = s.dashLength;
        document.getElementById('dashLengthValue').textContent = s.dashLength.toFixed(2);
        document.getElementById('gapLengthSlider').value = s.gapLength;
        document.getElementById('gapLengthValue').textContent = s.gapLength.toFixed(2);
        document.getElementById('dashChessToggle').checked = s.dashChess;
        document.getElementById('wobblyToggle').checked = s.wobblyEnabled;
        document.getElementById('wobbleParams').classList.toggle('visible', s.wobblyEnabled);
        document.getElementById('wobblyAmountSlider').value = s.wobblyAmount;
        document.getElementById('wobblyAmountValue').textContent = s.wobblyAmount.toFixed(2);
        document.getElementById('wobblyFreqSlider').value = s.wobblyFrequency;
        document.getElementById('wobblyFreqValue').textContent = s.wobblyFrequency.toFixed(2);
        document.getElementById('colorPicker').value = s.color;
        document.getElementById('bgColorPicker').value = s.bgColor;
    }

    // --- Alternatives ---

    _initAlternativesPanel() {
        document.getElementById('addAltBtn').addEventListener('click', () => {
            if (!this.gridEditor.selectedChar) return;
            this.project.glyphStore.duplicateAsAlternative(this.gridEditor.selectedChar);
            this._updateAlternativesList();
            this.project.markDirty();
        });
    }

    _updateAlternativesList() {
        const list = document.getElementById('alternativesList');
        const char = this.gridEditor.selectedChar;
        if (!char) { list.innerHTML = ''; return; }

        const count = this.project.glyphStore.getVariantCount(char);
        list.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const item = document.createElement('div');
            item.className = 'alt-item';
            if (i === this.gridEditor.selectedVariant) item.classList.add('active');

            const label = document.createElement('span');
            label.className = 'alt-item-label';
            label.textContent = i === 0 ? 'Base' : `Alt ${i}`;
            item.appendChild(label);

            if (i > 0) {
                const del = document.createElement('button');
                del.className = 'alt-item-delete';
                del.textContent = '×';
                del.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.project.glyphStore.removeAlternative(char, i - 1);
                    if (this.gridEditor.selectedVariant >= i) {
                        this.gridEditor.selectedVariant = Math.max(0, this.gridEditor.selectedVariant - 1);
                    }
                    this._updateAlternativesList();
                    this.gridEditor.render();
                    this.project.markDirty();
                });
                item.appendChild(del);
            }

            item.addEventListener('click', () => {
                this.gridEditor.selectedVariant = i;
                this._updateAlternativesList();
                this.gridEditor.render();
            });

            list.appendChild(item);
        }
    }

    // --- Modals ---

    _initModals() {
        document.getElementById('closeModuleDesigner').addEventListener('click', () => {
            this._closeModal('moduleDesignerModal');
            this.moduleDesigner.deactivate();
        });
        document.getElementById('closeGridSettings').addEventListener('click', () => {
            this._closeModal('gridSettingsModal');
        });
        document.getElementById('closeAddChar').addEventListener('click', () => {
            this._closeModal('addCharModal');
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('visible');
                    this.moduleDesigner.deactivate();
                }
            });
        });

        document.getElementById('applyGridBtn').addEventListener('click', () => {
            const name = document.getElementById('gridProjectName').value || 'Untitled';
            const cols = parseInt(document.getElementById('gridCols').value) || 5;
            const rows = parseInt(document.getElementById('gridRows').value) || 5;

            this.project.projectName = name;
            this.project.setGridSize(cols, rows);
            document.getElementById('projectName').textContent = name;

            this._closeModal('gridSettingsModal');
            this.gridEditor._updateLayout();
            this.gridEditor.render();
            this._updateTextPreview();
            this.project.markDirty();
        });
    }

    _openModal(id) {
        document.getElementById(id).classList.add('visible');
    }

    _closeModal(id) {
        document.getElementById(id).classList.remove('visible');
    }

    _openGridSettings() {
        document.getElementById('gridProjectName').value = this.project.projectName;
        document.getElementById('gridCols').value = this.project.gridCols;
        document.getElementById('gridRows').value = this.project.gridRows;
        this._openModal('gridSettingsModal');
    }

    // --- Keyboard Shortcuts ---

    _initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.project.saveToFile();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
                e.preventDefault();
                document.getElementById('openProjectInput').click();
            }
        });
    }

    // --- Export ---

    _exportSVG() {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = this.project.settings.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const text = document.getElementById('previewText').value || 'HELLO';
        this.textPreview.renderer.drawText(
            ctx, text.toUpperCase(),
            this.project.glyphStore,
            this.project.moduleRegistry,
            30, 30, 50,
            { letterSpacing: 0.2, lineHeight: 1.5 }
        );

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${this.project.projectName}_preview.png`;
        a.click();
    }

    _exportPNG() {
        this._exportSVG();
    }

    // --- Refresh All ---

    _refreshAll() {
        document.getElementById('projectName').textContent = this.project.projectName;
        this.gridEditor.renderer.applySettings(this.project.settings);
        this.textPreview.applySettings(this.project.settings);
        this._refreshModuleList();
        this._refreshCharGrid();
        this._syncParamsUI();

        const chars = this.project.glyphStore.getChars();
        if (chars.length > 0) {
            this.gridEditor.selectChar(chars[0]);
            this._highlightActiveChar(chars[0]);
        }

        this._updateAlternativesList();
        this.gridEditor._updateLayout();
        this.gridEditor.render();
        this._updateTextPreview();
    }

    // --- Autosave ---

    _startAutosave() {
        setInterval(() => {
            if (this.project.isDirty) {
                this.project.autosave();
            }
        }, 5000);
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
    window.glypApp = new GlypApp();
});
