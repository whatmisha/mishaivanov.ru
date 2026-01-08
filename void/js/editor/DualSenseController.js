/**
 * DualSense Controller Support для Glyph Editor
 * Управление редактором глифов с помощью контроллера PlayStation 5
 */

export default class DualSenseController {
    constructor(editorApp, glyphEditor) {
        this.editorApp = editorApp;
        this.glyphEditor = glyphEditor;
        
        // Индекс подключенного контроллера
        this.gamepadIndex = null;
        
        // Состояние кнопок (для предотвращения повторных нажатий)
        this.buttonStates = {};
        
        // Позиция курсора на канвасе (управляется правым стиком)
        this.cursorRow = 2; // Центр сетки 5x5
        this.cursorCol = 2;
        
        // Скорость движения курсора
        this.cursorSpeed = 0.12;
        this.cursorAccumulator = { x: 0, y: 0 };
        
        // Порог для активации движения стика
        this.stickDeadZone = 0.15;
        
        // Флаг активности
        this.isActive = false;
        
        // Интервал для обновления состояния
        this.updateInterval = null;
        
        // Привязка методов
        this.handleGamepadConnected = this.handleGamepadConnected.bind(this);
        this.handleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
        this.update = this.update.bind(this);
    }
    
    /**
     * Активировать контроллер
     */
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Слушать события подключения/отключения
        window.addEventListener('gamepadconnected', this.handleGamepadConnected);
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        
        // Проверить уже подключенные контроллеры
        this.checkConnectedGamepads();
        
        // Запустить цикл обновления
        this.startUpdateLoop();
        
        console.log('[DualSenseController] Activated');
    }
    
    /**
     * Деактивировать контроллер
     */
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
        window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        
        this.stopUpdateLoop();
        
        this.gamepadIndex = null;
        
        console.log('[DualSenseController] Deactivated');
    }
    
    /**
     * Проверить уже подключенные контроллеры
     */
    checkConnectedGamepads() {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (gamepad && this.isDualSense(gamepad)) {
                this.gamepadIndex = i;
                console.log('[DualSenseController] Found connected DualSense:', gamepad.id);
                return;
            }
        }
    }
    
    /**
     * Проверить, является ли контроллер DualSense
     */
    isDualSense(gamepad) {
        // DualSense обычно имеет в названии "DualSense" или "Wireless Controller"
        const id = gamepad.id.toLowerCase();
        return id.includes('dualsense') || 
               id.includes('wireless controller') ||
               id.includes('054c:0ce6'); // Vendor ID для DualSense
    }
    
    /**
     * Обработчик подключения контроллера
     */
    handleGamepadConnected(e) {
        if (this.isDualSense(e.gamepad)) {
            this.gamepadIndex = e.gamepad.index;
            console.log('[DualSenseController] DualSense connected:', e.gamepad.id);
        }
    }
    
    /**
     * Обработчик отключения контроллера
     */
    handleGamepadDisconnected(e) {
        if (e.gamepad.index === this.gamepadIndex) {
            console.log('[DualSenseController] DualSense disconnected');
            this.gamepadIndex = null;
        }
    }
    
    /**
     * Запустить цикл обновления
     */
    startUpdateLoop() {
        if (this.updateInterval) return;
        
        // Обновление с частотой ~60 FPS
        this.updateInterval = setInterval(() => {
            if (this.isActive) {
                this.update();
            }
        }, 16);
    }
    
    /**
     * Остановить цикл обновления
     */
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Основной цикл обновления
     */
    update() {
        if (this.gamepadIndex === null) return;
        
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (!gamepad) {
            this.gamepadIndex = null;
            return;
        }
        
        // Обработка D-Pad и левого стика для управления курсором на канвасе
        this.handleCursorMovement(gamepad);
        
        // Обработка кнопок
        this.handleButtons(gamepad);
        
        // Обработка триггеров
        this.handleTriggers(gamepad);
    }
    
    /**
     * Обработка D-Pad и левого стика для управления курсором на канвасе
     */
    handleCursorMovement(gamepad) {
        // D-Pad на DualSense: кнопки 12-15
        // 12 = вверх, 13 = вниз, 14 = влево, 15 = вправо
        const dpadUp = gamepad.buttons[12]?.pressed || false;
        const dpadDown = gamepad.buttons[13]?.pressed || false;
        const dpadLeft = gamepad.buttons[14]?.pressed || false;
        const dpadRight = gamepad.buttons[15]?.pressed || false;
        
        // Левый стик: axes[0] (X), axes[1] (Y)
        const leftStickX = gamepad.axes[0] || 0;
        const leftStickY = gamepad.axes[1] || 0;
        
        // Обработка D-Pad (дискретные движения)
        if (dpadUp && !this.buttonStates['dpad_up']) {
            this.buttonStates['dpad_up'] = true;
            this.cursorRow = Math.max(0, this.cursorRow - 1);
            this.updateCursorVisual();
        } else if (!dpadUp) {
            this.buttonStates['dpad_up'] = false;
        }
        
        if (dpadDown && !this.buttonStates['dpad_down']) {
            this.buttonStates['dpad_down'] = true;
            this.cursorRow = Math.min(4, this.cursorRow + 1);
            this.updateCursorVisual();
        } else if (!dpadDown) {
            this.buttonStates['dpad_down'] = false;
        }
        
        if (dpadLeft && !this.buttonStates['dpad_left']) {
            this.buttonStates['dpad_left'] = true;
            this.cursorCol = Math.max(0, this.cursorCol - 1);
            this.updateCursorVisual();
        } else if (!dpadLeft) {
            this.buttonStates['dpad_left'] = false;
        }
        
        if (dpadRight && !this.buttonStates['dpad_right']) {
            this.buttonStates['dpad_right'] = true;
            this.cursorCol = Math.min(4, this.cursorCol + 1);
            this.updateCursorVisual();
        } else if (!dpadRight) {
            this.buttonStates['dpad_right'] = false;
        }
        
        // Обработка левого стика (плавные движения)
        const absX = Math.abs(leftStickX);
        const absY = Math.abs(leftStickY);
        
        if (absX < this.stickDeadZone && absY < this.stickDeadZone) {
            this.cursorAccumulator.x = 0;
            this.cursorAccumulator.y = 0;
            return;
        }
        
        // Накопить движение
        this.cursorAccumulator.x += leftStickX * this.cursorSpeed;
        this.cursorAccumulator.y += leftStickY * this.cursorSpeed;
        
        // Переместить курсор, если накопилось достаточно движения
        if (Math.abs(this.cursorAccumulator.x) >= 1) {
            const delta = Math.floor(this.cursorAccumulator.x);
            this.cursorCol = Math.max(0, Math.min(4, this.cursorCol + delta));
            this.cursorAccumulator.x -= delta;
            this.updateCursorVisual();
        }
        
        if (Math.abs(this.cursorAccumulator.y) >= 1) {
            const delta = Math.floor(this.cursorAccumulator.y);
            this.cursorRow = Math.max(0, Math.min(4, this.cursorRow + delta));
            this.cursorAccumulator.y -= delta;
            this.updateCursorVisual();
        }
    }
    
    /**
     * Обновить визуальное отображение курсора
     */
    updateCursorVisual() {
        // Обновляем hoveredCell в редакторе для визуальной индикации
        if (this.glyphEditor) {
            // Убедиться, что курсор в пределах сетки
            this.cursorRow = Math.max(0, Math.min(4, this.cursorRow));
            this.cursorCol = Math.max(0, Math.min(4, this.cursorCol));
            
            this.glyphEditor.hoveredCell = {
                row: this.cursorRow,
                col: this.cursorCol
            };
            this.glyphEditor.render();
        }
    }
    
    /**
     * Обработка кнопок
     */
    handleButtons(gamepad) {
        // DualSense кнопки:
        // 0 = X (крестик) - разместить/очистить модуль
        // 1 = Circle (круг) - переключить модуль
        // 2 = Triangle (треугольник) - повернуть модуль вправо
        // 3 = Square (квадрат) - переключить модуль (вверх по списку)
        // 4 = L1 - переключить на предыдущую альтернативу
        // 5 = R1 - переключить на следующую альтернативу
        // 8 = Share
        // 9 = Options
        // 10 = L3 (нажатие левого стика)
        // 11 = R3 (нажатие правого стика)
        
        const x = gamepad.buttons[0]?.pressed || false;
        const circle = gamepad.buttons[1]?.pressed || false;
        const triangle = gamepad.buttons[2]?.pressed || false;
        const square = gamepad.buttons[3]?.pressed || false;
        const l1 = gamepad.buttons[4]?.pressed || false;
        const r1 = gamepad.buttons[5]?.pressed || false;
        
        // X - разместить/очистить модуль (клик на текущей позиции курсора)
        if (x && !this.buttonStates['x']) {
            this.buttonStates['x'] = true;
            this.placeOrRemoveModule();
        } else if (!x) {
            this.buttonStates['x'] = false;
        }
        
        // Circle - переключить модуль (вверх по списку)
        if (circle && !this.buttonStates['circle']) {
            this.buttonStates['circle'] = true;
            this.changeModuleUp();
        } else if (!circle) {
            this.buttonStates['circle'] = false;
        }
        
        // Triangle - повернуть модуль вправо
        if (triangle && !this.buttonStates['triangle']) {
            this.buttonStates['triangle'] = true;
            this.rotateModuleRight();
        } else if (!triangle) {
            this.buttonStates['triangle'] = false;
        }
        
        // Square - переключить модуль (вверх по списку)
        if (square && !this.buttonStates['square']) {
            this.buttonStates['square'] = true;
            this.changeModuleUp();
        } else if (!square) {
            this.buttonStates['square'] = false;
        }
        
        // L1 - предыдущая альтернатива
        if (l1 && !this.buttonStates['l1']) {
            this.buttonStates['l1'] = true;
            this.selectPreviousAlternative();
        } else if (!l1) {
            this.buttonStates['l1'] = false;
        }
        
        // R1 - следующая альтернатива
        if (r1 && !this.buttonStates['r1']) {
            this.buttonStates['r1'] = true;
            this.selectNextAlternative();
        } else if (!r1) {
            this.buttonStates['r1'] = false;
        }
    }
    
    /**
     * Разместить или удалить модуль на текущей позиции курсора
     */
    placeOrRemoveModule() {
        if (!this.glyphEditor) return;
        
        // Убедиться, что курсор в пределах сетки
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        // Если ячейка пустая - добавить модуль, если занята - удалить
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = null;
        } else {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
        }
        
        // Обновить hoveredCell для визуальной индикации
        this.glyphEditor.hoveredCell = { row, col };
        
        this.glyphEditor.render();
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.updateGlyphString();
        this.glyphEditor.autoSave();
    }
    
    /**
     * Удалить модуль на текущей позиции курсора
     */
    removeModule() {
        if (!this.glyphEditor) return;
        
        // Убедиться, что курсор в пределах сетки
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = null;
            
            // Обновить hoveredCell для визуальной индикации
            this.glyphEditor.hoveredCell = { row, col };
            
            this.glyphEditor.render();
            this.glyphEditor.updateModuleInfo();
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
    }
    
    /**
     * Повернуть модуль вправо
     */
    rotateModuleRight() {
        if (!this.glyphEditor) return;
        
        this.glyphEditor.currentRotation = (this.glyphEditor.currentRotation + 1) % 4;
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
    
    /**
     * Изменить модуль (вверх по списку)
     */
    changeModuleUp() {
        if (!this.glyphEditor) return;
        
        this.glyphEditor.currentModuleIndex = (this.glyphEditor.currentModuleIndex - 1 + this.glyphEditor.moduleTypes.length) % this.glyphEditor.moduleTypes.length;
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
    
    /**
     * Выбрать предыдущую альтернативу
     */
    selectPreviousAlternative() {
        if (!this.editorApp || !this.editorApp.selectedChar) return;
        
        const alternatives = document.querySelectorAll('.alternative-item');
        const selectedIndex = Array.from(alternatives).findIndex(item => item.classList.contains('selected'));
        
        if (selectedIndex > 0) {
            const prevItem = alternatives[selectedIndex - 1];
            const indexStr = prevItem.dataset.index;
            const index = indexStr === 'base' ? null : parseInt(indexStr);
            this.editorApp.selectAlternative(index);
        }
    }
    
    /**
     * Выбрать следующую альтернативу
     */
    selectNextAlternative() {
        if (!this.editorApp || !this.editorApp.selectedChar) return;
        
        const alternatives = document.querySelectorAll('.alternative-item');
        const selectedIndex = Array.from(alternatives).findIndex(item => item.classList.contains('selected'));
        
        if (selectedIndex >= 0 && selectedIndex < alternatives.length - 1) {
            const nextItem = alternatives[selectedIndex + 1];
            const indexStr = nextItem.dataset.index;
            const index = indexStr === 'base' ? null : parseInt(indexStr);
            this.editorApp.selectAlternative(index);
        }
    }
    
    /**
     * Обработка триггеров
     */
    handleTriggers(gamepad) {
        // L2 (кнопка 6) - повернуть модуль влево
        // R2 (кнопка 7) - изменить модуль (вниз по списку)
        
        const l2 = gamepad.buttons[6]?.pressed || false;
        const r2 = gamepad.buttons[7]?.pressed || false;
        
        // L2 - повернуть модуль влево
        if (l2 && !this.buttonStates['l2']) {
            this.buttonStates['l2'] = true;
            this.rotateModuleLeft();
        } else if (!l2) {
            this.buttonStates['l2'] = false;
        }
        
        // R2 - изменить модуль (вниз по списку)
        if (r2 && !this.buttonStates['r2']) {
            this.buttonStates['r2'] = true;
            this.changeModuleDown();
        } else if (!r2) {
            this.buttonStates['r2'] = false;
        }
    }
    
    /**
     * Повернуть модуль влево
     */
    rotateModuleLeft() {
        if (!this.glyphEditor) return;
        
        this.glyphEditor.currentRotation = (this.glyphEditor.currentRotation - 1 + 4) % 4;
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
    
    /**
     * Изменить модуль (вниз по списку)
     */
    changeModuleDown() {
        if (!this.glyphEditor) return;
        
        this.glyphEditor.currentModuleIndex = (this.glyphEditor.currentModuleIndex + 1) % this.glyphEditor.moduleTypes.length;
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
}
