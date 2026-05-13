/**
 * HistoryManager — управление историей изменений (undo/redo)
 *
 * Snapshot-based: хранит полные снэпшоты состояния. Поддерживает транзакции
 * для группировки серии изменений в одно действие (например, drag слайдера).
 *
 * Базовый сценарий:
 *   const history = new HistoryManager({ maxSize: 50 });
 *
 *   // Мгновенное действие
 *   history.saveSnapshot(getState(), 'toggle grid');
 *
 *   // Транзакция (drag, серия set-ов)
 *   history.beginAction('adjust stem', getState());
 *   // ... изменения состояния ...
 *   history.commitAction(getState());
 *
 *   // Откат
 *   const prev = history.undo();
 *   if (prev) applyState(prev);
 */
export class HistoryManager {
    /**
     * @param {Object} [options]
     * @param {number} [options.maxSize=50] — максимальный размер истории
     * @param {Function} [options.stateSerializer] — кастомный сериализатор состояния
     * @param {Function} [options.stateComparator] — кастомная функция сравнения
     */
    constructor(options = {}) {
        this.maxSize = options.maxSize || 50;
        this.stateSerializer = options.stateSerializer || this._defaultSerializer;
        this.stateComparator = options.stateComparator || this._defaultComparator;

        this.history = [];
        this.historyIndex = -1;
        this.currentTransaction = null;
        this.isRestoring = false;
    }

    _defaultSerializer(state) {
        return JSON.parse(JSON.stringify(state));
    }

    _defaultComparator(state1, state2) {
        return JSON.stringify(state1) === JSON.stringify(state2);
    }

    /**
     * Начать транзакцию: сохраняет состояние "до"
     * @param {string} [label] — метка для отладки
     * @param {Object} [currentState] — состояние "до"
     */
    beginAction(label = '', currentState = null) {
        if (this.isRestoring) return;

        if (this.currentTransaction) {
            this.cancelAction();
        }

        const beforeState = currentState ? this.stateSerializer(currentState) : null;

        this.currentTransaction = {
            label,
            beforeState,
            startIndex: this.historyIndex
        };
    }

    /**
     * Завершить транзакцию. Если состояние не изменилось — ничего не пишет.
     * @param {Object} afterState
     * @returns {boolean} true если запись произошла
     */
    commitAction(afterState) {
        if (this.isRestoring) return false;

        if (!this.currentTransaction) {
            return this.saveSnapshot(afterState);
        }

        const { beforeState, label } = this.currentTransaction;
        const serializedAfter = this.stateSerializer(afterState);

        if (beforeState && this.stateComparator(beforeState, serializedAfter)) {
            this.currentTransaction = null;
            return false;
        }

        const safeIndex = Math.max(0, this.historyIndex);
        if (this.history.length > 0) {
            this.history = this.history.slice(0, safeIndex + 1);
        }

        this.history.push({
            state: serializedAfter,
            label: label || 'action',
            timestamp: Date.now()
        });

        this.historyIndex = this.history.length - 1;

        if (this.history.length > this.maxSize) {
            this.history.shift();
            this.historyIndex--;
        }

        this.currentTransaction = null;
        return true;
    }

    /**
     * Отменить текущую транзакцию без записи в историю
     */
    cancelAction() {
        this.currentTransaction = null;
    }

    /**
     * Сохранить снэпшот без транзакции (для мгновенных действий)
     * @param {Object} state
     * @param {string} [label]
     * @returns {boolean} true если запись произошла
     */
    saveSnapshot(state, label = '') {
        if (this.isRestoring) return false;

        if (this.currentTransaction) {
            this.cancelAction();
        }

        const serializedState = this.stateSerializer(state);

        if (
            this.history.length > 0 &&
            this.historyIndex >= 0 &&
            this.historyIndex < this.history.length
        ) {
            const lastState = this.history[this.historyIndex].state;
            if (this.stateComparator(lastState, serializedState)) {
                return false;
            }
        }

        if (this.history.length === 0) {
            this.history.push({
                state: serializedState,
                label: label || 'snapshot',
                timestamp: Date.now()
            });
            this.historyIndex = 0;
            return true;
        }

        const safeIndex = Math.max(0, Math.min(this.historyIndex, this.history.length - 1));
        this.history = this.history.slice(0, safeIndex + 1);

        this.history.push({
            state: serializedState,
            label: label || 'snapshot',
            timestamp: Date.now()
        });

        this.historyIndex = this.history.length - 1;

        if (this.history.length > this.maxSize) {
            this.history.shift();
            this.historyIndex--;
        }

        return true;
    }

    /**
     * Откат к предыдущему состоянию
     * @returns {Object|null}
     */
    undo() {
        if (!this.canUndo()) return null;

        if (this.currentTransaction) {
            this.cancelAction();
        }

        this.historyIndex--;
        if (this.historyIndex < 0) this.historyIndex = 0;

        return this.history[this.historyIndex].state;
    }

    /**
     * Повтор отменённого действия
     * @returns {Object|null}
     */
    redo() {
        if (!this.canRedo()) return null;

        if (this.currentTransaction) {
            this.cancelAction();
        }

        this.historyIndex++;
        if (this.historyIndex >= this.history.length) {
            this.historyIndex = this.history.length - 1;
            return null;
        }

        return this.history[this.historyIndex].state;
    }

    canUndo() {
        return this.history.length > 0 && this.historyIndex > 0;
    }

    canRedo() {
        return this.history.length > 0 && this.historyIndex < this.history.length - 1;
    }

    getCurrentState() {
        if (this.history.length === 0) return null;
        const safeIndex = Math.max(0, Math.min(this.historyIndex, this.history.length - 1));
        return this.history[safeIndex].state;
    }

    clear() {
        this.history = [];
        this.historyIndex = -1;
        this.currentTransaction = null;
    }

    /**
     * Блокирует запись в историю на время восстановления состояния
     * @param {boolean} value
     */
    setRestoring(value) {
        this.isRestoring = value;
    }

    /**
     * Диагностика
     * @returns {Object}
     */
    getHistoryInfo() {
        return {
            size: this.history.length,
            index: this.historyIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            hasTransaction: !!this.currentTransaction,
            transactionLabel: this.currentTransaction?.label || null
        };
    }
}
