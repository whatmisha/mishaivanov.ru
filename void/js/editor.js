/**
 * Standalone Glyph Editor
 * Separate tool for creating and editing glyphs
 * 
 * INDEPENDENT EDITOR:
 * - Does not use VOID_ALPHABET from code
 * - Works only with imported data
 * - Empty on first open
 */

import GlyphEditor from './core/GlyphEditor.js';
import { ModuleDrawer } from './core/ModuleDrawer.js';
import DualSenseController from './editor/DualSenseController.js';

// Separate keys for editor (do not overlap with main application)
const STORAGE_KEY = 'voidEditor_editedGlyphs';
const IMPORTED_CHARS_KEY = 'voidEditor_importedChars';

class GlyphEditorApp {
    constructor() {
        const canvas = document.getElementById('editorCanvas');
        const moduleDrawer = new ModuleDrawer('fill');
        
        this.editor = new GlyphEditor(canvas, moduleDrawer);
        this.editor.storageKey = STORAGE_KEY;
        
        this.selectedChar = null;
        this.selectedAlternativeIndex = null;
        
        this.dualsenseController = new DualSenseController(this, this.editor);
        
        this.init();
    }
    
    init() {
        console.log('[GlyphEditorApp] Initializing editor...');
        console.log('[GlyphEditorApp] Canvas:', this.editor.canvas);
        console.log('[GlyphEditorApp] charList element:', document.getElementById('charList'));
        console.log('[GlyphEditorApp] alternativesContent element:', document.getElementById('alternativesContent'));
        
        this.editor.activate();
        console.log('[GlyphEditorApp] Editor activated');
        
        this.populateCharList();
        console.log('[GlyphEditorApp] Character list populated');
        
        this.selectChar('A');
        
        document.getElementById('importBtn').addEventListener('click', () => this.showImportDialog());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('newGlyphBtn').addEventListener('click', () => this.createNewGlyph());
        
        document.addEventListener('glyphAutoSaved', (e) => {
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
        });
        
        this.dualsenseController.activate();
        
        console.log('[GlyphEditorApp] Initialized with storage key:', STORAGE_KEY);
    }
    
    /**
     * Populate character list as grid
     */
    populateCharList() {
        const charGrid = document.getElementById('charGrid');
        if (!charGrid) {
            console.error('[GlyphEditorApp] charGrid element not found!');
            return;
        }
        
        charGrid.innerHTML = '';
        
        const latinChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const cyrillicChars = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
        const digitChars = '0123456789'.split('');
        
        const groups = [
            { title: 'Latin', chars: latinChars },
            { title: 'Cyrillic', chars: cyrillicChars },
            { title: 'Digits', chars: digitChars }
        ];
        
        const editedGlyphs = this.getEditedGlyphs();
        const importedChars = this.getImportedCharList() || [];
        
        const allStandardChars = [...latinChars, ...cyrillicChars, ...digitChars];
        const symbolChars = importedChars.filter(char => !allStandardChars.includes(char));
        
        let totalChars = 0;
        
        groups.forEach(group => {
            const title = document.createElement('div');
            title.className = 'char-group-title';
            title.textContent = group.title;
            charGrid.appendChild(title);
            group.chars.forEach(char => {
                const cell = this.createCharCell(char, editedGlyphs, importedChars);
                charGrid.appendChild(cell);
            });
            
            totalChars += group.chars.length;
        });
        
        if (symbolChars.length > 0) {
            const title = document.createElement('div');
            title.className = 'char-group-title';
            title.textContent = 'Symbols';
            charGrid.appendChild(title);
            
            symbolChars.forEach(char => {
                const cell = this.createCharCell(char, editedGlyphs, importedChars);
                charGrid.appendChild(cell);
            });
            
            totalChars += symbolChars.length;
        }
        
        console.log('[GlyphEditorApp] Populated grid with', totalChars, 'characters');
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
     * Создать ячейку символа
     */
    createCharCell(char, editedGlyphs, importedChars) {
        const cell = document.createElement('div');
        cell.className = 'char-cell';
        cell.dataset.char = char;
        
        const isImported = importedChars.includes(char);
        const glyphString = editedGlyphs[char] && editedGlyphs[char]['base'];
        const hasGlyph = glyphString && !this.isEmptyGlyph(glyphString);
        const isSelected = this.selectedChar === char;
        
        if (!isImported) {
            cell.classList.add('inactive');
        } else if (!hasGlyph) {
            cell.classList.add('empty');
        } else {
            cell.classList.add('has-glyph');
        }
        
        if (isSelected) {
            cell.classList.add('selected');
        }
        
        let altCount = 0;
        if (editedGlyphs[char]) {
            const keys = Object.keys(editedGlyphs[char]).filter(k => k !== 'base');
            altCount = keys.length;
        }
        
        if (hasGlyph) {
            const preview = document.createElement('div');
            preview.className = 'char-preview';
            
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 120;
            
            this.editor.renderGlyphPreview(canvas, glyphString);
            
            preview.appendChild(canvas);
            cell.appendChild(preview);
        } else {
            const fallback = document.createElement('div');
            fallback.className = 'char-fallback';
            fallback.textContent = char;
            cell.appendChild(fallback);
        }
        
        if (altCount > 0) {
            const badge = document.createElement('div');
            badge.className = 'char-alt-badge';
            badge.textContent = `+${altCount}`;
            cell.appendChild(badge);
        }
        
        if (isImported) {
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'char-cell-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete glyph';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteGlyph(char);
            });
            cell.appendChild(deleteBtn);
        }
        
        cell.addEventListener('click', () => {
            if (!isImported) {
                this.addCharToImported(char);
            }
            this.selectChar(char);
        });
        
        return cell;
    }
    
    /**
     * Add character to imported list
     */
    addCharToImported(char) {
        const importedChars = this.getImportedCharList() || [];
        if (!importedChars.includes(char)) {
            importedChars.push(char);
            this.saveImportedCharList(importedChars);
        }
    }
    
    
    /**
     * Select character
     */
    selectChar(char) {
        console.log('[GlyphEditorApp] Selecting character:', char);
        
        this.selectedChar = char;
        this.selectedAlternativeIndex = null;
        const items = document.querySelectorAll('.char-cell');
        items.forEach(item => {
            if (item.dataset.char === char) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        this.editor.selectedChar = char;
        this.editor.selectedAlternativeIndex = null;
        
        const editedGlyph = this.editor.getEditedGlyph(char, null);
        console.log('[GlyphEditorApp] selectChar - editedGlyph for', char, ':', editedGlyph ? 'found' : 'not found');
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            console.log('[GlyphEditorApp] Loading glyph for', char);
            this.editor.loadGlyphWithEdits(char, null);
        } else {
            console.log('[GlyphEditorApp] Clearing canvas for', char, '- glyph not found or empty');
            this.editor.clear();
        }
        
        console.log('[GlyphEditorApp] Glyph loaded for', char);
        
        this.updateAlternativesPanel();
        
        const displayChar = char === ' ' ? 'Space' : char;
        document.getElementById('currentChar').textContent = displayChar;
        document.getElementById('currentMode').textContent = 'Base';
        
        this.updateButtons();
    }
    
    /**
     * Update alternatives panel
     */
    updateAlternativesPanel() {
        const content = document.getElementById('alternativesContent');
        content.innerHTML = '';
        
        if (!this.selectedChar) {
            this.addAlternativePreview(content, null, 'Base', false);
            return;
        }
        
        const existingAlternatives = [];
            const editedGlyphs = this.getEditedGlyphs();
            if (editedGlyphs[this.selectedChar]) {
                Object.keys(editedGlyphs[this.selectedChar]).forEach(key => {
                    if (key !== 'base') {
                    existingAlternatives.push(parseInt(key));
                    }
                });
        }
        
        existingAlternatives.sort((a, b) => a - b);
        
        const alternativesToShow = [
            { index: null, label: 'Base' }
        ];
        
        existingAlternatives.forEach(index => {
                alternativesToShow.push({ index, label: `Alt ${index}` });
        });
        
        alternativesToShow.forEach(({ index, label }) => {
            let hasGlyph = false;
                const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, index);
                
                if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
                    hasGlyph = true;
            }
            
            this.addAlternativePreview(content, index, label, hasGlyph);
        });
        
        this.addAddButton(content);
        this.setupDragAndDrop(content);
    }
    
    /**
     * Setup drag-and-drop for alternatives container
     */
    setupDragAndDrop(container) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const dragging = document.querySelector('.alternative-item.dragging');
            if (!dragging) return;
            
            const targetElement = this.getElementUnderCursor(container, e.clientX, e.clientY);
            
            document.querySelectorAll('.alternative-item').forEach(el => {
                el.classList.remove('drag-over');
            });
            
            if (targetElement && targetElement.dataset.index !== 'add') {
                targetElement.classList.add('drag-over');
            }
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const dragging = document.querySelector('.alternative-item.dragging');
            if (!dragging) return;
            
            const draggedData = dragging.dataset.index;
            const isDraggingBase = draggedData === 'base';
            const draggedIndex = isDraggingBase ? null : parseInt(draggedData);
            
            const targetElement = this.getElementUnderCursor(container, e.clientX, e.clientY);
            if (!targetElement || targetElement.dataset.index === 'add') {
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                return;
            }
            
            const targetIndex = targetElement.dataset.index;
            const isTargetBase = targetIndex === 'base';
            const targetAltIndex = isTargetBase ? null : parseInt(targetIndex);
            
            if (draggedData === targetIndex) {
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                return;
            }
            
            this.swapAlternatives(draggedData, targetIndex);
            
            document.querySelectorAll('.alternative-item').forEach(el => {
                el.classList.remove('drag-over');
            });
        });
    }
    
    /**
     * Get element under cursor
     */
    getElementUnderCursor(container, x, y) {
        const elements = [...container.querySelectorAll('.alternative-item:not(.dragging)')];
        
        for (const element of elements) {
            const box = element.getBoundingClientRect();
            if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
                return element;
            }
        }
        
        return null;
    }
    
    /**
     * Swap two cells (Base or alternatives)
     * @param {string} draggedData - index of dragged cell ('base' or number)
     * @param {string} targetData - index of target cell ('base' or number)
     */
    swapAlternatives(draggedData, targetData) {
        if (!this.selectedChar) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        if (!editedGlyphs[this.selectedChar]) return;
        
        const isDraggingBase = draggedData === 'base';
        const isTargetBase = targetData === 'base';
        const draggedIndex = isDraggingBase ? null : parseInt(draggedData);
        const targetAltIndex = isTargetBase ? null : parseInt(targetData);
        
        const draggedGlyph = isDraggingBase 
            ? editedGlyphs[this.selectedChar]['base']
            : editedGlyphs[this.selectedChar][String(draggedIndex)];
        const targetGlyph = isTargetBase
            ? editedGlyphs[this.selectedChar]['base']
            : editedGlyphs[this.selectedChar][String(targetAltIndex)];
        
        if (isDraggingBase && isTargetBase) {
            return;
        } else if (isDraggingBase && !isTargetBase) {
            editedGlyphs[this.selectedChar]['base'] = targetGlyph;
            editedGlyphs[this.selectedChar][String(targetAltIndex)] = draggedGlyph;
        } else if (!isDraggingBase && isTargetBase) {
            editedGlyphs[this.selectedChar]['base'] = draggedGlyph;
            editedGlyphs[this.selectedChar][String(draggedIndex)] = targetGlyph;
        } else {
            editedGlyphs[this.selectedChar][String(draggedIndex)] = targetGlyph;
            editedGlyphs[this.selectedChar][String(targetAltIndex)] = draggedGlyph;
        }
        this.saveEditedGlyphs(editedGlyphs);
        
        if (isDraggingBase) {
            if (isTargetBase) {
                this.selectedAlternativeIndex = null;
            } else {
                this.selectedAlternativeIndex = targetAltIndex;
            }
        } else {
            if (isTargetBase) {
                this.selectedAlternativeIndex = null;
            } else {
                this.selectedAlternativeIndex = targetAltIndex;
            }
        }
        
        this.updateAlternativesPanel();
        setTimeout(() => {
            if (isTargetBase) {
                this.selectAlternative(null);
            } else {
                this.selectAlternative(targetAltIndex);
            }
        }, 0);
    }
    
    
    /**
     * Добавить превью альтернативы
     */
    addAlternativePreview(container, alternativeIndex, label, hasGlyph) {
        const item = document.createElement('div');
        item.className = 'alternative-item';
        item.dataset.index = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        let existsInStorage = false;
        if (this.selectedChar) {
            const editedGlyphs = this.getEditedGlyphs();
            const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
            existsInStorage = editedGlyphs[this.selectedChar] && editedGlyphs[this.selectedChar].hasOwnProperty(key);
        }
        
        const isEmpty = !hasGlyph || !this.selectedChar;
        
        if (isEmpty) {
            item.classList.add('empty');
            if (!this.selectedChar) {
                item.style.cursor = 'default';
                item.style.opacity = '0.3';
            }
        } else {
            item.classList.add('has-glyph');
        }
        
        if (alternativeIndex === this.selectedAlternativeIndex && this.selectedChar) {
            item.classList.add('selected');
        }
        if (hasGlyph && this.selectedChar) {
            const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
            if (editedGlyph) {
                item.classList.add('edited');
            }
        }
        
        if (alternativeIndex !== null || (alternativeIndex === null && this.selectedChar)) {
            item.draggable = true;
            item.classList.add('draggable');
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                const data = alternativeIndex === null ? 'base' : String(alternativeIndex);
                e.dataTransfer.setData('text/plain', data);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });
        }
        
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('alternative-delete')) {
                if (this.selectedChar) {
                    this.selectAlternative(alternativeIndex);
                }
            }
        });
        
        if (hasGlyph && this.selectedChar) {
            const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
            
            const preview = document.createElement('div');
            preview.className = 'alternative-preview';
            
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 120;
            this.editor.renderGlyphPreview(canvas, editedGlyph);
            
            preview.appendChild(canvas);
            item.appendChild(preview);
            
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'alternative-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete alternative';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAlternative(this.selectedChar, alternativeIndex);
            });
            item.appendChild(deleteBtn);
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'alternative-label';
            labelDiv.textContent = label;
            item.appendChild(labelDiv);
        } else {
            const fallback = document.createElement('div');
            fallback.className = 'char-fallback';
            fallback.textContent = label;
            item.appendChild(fallback);
            if (existsInStorage && this.selectedChar) {
                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'alternative-delete';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete empty alternative';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteAlternative(this.selectedChar, alternativeIndex);
                });
                item.appendChild(deleteBtn);
            }
        }
        
        container.appendChild(item);
    }
    
    /**
     * Add "+" button for creating new alternative
     */
    addAddButton(container) {
        const item = document.createElement('div');
        item.className = 'alternative-item add-alternative-button';
        item.dataset.index = 'add';
        
        if (!this.selectedChar) {
            item.style.cursor = 'default';
            item.style.opacity = '0.3';
        } else {
            item.style.cursor = 'pointer';
        }
        
        const plus = document.createElement('div');
        plus.className = 'char-fallback';
        plus.textContent = '+';
        item.appendChild(plus);
        item.addEventListener('click', () => {
            if (this.selectedChar) {
                this.createNewAlternative();
            }
        });
        
        container.appendChild(item);
    }
    
    /**
     * Выбрать альтернативу
     */
    selectAlternative(alternativeIndex) {
        this.selectedAlternativeIndex = alternativeIndex;
        
        this.editor.selectedAlternativeIndex = alternativeIndex;
        
        const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            this.editor.loadGlyphWithEdits(this.selectedChar, alternativeIndex);
        } else {
            this.editor.clear();
        }
        
        const items = document.querySelectorAll('.alternative-item');
        items.forEach(item => {
            const indexStr = item.dataset.index;
            const index = indexStr === 'base' ? null : parseInt(indexStr);
            if (index === alternativeIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        const modeName = alternativeIndex === null ? 'Base' : `Alt ${alternativeIndex}`;
        document.getElementById('currentMode').textContent = modeName;
        
        this.updateButtons();
    }
    
    /**
     * Update button states
     */
    updateButtons() {
        const clearAllBtn = document.getElementById('clearAllBtn');
        
        const importedChars = this.getImportedCharList();
        if (importedChars && importedChars.length > 0) {
            clearAllBtn.classList.add('visible');
        } else {
            clearAllBtn.classList.remove('visible');
        }
    }
    
    /**
     * Create new glyph for new character
     */
    createNewGlyph() {
        const input = document.getElementById('newGlyphInput');
        const char = input.value.trim().toUpperCase();
        
        if (!char) {
            alert('Please enter a character');
            return;
        }
        
        if (char.length !== 1) {
            alert('Please enter exactly one character');
            return;
        }
        
        let importedChars = this.getImportedCharList();
        if (importedChars && importedChars.includes(char)) {
            alert(`Character "${char}" already exists`);
            return;
        }
        
        const editedGlyphs = this.getEditedGlyphs();
        if (editedGlyphs[char] && editedGlyphs[char]['base'] && !this.isEmptyGlyph(editedGlyphs[char]['base'])) {
            alert(`Character "${char}" already exists`);
            return;
        }
        
        if (!importedChars) {
            importedChars = [];
        }
        if (!importedChars.includes(char)) {
            importedChars.push(char);
            this.saveImportedCharList(importedChars);
        }
        
        input.value = '';
        
        this.populateCharList();
        
        this.selectChar(char);
        
        console.log(`[GlyphEditorApp] Created new glyph for "${char}"`);
    }
    
    /**
     * Create new alternative for current character
     */
    createNewAlternative() {
        if (!this.selectedChar) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        
        let maxIndex = 0;
        
        if (editedGlyphs[this.selectedChar]) {
            Object.keys(editedGlyphs[this.selectedChar]).forEach(key => {
                if (key !== 'base') {
                    const index = parseInt(key);
                    if (index > maxIndex) {
                        maxIndex = index;
                    }
                }
            });
        }
        
        const newIndex = maxIndex + 1;
        
        const emptyGlyph = 'E0'.repeat(25);
        
        if (!editedGlyphs[this.selectedChar]) {
            editedGlyphs[this.selectedChar] = {};
        }
        
        editedGlyphs[this.selectedChar][String(newIndex)] = emptyGlyph;
        this.saveEditedGlyphs(editedGlyphs);
        
        this.updateAlternativesPanel();
        
        this.selectAlternative(newIndex);
        
        console.log(`[GlyphEditorApp] Created new alternative #${newIndex} for ${this.selectedChar}`);
    }
    
    /**
     * Delete all imported file
     */
    clearAll() {
        const confirmed = confirm('Delete all imported glyphs?\n\nThis will clear all data from localStorage.');
        if (!confirmed) return;
        
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(IMPORTED_CHARS_KEY);
        
        this.selectedChar = null;
        this.selectedAlternativeIndex = null;
        
        this.editor.clear();
        
        this.populateCharList();
        this.updateAlternativesPanel();
        this.updateButtons();
        
        document.getElementById('currentChar').textContent = '-';
        document.getElementById('currentMode').textContent = 'Base';
        
        const clearAllBtn = document.getElementById('clearAllBtn');
        clearAllBtn.classList.remove('visible');
        
        console.log('[GlyphEditorApp] All data cleared');
    }
    
    /**
     * Delete specific glyph (with all alternatives)
     */
    deleteGlyph(char) {
        const confirmed = confirm(`Delete glyph "${char}" and all its alternatives?`);
        if (!confirmed) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        
        delete editedGlyphs[char];
        this.saveEditedGlyphs(editedGlyphs);
        
        const importedChars = this.getImportedCharList();
        if (importedChars) {
            const index = importedChars.indexOf(char);
            if (index > -1) {
                importedChars.splice(index, 1);
                this.saveImportedCharList(importedChars);
            }
        }
        
        if (this.selectedChar === char) {
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            this.editor.clear();
            document.getElementById('currentChar').textContent = '-';
            document.getElementById('currentMode').textContent = 'Base';
        }
        
        this.populateCharList();
        this.updateAlternativesPanel();
        this.updateButtons();
        
        console.log('[GlyphEditorApp] Glyph deleted:', char);
    }
    
    /**
     * Delete specific alternative
     */
    deleteAlternative(char, alternativeIndex) {
        const label = alternativeIndex === null ? 'Base' : `Alt ${alternativeIndex}`;
        const confirmed = confirm(`Delete ${char} ${label}?`);
        if (!confirmed) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        if (editedGlyphs[char] && editedGlyphs[char][key]) {
            delete editedGlyphs[char][key];
            
            const shouldDeleteChar = Object.keys(editedGlyphs[char]).length === 0;
            if (shouldDeleteChar) {
                delete editedGlyphs[char];
                
                const importedChars = this.getImportedCharList();
                if (importedChars) {
                    const index = importedChars.indexOf(char);
                    if (index > -1) {
                        importedChars.splice(index, 1);
                        this.saveImportedCharList(importedChars);
                    }
                }
            }
            
            this.saveEditedGlyphs(editedGlyphs);
            
            if (this.selectedChar === char && this.selectedAlternativeIndex === alternativeIndex) {
                this.selectedAlternativeIndex = null;
                
                const baseGlyph = editedGlyphs[char] && editedGlyphs[char]['base'];
                if (baseGlyph && !this.isEmptyGlyph(baseGlyph)) {
                    this.editor.loadGlyphWithEdits(char, null);
                } else {
                    this.editor.selectedChar = char;
                    this.editor.selectedAlternativeIndex = null;
                    this.editor.clear();
                    this.editor.render();
                }
                
                document.getElementById('currentMode').textContent = 'Base';
            }
            
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
            
            console.log('[GlyphEditorApp] Alternative deleted:', char, alternativeIndex);
        }
    }
    
    /**
     * Delete current edited glyph (used by Delete button)
     */
    deleteCurrentGlyph() {
        if (!this.selectedChar) return;
        
        this.deleteAlternative(this.selectedChar, this.selectedAlternativeIndex);
    }
    
    /**
     * Show import file dialog
     */
    showImportDialog() {
        document.getElementById('importFileInput').click();
    }
    
    /**
     * Handle file import
     */
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const imported = this.parseVoidAlphabetFile(text);
            
            if (!imported.base && !imported.alternatives) {
                alert('Could not parse VoidAlphabet.js file. Make sure it contains VOID_ALPHABET and/or VOID_ALPHABET_ALTERNATIVES objects.');
                return;
            }
            
            const baseCount = Object.keys(imported.base || {}).length;
            const altCount = Object.keys(imported.alternatives || {}).length;
            
            const hasExistingData = this.getImportedCharList() && this.getImportedCharList().length > 0;
            
            let confirmed = true;
            if (hasExistingData) {
                confirmed = confirm(`Import ${baseCount} base glyphs and ${altCount} characters with alternatives?\n\nThis will REPLACE ALL DATA in localStorage.`);
            }
            
            if (!confirmed) return;
            
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(IMPORTED_CHARS_KEY);
            
            const editedGlyphs = {};
            const importedCharsList = new Set();
            
            for (const char in imported.base) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                editedGlyphs[char]['base'] = imported.base[char];
                importedCharsList.add(char);
            }
            
            for (const char in imported.alternatives) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                imported.alternatives[char].forEach((glyph, index) => {
                    editedGlyphs[char][String(index + 1)] = glyph;
                });
                importedCharsList.add(char);
            }
            
            this.saveEditedGlyphs(editedGlyphs);
            this.saveImportedCharList(Array.from(importedCharsList));
            
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
            
            setTimeout(() => {
                const importedChars = Array.from(importedCharsList).sort();
                if (importedChars.length > 0) {
                    const firstChar = importedChars.includes('A') ? 'A' : importedChars[0];
                    console.log('[GlyphEditorApp] Auto-selecting first char after import:', firstChar);
                    this.selectChar(firstChar);
                }
            }, 0);
            
            const clearAllBtn = document.getElementById('clearAllBtn');
            clearAllBtn.classList.add('visible');
            
        } catch (e) {
            console.error('Import error:', e);
            alert('Failed to import file: ' + e.message);
        }
        
        event.target.value = '';
    }
    
    /**
     * Parse VoidAlphabet.js file
     */
    parseVoidAlphabetFile(text) {
        const result = {
            base: {},
            alternatives: {}
        };
        
        const alphabetMatch = text.match(/export\s+const\s+VOID_ALPHABET\s*=\s*\{([^}]+(?:\}[^}]+)*)\};/s);
        if (alphabetMatch) {
            const content = alphabetMatch[1];
            const entries = content.matchAll(/"([^"]+)":\s*"([^"]+)"/g);
            for (const [, char, glyph] of entries) {
                result.base[char] = glyph;
            }
        }
        
        const altMatch = text.match(/export\s+const\s+VOID_ALPHABET_ALTERNATIVES\s*=\s*\{([^}]+(?:\}[^}]+)*)\};/s);
        if (altMatch) {
            const content = altMatch[1];
            const charMatches = content.matchAll(/"([^"]+)":\s*\[([\s\S]*?)\]/g);
            for (const [, char, altsContent] of charMatches) {
                const glyphs = [];
                const glyphMatches = altsContent.matchAll(/"([^"]+)"/g);
                for (const [, glyph] of glyphMatches) {
                    glyphs.push(glyph);
                }
                if (glyphs.length > 0) {
                    result.alternatives[char] = glyphs;
                }
            }
        }
        
        return result;
    }
    
    /**
     * Export VoidAlphabet.js file
     */
    showExportModal() {
        const editedGlyphs = this.getEditedGlyphs();
        const code = this.generateFullVoidAlphabetFile(editedGlyphs);
        
        this.downloadFile('VoidAlphabet.js', code);
    }
    
    /**
     * Download file
     */
    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Generate full VoidAlphabet.js file from imported data only
     */
    generateFullVoidAlphabetFile(editedGlyphs) {
        const allBaseGlyphs = {};
        
        for (const char in editedGlyphs) {
            const glyphString = editedGlyphs[char]['base'];
            const isSpace = char === ' ';
            if (glyphString && (isSpace || !this.isEmptyGlyph(glyphString))) {
                allBaseGlyphs[char] = glyphString;
            }
        }
        
        let code = 'export const VOID_ALPHABET = {\n';
        
        const latin = [];
        const cyrillic = [];
        const digits = [];
        const symbols = [];
        
        for (const char in allBaseGlyphs) {
            if (/[A-Z]/.test(char)) {
                latin.push(char);
            } else if (/[А-ЯЁ]/.test(char)) {
                cyrillic.push(char);
            } else if (/[0-9]/.test(char)) {
                digits.push(char);
            } else {
                symbols.push(char);
            }
        }
        latin.sort((a, b) => a.localeCompare(b, 'en'));
        cyrillic.sort((a, b) => a.localeCompare(b, 'ru'));
        digits.sort((a, b) => a.localeCompare(b, 'en'));
        symbols.sort((a, b) => a.localeCompare(b, 'en'));
        
        // Latin
        if (latin.length > 0) {
            code += '    // Latin\n';
            latin.forEach((char, i) => {
                const comma = (i < latin.length - 1 || cyrillic.length > 0 || digits.length > 0 || symbols.length > 0) ? ',' : '';
                code += `    "${char}": "${allBaseGlyphs[char]}"${comma}\n`;
            });
            code += '    \n';
        }
        
        // Cyrillic
        if (cyrillic.length > 0) {
            code += '    // Cyrillic\n';
            cyrillic.forEach((char, i) => {
                const comma = (i < cyrillic.length - 1 || digits.length > 0 || symbols.length > 0) ? ',' : '';
                code += `    "${char}": "${allBaseGlyphs[char]}"${comma}\n`;
            });
            code += '    \n';
        }
        
        // Digits
        if (digits.length > 0) {
            code += '    // Digits\n';
            digits.forEach((char, i) => {
                const comma = (i < digits.length - 1 || symbols.length > 0) ? ',' : '';
                code += `    "${char}": "${allBaseGlyphs[char]}"${comma}\n`;
            });
            code += '    \n';
        }
        
        // Symbols
        if (symbols.length > 0) {
            code += '    // Symbols\n';
            symbols.forEach((char, i) => {
                const comma = i < symbols.length - 1 ? ',' : '';
                code += `    "${char}": "${allBaseGlyphs[char]}"${comma}\n`;
            });
        }
        
        code += '};\n\n';
        
        const allAlternatives = {};
        
        for (const char in editedGlyphs) {
            const charAlts = [];
            const keys = Object.keys(editedGlyphs[char])
                .filter(k => k !== 'base')
                .map(k => parseInt(k))
                .sort((a, b) => a - b);
            
            keys.forEach(index => {
                while (charAlts.length < index - 1) {
                    charAlts.push('E0'.repeat(25));
                }
                charAlts.push(editedGlyphs[char][String(index)]);
            });
            
            if (charAlts.length > 0) {
                allAlternatives[char] = charAlts;
            }
        }
        
        code += 'export const VOID_ALPHABET_ALTERNATIVES = {\n';
        
        const altLatin = [];
        const altCyrillic = [];
        const altDigits = [];
        const altSymbols = [];
        
        for (const char in allAlternatives) {
            if (/[A-Z]/.test(char)) {
                altLatin.push(char);
            } else if (/[А-ЯЁ]/.test(char)) {
                altCyrillic.push(char);
            } else if (/[0-9]/.test(char)) {
                altDigits.push(char);
            } else {
                altSymbols.push(char);
            }
        }
        altLatin.sort((a, b) => a.localeCompare(b, 'en'));
        altCyrillic.sort((a, b) => a.localeCompare(b, 'ru'));
        altDigits.sort((a, b) => a.localeCompare(b, 'en'));
        altSymbols.sort((a, b) => a.localeCompare(b, 'en'));
        
        // Latin
        if (altLatin.length > 0) {
            code += '    // Latin\n';
            altLatin.forEach((char, i) => {
                const comma = (i < altLatin.length - 1 || altCyrillic.length > 0 || altDigits.length > 0 || altSymbols.length > 0) ? ',' : '';
                code += `    "${char}": [\n`;
                allAlternatives[char].forEach((glyph, j) => {
                    const glyphComma = j < allAlternatives[char].length - 1 ? ',' : '';
                    code += `        "${glyph}"${glyphComma}\n`;
                });
                code += `    ]${comma}\n`;
            });
            code += '    \n';
        }
        
        // Cyrillic
        if (altCyrillic.length > 0) {
            code += '    // Cyrillic\n';
            altCyrillic.forEach((char, i) => {
                const comma = (i < altCyrillic.length - 1 || altDigits.length > 0 || altSymbols.length > 0) ? ',' : '';
                code += `    "${char}": [\n`;
                allAlternatives[char].forEach((glyph, j) => {
                    const glyphComma = j < allAlternatives[char].length - 1 ? ',' : '';
                    code += `        "${glyph}"${glyphComma}\n`;
                });
                code += `    ]${comma}\n`;
            });
            code += '    \n';
        }
        
        // Digits
        if (altDigits.length > 0) {
            code += '    // Digits\n';
            altDigits.forEach((char, i) => {
                const comma = (i < altDigits.length - 1 || altSymbols.length > 0) ? ',' : '';
                code += `    "${char}": [\n`;
                allAlternatives[char].forEach((glyph, j) => {
                    const glyphComma = j < allAlternatives[char].length - 1 ? ',' : '';
                    code += `        "${glyph}"${glyphComma}\n`;
                });
                code += `    ]${comma}\n`;
            });
            code += '    \n';
        }
        
        // Symbols
        if (altSymbols.length > 0) {
            code += '    // Symbols\n';
            altSymbols.forEach((char, i) => {
                const comma = i < altSymbols.length - 1 ? ',' : '';
                code += `    "${char}": [\n`;
                allAlternatives[char].forEach((glyph, j) => {
                    const glyphComma = j < allAlternatives[char].length - 1 ? ',' : '';
                    code += `        "${glyph}"${glyphComma}\n`;
                });
                code += `    ]${comma}\n`;
            });
        }
        
        code += '};\n';
        
        return code;
    }
    
    /**
     * Get edited glyphs from localStorage
     */
    getEditedGlyphs() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(editedGlyphs));
        } catch (e) {
            console.error('Error saving edited glyphs:', e);
        }
    }
    
    /**
     * Получить список импортированных символов
     */
    getImportedCharList() {
        try {
            const stored = localStorage.getItem(IMPORTED_CHARS_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error('Error loading imported char list:', e);
            return null;
        }
    }
    
    /**
     * Сохранить список импортированных символов
     */
    saveImportedCharList(charList) {
        try {
            localStorage.setItem(IMPORTED_CHARS_KEY, JSON.stringify(charList));
        } catch (e) {
            console.error('Error saving imported char list:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[GlyphEditorApp] DOM loaded');
    
    if (localStorage.getItem('undefined')) {
        console.log('[GlyphEditorApp] Found data under "undefined" key, removing...');
        localStorage.removeItem('undefined');
        console.log('[GlyphEditorApp] Removed old "undefined" data');
    }
    
    const oldEditorKey = 'voidGlyphEditor_editedGlyphs';
    const oldImportedKey = 'voidGlyphEditor_importedChars';
    if (localStorage.getItem(oldEditorKey) && !localStorage.getItem(STORAGE_KEY)) {
        console.log('[GlyphEditorApp] Migrating from old editor key...');
        const oldData = localStorage.getItem(oldEditorKey);
        const oldImported = localStorage.getItem(oldImportedKey);
        localStorage.setItem(STORAGE_KEY, oldData);
        if (oldImported) {
            localStorage.setItem(IMPORTED_CHARS_KEY, oldImported);
        }
        localStorage.removeItem(oldEditorKey);
        localStorage.removeItem(oldImportedKey);
        console.log('[GlyphEditorApp] Migration from old editor key complete');
    }
    
    const currentData = localStorage.getItem(STORAGE_KEY);
    if (currentData) {
        console.log('[GlyphEditorApp] Found edited glyphs in storage:', JSON.parse(currentData));
    } else {
        console.log('[GlyphEditorApp] No edited glyphs in storage');
    }
    const navPanel = document.querySelector('.nav-panel');
    const altPanel = document.querySelector('.alternatives-panel');
    if (navPanel) {
        const navStyle = window.getComputedStyle(navPanel);
        console.log('[GlyphEditorApp] Nav panel display:', navStyle.display, 'width:', navStyle.width);
    }
    if (altPanel) {
        const altStyle = window.getComputedStyle(altPanel);
        console.log('[GlyphEditorApp] Alt panel display:', altStyle.display, 'width:', altStyle.width);
    }
    
    new GlyphEditorApp();
});

