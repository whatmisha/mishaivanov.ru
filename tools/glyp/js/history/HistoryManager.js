/**
 * HistoryManager — undo/redo system for the editor.
 * Stores snapshots of state as JSON-serializable objects.
 */

export class HistoryManager {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.undoStack = [];
        this.redoStack = [];
        this._currentState = null;
    }

    /**
     * Initialize with the starting state.
     */
    init(state) {
        this._currentState = JSON.stringify(state);
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Push a new state onto the history.
     * Clears redo stack.
     */
    push(state) {
        const serialized = JSON.stringify(state);
        if (serialized === this._currentState) return;

        this.undoStack.push(this._currentState);
        this._currentState = serialized;
        this.redoStack = [];

        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Undo: revert to previous state.
     * @returns {object|null} Previous state, or null if nothing to undo
     */
    undo() {
        if (this.undoStack.length === 0) return null;

        this.redoStack.push(this._currentState);
        this._currentState = this.undoStack.pop();
        return JSON.parse(this._currentState);
    }

    /**
     * Redo: reapply undone state.
     * @returns {object|null} Next state, or null if nothing to redo
     */
    redo() {
        if (this.redoStack.length === 0) return null;

        this.undoStack.push(this._currentState);
        this._currentState = this.redoStack.pop();
        return JSON.parse(this._currentState);
    }

    /**
     * Get current state.
     */
    getCurrent() {
        return this._currentState ? JSON.parse(this._currentState) : null;
    }

    get canUndo() {
        return this.undoStack.length > 0;
    }

    get canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history.
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this._currentState = null;
    }
}
