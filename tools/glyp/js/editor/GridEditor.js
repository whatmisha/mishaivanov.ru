/**
 * GridEditor — canvas-based grid editor for composing glyphs from modules.
 * Supports arbitrary NxM grids, module placement, rotation, and visual feedback.
 */

import { ParametricRenderer } from '../core/ParametricRenderer.js';
import { SVGPathParser } from '../core/SVGPathParser.js';
import { JointDetector } from '../core/JointDetector.js';
import { HistoryManager } from '../history/HistoryManager.js';

export class GridEditor {
    constructor(canvas, registry, glyphStore) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.registry = registry;
        this.glyphStore = glyphStore;
        this.renderer = new ParametricRenderer();
        this.history = new HistoryManager();

        this.selectedChar = null;
        this.selectedVariant = 0;

        this.currentModuleId = null;
        this.currentRotation = 0;

        this.hoveredCell = null;
        this.isMouseDown = false;
        this.lastProcessedCell = null;

        this.showGrid = true;
        this.showJoints = false;
        this.showEndpoints = false;

        this.padding = 20;
        this._cellSize = 0;
        this._gridOriginX = 0;
        this._gridOriginY = 0;

        this._boundHandlers = {
            mousedown: this._onMouseDown.bind(this),
            mouseup: this._onMouseUp.bind(this),
            mousemove: this._onMouseMove.bind(this),
            mouseleave: this._onMouseLeave.bind(this),
            contextmenu: this._onContextMenu.bind(this),
            keydown: this._onKeyDown.bind(this)
        };

        this._active = false;
    }

    activate() {
        if (this._active) return;
        this._active = true;

        this.canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
        this.canvas.addEventListener('mouseup', this._boundHandlers.mouseup);
        this.canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
        this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);
        this.canvas.addEventListener('contextmenu', this._boundHandlers.contextmenu);
        document.addEventListener('keydown', this._boundHandlers.keydown);

        this._updateLayout();
        this.render();
    }

    deactivate() {
        if (!this._active) return;
        this._active = false;

        this.canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
        this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseup);
        this.canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
        this.canvas.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
        this.canvas.removeEventListener('contextmenu', this._boundHandlers.contextmenu);
        document.removeEventListener('keydown', this._boundHandlers.keydown);
    }

    /**
     * Select a character to edit.
     */
    selectChar(char, variantIndex = 0) {
        this.selectedChar = char;
        this.selectedVariant = variantIndex;

        if (char && !this.glyphStore.hasGlyph(char)) {
            this.glyphStore.setGlyph(char, this.glyphStore.createEmptyCells());
        }

        this._saveHistorySnapshot();
        this.render();
    }

    /**
     * Set the current module to place.
     */
    setModule(moduleId) {
        this.currentModuleId = moduleId;
    }

    /**
     * Set current rotation (0-3).
     */
    setRotation(rotation) {
        this.currentRotation = ((rotation % 4) + 4) % 4;
    }

    /**
     * Rotate current rotation by +1 (clockwise).
     */
    rotateCW() {
        this.setRotation(this.currentRotation + 1);
    }

    /**
     * Rotate current rotation by -1 (counter-clockwise).
     */
    rotateCCW() {
        this.setRotation(this.currentRotation - 1);
    }

    /**
     * Get the current cells being edited.
     */
    getCurrentCells() {
        if (!this.selectedChar) return null;
        return this.glyphStore.getVariant(this.selectedChar, this.selectedVariant);
    }

    // --- Layout ---

    _updateLayout() {
        const cols = this.glyphStore.gridCols;
        const rows = this.glyphStore.gridRows;
        const availW = this.canvas.width - this.padding * 2;
        const availH = this.canvas.height - this.padding * 2;

        this._cellSize = Math.floor(Math.min(availW / cols, availH / rows));
        this._gridOriginX = Math.floor((this.canvas.width - cols * this._cellSize) / 2);
        this._gridOriginY = Math.floor((this.canvas.height - rows * this._cellSize) / 2);
    }

    /**
     * Resize the canvas and recalculate layout.
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this._updateLayout();
        this.render();
    }

    // --- Rendering ---

    render() {
        if (!this._active) return;

        const ctx = this.ctx;
        const cols = this.glyphStore.gridCols;
        const rows = this.glyphStore.gridRows;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.showGrid) {
            this.renderer.drawGrid(
                ctx, this._gridOriginX, this._gridOriginY,
                cols, rows, this._cellSize
            );
        }

        const cells = this.getCurrentCells();
        if (cells) {
            this.renderer.drawGlyph(
                ctx, cells, cols, rows, this.registry,
                this._gridOriginX, this._gridOriginY, this._cellSize
            );

            if (this.showJoints) {
                const joints = JointDetector.getJoints(cells, cols, rows, this.registry);
                this.renderer.drawJoints(
                    ctx, joints, this._gridOriginX, this._gridOriginY, this._cellSize
                );
            }

            if (this.showEndpoints) {
                const endpoints = JointDetector.getFreeEndpoints(cells, cols, rows, this.registry);
                this.renderer.drawEndpoints(
                    ctx, endpoints, this._gridOriginX, this._gridOriginY, this._cellSize
                );
            }
        }

        if (this.hoveredCell && this.currentModuleId) {
            this._drawHoverPreview();
        }
    }

    _drawHoverPreview() {
        const { row, col } = this.hoveredCell;
        const ctx = this.ctx;
        const cellX = this._gridOriginX + col * this._cellSize;
        const cellY = this._gridOriginY + row * this._cellSize;

        ctx.save();
        ctx.globalAlpha = 0.4;

        const mod = this.registry.get(this.currentModuleId);
        if (mod && mod.paths.length > 0) {
            for (const pathDef of mod.paths) {
                const rotated = SVGPathParser.rotateCommands(pathDef.commands, this.currentRotation);
                this.renderer.drawPath(ctx, rotated, cellX, cellY, this._cellSize, this._cellSize);
            }
        }

        ctx.restore();
    }

    // --- Cell operations ---

    _getCellFromMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor((x - this._gridOriginX) / this._cellSize);
        const row = Math.floor((y - this._gridOriginY) / this._cellSize);

        const cols = this.glyphStore.gridCols;
        const rows = this.glyphStore.gridRows;

        if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
        return { row, col };
    }

    _placeModule(row, col) {
        if (!this.selectedChar) return;

        this.glyphStore.setCell(
            this.selectedChar, row, col,
            this.currentModuleId, this.currentRotation,
            this.selectedVariant
        );

        this.render();
        this._emitChange();
    }

    _clearCell(row, col) {
        if (!this.selectedChar) return;

        this.glyphStore.setCell(
            this.selectedChar, row, col,
            null, 0,
            this.selectedVariant
        );

        this.render();
        this._emitChange();
    }

    _saveHistorySnapshot() {
        const cells = this.getCurrentCells();
        if (cells) {
            this.history.push({
                char: this.selectedChar,
                variant: this.selectedVariant,
                cells: cells.map(c => ({ ...c }))
            });
        }
    }

    _restoreFromHistory(state) {
        if (!state) return;
        if (state.variant === 0) {
            this.glyphStore.setGlyph(state.char, state.cells);
        } else {
            this.glyphStore.setAlternative(state.char, state.variant - 1, state.cells);
        }
        this.render();
        this._emitChange();
    }

    undo() {
        const state = this.history.undo();
        if (state) this._restoreFromHistory(state);
    }

    redo() {
        const state = this.history.redo();
        if (state) this._restoreFromHistory(state);
    }

    // --- Events ---

    _onMouseDown(e) {
        if (e.button === 2) return;
        this.isMouseDown = true;
        const cell = this._getCellFromMouse(e);
        if (!cell) return;

        this._saveHistorySnapshot();

        if (this.currentModuleId) {
            this._placeModule(cell.row, cell.col);
        } else {
            this._clearCell(cell.row, cell.col);
        }
        this.lastProcessedCell = cell;
    }

    _onMouseUp() {
        this.isMouseDown = false;
        this.lastProcessedCell = null;
    }

    _onMouseMove(e) {
        const cell = this._getCellFromMouse(e);
        this.hoveredCell = cell;

        if (this.isMouseDown && cell) {
            if (!this.lastProcessedCell ||
                this.lastProcessedCell.row !== cell.row ||
                this.lastProcessedCell.col !== cell.col) {
                if (this.currentModuleId) {
                    this._placeModule(cell.row, cell.col);
                } else {
                    this._clearCell(cell.row, cell.col);
                }
                this.lastProcessedCell = cell;
            }
        }

        this.render();
    }

    _onMouseLeave() {
        this.hoveredCell = null;
        this.isMouseDown = false;
        this.lastProcessedCell = null;
        this.render();
    }

    _onContextMenu(e) {
        e.preventDefault();
        const cell = this._getCellFromMouse(e);
        if (cell) {
            this._saveHistorySnapshot();
            this._clearCell(cell.row, cell.col);
        }
    }

    _onKeyDown(e) {
        if (e.metaKey || e.ctrlKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.redo();
                else this.undo();
                return;
            }
        }

        if (e.key === 'ArrowRight' || e.key === 'e') {
            e.preventDefault();
            this.rotateCW();
            this.render();
            this._emitRotationChange();
        } else if (e.key === 'ArrowLeft' || e.key === 'q') {
            e.preventDefault();
            this.rotateCCW();
            this.render();
            this._emitRotationChange();
        }

        const mod = this.registry.getByShortcut(e.key);
        if (mod) {
            this.currentModuleId = mod.id;
            this.render();
            this._emitModuleChange();
        }

        if (e.key === 'Escape' || e.key === 'Delete' || e.key === 'Backspace') {
            this.currentModuleId = null;
            this.render();
            this._emitModuleChange();
        }
    }

    _emitChange() {
        this.canvas.dispatchEvent(new CustomEvent('glyphchange', {
            detail: { char: this.selectedChar, variant: this.selectedVariant }
        }));
    }

    _emitRotationChange() {
        this.canvas.dispatchEvent(new CustomEvent('rotationchange', {
            detail: { rotation: this.currentRotation }
        }));
    }

    _emitModuleChange() {
        this.canvas.dispatchEvent(new CustomEvent('modulechange', {
            detail: { moduleId: this.currentModuleId }
        }));
    }
}
