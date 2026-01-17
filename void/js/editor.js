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

// Separate keys for editor (don't overlap with main app)
const STORAGE_KEY = 'voidEditor_editedGlyphs';
const IMPORTED_CHARS_KEY = 'voidEditor_importedChars';

class GlyphEditorApp {
    constructor() {
        const canvas = document.getElementById('editorCanvas');
        const moduleDrawer = new ModuleDrawer('fill');  // FIXED: 'fill' instead of 'stroke'
        
        this.editor = new GlyphEditor(canvas, moduleDrawer);
        
        // Set correct storageKey
        this.editor.storageKey = STORAGE_KEY;
        
        this.selectedChar = null;
        this.selectedAlternativeIndex = null;
        
        // Initialize DualSense controller
        this.dualsenseController = new DualSenseController(this, this.editor);
        
        this.init();
    }
    
    init() {
        console.log('[GlyphEditorApp] Initializing editor...');
        console.log('[GlyphEditorApp] Canvas:', this.editor.canvas);
        console.log('[GlyphEditorApp] charList element:', document.getElementById('charList'));
        console.log('[GlyphEditorApp] alternativesContent element:', document.getElementById('alternativesContent'));
        
        // Activate editor
        this.editor.activate();
        console.log('[GlyphEditorApp] Editor activated');
        
        // Populate character list
        this.populateCharList();
        console.log('[GlyphEditorApp] Character list populated');
        
        // Automatically select glyph A by default
        this.selectChar('A');
        
        // Button handlers
        document.getElementById('importBtn').addEventListener('click', () => this.showImportDialog());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('newGlyphBtn').addEventListener('click', () => this.createNewGlyph());
        
        // Listen for autosave events to update UI
        document.addEventListener('glyphAutoSaved', (e) => {
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
        });
        
        // Activate DualSense controller
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
        
        // Define character groups
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
        
        // Find symbols not in standard groups
        const allStandardChars = [...latinChars, ...cyrillicChars, ...digitChars];
        const symbolChars = importedChars.filter(char => !allStandardChars.includes(char));
        
        let totalChars = 0;
        
        // Display standard groups
        groups.forEach(group => {
            // Add group title
            const title = document.createElement('div');
            title.className = 'char-group-title';
            title.textContent = group.title;
            charGrid.appendChild(title);
            
            // Add group symbols
            group.chars.forEach(char => {
                const cell = this.createCharCell(char, editedGlyphs, importedChars);
                charGrid.appendChild(cell);
            });
            
            totalChars += group.chars.length;
        });
        
        // If there are additional symbols, show Symbols group
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
     * Check if glyph is empty (only E0)
     */
    isEmptyGlyph(glyphString) {
        if (!glyphString) return true;
        // Check if glyph consists only of E0 modules
        const emptyGlyph = 'E0'.repeat(25);
        return glyphString === emptyGlyph;
    }
    
    /**
     * Create character cell
     */
    createCharCell(char, editedGlyphs, importedChars) {
        const cell = document.createElement('div');
        cell.className = 'char-cell';
        cell.dataset.char = char;
        
        const isImported = importedChars.includes(char);
        const glyphString = editedGlyphs[char] && editedGlyphs[char]['base'];
        const hasGlyph = glyphString && !this.isEmptyGlyph(glyphString);
        const isSelected = this.selectedChar === char;
        
        // Determine state
        if (!isImported) {
            cell.classList.add('inactive'); // State 1: not in file
        } else if (!hasGlyph) {
            cell.classList.add('empty'); // State 3: added but not drawn or cleared
        } else {
            cell.classList.add('has-glyph'); // State 4: drawn
        }
        
        if (isSelected) {
            cell.classList.add('selected'); // State 5: selected
        }
        
        // Count alternatives
        let altCount = 0;
        if (editedGlyphs[char]) {
            const keys = Object.keys(editedGlyphs[char]).filter(k => k !== 'base');
            altCount = keys.length;
        }
        
        // If glyph exists - show preview
        if (hasGlyph) {
            const preview = document.createElement('div');
            preview.className = 'char-preview';
            
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 120;
            
            // Render glyph using editor's method
            this.editor.renderGlyphPreview(canvas, glyphString);
            
            preview.appendChild(canvas);
            cell.appendChild(preview);
        } else {
            // Show letter with standard font
            const fallback = document.createElement('div');
            fallback.className = 'char-fallback';
            fallback.textContent = char;
            cell.appendChild(fallback);
        }
        
        // Alternative count badge
        if (altCount > 0) {
            const badge = document.createElement('div');
            badge.className = 'char-alt-badge';
            badge.textContent = `+${altCount}`;
            cell.appendChild(badge);
        }
        
        // Delete button (only for imported)
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
        
        // Click handler
        cell.addEventListener('click', () => {
            if (!isImported) {
                // Add symbol to imported
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
            
            // DON'T create empty glyph - it will be created automatically on first draw
            // Just add character to imported list
        }
    }
    
    
    /**
     * Select character
     */
    selectChar(char) {
        console.log('[GlyphEditorApp] Selecting character:', char);
        
        this.selectedChar = char;
        this.selectedAlternativeIndex = null; // Reset alternative selection
        
        // Update UI
        const items = document.querySelectorAll('.char-cell');
        items.forEach(item => {
            if (item.dataset.char === char) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Load base glyph to editor (ONLY from editedGlyphs, WITHOUT original)
        this.editor.selectedChar = char;
        this.editor.selectedAlternativeIndex = null;
        
        // Load only if glyph exists in editedGlyphs
        const editedGlyph = this.editor.getEditedGlyph(char, null);
        console.log('[GlyphEditorApp] selectChar - editedGlyph for', char, ':', editedGlyph ? 'found' : 'not found');
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            console.log('[GlyphEditorApp] Loading glyph for', char);
            this.editor.loadGlyphWithEdits(char, null);
        } else {
            console.log('[GlyphEditorApp] Clearing canvas for', char, '- glyph not found or empty');
            // Clear canvas for new empty glyph
            this.editor.clear();
        }
        
        console.log('[GlyphEditorApp] Glyph loaded for', char);
        
        // Update alternatives panel
        this.updateAlternativesPanel();
        
        // Update toolbar
        // For space show visual representation so title doesn't shift
        const displayChar = char === ' ' ? 'Space' : char;
        document.getElementById('currentChar').textContent = displayChar;
        document.getElementById('currentMode').textContent = 'Base';
        
        // Enable buttons
        this.updateButtons();
    }
    
    /**
     * Update alternatives panel
     */
    updateAlternativesPanel() {
        const content = document.getElementById('alternativesContent');
        content.innerHTML = '';
        
        if (!this.selectedChar) {
            // If glyph not selected, show only empty Base cell
            this.addAlternativePreview(content, null, 'Base', false);
            return;
        }
        
        // Collect all existing alternatives from editedGlyphs
        const existingAlternatives = [];
            const editedGlyphs = this.getEditedGlyphs();
            if (editedGlyphs[this.selectedChar]) {
                Object.keys(editedGlyphs[this.selectedChar]).forEach(key => {
                    if (key !== 'base') {
                    existingAlternatives.push(parseInt(key));
                    }
                });
        }
        
        // Sort alternatives by index
        existingAlternatives.sort((a, b) => a - b);
        
        // Determine which cells to show
        // Always show Base
        const alternativesToShow = [
            { index: null, label: 'Base' }
        ];
        
        // Add only existing alternatives
        existingAlternatives.forEach(index => {
                alternativesToShow.push({ index, label: `Alt ${index}` });
        });
        
        // Show all existing cells
        alternativesToShow.forEach(({ index, label }) => {
            // Check if alternative exists and is not empty
            // DON'T load original glyphs - only those in editedGlyphs
            let hasGlyph = false;
                const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, index);
                
                // Check that glyph exists and is not empty (ONLY editedGlyph, WITHOUT originalGlyph)
                if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
                    hasGlyph = true;
            }
            
            this.addAlternativePreview(content, index, label, hasGlyph);
        });
        
        // Add "+" cell at the end
        this.addAddButton(content);
        
        // Add drag-and-drop handlers for container
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
            
            // Find element under cursor
            const targetElement = this.getElementUnderCursor(container, e.clientX, e.clientY);
            
            // Remove all drag-over classes
            document.querySelectorAll('.alternative-item').forEach(el => {
                el.classList.remove('drag-over');
            });
            
            // Highlight element under cursor (except "+" button)
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
            
            // Find element where drop occurred
            const targetElement = this.getElementUnderCursor(container, e.clientX, e.clientY);
            if (!targetElement || targetElement.dataset.index === 'add') {
                // Remove all drag-over classes
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                return;
            }
            
            const targetIndex = targetElement.dataset.index;
            const isTargetBase = targetIndex === 'base';
            const targetAltIndex = isTargetBase ? null : parseInt(targetIndex);
            
            // If dragging to same element, do nothing
            if (draggedData === targetIndex) {
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                return;
            }
            
            // Simply swap two cells
            this.swapAlternatives(draggedData, targetIndex);
            
            // Remove all drag-over classes
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
        
        // Save glyphs
        const draggedGlyph = isDraggingBase 
            ? editedGlyphs[this.selectedChar]['base']
            : editedGlyphs[this.selectedChar][String(draggedIndex)];
        const targetGlyph = isTargetBase
            ? editedGlyphs[this.selectedChar]['base']
            : editedGlyphs[this.selectedChar][String(targetAltIndex)];
        
        // Swap
        if (isDraggingBase && isTargetBase) {
            // Base to Base - do nothing
            return;
        } else if (isDraggingBase && !isTargetBase) {
            // Base to alternative
            editedGlyphs[this.selectedChar]['base'] = targetGlyph;
            editedGlyphs[this.selectedChar][String(targetAltIndex)] = draggedGlyph;
        } else if (!isDraggingBase && isTargetBase) {
            // Alternative to Base
            editedGlyphs[this.selectedChar]['base'] = draggedGlyph;
            editedGlyphs[this.selectedChar][String(draggedIndex)] = targetGlyph;
        } else {
            // Alternative to alternative
            editedGlyphs[this.selectedChar][String(draggedIndex)] = targetGlyph;
            editedGlyphs[this.selectedChar][String(targetAltIndex)] = draggedGlyph;
        }
        
        // Save changes
        this.saveEditedGlyphs(editedGlyphs);
        
        // Update selected index
        if (isDraggingBase) {
            // If dragged Base, select target cell
            if (isTargetBase) {
                this.selectedAlternativeIndex = null;
            } else {
                this.selectedAlternativeIndex = targetAltIndex;
            }
        } else {
            // If dragged alternative, select target cell
            if (isTargetBase) {
                this.selectedAlternativeIndex = null;
            } else {
                this.selectedAlternativeIndex = targetAltIndex;
            }
        }
        
        // Update alternatives panel
        this.updateAlternativesPanel();
        
        // Select target cell
        setTimeout(() => {
            if (isTargetBase) {
                this.selectAlternative(null);
            } else {
                this.selectAlternative(targetAltIndex);
            }
        }, 0);
    }
    
    
    /**
     * Add alternative preview
     */
    addAlternativePreview(container, alternativeIndex, label, hasGlyph) {
        const item = document.createElement('div');
        item.className = 'alternative-item';
        item.dataset.index = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        // Check if alternative exists in editedGlyphs (even if empty)
        let existsInStorage = false;
        if (this.selectedChar) {
            const editedGlyphs = this.getEditedGlyphs();
            const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
            existsInStorage = editedGlyphs[this.selectedChar] && editedGlyphs[this.selectedChar].hasOwnProperty(key);
        }
        
        // Determine cell state (same as left panel)
        const isEmpty = !hasGlyph || !this.selectedChar;
        
        if (isEmpty) {
            item.classList.add('empty'); // Empty cell
            // If glyph not selected, make cell inactive
            if (!this.selectedChar) {
                item.style.cursor = 'default';
                item.style.opacity = '0.3';
            }
        } else {
            item.classList.add('has-glyph'); // Cell with glyph
        }
        
        if (alternativeIndex === this.selectedAlternativeIndex && this.selectedChar) {
            item.classList.add('selected');
        }
        
        // If edited glyph exists, add edited class
        if (hasGlyph && this.selectedChar) {
            const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
            if (editedGlyph) {
                item.classList.add('edited');
            }
        }
        
        // Add drag-and-drop for Base and alternatives (not for "+" button)
        if (alternativeIndex !== null || (alternativeIndex === null && this.selectedChar)) {
            item.draggable = true;
            item.classList.add('draggable');
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                // For Base use 'base', for alternatives - index
                const data = alternativeIndex === null ? 'base' : String(alternativeIndex);
                e.dataTransfer.setData('text/plain', data);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                // Remove all drag-over classes
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });
        }
        
        item.addEventListener('click', (e) => {
            // Don't select alternative when clicking delete or duplicate button
            if (!e.target.classList.contains('alternative-delete') && !e.target.classList.contains('alternative-duplicate')) {
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
            
            // Duplicate button for alternative (for cells with glyph)
            const duplicateBtn = document.createElement('div');
            duplicateBtn.className = 'alternative-duplicate';
            duplicateBtn.innerHTML = '⧉';
            duplicateBtn.title = 'Duplicate alternative';
            duplicateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.duplicateAlternative(this.selectedChar, alternativeIndex);
            });
            item.appendChild(duplicateBtn);
            
            // Delete button for alternative (for cells with glyph)
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'alternative-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete alternative';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAlternative(this.selectedChar, alternativeIndex);
            });
            item.appendChild(deleteBtn);
            
            // Label at bottom for cells with glyph
            const labelDiv = document.createElement('div');
            labelDiv.className = 'alternative-label';
            labelDiv.textContent = label;
            item.appendChild(labelDiv);
        } else {
            // For empty cells show only label text with standard font centered
            const fallback = document.createElement('div');
            fallback.className = 'char-fallback';
            fallback.textContent = label;
            item.appendChild(fallback);
            
            // Duplicate and delete buttons for empty alternative (only if it exists in storage)
            if (existsInStorage && this.selectedChar) {
                const duplicateBtn = document.createElement('div');
                duplicateBtn.className = 'alternative-duplicate';
                duplicateBtn.innerHTML = '⧉';
                duplicateBtn.title = 'Duplicate alternative';
                duplicateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.duplicateAlternative(this.selectedChar, alternativeIndex);
                });
                item.appendChild(duplicateBtn);
                
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
        
        // If glyph not selected, make button inactive
        if (!this.selectedChar) {
            item.style.cursor = 'default';
            item.style.opacity = '0.3';
        } else {
            item.style.cursor = 'pointer';
        }
        
        // Show "+" centered (use same font size as for "Base")
        const plus = document.createElement('div');
        plus.className = 'char-fallback';
        plus.textContent = '+';
        item.appendChild(plus);
        
        // Click handler
        item.addEventListener('click', () => {
            if (this.selectedChar) {
                this.createNewAlternative();
            }
        });
        
        container.appendChild(item);
    }
    
    /**
     * Select alternative
     */
    selectAlternative(alternativeIndex) {
        this.selectedAlternativeIndex = alternativeIndex;
        
        // Load to editor (ONLY from editedGlyphs, WITHOUT original)
        this.editor.selectedAlternativeIndex = alternativeIndex;
        
        // Check if glyph exists in editedGlyphs
        const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            this.editor.loadGlyphWithEdits(this.selectedChar, alternativeIndex);
        } else {
            // Clear canvas for new empty glyph
            this.editor.clear();
        }
        
        // Update UI
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
        
        // Update toolbar
        const modeName = alternativeIndex === null ? 'Base' : `Alt ${alternativeIndex}`;
        document.getElementById('currentMode').textContent = modeName;
        
        // Update buttons
        this.updateButtons();
    }
    
    /**
     * Update button states
     */
    updateButtons() {
        const clearAllBtn = document.getElementById('clearAllBtn');
        
        // Show Clear All only if data exists
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
        
        // Validation
        if (!char) {
            alert('Please enter a character');
            return;
        }
        
        if (char.length !== 1) {
            alert('Please enter exactly one character');
            return;
        }
        
        // Check if already exists in imported
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
        
        // DON'T create empty glyph - it will be created automatically on first draw
        // Just add character to imported list
        
        // Add to imported list (update or create)
        if (!importedChars) {
            importedChars = [];
        }
        if (!importedChars.includes(char)) {
            importedChars.push(char);
            this.saveImportedCharList(importedChars);
        }
        
        // Clear field
        input.value = '';
        
        // Update character list
        this.populateCharList();
        
        // Automatically select new character
        this.selectChar(char);
        
        console.log(`[GlyphEditorApp] Created new glyph for "${char}"`);
    }
    
    /**
     * Create new alternative for current character
     */
    createNewAlternative() {
        if (!this.selectedChar) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        
        // Find next free index for alternative (only from imported data)
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
        
        // Create EMPTY glyph (25 E0 modules) instead of copying original
        const emptyGlyph = 'E0'.repeat(25);
        
        // Save new alternative
        if (!editedGlyphs[this.selectedChar]) {
            editedGlyphs[this.selectedChar] = {};
        }
        
        editedGlyphs[this.selectedChar][String(newIndex)] = emptyGlyph;
        this.saveEditedGlyphs(editedGlyphs);
        
        // Update UI
        this.updateAlternativesPanel();
        
        // Automatically select new alternative for editing
        this.selectAlternative(newIndex);
        
        console.log(`[GlyphEditorApp] Created new alternative #${newIndex} for ${this.selectedChar}`);
    }
    
    /**
     * Delete all imported file
     */
    clearAll() {
        const confirmed = confirm('Delete all imported glyphs?\n\nThis will clear all data from localStorage.');
        if (!confirmed) return;
        
        // Full cleanup
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(IMPORTED_CHARS_KEY);
        
        // Reset selection
        this.selectedChar = null;
        this.selectedAlternativeIndex = null;
        
        // Clear canvas
        this.editor.clear();
        
        // Update UI
        this.populateCharList();
        this.updateAlternativesPanel();
        this.updateButtons();
        
        // Clear toolbar
        document.getElementById('currentChar').textContent = '-';
        document.getElementById('currentMode').textContent = 'Base';
        
        // Hide Clear All button
        const clearAllBtn = document.getElementById('clearAllBtn');
        clearAllBtn.classList.remove('visible');
        
        console.log('[GlyphEditorApp] All data cleared');
    }
    
    /**
     * Delete specific glyph (with alternatives)
     */
    deleteGlyph(char) {
        const confirmed = confirm(`Delete glyph "${char}" and all its alternatives?`);
        if (!confirmed) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        
        // Delete all glyph data
        delete editedGlyphs[char];
        this.saveEditedGlyphs(editedGlyphs);
        
        // Remove from imported list
        const importedChars = this.getImportedCharList();
        if (importedChars) {
            const index = importedChars.indexOf(char);
            if (index > -1) {
                importedChars.splice(index, 1);
                this.saveImportedCharList(importedChars);
            }
        }
        
        // If deleted glyph was selected - reset selection
        if (this.selectedChar === char) {
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            this.editor.clear();
            document.getElementById('currentChar').textContent = '-';
            document.getElementById('currentMode').textContent = 'Base';
        }
        
        // Update UI
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
            
            // If no edited versions remain for character, delete entire character
            const shouldDeleteChar = Object.keys(editedGlyphs[char]).length === 0;
            if (shouldDeleteChar) {
                delete editedGlyphs[char];
                
                // Remove from imported list
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
            
            // If deleted alternative was selected
            if (this.selectedChar === char && this.selectedAlternativeIndex === alternativeIndex) {
                // Switch to base (if exists) or clear canvas
                this.selectedAlternativeIndex = null;
                
                // Check if base glyph exists in editedGlyphs
                const baseGlyph = editedGlyphs[char] && editedGlyphs[char]['base'];
                if (baseGlyph && !this.isEmptyGlyph(baseGlyph)) {
                    this.editor.loadGlyphWithEdits(char, null);
                } else {
                    // Base glyph doesn't exist or is empty - clear canvas
                    this.editor.selectedChar = char;
                    this.editor.selectedAlternativeIndex = null;
                    this.editor.clear();
                    this.editor.render();
                }
                
                document.getElementById('currentMode').textContent = 'Base';
            }
            
            // Update UI
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
            
            console.log('[GlyphEditorApp] Alternative deleted:', char, alternativeIndex);
        }
    }
    
    /**
     * Duplicate specific alternative
     */
    duplicateAlternative(char, alternativeIndex) {
        if (!char) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        if (!editedGlyphs[char]) return;
        
        const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
        const sourceGlyph = editedGlyphs[char][key];
        
        if (!sourceGlyph) return;
        
        // Find next free index for alternative
        let maxIndex = 0;
        if (editedGlyphs[char]) {
            Object.keys(editedGlyphs[char]).forEach(k => {
                if (k !== 'base') {
                    const index = parseInt(k);
                    if (index > maxIndex) {
                        maxIndex = index;
                    }
                }
            });
        }
        
        const newIndex = maxIndex + 1;
        
        // Create new alternative with copy of source glyph
        if (!editedGlyphs[char]) {
            editedGlyphs[char] = {};
        }
        
        editedGlyphs[char][String(newIndex)] = sourceGlyph;
        this.saveEditedGlyphs(editedGlyphs);
        
        // Update UI
        this.updateAlternativesPanel();
        
        // Automatically select new alternative for editing
        this.selectAlternative(newIndex);
        
        const label = alternativeIndex === null ? 'Base' : `Alt ${alternativeIndex}`;
        console.log(`[GlyphEditorApp] Duplicated ${char} ${label} to Alt ${newIndex}`);
    }
    
    /**
     * Delete current edited glyph (used by Delete button)
     */
    deleteCurrentGlyph() {
        if (!this.selectedChar) return;
        
        // Use new deleteAlternative method
        this.deleteAlternative(this.selectedChar, this.selectedAlternativeIndex);
    }
    
    /**
     * Show file import dialog
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
            
            // Count glyphs
            const baseCount = Object.keys(imported.base || {}).length;
            const altCount = Object.keys(imported.alternatives || {}).length;
            
            // Check if data already exists in editor
            const hasExistingData = this.getImportedCharList() && this.getImportedCharList().length > 0;
            
            // Confirmation only if existing data exists
            let confirmed = true;
            if (hasExistingData) {
                confirmed = confirm(`Import ${baseCount} base glyphs and ${altCount} characters with alternatives?\n\nThis will REPLACE ALL DATA in localStorage.`);
            }
            
            if (!confirmed) return;
            
            // FULL CLEAR localStorage
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(IMPORTED_CHARS_KEY);
            
            // Convert to localStorage format
            const editedGlyphs = {};
            const importedCharsList = new Set();
            
            // Import base glyphs
            for (const char in imported.base) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                editedGlyphs[char]['base'] = imported.base[char];
                importedCharsList.add(char);
            }
            
            // Import alternatives
            for (const char in imported.alternatives) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                imported.alternatives[char].forEach((glyph, index) => {
                    editedGlyphs[char][String(index + 1)] = glyph;
                });
                importedCharsList.add(char);
            }
            
            // Save to localStorage
            this.saveEditedGlyphs(editedGlyphs);
            this.saveImportedCharList(Array.from(importedCharsList));
            
            // Reset selection
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            
            // Update UI
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
            
            // Automatically select first glyph (A) after import
            // Use setTimeout to ensure UI is updated
            setTimeout(() => {
                const importedChars = Array.from(importedCharsList).sort();
                if (importedChars.length > 0) {
                    // Select 'A' if exists, otherwise first character
                    const firstChar = importedChars.includes('A') ? 'A' : importedChars[0];
                    console.log('[GlyphEditorApp] Auto-selecting first char after import:', firstChar);
                    this.selectChar(firstChar);
                }
            }, 0);
            
            // Show Clear All button after import
            const clearAllBtn = document.getElementById('clearAllBtn');
            clearAllBtn.classList.add('visible');
            
        } catch (e) {
            console.error('Import error:', e);
            alert('Failed to import file: ' + e.message);
        }
        
        // Reset input
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
        
        // Extract VOID_ALPHABET
        const alphabetMatch = text.match(/export\s+const\s+VOID_ALPHABET\s*=\s*\{([^}]+(?:\}[^}]+)*)\};/s);
        if (alphabetMatch) {
            const content = alphabetMatch[1];
            const entries = content.matchAll(/"([^"]+)":\s*"([^"]+)"/g);
            for (const [, char, glyph] of entries) {
                result.base[char] = glyph;
            }
        }
        
        // Extract VOID_ALPHABET_ALTERNATIVES
        const altMatch = text.match(/export\s+const\s+VOID_ALPHABET_ALTERNATIVES\s*=\s*\{([^}]+(?:\}[^}]+)*)\};/s);
        if (altMatch) {
            const content = altMatch[1];
            // Find each character with its alternatives array
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
        
        // Download file
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
     * Generate FULL VoidAlphabet.js file ONLY from imported data
     */
    generateFullVoidAlphabetFile(editedGlyphs) {
        // Collect base glyphs ONLY from imported data
        // Exclude empty glyphs (only E0), BUT keep space
        const allBaseGlyphs = {};
        
        for (const char in editedGlyphs) {
            const glyphString = editedGlyphs[char]['base'];
            // Space is a valid character that should be "empty" (all E0)
            const isSpace = char === ' ';
            if (glyphString && (isSpace || !this.isEmptyGlyph(glyphString))) {
                allBaseGlyphs[char] = glyphString;
            }
        }
        
        // VOID_ALPHABET with grouping: Latin → Cyrillic → Digits → Symbols
        let code = 'export const VOID_ALPHABET = {\n';
        
        // Split into groups
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
        
        // Sort considering locale (for correct order of Cyrillic and other characters)
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
        
        // VOID_ALPHABET_ALTERNATIVES - ONLY from imported data
        const allAlternatives = {};
        
        for (const char in editedGlyphs) {
            const charAlts = [];
            const keys = Object.keys(editedGlyphs[char])
                .filter(k => k !== 'base')
                .map(k => parseInt(k))
                .sort((a, b) => a - b);
            
            keys.forEach(index => {
                // Fill gaps with empty glyphs (if indices are not sequential)
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
        
        // Split into groups: Latin → Cyrillic → Digits → Symbols
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
        
        // Sort considering locale
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
     * Get imported character list
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
     * Save imported character list
     */
    saveImportedCharList(charList) {
        try {
            localStorage.setItem(IMPORTED_CHARS_KEY, JSON.stringify(charList));
        } catch (e) {
            console.error('Error saving imported char list:', e);
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[GlyphEditorApp] DOM loaded');
    
    // Migrate old data
    // 1. Clear old data with incorrect "undefined" key
    if (localStorage.getItem('undefined')) {
        console.log('[GlyphEditorApp] Found data under "undefined" key, removing...');
        localStorage.removeItem('undefined');
        console.log('[GlyphEditorApp] Removed old "undefined" data');
    }
    
    // 2. Migrate data from old editor key (if exists)
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
    
    // Check what's in localStorage
    const currentData = localStorage.getItem(STORAGE_KEY);
    if (currentData) {
        console.log('[GlyphEditorApp] Found edited glyphs in storage:', JSON.parse(currentData));
    } else {
        console.log('[GlyphEditorApp] No edited glyphs in storage');
    }
    
    // Check element visibility
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

