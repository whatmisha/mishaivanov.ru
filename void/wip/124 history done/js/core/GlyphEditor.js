/**
 * GlyphEditor - editor for creating and editing glyphs
 */
import { VOID_ALPHABET, VOID_ALPHABET_ALTERNATIVES } from './VoidAlphabet.js';
import { getGlyph } from './GlyphLoader.js';

export default class GlyphEditor {
    constructor(canvas, moduleDrawer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.moduleDrawer = moduleDrawer;
        
        // Key for saving to localStorage (can be overridden externally)
        this.storageKey = 'voidGlyphEditor_editedGlyphs';
        
        // Grid dimensions
        this.gridSize = 5; // 5x5 modules
        this.moduleSize = 48; // single module size
        
        // Array of modules on grid [row][col] = {type, rotation}
        this.grid = this.createEmptyGrid();
        
        // Available module types (without 'E' - empty module)
        this.moduleTypes = ['S', 'C', 'J', 'L', 'R', 'B'];
        this.currentModuleIndex = 0; // start with 'S'
        this.currentRotation = 0; // 0, 1, 2, 3 (0°, 90°, 180°, 270°)
        
        // Editor active flag
        this.isActive = false;
        
        // Selected character
        this.selectedChar = null;
        
        // Mouse pressed flag
        this.isMouseDown = false;
        // Last processed cell when mouse pressed (to avoid repeated placement)
        this.lastProcessedCell = null;
        // First cell on mousedown (for placement on first movement)
        this.startCell = null;
        // Flag: was there drag (to distinguish click from drag)
        this.wasDrag = false;
        
        // Bind methods
        this.handleClick = this.handleClick.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleCharSelectorChange = this.handleCharSelectorChange.bind(this);
        
        // Current cell under cursor
        this.hoveredCell = null;
        
        // Flag to prevent infinite loop during programmatic field update
        this.isUpdatingFromGrid = false;
        
        // Flag to prevent recursion between checkForChanges and updateGlyphString
        this.isCheckingChanges = false;
        
        // Bind method for handling text changes
        this.handleGlyphStringChange = this.handleGlyphStringChange.bind(this);
    }
    
    /**
     * Create empty grid
     */
    createEmptyGrid() {
        const grid = [];
        for (let row = 0; row < this.gridSize; row++) {
            grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                grid[row][col] = null;
            }
        }
        return grid;
    }
    
    /**
     * Activate editor
     */
    activate() {
        console.log('[GlyphEditor] Activating...');
        this.isActive = true;
        
        // Update canvas dimensions
        this.updateCanvasSize();
        console.log('[GlyphEditor] Canvas size:', this.canvas.width, 'x', this.canvas.height);
        
        // Initialize field with default string
        this.updateGlyphString();
        
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mouseleave', this.handleMouseUp); // Release when leaving canvas
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('keydown', this.handleKeyDown);
        console.log('[GlyphEditor] Event listeners attached');
        
        // Handler for glyph field text changes
        const glyphStringField = document.getElementById('editorGlyphString');
        if (glyphStringField) {
            glyphStringField.addEventListener('input', this.handleGlyphStringChange);
        }
        
        // Character selector handler
        const charSelector = document.getElementById('editorCharSelector');
        if (charSelector) {
            charSelector.addEventListener('input', this.handleCharSelectorChange);
            charSelector.addEventListener('keydown', (e) => {
                // Allow only one character
                if (e.target.value.length >= 1 && e.key !== 'Backspace' && e.key !== 'Delete') {
                    e.preventDefault();
                }
            });
        }
        
        // "Save Changes" button handler
        const saveChangesBtn = document.getElementById('editorSaveChangesBtn');
        if (saveChangesBtn) {
            saveChangesBtn.addEventListener('click', () => {
                this.saveChanges();
            });
        }
        
        // Show alternatives panel
        const alternativesPanel = document.getElementById('editorAlternativesPanel');
        if (alternativesPanel) {
            alternativesPanel.style.display = 'flex';
        }
        
        // Click handlers for MOD and ANG in toolbar
        // Find parent sections for MOD and ANG
        const currentModuleEl = document.getElementById('currentModule');
        const currentAngleEl = document.getElementById('currentAngle');
        
        if (currentModuleEl) {
            const moduleSection = currentModuleEl.closest('.toolbar-section');
            if (moduleSection) {
                moduleSection.style.cursor = 'pointer';
                moduleSection.addEventListener('click', () => {
                    // Analog of up arrow - switch module
                    this.currentModuleIndex = (this.currentModuleIndex - 1 + this.moduleTypes.length) % this.moduleTypes.length;
                    this.updateModuleInfo();
                    this.render();
                });
            }
        }
        
        if (currentAngleEl) {
            const angleSection = currentAngleEl.closest('.toolbar-section');
            if (angleSection) {
                angleSection.style.cursor = 'pointer';
                angleSection.addEventListener('click', () => {
                    // Analog of right arrow - rotate module
                    this.currentRotation = (this.currentRotation + 1) % 4;
                    this.updateModuleInfo();
                    this.render();
                });
            }
        }
        
        this.render();
        console.log('[GlyphEditor] Activation complete');
    }
    
    /**
     * Deactivate editor
     */
    deactivate() {
        this.isActive = false;
        this.canvas.removeEventListener('click', this.handleClick);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Remove text change handler
        const glyphStringField = document.getElementById('editorGlyphString');
        if (glyphStringField) {
            glyphStringField.removeEventListener('input', this.handleGlyphStringChange);
        }
        
        // Remove character selector handler
        const charSelector = document.getElementById('editorCharSelector');
        if (charSelector) {
            charSelector.removeEventListener('input', this.handleCharSelectorChange);
        }
        
        this.hoveredCell = null;
        
        // Hide alternatives panel
        const alternativesPanel = document.getElementById('editorAlternativesPanel');
        if (alternativesPanel) {
            alternativesPanel.style.display = 'none';
        }
        
        // Clear canvas on deactivation
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Handle mouse down
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // In standalone editor don't use devicePixelRatio for coordinates
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            // Direct CSS coordinates
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
            // With DPR for main application
            const dpr = window.devicePixelRatio || 1;
            x = (e.clientX - rect.left) * dpr;
            y = (e.clientY - rect.top) * dpr;
        }
        
        const cell = this.getCellFromCoords(x, y);
        if (!cell) return;
        
        this.isMouseDown = true;
        this.wasDrag = false;
        this.startCell = { row: cell.row, col: cell.col };
        this.lastProcessedCell = null;
    }
    
    /**
     * Handle mouse up
     */
    handleMouseUp(e) {
        // If mouse was pressed and there was drag, place module on last cell
        if (this.isMouseDown && this.wasDrag && this.hoveredCell) {
            const { row, col } = this.hoveredCell;
            
            // Check if we already processed this cell
            if (!this.lastProcessedCell || 
                this.lastProcessedCell.row !== row || 
                this.lastProcessedCell.col !== col) {
                
                // Place module on last cell
                this.grid[row][col] = {
                    type: this.getCurrentModuleType(),
                    rotation: this.currentRotation
                };
                
                this.updateGlyphString();
                this.autoSave();
                this.render();
            }
        }
        
        this.isMouseDown = false;
        this.lastProcessedCell = null;
        this.startCell = null;
        // Don't reset wasDrag here - it's needed for handleClick
    }
    
    /**
     * Handle mouse click (for placing module or clearing cell)
     */
    handleClick(e) {
        // If there was drag, ignore click and reset flag
        if (this.wasDrag) {
            this.wasDrag = false;
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        
        // In standalone editor don't use devicePixelRatio for coordinates
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            // Direct CSS coordinates
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
            // With DPR for main application
            const dpr = window.devicePixelRatio || 1;
            x = (e.clientX - rect.left) * dpr;
            y = (e.clientY - rect.top) * dpr;
        }
        
        const cell = this.getCellFromCoords(x, y);
        if (!cell) return;
        
        const { row, col } = cell;
        
        // If cell is occupied - remove module (clear)
        if (this.grid[row][col]) {
            this.grid[row][col] = null;
            this.render();
            this.updateModuleInfo();
            this.updateGlyphString();
            
            // Auto-save after each change
            this.autoSave();
        }
        // If cell is empty - place module
        else {
            this.grid[row][col] = {
                type: this.getCurrentModuleType(),
                rotation: this.currentRotation
            };
        this.render();
        this.updateModuleInfo();
        this.updateGlyphString();
        
        // Auto-save after each change
        this.autoSave();
        }
    }
    
    /**
     * Handle mouse movement
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // In standalone editor don't use devicePixelRatio for coordinates
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            // Direct CSS coordinates
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
            // With DPR for main application
            const dpr = window.devicePixelRatio || 1;
            x = (e.clientX - rect.left) * dpr;
            y = (e.clientY - rect.top) * dpr;
        }
        
        const cell = this.getCellFromCoords(x, y);
        
        // Check if cell changed
        const cellChanged = !cell || !this.hoveredCell ||
            cell.row !== this.hoveredCell.row ||
            cell.col !== this.hoveredCell.col;
        
        if (cellChanged) {
            this.hoveredCell = cell;
            
            // Sync currentRotation and currentModuleIndex with module in cell
            // (if mouse not pressed and cell has module)
            if (cell && !this.isMouseDown && this.grid[cell.row][cell.col]) {
                const module = this.grid[cell.row][cell.col];
                this.currentRotation = module.rotation;
                const moduleIndex = this.moduleTypes.indexOf(module.type);
                if (moduleIndex !== -1) {
                    this.currentModuleIndex = moduleIndex;
                }
            }
            
            // If mouse pressed, place module on new cell
            if (this.isMouseDown && cell) {
                const { row, col } = cell;
                
                // If this is first movement after mousedown, set drag flag
                // and place module on first cell (startCell)
                if (!this.wasDrag && this.startCell) {
                    this.wasDrag = true;
                    
                    // Place module on first cell
                    this.grid[this.startCell.row][this.startCell.col] = {
                        type: this.getCurrentModuleType(),
                        rotation: this.currentRotation
                    };
                    this.lastProcessedCell = { row: this.startCell.row, col: this.startCell.col };
                    this.updateGlyphString();
                    this.autoSave();
                }
                
                // Check if we already processed this cell
                if (!this.lastProcessedCell || 
                    this.lastProcessedCell.row !== row || 
                    this.lastProcessedCell.col !== col) {
                    
                    // Place module
                    this.grid[row][col] = {
                        type: this.getCurrentModuleType(),
                        rotation: this.currentRotation
                    };
                    
                    this.lastProcessedCell = { row, col };
                    
                    this.updateGlyphString();
                    this.autoSave();
                }
            }
            
            this.render();
        }
    }
    
    /**
     * Get cell from coordinates
     */
    getCellFromCoords(x, y) {
        // Check if we're in standalone editor
        const isStandalone = window.location.pathname.includes('/editor');
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        let modulePixelSize;
        
        if (isStandalone) {
            modulePixelSize = canvasWidth / 6.25;
        } else {
            const dpr = window.devicePixelRatio || 1;
            modulePixelSize = 48 * dpr;
        }
        
        // Center grid
        const gridPixelSize = modulePixelSize * this.gridSize;
        const offsetX = (canvasWidth - gridPixelSize) / 2;
        const offsetY = (canvasHeight - gridPixelSize) / 2;
        
        // Check if click hits grid
        if (x < offsetX || x > offsetX + gridPixelSize ||
            y < offsetY || y > offsetY + gridPixelSize) {
            return null;
        }
        
        const col = Math.floor((x - offsetX) / modulePixelSize);
        const row = Math.floor((y - offsetY) / modulePixelSize);
        
        return { row, col };
    }
    
    /**
     * Handle keyboard
     */
    handleKeyDown(e) {
        // Check if focus is on text fields
        const activeElement = document.activeElement;
        const isTextInputFocused = activeElement && (
            activeElement.id === 'editorGlyphString' ||
            activeElement.id === 'editorSavedGlyphs' ||
            activeElement.id === 'editorCharSelector' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'INPUT'
        );
        
        // If editing text or character selector field, don't process arrows
        if (isTextInputFocused) {
            return;
        }
        
        // Check if there's a cell under cursor
        if (!this.hoveredCell) {
            return;
        }
        
        const { row, col } = this.hoveredCell;
        const cellHasModule = this.grid[row][col] !== null;
        
        let shouldUpdate = false;
        
        // Arrow up/down or W/S (or Ц/Ы in Russian layout) - select module
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex - 1 + this.moduleTypes.length) % this.moduleTypes.length;
            shouldUpdate = true;
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex + 1) % this.moduleTypes.length;
            shouldUpdate = true;
        }
        // Arrow left/right or A/D (or Ф/В in Russian layout) - rotate
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
            e.preventDefault();
            this.currentRotation = (this.currentRotation - 1 + 4) % 4;
            shouldUpdate = true;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
            e.preventDefault();
            this.currentRotation = (this.currentRotation + 1) % 4;
            shouldUpdate = true;
        }
        
        if (shouldUpdate) {
            // If cell is empty and mouse pressed - place module
            if (!cellHasModule && this.isMouseDown) {
                this.grid[row][col] = {
                    type: this.getCurrentModuleType(),
                    rotation: this.currentRotation
                };
                this.lastProcessedCell = { row, col };
                this.updateGlyphString();
                this.autoSave();
            }
            // If cell is not empty - update module (works with mouse pressed and without)
            else if (cellHasModule) {
                this.grid[row][col] = {
                    type: this.getCurrentModuleType(),
                    rotation: this.currentRotation
                };
                this.updateGlyphString();
                this.autoSave();
            }
            // If cell is empty and mouse not pressed - only update preview (don't place module)
            // This allows selecting module and rotation before click
            
            this.updateModuleInfo();
            this.render();
        }
    }
    
    /**
     * Get current module type
     */
    getCurrentModuleType() {
        return this.moduleTypes[this.currentModuleIndex];
    }
    
    /**
     * Update current module info in UI
     */
    updateModuleInfo() {
        const moduleInfo = document.getElementById('editorCurrentModule') || document.getElementById('currentModule');
        const angleInfo = document.getElementById('currentAngle');
        
        if (moduleInfo) {
            const type = this.getCurrentModuleType();
            moduleInfo.textContent = type;
        }
        
        if (angleInfo) {
            const rotation = this.currentRotation * 90;
            angleInfo.textContent = `${rotation}°`;
        }
    }
    
    /**
     * Render editor
     */
    render() {
        if (!this.isActive) return;
        
        // Check if we're in standalone editor
        const isStandalone = window.location.pathname.includes('/editor');
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Module size: in standalone use CSS pixels, in main app - physical pixels
        let modulePixelSize;
        let lineWidth;
        
        if (isStandalone) {
            // In standalone canvas 600x600 without DPR scaling
            // Module takes 1/6 width (5 modules + padding)
            modulePixelSize = canvasWidth / 6.25;  // ~96px at canvas 600px
            lineWidth = 0.5; // Thin line (as in main app)
        } else {
            const dpr = window.devicePixelRatio || 1;
            modulePixelSize = 48 * dpr;
            lineWidth = 0.5 * dpr; // Thin line (as in main app)
        }
        
        // Center grid
        const gridPixelSize = modulePixelSize * this.gridSize;
        const offsetX = (canvasWidth - gridPixelSize) / 2;
        const offsetY = (canvasHeight - gridPixelSize) / 2;
        
        // Draw background (black)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw grid (#666666 - lighter and more visible)
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = lineWidth;
        
        for (let i = 0; i <= this.gridSize; i++) {
            // Vertical lines
            const x = offsetX + i * modulePixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, offsetY);
            this.ctx.lineTo(x, offsetY + gridPixelSize);
            this.ctx.stroke();
            
            // Horizontal lines
            const y = offsetY + i * modulePixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(offsetX, y);
            this.ctx.lineTo(offsetX + gridPixelSize, y);
            this.ctx.stroke();
        }
        
        // Highlight cell under cursor
        if (this.hoveredCell) {
            const { row, col } = this.hoveredCell;
            const x = offsetX + col * modulePixelSize;
            const y = offsetY + row * modulePixelSize;
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(x, y, modulePixelSize, modulePixelSize);
            
            // Preview current module (white with 50% transparency)
            if (!this.grid[row][col]) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.5;
                this.drawModule(
                    x + modulePixelSize / 2,
                    y + modulePixelSize / 2,
                    modulePixelSize,
                    this.getCurrentModuleType(),
                    this.currentRotation
                );
                this.ctx.restore();
            }
        }
        
        // Draw placed modules (white, 100% opacity)
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const module = this.grid[row][col];
                if (module) {
                    const x = offsetX + col * modulePixelSize + modulePixelSize / 2;
                    const y = offsetY + row * modulePixelSize + modulePixelSize / 2;
                    this.drawModule(x, y, modulePixelSize, module.type, module.rotation);
                }
            }
        }
    }
    
    /**
     * Draw module
     */
    drawModule(centerX, centerY, size, type, rotation) {
        const angle = rotation * Math.PI / 2;
        // ModuleDrawer divides stem by 2 for lineWidth, so pass size * 1.0
        // to get line width = 0.5 of cell size
        const stem = size * 1.0;
        
        // Set white color for modules
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.fillStyle = '#FFFFFF';
        
        this.ctx.save();
        
        switch (type) {
            case 'E':
                // Empty module - draw nothing
                break;
            case 'S':
                this.moduleDrawer.drawStraight(this.ctx, centerX - size/2, centerY - size/2, size, size, angle, stem);
                break;
            case 'C':
                this.moduleDrawer.drawCentral(this.ctx, centerX - size/2, centerY - size/2, size, size, angle, stem);
                break;
            case 'J':
                this.moduleDrawer.drawJoint(this.ctx, centerX - size/2, centerY - size/2, size, size, angle, stem);
                break;
            case 'L':
                this.moduleDrawer.drawLink(this.ctx, centerX - size/2, centerY - size/2, size, size, angle, stem);
                break;
            case 'R':
                this.moduleDrawer.drawRound(this.ctx, centerX - size/2, centerY - size/2, size, size, angle, stem);
                break;
            case 'B':
                this.moduleDrawer.drawBend(this.ctx, centerX - size/2, centerY - size/2, size, size, angle, stem);
                break;
        }
        
        this.ctx.restore();
    }
    
    /**
     * Clear grid
     */
    clear() {
        this.grid = this.createEmptyGrid();
        this.render();
        this.updateGlyphString();
    }
    
    /**
     * Format glyph string with spaces every 10 characters
     */
    formatGlyphString(glyphString) {
        let formatted = '';
        for (let i = 0; i < glyphString.length; i += 10) {
            if (i > 0) formatted += ' ';
            formatted += glyphString.substring(i, i + 10);
        }
        return formatted;
    }
    
    /**
     * Remove spaces from glyph string
     */
    removeSpaces(glyphString) {
        return glyphString.replace(/\s/g, '');
    }
    
    /**
     * Update glyph string in UI
     */
    updateGlyphString() {
        let glyphString = '';
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const module = this.grid[row][col];
                if (module) {
                    glyphString += module.type + module.rotation;
                } else {
                    glyphString += 'E0';
                }
            }
        }
        
        // Update textarea only if field not in focus (to avoid interfering with editing)
        const outputField = document.getElementById('editorGlyphString');
        if (outputField && document.activeElement !== outputField) {
            this.isUpdatingFromGrid = true;
            // Format string with spaces every 10 characters
            outputField.value = this.formatGlyphString(glyphString);
            this.isUpdatingFromGrid = false;
        }
        
        return glyphString;
    }
    
    /**
     * Handler for glyph field text changes
     */
    handleGlyphStringChange(e) {
        // Don't process if update is from grid
        if (this.isUpdatingFromGrid) {
            return;
        }
        
        // Remove spaces from string before processing
        const glyphString = this.removeSpaces(e.target.value);
        
        // Check string length (should be 25 modules * 2 characters = 50)
        if (glyphString.length !== 50) {
            // If length incorrect, don't update grid
            return;
        }
        
        // Import glyph from string without updating field (to avoid loop)
        this.importGlyph(glyphString, false);
    }
    
    /**
     * Copy text from second field to clipboard
     */
    copySavedGlyphs() {
        const savedGlyphsField = document.getElementById('editorSavedGlyphs');
        if (!savedGlyphsField) return;
        
        savedGlyphsField.select();
        
        try {
            document.execCommand('copy');
            console.log('Text copied to clipboard');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
    
    /**
     * Export glyph to string (for copying)
     */
    exportGlyph() {
        const glyphString = this.updateGlyphString();
        
        // Select text for copying
        const outputField = document.getElementById('editorGlyphString');
        if (outputField) {
            outputField.select();
            
            // Copy to clipboard
            try {
                document.execCommand('copy');
                console.log('Glyph exported:', glyphString);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
        
        return glyphString;
    }
    
    /**
     * Save glyph to collection
     */
    saveGlyph() {
        const glyphString = this.updateGlyphString();
        const savedGlyphsField = document.getElementById('editorSavedGlyphs');
        
        if (!savedGlyphsField) return;
        
        // Generate random emoji
        const emojis = ['😎', '🎨', '✨', '🔥', '💎', '🌟', '⚡', '🎯', '🚀', '💫', '🎭', '🎪', '🎬', '🎮', '🎲', '🎸', '🎺', '🎻', '🎤', '🎧'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        // Format: "😎": "E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0",
        // Without spaces at start, with empty line between entries
        const currentValue = savedGlyphsField.value.trim();
        const newEntry = `"${randomEmoji}": "${glyphString}",\n`;
        const separator = currentValue ? '\n\n' : '';
        
        savedGlyphsField.value = currentValue + separator + newEntry;
        
        // Scroll down
        savedGlyphsField.scrollTop = savedGlyphsField.scrollHeight;
        
        // Reset grid and first field to default state
        this.grid = this.createEmptyGrid();
        this.render();
        this.updateGlyphString();
    }
    
    /**
     * Import glyph from string
     * @param {string} glyphString - glyph string
     * @param {boolean} updateField - whether to update text field (default true)
     */
    importGlyph(glyphString, updateField = true) {
        // Remove spaces from string before processing
        glyphString = this.removeSpaces(glyphString);
        
        // Check string length (should be 25 modules * 2 characters = 50)
        if (glyphString.length !== 50) {
            console.error('Invalid glyph string length:', glyphString.length);
            return;
        }
        
        this.grid = this.createEmptyGrid();
        
        let index = 0;
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const type = glyphString[index];
                const rotation = parseInt(glyphString[index + 1]);
                
                if (type !== 'E') {
                    this.grid[row][col] = { type, rotation };
                }
                
                index += 2;
            }
        }
        
        this.render();
        
        // Update field only if explicitly specified (to avoid loop during editing)
        if (updateField) {
            this.updateGlyphString();
        }
    }
    
    /**
     * Update canvas dimensions
     */
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        // Check if we're in standalone editor
        const isStandalone = window.location.pathname.includes('/editor');
        
        if (isStandalone) {
            // In standalone editor use fixed size
            const size = 600;
            this.canvas.width = size;
            this.canvas.height = size;
            console.log('[GlyphEditor.updateCanvasSize] Standalone mode: fixed size', size);
        } else {
            // In main app use window size
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            
            // Set canvas dimensions
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            console.log('[GlyphEditor.updateCanvasSize] Main app mode: responsive size');
        }
        
        if (this.isActive) {
            this.render();
        }
    }
    
    /**
     * Character selector change handler
     */
    handleCharSelectorChange(e) {
        const char = e.target.value.toUpperCase();
        
        // Check if there's a glyph for this character
        if (char && VOID_ALPHABET[char]) {
            this.selectedChar = char;
            this.selectedAlternativeIndex = null; // Reset alternative selection
            this.loadBaseGlyph(char);
            this.updateAlternativesPanel();
        } else if (char === '') {
            // If field cleared, clear grid
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            this.grid = this.createEmptyGrid();
            this.render();
            this.updateGlyphString();
            this.clearAlternativesPanel();
        }
    }
    
    /**
     * Load base glyph for character
     * @param {string} char - character
     */
    loadBaseGlyph(char) {
        this.loadGlyphWithEdits(char, null);
    }
    
    /**
     * Update alternatives panel
     */
    updateAlternativesPanel() {
        const content = document.getElementById('editorAlternativesContent');
        const panel = document.getElementById('editorAlternativesPanel');
        if (!content || !panel || !this.selectedChar) {
            return;
        }
        
        // Ensure panel is visible
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
        }
        
        // Clear panel
        content.innerHTML = '';
        
        // Add base glyph preview (index null)
        this.addAlternativePreview(content, null, 'Base');
        
        // Get alternatives for selected character
        const alternatives = VOID_ALPHABET_ALTERNATIVES[this.selectedChar];
        
        if (alternatives && alternatives.length > 0) {
            // Create thumbnails for each alternative
            alternatives.forEach((altGlyphString, index) => {
                const altIndex = index + 1; // Index 1+ for alternatives
                this.addAlternativePreview(content, altIndex, `Alt ${altIndex}`);
            });
        }
    }
    
    /**
     * Add alternative preview to panel
     */
    addAlternativePreview(container, alternativeIndex, label) {
        // Check if there's saved version (ONLY from editor localStorage)
        const editedGlyph = this.getEditedGlyph(this.selectedChar, alternativeIndex);
        
        // DON'T load from VoidAlphabet.js - editor is isolated!
        const glyphStringToShow = editedGlyph || 'E0'.repeat(25);
        
        const item = document.createElement('div');
        item.className = 'editor-alternative-item';
        item.dataset.index = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        // Add "edited" class if there are saved changes
        if (editedGlyph) {
            item.classList.add('edited');
        }
        
        // Add click handler
        item.addEventListener('click', () => {
            console.log(`[addAlternativePreview] Clicked on alternative: ${alternativeIndex}`);
            this.selectAlternative(alternativeIndex);
        });
        
        // Container for preview
        const preview = document.createElement('div');
        preview.className = 'editor-alternative-preview';
        
        // Canvas for thumbnail
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 120;
        previewCanvas.height = 80;
        this.renderGlyphPreview(previewCanvas, glyphStringToShow);
        
        preview.appendChild(previewCanvas);
        
        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'editor-alternative-label';
        labelDiv.textContent = label;
        
        item.appendChild(preview);
        item.appendChild(labelDiv);
        
        container.appendChild(item);
    }
    
    /**
     * Clear alternatives panel
     */
    clearAlternativesPanel() {
        const content = document.getElementById('editorAlternativesContent');
        if (content) {
            content.innerHTML = '';
        }
    }
    
    /**
     * Select alternative
     * @param {number} index - alternative index (1+ for alternatives, null for base)
     */
    selectAlternative(index) {
        if (!this.selectedChar) return;
        
        console.log(`[selectAlternative] Selecting alternative: ${index} (type: ${typeof index}) for char: ${this.selectedChar}`);
        
        this.selectedAlternativeIndex = index;
        
        // Load selected alternative considering saved changes
        this.loadGlyphWithEdits(this.selectedChar, index);
        
        // Update visual selection
        this.updateAlternativesSelection();
    }
    
    /**
     * Update visual selection of selected alternative
     */
    updateAlternativesSelection() {
        const items = document.querySelectorAll('.editor-alternative-item');
        items.forEach(item => {
            const indexStr = item.dataset.index;
            const index = indexStr === 'base' ? null : parseInt(indexStr);
            if (index === this.selectedAlternativeIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    /**
     * Render glyph preview on canvas
     * @param {HTMLCanvasElement} canvas - canvas for preview
     * @param {string} glyphString - glyph string
     */
    renderGlyphPreview(canvas, glyphString) {
        const ctx = canvas.getContext('2d');
        
        // Use canvas dimensions as is (CSS pixels)
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas (transparent background so cell background is visible)
        ctx.clearRect(0, 0, width, height);
        
        // Module size for preview (smaller than on main canvas)
        const moduleSize = Math.min(width, height) / (this.gridSize + 1);
        const gridSize = moduleSize * this.gridSize;
        const offsetX = (width - gridSize) / 2;
        const offsetY = (height - gridSize) / 2;
        
        // Parse glyph string
        const grid = this.createEmptyGrid();
        let index = 0;
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const type = glyphString[index];
                const rotation = parseInt(glyphString[index + 1]);
                
                if (type !== 'E') {
                    grid[row][col] = { type, rotation };
                }
                
                index += 2;
            }
        }
        
        // Draw modules
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const module = grid[row][col];
                if (module) {
                    const x = offsetX + col * moduleSize + moduleSize / 2;
                    const y = offsetY + row * moduleSize + moduleSize / 2;
                    const angle = module.rotation * Math.PI / 2;
                    const stem = moduleSize * 1.0;
                    
                    // White color for preview on dark background
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.fillStyle = '#FFFFFF';
                    
                    ctx.save();
                    switch (module.type) {
                        case 'S':
                            this.moduleDrawer.drawStraight(ctx, x - moduleSize/2, y - moduleSize/2, moduleSize, moduleSize, angle, stem);
                            break;
                        case 'C':
                            this.moduleDrawer.drawCentral(ctx, x - moduleSize/2, y - moduleSize/2, moduleSize, moduleSize, angle, stem);
                            break;
                        case 'J':
                            this.moduleDrawer.drawJoint(ctx, x - moduleSize/2, y - moduleSize/2, moduleSize, moduleSize, angle, stem);
                            break;
                        case 'L':
                            this.moduleDrawer.drawLink(ctx, x - moduleSize/2, y - moduleSize/2, moduleSize, moduleSize, angle, stem);
                            break;
                        case 'R':
                            this.moduleDrawer.drawRound(ctx, x - moduleSize/2, y - moduleSize/2, moduleSize, moduleSize, angle, stem);
                            break;
                        case 'B':
                            this.moduleDrawer.drawBend(ctx, x - moduleSize/2, y - moduleSize/2, moduleSize, moduleSize, angle, stem);
                            break;
                    }
                    ctx.restore();
                }
            }
        }
    }
    
    /**
     * Get saved edited glyphs from localStorage
     */
    getEditedGlyphs() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Error loading edited glyphs:', e);
            return {};
        }
    }
    
    /**
     * Save edited glyphs to localStorage
     */
    saveEditedGlyphs(editedGlyphs) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(editedGlyphs));
        } catch (e) {
            console.error('Error saving edited glyphs:', e);
        }
    }
    
    /**
     * DEPRECATED: Этот метод больше не используется в изолированном редакторе.
     * Редактор работает ТОЛЬКО с импортированными данными из localStorage.
     * 
     * Получить оригинальный глиф (из VOID_ALPHABET или альтернатив)
     * Метод сохранён для обратной совместимости, но не должен вызываться в редакторе.
     */
    getOriginalGlyph(char, alternativeIndex) {
        console.warn('[getOriginalGlyph] DEPRECATED: This method should not be used in the standalone editor!');
        
        // First check if exists in VoidAlphabet
        const glyph = getGlyph(char, { alternativeIndex: alternativeIndex || null });
        
        // If glyph not found (returned space), check if this is new character from localStorage
        if (glyph === VOID_ALPHABET[" "]) {
            // Check localStorage
            const editedGlyph = this.getEditedGlyph(char, alternativeIndex);
            if (editedGlyph) {
                return editedGlyph;
            }
            // Return empty glyph for new characters
            return 'E0'.repeat(25);
        }
        
        return glyph;
    }
    
    /**
     * Get saved edited glyph
     */
    getEditedGlyph(char, alternativeIndex) {
        const editedGlyphs = this.getEditedGlyphs();
        const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
        return editedGlyphs[char] && editedGlyphs[char][key] ? editedGlyphs[char][key] : null;
    }
    
    /**
     * Check if there are changes in current glyph
     */
    checkForChanges() {
        if (!this.selectedChar || this.isCheckingChanges) {
            return;
        }
        
        this.isCheckingChanges = true;
        
        // Get current glyph string without calling updateGlyphString (to avoid recursion)
        let currentGlyphString = '';
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const module = this.grid[row][col];
                if (module) {
                    currentGlyphString += module.type + module.rotation;
                } else {
                    currentGlyphString += 'E0';
                }
            }
        }
        
        const editedGlyphString = this.getEditedGlyph(this.selectedChar, this.selectedAlternativeIndex);
        
        // Use ONLY saved version or empty glyph (NOT from VoidAlphabet.js)
        const referenceGlyphString = editedGlyphString || 'E0'.repeat(25);
        
        const hasChanges = currentGlyphString !== referenceGlyphString;
        this.updateSaveChangesButton(hasChanges);
        
        this.isCheckingChanges = false;
    }
    
    /**
     * Update "Save Changes" button visibility
     */
    updateSaveChangesButton(show) {
        const saveChangesBtn = document.getElementById('editorSaveChangesBtn');
        if (saveChangesBtn) {
            saveChangesBtn.style.display = show ? 'block' : 'none';
        }
        
        // Also update "Save" button in standalone editor
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = !show;
        }
    }
    
    /**
     * Check if glyph is empty (only E0)
     */
    isEmptyGlyph(glyphString) {
        if (!glyphString) return true;
        // Check if glyph consists only of E0 modules
        const emptyGlyph = 'E0'.repeat(25);
        return glyphString === emptyGlyph;
    }
    
    /**
     * Save changes to current glyph
     */
    saveChanges() {
        if (!this.selectedChar) {
            console.log('[saveChanges] No selected character');
            return;
        }
        
        const glyphString = this.updateGlyphString();
        const editedGlyphs = this.getEditedGlyphs();
        
        // Initialize object for character if it doesn't exist
        if (!editedGlyphs[this.selectedChar]) {
            editedGlyphs[this.selectedChar] = {};
        }
        
        // Save glyph with key 'base' for base or index for alternative
        const key = this.selectedAlternativeIndex === null ? 'base' : String(this.selectedAlternativeIndex);
        
        console.log(`[saveChanges] Saving glyph for char: ${this.selectedChar}, selectedAlternativeIndex: ${this.selectedAlternativeIndex}, key: ${key}`);
        console.log(`[saveChanges] Glyph string length: ${glyphString.length}`);
        
        // If glyph is empty, remove it from localStorage
        if (this.isEmptyGlyph(glyphString)) {
            delete editedGlyphs[this.selectedChar][key];
            // If character has no more glyphs, remove entire object
            if (Object.keys(editedGlyphs[this.selectedChar]).length === 0) {
                delete editedGlyphs[this.selectedChar];
            }
        } else {
            editedGlyphs[this.selectedChar][key] = glyphString;
        }
        
        // Save to localStorage
        this.saveEditedGlyphs(editedGlyphs);
        
        console.log(`[saveChanges] ✓ Saved. Current storage for ${this.selectedChar}:`, editedGlyphs[this.selectedChar] ? Object.keys(editedGlyphs[this.selectedChar]) : 'deleted');
        
        // Update preview in alternatives panel if this is alternative
        if (this.selectedAlternativeIndex !== null) {
            this.updateAlternativesPanel();
        }
    }
    
    /**
     * Auto-save (called on each change)
     */
    autoSave() {
        if (!this.selectedChar) {
            return;
        }
        
        // Use debounce to avoid saving too frequently
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            const glyphString = this.updateGlyphString();
            const editedGlyphs = this.getEditedGlyphs();
            
            // Initialize object for character if it doesn't exist
            if (!editedGlyphs[this.selectedChar]) {
                editedGlyphs[this.selectedChar] = {};
            }
            
            // Save glyph with key 'base' for base or index for alternative
            const key = this.selectedAlternativeIndex === null ? 'base' : String(this.selectedAlternativeIndex);
            
            // If glyph is empty, remove it from localStorage
            if (this.isEmptyGlyph(glyphString)) {
                delete editedGlyphs[this.selectedChar][key];
                // If character has no more glyphs, remove entire object
                if (Object.keys(editedGlyphs[this.selectedChar]).length === 0) {
                    delete editedGlyphs[this.selectedChar];
                }
            } else {
                editedGlyphs[this.selectedChar][key] = glyphString;
            }
            
            // Save to localStorage
            this.saveEditedGlyphs(editedGlyphs);
            
            // Dispatch event for UI update in editor.js
            const event = new CustomEvent('glyphAutoSaved', {
                detail: {
                    char: this.selectedChar,
                    alternativeIndex: this.selectedAlternativeIndex
                }
            });
            document.dispatchEvent(event);
        }, 300); // 300ms delay
    }
    
    /**
     * Load glyph considering saved changes
     */
    loadGlyphWithEdits(char, alternativeIndex) {
        // Set selected character and alternative index
        this.selectedChar = char;
        this.selectedAlternativeIndex = alternativeIndex;
        
        console.log(`[loadGlyphWithEdits] Loading glyph for char: ${char}, alternativeIndex: ${alternativeIndex} (type: ${typeof alternativeIndex})`);
        
        // Check ONLY saved changes from editor localStorage
        const editedGlyph = this.getEditedGlyph(char, alternativeIndex);
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            console.log(`[loadGlyphWithEdits] ✓ Found edited glyph, loading it`);
            this.importGlyph(editedGlyph, true);
        } else {
            console.log(`[loadGlyphWithEdits] No edited glyph found, clearing canvas`);
            // DON'T load from VoidAlphabet.js - editor is isolated!
            // Clear canvas for new empty glyph
            this.clear();
        }
        
        this.render();
        this.updateModuleInfo();
        this.updateGlyphString();
    }
}

