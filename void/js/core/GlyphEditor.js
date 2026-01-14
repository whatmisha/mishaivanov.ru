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
        
        this.storageKey = 'voidGlyphEditor_editedGlyphs';
        
        this.gridSize = 5;
        this.moduleSize = 48;
        
        this.grid = this.createEmptyGrid();
        
        this.moduleTypes = ['S', 'C', 'J', 'L', 'R', 'B'];
        this.currentModuleIndex = 0;
        this.currentRotation = 0;
        
        this.isActive = false;
        this.selectedChar = null;
        this.isMouseDown = false;
        this.lastProcessedCell = null;
        this.startCell = null;
        this.wasDrag = false;
        this.handleClick = this.handleClick.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleCharSelectorChange = this.handleCharSelectorChange.bind(this);
        
        this.hoveredCell = null;
        this.isUpdatingFromGrid = false;
        this.isCheckingChanges = false;
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
        
        this.updateCanvasSize();
        console.log('[GlyphEditor] Canvas size:', this.canvas.width, 'x', this.canvas.height);
        
        this.updateGlyphString();
        
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mouseleave', this.handleMouseUp);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('keydown', this.handleKeyDown);
        console.log('[GlyphEditor] Event listeners attached');
        
        const glyphStringField = document.getElementById('editorGlyphString');
        if (glyphStringField) {
            glyphStringField.addEventListener('input', this.handleGlyphStringChange);
        }
        
        const charSelector = document.getElementById('editorCharSelector');
        if (charSelector) {
            charSelector.addEventListener('input', this.handleCharSelectorChange);
            charSelector.addEventListener('keydown', (e) => {
                if (e.target.value.length >= 1 && e.key !== 'Backspace' && e.key !== 'Delete') {
                    e.preventDefault();
                }
            });
        }
        
        const saveChangesBtn = document.getElementById('editorSaveChangesBtn');
        if (saveChangesBtn) {
            saveChangesBtn.addEventListener('click', () => {
                this.saveChanges();
            });
        }
        
        const alternativesPanel = document.getElementById('editorAlternativesPanel');
        if (alternativesPanel) {
            alternativesPanel.style.display = 'flex';
        }
        
        const currentModuleEl = document.getElementById('currentModule');
        const currentAngleEl = document.getElementById('currentAngle');
        
        if (currentModuleEl) {
            const moduleSection = currentModuleEl.closest('.toolbar-section');
            if (moduleSection) {
                moduleSection.style.cursor = 'pointer';
                moduleSection.addEventListener('click', () => {
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
     * Деактивировать редактор
     */
    deactivate() {
        this.isActive = false;
        this.canvas.removeEventListener('click', this.handleClick);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        const glyphStringField = document.getElementById('editorGlyphString');
        if (glyphStringField) {
            glyphStringField.removeEventListener('input', this.handleGlyphStringChange);
        }
        
        const charSelector = document.getElementById('editorCharSelector');
        if (charSelector) {
            charSelector.removeEventListener('input', this.handleCharSelectorChange);
        }
        
        this.hoveredCell = null;
        
        const alternativesPanel = document.getElementById('editorAlternativesPanel');
        if (alternativesPanel) {
            alternativesPanel.style.display = 'none';
        }
        
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Обработка нажатия мыши
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
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
        if (this.isMouseDown && this.wasDrag && this.hoveredCell) {
            const { row, col } = this.hoveredCell;
            
            if (!this.lastProcessedCell || 
                this.lastProcessedCell.row !== row || 
                this.lastProcessedCell.col !== col) {
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
    }
    
    /**
     * Handle mouse click (for placing module or clearing cell)
     */
    handleClick(e) {
        if (this.wasDrag) {
            this.wasDrag = false;
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
            const dpr = window.devicePixelRatio || 1;
            x = (e.clientX - rect.left) * dpr;
            y = (e.clientY - rect.top) * dpr;
        }
        
        const cell = this.getCellFromCoords(x, y);
        if (!cell) return;
        
        const { row, col } = cell;
        
        if (this.grid[row][col]) {
            this.grid[row][col] = null;
            this.render();
            this.updateModuleInfo();
            this.updateGlyphString();
            this.autoSave();
        } else {
            this.grid[row][col] = {
                type: this.getCurrentModuleType(),
                rotation: this.currentRotation
            };
        this.render();
        this.updateModuleInfo();
        this.updateGlyphString();
        this.autoSave();
        }
    }
    
    /**
     * Обработка движения мыши
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
            const dpr = window.devicePixelRatio || 1;
            x = (e.clientX - rect.left) * dpr;
            y = (e.clientY - rect.top) * dpr;
        }
        
        const cell = this.getCellFromCoords(x, y);
        
        const cellChanged = !cell || !this.hoveredCell ||
            cell.row !== this.hoveredCell.row ||
            cell.col !== this.hoveredCell.col;
        
        if (cellChanged) {
            this.hoveredCell = cell;
            
            if (cell && !this.isMouseDown && this.grid[cell.row][cell.col]) {
                const module = this.grid[cell.row][cell.col];
                this.currentRotation = module.rotation;
                const moduleIndex = this.moduleTypes.indexOf(module.type);
                if (moduleIndex !== -1) {
                    this.currentModuleIndex = moduleIndex;
                }
            }
            
            if (this.isMouseDown && cell) {
                const { row, col } = cell;
                
                if (!this.wasDrag && this.startCell) {
                    this.wasDrag = true;
                    
                    this.grid[this.startCell.row][this.startCell.col] = {
                        type: this.getCurrentModuleType(),
                        rotation: this.currentRotation
                    };
                    this.lastProcessedCell = { row: this.startCell.row, col: this.startCell.col };
                    this.updateGlyphString();
                    this.autoSave();
                }
                
                if (!this.lastProcessedCell || 
                    this.lastProcessedCell.row !== row || 
                    this.lastProcessedCell.col !== col) {
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
        
        const gridPixelSize = modulePixelSize * this.gridSize;
        const offsetX = (canvasWidth - gridPixelSize) / 2;
        const offsetY = (canvasHeight - gridPixelSize) / 2;
        if (x < offsetX || x > offsetX + gridPixelSize ||
            y < offsetY || y > offsetY + gridPixelSize) {
            return null;
        }
        
        const col = Math.floor((x - offsetX) / modulePixelSize);
        const row = Math.floor((y - offsetY) / modulePixelSize);
        
        return { row, col };
    }
    
    /**
     * Обработка клавиатуры
     */
    handleKeyDown(e) {
        const activeElement = document.activeElement;
        const isTextInputFocused = activeElement && (
            activeElement.id === 'editorGlyphString' ||
            activeElement.id === 'editorSavedGlyphs' ||
            activeElement.id === 'editorCharSelector' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'INPUT'
        );
        
        if (isTextInputFocused) {
            return;
        }
        
        if (!this.hoveredCell) {
            return;
        }
        
        const { row, col } = this.hoveredCell;
        const cellHasModule = this.grid[row][col] !== null;
        
        let shouldUpdate = false;
        
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex - 1 + this.moduleTypes.length) % this.moduleTypes.length;
            shouldUpdate = true;
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex + 1) % this.moduleTypes.length;
            shouldUpdate = true;
        }
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
            if (!cellHasModule && this.isMouseDown) {
                this.grid[row][col] = {
                    type: this.getCurrentModuleType(),
                    rotation: this.currentRotation
                };
                this.lastProcessedCell = { row, col };
                this.updateGlyphString();
                this.autoSave();
            }
            else if (cellHasModule) {
                this.grid[row][col] = {
                    type: this.getCurrentModuleType(),
                    rotation: this.currentRotation
                };
                this.updateGlyphString();
                this.autoSave();
            }
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
     * Обновить информацию о текущем модуле в UI
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
     * Отрисовать редактор
     */
    render() {
        if (!this.isActive) return;
        
        const isStandalone = window.location.pathname.includes('/editor');
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        let modulePixelSize;
        let lineWidth;
        
        if (isStandalone) {
            modulePixelSize = canvasWidth / 6.25;
            lineWidth = 0.5;
        } else {
            const dpr = window.devicePixelRatio || 1;
            modulePixelSize = 48 * dpr;
            lineWidth = 0.5 * dpr;
        }
        
        const gridPixelSize = modulePixelSize * this.gridSize;
        const offsetX = (canvasWidth - gridPixelSize) / 2;
        const offsetY = (canvasHeight - gridPixelSize) / 2;
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = lineWidth;
        
        for (let i = 0; i <= this.gridSize; i++) {
            const x = offsetX + i * modulePixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, offsetY);
            this.ctx.lineTo(x, offsetY + gridPixelSize);
            this.ctx.stroke();
            
            const y = offsetY + i * modulePixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(offsetX, y);
            this.ctx.lineTo(offsetX + gridPixelSize, y);
            this.ctx.stroke();
        }
        
        if (this.hoveredCell) {
            const { row, col } = this.hoveredCell;
            const x = offsetX + col * modulePixelSize;
            const y = offsetY + row * modulePixelSize;
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(x, y, modulePixelSize, modulePixelSize);
            
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
        const stem = size * 1.0;
        
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.fillStyle = '#FFFFFF';
        
        this.ctx.save();
        
        switch (type) {
            case 'E':
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
     * Очистить сетку
     */
    clear() {
        this.grid = this.createEmptyGrid();
        this.render();
        this.updateGlyphString();
    }
    
    /**
     * Форматировать строку глифа с пробелами каждые 10 символов
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
     * Удалить пробелы из строки глифа
     */
    removeSpaces(glyphString) {
        return glyphString.replace(/\s/g, '');
    }
    
    /**
     * Обновить строку глифа в UI
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
        
        const outputField = document.getElementById('editorGlyphString');
        if (outputField && document.activeElement !== outputField) {
            this.isUpdatingFromGrid = true;
            outputField.value = this.formatGlyphString(glyphString);
            this.isUpdatingFromGrid = false;
        }
        
        return glyphString;
    }
    
    /**
     * Handle glyph text field changes
     */
    handleGlyphStringChange(e) {
        if (this.isUpdatingFromGrid) {
            return;
        }
        
        const glyphString = this.removeSpaces(e.target.value);
        
        if (glyphString.length !== 50) {
            return;
        }
        
        this.importGlyph(glyphString, false);
    }
    
    /**
     * Копировать текст из второго поля в буфер обмена
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
     * Экспортировать глиф в строку (для копирования)
     */
    exportGlyph() {
        const glyphString = this.updateGlyphString();
        
        const outputField = document.getElementById('editorGlyphString');
        if (outputField) {
            outputField.select();
            
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
     * Сохранить глиф в коллекцию
     */
    saveGlyph() {
        const glyphString = this.updateGlyphString();
        const savedGlyphsField = document.getElementById('editorSavedGlyphs');
        
        if (!savedGlyphsField) return;
        
        const emojis = ['😎', '🎨', '✨', '🔥', '💎', '🌟', '⚡', '🎯', '🚀', '💫', '🎭', '🎪', '🎬', '🎮', '🎲', '🎸', '🎺', '🎻', '🎤', '🎧'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        const currentValue = savedGlyphsField.value.trim();
        const newEntry = `"${randomEmoji}": "${glyphString}",\n`;
        const separator = currentValue ? '\n\n' : '';
        
        savedGlyphsField.value = currentValue + separator + newEntry;
        
        savedGlyphsField.scrollTop = savedGlyphsField.scrollHeight;
        
        this.grid = this.createEmptyGrid();
        this.render();
        this.updateGlyphString();
    }
    
    /**
     * Импортировать глиф из строки
     * @param {string} glyphString - строка глифа
     * @param {boolean} updateField - обновлять ли поле текста (по умолчанию true)
     */
    importGlyph(glyphString, updateField = true) {
        glyphString = this.removeSpaces(glyphString);
        
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
        
        if (updateField) {
            this.updateGlyphString();
        }
    }
    
    /**
     * Обновить размеры canvas
     */
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const isStandalone = window.location.pathname.includes('/editor');
        
        if (isStandalone) {
            const size = 600;
            this.canvas.width = size;
            this.canvas.height = size;
            console.log('[GlyphEditor.updateCanvasSize] Standalone mode: fixed size', size);
        } else {
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            console.log('[GlyphEditor.updateCanvasSize] Main app mode: responsive size');
        }
        
        if (this.isActive) {
            this.render();
        }
    }
    
    /**
     * Обработчик изменения селектора символов
     */
    handleCharSelectorChange(e) {
        const char = e.target.value.toUpperCase();
        
        if (char && VOID_ALPHABET[char]) {
            this.selectedChar = char;
            this.selectedAlternativeIndex = null;
            this.loadBaseGlyph(char);
            this.updateAlternativesPanel();
        } else if (char === '') {
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            this.grid = this.createEmptyGrid();
            this.render();
            this.updateGlyphString();
            this.clearAlternativesPanel();
        }
    }
    
    /**
     * Загрузить базовый глиф символа
     * @param {string} char - символ
     */
    loadBaseGlyph(char) {
        this.loadGlyphWithEdits(char, null);
    }
    
    /**
     * Обновить панель альтернативных начертаний
     */
    updateAlternativesPanel() {
        const content = document.getElementById('editorAlternativesContent');
        const panel = document.getElementById('editorAlternativesPanel');
        if (!content || !panel || !this.selectedChar) {
            return;
        }
        
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
        }
        
        content.innerHTML = '';
        
        this.addAlternativePreview(content, null, 'Base');
        
        const alternatives = VOID_ALPHABET_ALTERNATIVES[this.selectedChar];
        
        if (alternatives && alternatives.length > 0) {
            alternatives.forEach((altGlyphString, index) => {
                const altIndex = index + 1;
                this.addAlternativePreview(content, altIndex, `Alt ${altIndex}`);
            });
        }
    }
    
    /**
     * Добавить превью альтернативы в панель
     */
    addAlternativePreview(container, alternativeIndex, label) {
        const editedGlyph = this.getEditedGlyph(this.selectedChar, alternativeIndex);
        
        const glyphStringToShow = editedGlyph || 'E0'.repeat(25);
        
        const item = document.createElement('div');
        item.className = 'editor-alternative-item';
        item.dataset.index = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        if (editedGlyph) {
            item.classList.add('edited');
        }
        
        item.addEventListener('click', () => {
            console.log(`[addAlternativePreview] Clicked on alternative: ${alternativeIndex}`);
            this.selectAlternative(alternativeIndex);
        });
        
        const preview = document.createElement('div');
        preview.className = 'editor-alternative-preview';
        
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 120;
        previewCanvas.height = 80;
        this.renderGlyphPreview(previewCanvas, glyphStringToShow);
        
        preview.appendChild(previewCanvas);
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'editor-alternative-label';
        labelDiv.textContent = label;
        
        item.appendChild(preview);
        item.appendChild(labelDiv);
        
        container.appendChild(item);
    }
    
    /**
     * Очистить панель альтернатив
     */
    clearAlternativesPanel() {
        const content = document.getElementById('editorAlternativesContent');
        if (content) {
            content.innerHTML = '';
        }
    }
    
    /**
     * Выбрать альтернативу
     * @param {number} index - индекс альтернативы (1+ для альтернатив, null для базового)
     */
    selectAlternative(index) {
        if (!this.selectedChar) return;
        
        console.log(`[selectAlternative] Selecting alternative: ${index} (type: ${typeof index}) for char: ${this.selectedChar}`);
        
        this.selectedAlternativeIndex = index;
        
        this.loadGlyphWithEdits(this.selectedChar, index);
        
        this.updateAlternativesSelection();
    }
    
    /**
     * Обновить визуальное выделение выбранной альтернативы
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
     * Отрисовать превью глифа на canvas
     * @param {HTMLCanvasElement} canvas - canvas для превью
     * @param {string} glyphString - строка глифа
     */
    renderGlyphPreview(canvas, glyphString) {
        const ctx = canvas.getContext('2d');
        
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const moduleSize = Math.min(width, height) / (this.gridSize + 1);
        const gridSize = moduleSize * this.gridSize;
        const offsetX = (width - gridSize) / 2;
        const offsetY = (height - gridSize) / 2;
        
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
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const module = grid[row][col];
                if (module) {
                    const x = offsetX + col * moduleSize + moduleSize / 2;
                    const y = offsetY + row * moduleSize + moduleSize / 2;
                    const angle = module.rotation * Math.PI / 2;
                    const stem = moduleSize * 1.0;
                    
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
     * Получить сохранённые отредактированные глифы из localStorage
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
     * Сохранить отредактированные глифы в localStorage
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
        
        const glyph = getGlyph(char, { alternativeIndex: alternativeIndex || null });
        
        if (glyph === VOID_ALPHABET[" "]) {
            const editedGlyph = this.getEditedGlyph(char, alternativeIndex);
            if (editedGlyph) {
                return editedGlyph;
            }
            return 'E0'.repeat(25);
        }
        
        return glyph;
    }
    
    /**
     * Получить сохранённый отредактированный глиф
     */
    getEditedGlyph(char, alternativeIndex) {
        const editedGlyphs = this.getEditedGlyphs();
        const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
        return editedGlyphs[char] && editedGlyphs[char][key] ? editedGlyphs[char][key] : null;
    }
    
    /**
     * Проверить, есть ли изменения в текущем глифе
     */
    checkForChanges() {
        if (!this.selectedChar || this.isCheckingChanges) {
            return;
        }
        
        this.isCheckingChanges = true;
        
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
        
        const referenceGlyphString = editedGlyphString || 'E0'.repeat(25);
        
        const hasChanges = currentGlyphString !== referenceGlyphString;
        this.updateSaveChangesButton(hasChanges);
        
        this.isCheckingChanges = false;
    }
    
    /**
     * Обновить видимость кнопки "Save Changes"
     */
    updateSaveChangesButton(show) {
        const saveChangesBtn = document.getElementById('editorSaveChangesBtn');
        if (saveChangesBtn) {
            saveChangesBtn.style.display = show ? 'block' : 'none';
        }
        
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = !show;
        }
    }
    
    /**
     * Проверить, является ли глиф пустым (только E0)
     */
    isEmptyGlyph(glyphString) {
        if (!glyphString) return true;
        const emptyGlyph = 'E0'.repeat(25);
        return glyphString === emptyGlyph;
    }
    
    /**
     * Сохранить изменения текущего глифа
     */
    saveChanges() {
        if (!this.selectedChar) {
            console.log('[saveChanges] No selected character');
            return;
        }
        
        const glyphString = this.updateGlyphString();
        const editedGlyphs = this.getEditedGlyphs();
        
        if (!editedGlyphs[this.selectedChar]) {
            editedGlyphs[this.selectedChar] = {};
        }
        
        const key = this.selectedAlternativeIndex === null ? 'base' : String(this.selectedAlternativeIndex);
        
        console.log(`[saveChanges] Saving glyph for char: ${this.selectedChar}, selectedAlternativeIndex: ${this.selectedAlternativeIndex}, key: ${key}`);
        console.log(`[saveChanges] Glyph string length: ${glyphString.length}`);
        
        if (this.isEmptyGlyph(glyphString)) {
            delete editedGlyphs[this.selectedChar][key];
            if (Object.keys(editedGlyphs[this.selectedChar]).length === 0) {
                delete editedGlyphs[this.selectedChar];
            }
        } else {
            editedGlyphs[this.selectedChar][key] = glyphString;
        }
        
        this.saveEditedGlyphs(editedGlyphs);
        
        console.log(`[saveChanges] ✓ Saved. Current storage for ${this.selectedChar}:`, editedGlyphs[this.selectedChar] ? Object.keys(editedGlyphs[this.selectedChar]) : 'deleted');
        
        if (this.selectedAlternativeIndex !== null) {
            this.updateAlternativesPanel();
        }
    }
    
    /**
     * Автосохранение (вызывается при каждом изменении)
     */
    autoSave() {
        if (!this.selectedChar) {
            return;
        }
        
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            const glyphString = this.updateGlyphString();
            const editedGlyphs = this.getEditedGlyphs();
            
            if (!editedGlyphs[this.selectedChar]) {
                editedGlyphs[this.selectedChar] = {};
            }
            
            const key = this.selectedAlternativeIndex === null ? 'base' : String(this.selectedAlternativeIndex);
            
            if (this.isEmptyGlyph(glyphString)) {
                delete editedGlyphs[this.selectedChar][key];
                if (Object.keys(editedGlyphs[this.selectedChar]).length === 0) {
                    delete editedGlyphs[this.selectedChar];
                }
            } else {
                editedGlyphs[this.selectedChar][key] = glyphString;
            }
            
            this.saveEditedGlyphs(editedGlyphs);
            
            const event = new CustomEvent('glyphAutoSaved', {
                detail: {
                    char: this.selectedChar,
                    alternativeIndex: this.selectedAlternativeIndex
                }
            });
            document.dispatchEvent(event);
        }, 300);
    }
    
    /**
     * Загрузить глиф с учётом сохранённых изменений
     */
    loadGlyphWithEdits(char, alternativeIndex) {
        this.selectedChar = char;
        this.selectedAlternativeIndex = alternativeIndex;
        
        console.log(`[loadGlyphWithEdits] Loading glyph for char: ${char}, alternativeIndex: ${alternativeIndex} (type: ${typeof alternativeIndex})`);
        
        const editedGlyph = this.getEditedGlyph(char, alternativeIndex);
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            console.log(`[loadGlyphWithEdits] ✓ Found edited glyph, loading it`);
            this.importGlyph(editedGlyph, true);
        } else {
            console.log(`[loadGlyphWithEdits] No edited glyph found, clearing canvas`);
            this.clear();
        }
        
        this.render();
        this.updateModuleInfo();
        this.updateGlyphString();
    }
}

