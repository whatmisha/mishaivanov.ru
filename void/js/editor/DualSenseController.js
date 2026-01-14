/**
 * DualSense Controller Support for Glyph Editor
 * Glyph editor control via PlayStation 5 controller
 */

export default class DualSenseController {
    constructor(editorApp, glyphEditor) {
        this.editorApp = editorApp;
        this.glyphEditor = glyphEditor;
        
        // Connected controller index
        this.gamepadIndex = null;
        
        // Button states (to prevent repeated presses)
        this.buttonStates = {};
        
        // Cursor position on canvas (controlled by right stick)
        this.cursorRow = 2; // Center of 5x5 grid
        this.cursorCol = 2;
        
        // Cursor movement speed
        this.cursorSpeed = 0.12;
        this.cursorAccumulator = { x: 0, y: 0 };
        
        // Threshold for stick movement activation
        this.stickDeadZone = 0.15;
        
        // Active flag
        this.isActive = false;
        
        // X button held flag (for continuous drawing)
        this.isButtonDown = false;
        this.startCell = null;
        this.lastProcessedCell = null;
        this.wasDrag = false;
        
        // Update interval
        this.updateInterval = null;
        
        // Bind methods
        this.handleGamepadConnected = this.handleGamepadConnected.bind(this);
        this.handleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
        this.update = this.update.bind(this);
    }
    
    /**
     * Activate controller
     */
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Listen for connect/disconnect events
        window.addEventListener('gamepadconnected', this.handleGamepadConnected);
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        
        // Check already connected controllers
        this.checkConnectedGamepads();
        
        // Start update loop
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
     * Check if controller is DualSense
     */
    isDualSense(gamepad) {
        // DualSense usually has "DualSense" or "Wireless Controller" in name
        const id = gamepad.id.toLowerCase();
        return id.includes('dualsense') || 
               id.includes('wireless controller') ||
               id.includes('054c:0ce6'); // Vendor ID for DualSense
    }
    
    /**
     * Controller connection handler
     */
    handleGamepadConnected(e) {
        if (this.isDualSense(e.gamepad)) {
            this.gamepadIndex = e.gamepad.index;
            console.log('[DualSenseController] DualSense connected:', e.gamepad.id);
        }
    }
    
    /**
     * Controller disconnection handler
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
        
        // Update at ~60 FPS
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
        
        // Handle D-Pad and left stick for cursor control on canvas
        this.handleCursorMovement(gamepad);
        
        // Handle buttons
        this.handleButtons(gamepad);
        
        // Handle triggers
        this.handleTriggers(gamepad);
    }
    
    /**
     * Handle D-Pad and left stick for cursor control on canvas
     */
    handleCursorMovement(gamepad) {
        // D-Pad on DualSense: buttons 12-15
        // 12 = up, 13 = down, 14 = left, 15 = right
        const dpadUp = gamepad.buttons[12]?.pressed || false;
        const dpadDown = gamepad.buttons[13]?.pressed || false;
        const dpadLeft = gamepad.buttons[14]?.pressed || false;
        const dpadRight = gamepad.buttons[15]?.pressed || false;
        
        // Left stick: axes[0] (X), axes[1] (Y)
        const leftStickX = gamepad.axes[0] || 0;
        const leftStickY = gamepad.axes[1] || 0;
        
        // Handle D-Pad (discrete movements)
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
        
        // Handle left stick (smooth movements)
        const absX = Math.abs(leftStickX);
        const absY = Math.abs(leftStickY);
        
        if (absX < this.stickDeadZone && absY < this.stickDeadZone) {
            this.cursorAccumulator.x = 0;
            this.cursorAccumulator.y = 0;
            return;
        }
        
        // Accumulate movement
        this.cursorAccumulator.x += leftStickX * this.cursorSpeed;
        this.cursorAccumulator.y += leftStickY * this.cursorSpeed;
        
        // Move cursor if enough movement accumulated
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
        // Update hoveredCell in editor for visual indication
        if (this.glyphEditor) {
            // Ensure cursor is within grid bounds
            this.cursorRow = Math.max(0, Math.min(4, this.cursorRow));
            this.cursorCol = Math.max(0, Math.min(4, this.cursorCol));
            
            const row = this.cursorRow;
            const col = this.cursorCol;
            
            // Check if cell changed
            const cellChanged = !this.glyphEditor.hoveredCell ||
                this.glyphEditor.hoveredCell.row !== row ||
                this.glyphEditor.hoveredCell.col !== col;
            
            this.glyphEditor.hoveredCell = {
                row: row,
                col: col
            };
            
            // If button held and cell changed, place module
            if (this.isButtonDown && cellChanged) {
                // If this is first movement after press, set drag flag
                // and place module on first cell (startCell)
                if (!this.wasDrag && this.startCell) {
                    this.wasDrag = true;
                    
                    // Place module on first cell
                    this.glyphEditor.grid[this.startCell.row][this.startCell.col] = {
                        type: this.glyphEditor.getCurrentModuleType(),
                        rotation: this.glyphEditor.currentRotation
                    };
                    this.lastProcessedCell = { row: this.startCell.row, col: this.startCell.col };
                    this.glyphEditor.updateGlyphString();
                    this.glyphEditor.autoSave();
                }
                
                // Check if we already processed this cell
                if (!this.lastProcessedCell || 
                    this.lastProcessedCell.row !== row || 
                    this.lastProcessedCell.col !== col) {
                    
                    // Place module
                    this.glyphEditor.grid[row][col] = {
                        type: this.glyphEditor.getCurrentModuleType(),
                        rotation: this.glyphEditor.currentRotation
                    };
                    
                    this.lastProcessedCell = { row, col };
                    
                    this.glyphEditor.updateGlyphString();
                    this.glyphEditor.autoSave();
                }
            }
            
            // Synchronize currentRotation and currentModuleIndex with module in cell
            // (if button not held and cell has module)
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
     * Handle buttons
     */
    handleButtons(gamepad) {
        // DualSense buttons:
        // 0 = X (cross) - place/clear module
        // 1 = Circle - switch module
        // 2 = Triangle - rotate module right
        // 3 = Square - switch module (up list)
        // 4 = L1 - rotate module left
        // 5 = R1 - rotate module right
        // 6 = L2 - change module type (up list)
        // 7 = R2 - change module type (down list)
        // 8 = Share
        // 9 = Options
        // 10 = L3 (left stick press)
        // 11 = R3 (right stick press)
        
        const x = gamepad.buttons[0]?.pressed || false;
        const circle = gamepad.buttons[1]?.pressed || false;
        const triangle = gamepad.buttons[2]?.pressed || false;
        const square = gamepad.buttons[3]?.pressed || false;
        const l1 = gamepad.buttons[4]?.pressed || false;
        const r1 = gamepad.buttons[5]?.pressed || false;
        
        // X - hold for continuous drawing or click to place/clear
        if (x && !this.buttonStates['x']) {
            this.buttonStates['x'] = true;
            this.handleButtonDown();
        } else if (!x && this.buttonStates['x']) {
            this.buttonStates['x'] = false;
            this.handleButtonUp();
        }
        
        // Circle - switch module (up list)
        if (circle && !this.buttonStates['circle']) {
            this.buttonStates['circle'] = true;
            this.changeModuleUp();
        } else if (!circle) {
            this.buttonStates['circle'] = false;
        }
        
        // Triangle - rotate module right
        if (triangle && !this.buttonStates['triangle']) {
            this.buttonStates['triangle'] = true;
            this.rotateModuleRight();
        } else if (!triangle) {
            this.buttonStates['triangle'] = false;
        }
        
        // Square - switch module (up list)
        if (square && !this.buttonStates['square']) {
            this.buttonStates['square'] = true;
            this.changeModuleUp();
        } else if (!square) {
            this.buttonStates['square'] = false;
        }
        
        // L1 - rotate module left
        if (l1 && !this.buttonStates['l1']) {
            this.buttonStates['l1'] = true;
            this.rotateModuleLeft();
        } else if (!l1) {
            this.buttonStates['l1'] = false;
        }
        
        // R1 - rotate module right
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
        
        // Ensure cursor is within grid bounds
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.isButtonDown = true;
        this.wasDrag = false;
        this.startCell = { row, col };
        this.lastProcessedCell = null;
        
        // If cell already filled, immediately place module (update it)
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
        
        // If button was held and there was drag, place module on last cell
        if (this.isButtonDown && this.wasDrag) {
            const row = Math.max(0, Math.min(4, this.cursorRow));
            const col = Math.max(0, Math.min(4, this.cursorCol));
            
            // Check if we already processed this cell
            if (!this.lastProcessedCell || 
                this.lastProcessedCell.row !== row || 
                this.lastProcessedCell.col !== col) {
                
                // Place module on last cell
                this.glyphEditor.grid[row][col] = {
                    type: this.glyphEditor.getCurrentModuleType(),
                    rotation: this.glyphEditor.currentRotation
                };
                
                this.glyphEditor.updateGlyphString();
                this.glyphEditor.autoSave();
                this.glyphEditor.render();
            }
        }
        // If no drag (just click), handle as click
        else if (this.isButtonDown && !this.wasDrag) {
            const row = Math.max(0, Math.min(4, this.cursorRow));
            const col = Math.max(0, Math.min(4, this.cursorCol));
            
            // If cell occupied - remove module (clear)
            if (this.glyphEditor.grid[row][col]) {
                this.glyphEditor.grid[row][col] = null;
            }
            // If cell empty - place module
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
     * Place or remove module at current cursor position
     */
    placeOrRemoveModule() {
        if (!this.glyphEditor) return;
        
        // Ensure cursor is within grid bounds
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        // If cell empty - add module, if occupied - remove
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = null;
        } else {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
        }
        
        // Update hoveredCell for visual indication
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
        
        // Ensure cursor is within grid bounds
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = null;
            
            // Update hoveredCell for visual indication
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
        
        // Ensure cursor is within grid bounds
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentRotation = (this.glyphEditor.currentRotation + 1) % 4;
        
        // If cell already filled - update module on canvas
        // (works both with button held and without)
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        // If cell empty and button held - place module
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
     * Change module (up list)
     */
    changeModuleUp() {
        if (!this.glyphEditor) return;
        
        // Ensure cursor is within grid bounds
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentModuleIndex = (this.glyphEditor.currentModuleIndex - 1 + this.glyphEditor.moduleTypes.length) % this.glyphEditor.moduleTypes.length;
        
        // If cell already filled - update module on canvas
        // (works both with button held and without)
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        // If cell empty and button held - place module
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
     * Select next alternative
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
     * Handle triggers
     */
    handleTriggers(gamepad) {
        // L2 (button 6) - change module (up list)
        // R2 (button 7) - change module (down list)
        
        const l2 = gamepad.buttons[6]?.pressed || false;
        const r2 = gamepad.buttons[7]?.pressed || false;
        
        // L2 - change module (up list)
        if (l2 && !this.buttonStates['l2']) {
            this.buttonStates['l2'] = true;
            this.changeModuleUp();
        } else if (!l2) {
            this.buttonStates['l2'] = false;
        }
        
        // R2 - change module (down list)
        if (r2 && !this.buttonStates['r2']) {
            this.buttonStates['r2'] = true;
            this.changeModuleDown();
        } else if (!r2) {
            this.buttonStates['r2'] = false;
        }
    }
    
    /**
     * Rotate module left
     */
    rotateModuleLeft() {
        if (!this.glyphEditor) return;
        
        // Ensure cursor is within grid bounds
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentRotation = (this.glyphEditor.currentRotation - 1 + 4) % 4;
        
        // If cell already filled - update module on canvas
        // (works both with button held and without)
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        // If cell empty and button held - place module
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
     * Change module (down list)
     */
    changeModuleDown() {
        if (!this.glyphEditor) return;
        
        // Ensure cursor is within grid bounds
        const row = Math.max(0, Math.min(4, this.cursorRow));
        const col = Math.max(0, Math.min(4, this.cursorCol));
        
        this.glyphEditor.currentModuleIndex = (this.glyphEditor.currentModuleIndex + 1) % this.glyphEditor.moduleTypes.length;
        
        // If cell already filled - update module on canvas
        // (works both with button held and without)
        if (this.glyphEditor.grid[row][col]) {
            this.glyphEditor.grid[row][col] = {
                type: this.glyphEditor.getCurrentModuleType(),
                rotation: this.glyphEditor.currentRotation
            };
            this.glyphEditor.updateGlyphString();
            this.glyphEditor.autoSave();
        }
        // If cell empty and button held - place module
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
