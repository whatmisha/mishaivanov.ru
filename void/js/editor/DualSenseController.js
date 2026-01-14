/**
 * DualSense Controller Support for Glyph Editor
 * Control glyph editor with PlayStation 5 controller
 */

export default class DualSenseController {
    constructor(editorApp, glyphEditor) {
        this.editorApp = editorApp;
        this.glyphEditor = glyphEditor;
        
        this.gamepadIndex = null;
        
        this.buttonStates = {};
        
        this.cursorRow = 2;
        this.cursorCol = 2;
        
        this.cursorSpeed = 0.12;
        this.cursorAccumulator = { x: 0, y: 0 };
        
        this.stickDeadZone = 0.15;
        
        this.isActive = false;
        
        this.isButtonDown = false;
        this.startCell = null;
        this.lastProcessedCell = null;
        this.wasDrag = false;
        
        this.updateInterval = null;
        
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
        
        window.addEventListener('gamepadconnected', this.handleGamepadConnected);
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        
        this.checkConnectedGamepads();
        
        this.startUpdateLoop();
        
        console.log('[DualSenseController] Activated');
    }
    
    /**
     * Deactivate controller
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
     * Check already connected controllers
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
        const id = gamepad.id.toLowerCase();
        return id.includes('dualsense') || 
               id.includes('wireless controller') ||
               id.includes('054c:0ce6');
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
     * Handle controller disconnection
     */
    handleGamepadDisconnected(e) {
        if (e.gamepad.index === this.gamepadIndex) {
            console.log('[DualSenseController] DualSense disconnected');
            this.gamepadIndex = null;
        }
    }
    
    /**
     * Start update loop
     */
    startUpdateLoop() {
        if (this.updateInterval) return;
        
        this.updateInterval = setInterval(() => {
            if (this.isActive) {
                this.update();
            }
        }, 16);
    }
    
    /**
     * Stop update loop
     */
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Main update loop
     */
    update() {
        if (this.gamepadIndex === null) return;
        
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (!gamepad) {
            this.gamepadIndex = null;
            return;
        }
        
        this.handleCursorMovement(gamepad);
        
        this.handleButtons(gamepad);
        
        this.handleTriggers(gamepad);
    }
    
    /**
     * Handle D-Pad and left stick for cursor movement on canvas
     */
    handleCursorMovement(gamepad) {
        const dpadUp = gamepad.buttons[12]?.pressed || false;
        const dpadDown = gamepad.buttons[13]?.pressed || false;
        const dpadLeft = gamepad.buttons[14]?.pressed || false;
        const dpadRight = gamepad.buttons[15]?.pressed || false;
        
        const leftStickX = gamepad.axes[0] || 0;
        const leftStickY = gamepad.axes[1] || 0;
        
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
        
        const absX = Math.abs(leftStickX);
        const absY = Math.abs(leftStickY);
        
        if (absX < this.stickDeadZone && absY < this.stickDeadZone) {
            this.cursorAccumulator.x = 0;
            this.cursorAccumulator.y = 0;
            return;
        }
        
        this.cursorAccumulator.x += leftStickX * this.cursorSpeed;
        this.cursorAccumulator.y += leftStickY * this.cursorSpeed;
        
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
     * Update cursor visual display
     */
    updateCursorVisual() {
        if (this.glyphEditor) {
            this.cursorRow = Math.max(0, Math.min(4, this.cursorRow));
            this.cursorCol = Math.max(0, Math.min(4, this.cursorCol));
            
            const row = this.cursorRow;
            const col = this.cursorCol;
            
            const cellChanged = !this.glyphEditor.hoveredCell ||
                this.glyphEditor.hoveredCell.row !== row ||
                this.glyphEditor.hoveredCell.col !== col;
            
            this.glyphEditor.hoveredCell = {
                row: row,
                col: col
            };
            
            if (this.isButtonDown && cellChanged) {
                if (!this.wasDrag && this.startCell) {
                    this.wasDrag = true;
                    
                    this.glyphEditor.grid[this.startCell.row][this.startCell.col] = {
                        type: this.glyphEditor.getCurrentModuleType(),
                        rotation: this.glyphEditor.currentRotation
                    };
                    this.lastProcessedCell = { row: this.startCell.row, col: this.startCell.col };
                    this.glyphEditor.updateGlyphString();
                    this.glyphEditor.autoSave();
                }
                
                if (!this.lastProcessedCell || 
                    this.lastProcessedCell.row !== row || 
                    this.lastProcessedCell.col !== col) {
                    
                    this.glyphEditor.grid[row][col] = {
                        type: this.glyphEditor.getCurrentModuleType(),
                        rotation: this.glyphEditor.currentRotation
                    };
                    
                    this.lastProcessedCell = { row, col };
                    
                    this.glyphEditor.updateGlyphString();
                    this.glyphEditor.autoSave();
                }
            }
            
            if (!this.isButtonDown && this.glyphEditor.grid[row][col]) {
                const module = this.glyphEditor.grid[row][col];
                this.glyphEditor.currentRotation = module.rotation;
                const moduleIndex = this.glyphEditor.moduleTypes.indexOf(module.type);
                if (moduleIndex !== -1) {
                    this.glyphEditor.currentModuleIndex = moduleIndex;
                }
            }
            
            this.glyphEditor.render();
        }
    }
    
    /**
     * Обработка кнопок
     */
    handleButtons(gamepad) {
        // 8 = Share
        // 9 = Options
        
        const x = gamepad.buttons[0]?.pressed || false;
        const circle = gamepad.buttons[1]?.pressed || false;
        const triangle = gamepad.buttons[2]?.pressed || false;
        const square = gamepad.buttons[3]?.pressed || false;
        const l1 = gamepad.buttons[4]?.pressed || false;
        const r1 = gamepad.buttons[5]?.pressed || false;
        
        if (x && !this.buttonStates['x']) {
            this.buttonStates['x'] = true;
            this.handleButtonDown();
        } else if (!x && this.buttonStates['x']) {
            this.buttonStates['x'] = false;
            this.handleButtonUp();
        }
        
        if (circle && !this.buttonStates['circle']) {
            this.buttonStates['circle'] = true;
            this.changeModuleUp();
        } else if (!circle) {
            this.buttonStates['circle'] = false;
        }
        
        if (triangle && !this.buttonStates['triangle']) {
            this.buttonStates['triangle'] = true;
            this.rotateModuleRight();
        } else if (!triangle) {
            this.buttonStates['triangle'] = false;
        }
        
        if (square && !this.buttonStates['square']) {
            this.buttonStates['square'] = true;
            this.changeModuleUp();
        } else if (!square) {
            this.buttonStates['square'] = false;
        }
        
        if (l1 && !this.buttonStates['l1']) {
            this.buttonStates['l1'] = true;
            this.rotateModuleLeft();
        } else if (!l1) {
            this.buttonStates['l1'] = false;
        }
        
        if (r1 && !this.buttonStates['r1']) {
            this.buttonStates['r1'] = true;
            this.rotateModuleRight();
        } else if (!r1) {
            this.buttonStates['r1'] = false;
        }
    }
    
    /**
     * Handle X button press
     */
    handleButtonDown() {
        if (!this.glyphEditor) return;
        
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.isButtonDown = true;
        this.wasDrag = false;
        this.startCell = { row, col };
        this.lastProcessedCell = null;
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.lastProcessedCell = { row, col };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
            this.glyphEditor.render();
        }
    }
    
    /**
     * Handle X button release
     */
    handleButtonUp() {
        if (!this.glyphEditor) return;
        
        if (this.isButtonDown && this.wasDrag) {
            const row = Math.max(0, Math.min(4, this.cursorRow));
            const col = Math.max(0, Math.min(4, this.cursorCol));
            
            if (!this.lastProcessedCell || 
                this.lastProcessedCell.row !== row || 
                this.lastProcessedCell.col !== col) {
                
                this.glyphEditor.grid[row][col] = {
                    type: this.glyphEditor.getCurrentModuleType(),
                    rotation: this.glyphEditor.currentRotation
                };
                
                this.glyphEditor.updateGlyphString();
                this.glyphEditor.autoSave();
                this.glyphEditor.render();
            }
        }
        else if (this.isButtonDown && !this.wasDrag) {
            const row = Math.max(0, Math.min(4, this.cursorRow));
            const col = Math.max(0, Math.min(4, this.cursorCol));
            
            if (this.glyphEditor.grid[row][col]) {
                this.glyphEditor.grid[row][col] = null;
            }
            else {
                this.glyphEditor.grid[row][col] = {
                    type: this.glyphEditor.getCurrentModuleType(),
                    rotation: this.glyphEditor.currentRotation
                };
            }
            
            this.glyphEditor.render();
            this.glyphEditor.updateModuleInfo();
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        
        this.isButtonDown = false;
        this.lastProcessedCell = null;
        this.startCell = null;
        this.wasDrag = false;
    }
    
    /**
     * Разместить или удалить модуль на текущей позиции курсора
     */
    placeOrRemoveModule() {
        if (!this.glyphEditor) return;
        
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = null;
        } else {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
        }
        
        this.glyphEditor.hoveredCell = { row, col };
        
        this.glyphEditor.render();
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.updateGlyphString();
        this.glyphEditor.autoSave();
    }
    
    /**
     * Remove module at current cursor position
     */
    removeModule() {
        if (!this.glyphEditor) return;
        
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = null;
            
            this.glyphEditor.hoveredCell = { row, col };
            
            this.glyphEditor.render();
            this.glyphEditor.updateModuleInfo();
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
    }
    
    /**
     * Rotate module right
     */
    rotateModuleRight() {
        if (!this.glyphEditor) return;
        
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentRotation = (this.glyphEditor.currentRotation + 1) % 4;
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        else if (this.isButtonDown) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.lastProcessedCell = { row, col };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
    
    /**
     * Change module (up in list)
     */
    changeModuleUp() {
        if (!this.glyphEditor) return;
        
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentModuleIndex = (this.glyphEditor.currentModuleIndex - 1 + this.glyphEditor.moduleTypes.length) % this.glyphEditor.moduleTypes.length;
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        else if (this.isButtonDown) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.lastProcessedCell = { row, col };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
    
    /**
     * Select previous alternative
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
        
        const l2 = gamepad.buttons[6]?.pressed || false;
        const r2 = gamepad.buttons[7]?.pressed || false;
        
        if (l2 && !this.buttonStates['l2']) {
            this.buttonStates['l2'] = true;
            this.changeModuleUp();
        } else if (!l2) {
            this.buttonStates['l2'] = false;
        }
        
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
        
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentRotation = (this.glyphEditor.currentRotation - 1 + 4) % 4;
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        else if (this.isButtonDown) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.lastProcessedCell = { row, col };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
    
    /**
     * Изменить модуль (вниз по списку)
     */
    changeModuleDown() {
        if (!this.glyphEditor) return;
        
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentModuleIndex = (this.glyphEditor.currentModuleIndex + 1) % this.glyphEditor.moduleTypes.length;
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        else if (this.isButtonDown) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.lastProcessedCell = { row, col };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        
        this.glyphEditor.updateModuleInfo();
        this.glyphEditor.render();
    }
}
