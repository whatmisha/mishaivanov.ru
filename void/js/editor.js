/**
 * Standalone Glyph Editor
 * Отдельный инструмент для создания и редактирования глифов
 * 
 * НЕЗАВИСИМЫЙ РЕДАКТОР:
 * - Не использует VOID_ALPHABET из кода
 * - Работает только с импортированными данными
 * - Пустой при первом открытии
 */

import GlyphEditor from './core/GlyphEditor.js';
import { ModuleDrawer } from './core/ModuleDrawer.js';
import DualSenseController from './editor/DualSenseController.js';

// Отдельные ключи для редактора (не пересекаются с основным приложением)
const STORAGE_KEY = 'voidEditor_editedGlyphs';
const IMPORTED_CHARS_KEY = 'voidEditor_importedChars';

class GlyphEditorApp {
    constructor() {
        const canvas = document.getElementById('editorCanvas');
        const moduleDrawer = new ModuleDrawer('fill');  // ИСПРАВЛЕНО: 'fill' вместо 'stroke'
        
        this.editor = new GlyphEditor(canvas, moduleDrawer);
        
        // Установить правильный storageKey
        this.editor.storageKey = STORAGE_KEY;
        
        this.selectedChar = null;
        this.selectedAlternativeIndex = null;
        
        // Инициализировать контроллер DualSense
        this.dualsenseController = new DualSenseController(this, this.editor);
        
        this.init();
    }
    
    init() {
        console.log('[GlyphEditorApp] Initializing editor...');
        console.log('[GlyphEditorApp] Canvas:', this.editor.canvas);
        console.log('[GlyphEditorApp] charList element:', document.getElementById('charList'));
        console.log('[GlyphEditorApp] alternativesContent element:', document.getElementById('alternativesContent'));
        
        // Активировать редактор
        this.editor.activate();
        console.log('[GlyphEditorApp] Editor activated');
        
        // Заполнить список символов
        this.populateCharList();
        console.log('[GlyphEditorApp] Character list populated');
        
        // Автоматически выбрать глиф A по умолчанию
        this.selectChar('A');
        
        // Обработчики кнопок
        document.getElementById('importBtn').addEventListener('click', () => this.showImportDialog());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('newGlyphBtn').addEventListener('click', () => this.createNewGlyph());
        
        // Слушать события автосохранения для обновления UI
        document.addEventListener('glyphAutoSaved', (e) => {
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
        });
        
        // Активировать контроллер DualSense
        this.dualsenseController.activate();
        
        console.log('[GlyphEditorApp] Initialized with storage key:', STORAGE_KEY);
    }
    
    /**
     * Заполнить список символов в виде сетки
     */
    populateCharList() {
        const charGrid = document.getElementById('charGrid');
        if (!charGrid) {
            console.error('[GlyphEditorApp] charGrid element not found!');
            return;
        }
        
        charGrid.innerHTML = '';
        
        // Определяем группы символов
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
        
        // Находим символы, которые не входят в стандартные группы
        const allStandardChars = [...latinChars, ...cyrillicChars, ...digitChars];
        const symbolChars = importedChars.filter(char => !allStandardChars.includes(char));
        
        let totalChars = 0;
        
        // Отображаем стандартные группы
        groups.forEach(group => {
            // Добавляем заголовок группы
            const title = document.createElement('div');
            title.className = 'char-group-title';
            title.textContent = group.title;
            charGrid.appendChild(title);
            
            // Добавляем символы группы
            group.chars.forEach(char => {
                const cell = this.createCharCell(char, editedGlyphs, importedChars);
                charGrid.appendChild(cell);
            });
            
            totalChars += group.chars.length;
        });
        
        // Если есть дополнительные символы, показываем группу Symbols
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
        // Проверяем, состоит ли глиф только из модулей E0
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
        
        // Определяем состояние
        if (!isImported) {
            cell.classList.add('inactive'); // Состояние 1: не в файле
        } else if (!hasGlyph) {
            cell.classList.add('empty'); // Состояние 3: добавлен, но не нарисован или очищен
        } else {
            cell.classList.add('has-glyph'); // Состояние 4: нарисован
        }
        
        if (isSelected) {
            cell.classList.add('selected'); // Состояние 5: выбран
        }
        
        // Подсчитать количество альтернатив
        let altCount = 0;
        if (editedGlyphs[char]) {
            const keys = Object.keys(editedGlyphs[char]).filter(k => k !== 'base');
            altCount = keys.length;
        }
        
        // Если есть глиф - показываем превью
        if (hasGlyph) {
            const preview = document.createElement('div');
            preview.className = 'char-preview';
            
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 120;
            
            // Рендерим глиф используя метод editor'а
            this.editor.renderGlyphPreview(canvas, glyphString);
            
            preview.appendChild(canvas);
            cell.appendChild(preview);
        } else {
            // Показываем букву стандартным шрифтом
            const fallback = document.createElement('div');
            fallback.className = 'char-fallback';
            fallback.textContent = char;
            cell.appendChild(fallback);
        }
        
        // Бейдж с количеством альтернатив
        if (altCount > 0) {
            const badge = document.createElement('div');
            badge.className = 'char-alt-badge';
            badge.textContent = `+${altCount}`;
            cell.appendChild(badge);
        }
        
        // Крестик для удаления (только для импортированных)
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
        
        // Обработчик клика
        cell.addEventListener('click', () => {
            if (!isImported) {
                // Добавляем символ в импортированные
                this.addCharToImported(char);
            }
            this.selectChar(char);
        });
        
        return cell;
    }
    
    /**
     * Добавить символ в список импортированных
     */
    addCharToImported(char) {
        const importedChars = this.getImportedCharList() || [];
        if (!importedChars.includes(char)) {
            importedChars.push(char);
            this.saveImportedCharList(importedChars);
            
            // НЕ создаем пустой глиф - он будет создан автоматически при первом рисовании
            // Просто добавляем символ в список импортированных
        }
    }
    
    
    /**
     * Выбрать символ
     */
    selectChar(char) {
        console.log('[GlyphEditorApp] Selecting character:', char);
        
        this.selectedChar = char;
        this.selectedAlternativeIndex = null; // Сбросить выбор альтернативы
        
        // Обновить UI
        const items = document.querySelectorAll('.char-cell');
        items.forEach(item => {
            if (item.dataset.char === char) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Загрузить базовый глиф в редактор (ТОЛЬКО из editedGlyphs, БЕЗ оригинального)
        this.editor.selectedChar = char;
        this.editor.selectedAlternativeIndex = null;
        
        // Загружаем только если глиф есть в editedGlyphs
        const editedGlyph = this.editor.getEditedGlyph(char, null);
        console.log('[GlyphEditorApp] selectChar - editedGlyph for', char, ':', editedGlyph ? 'found' : 'not found');
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            console.log('[GlyphEditorApp] Loading glyph for', char);
            this.editor.loadGlyphWithEdits(char, null);
        } else {
            console.log('[GlyphEditorApp] Clearing canvas for', char, '- glyph not found or empty');
            // Очищаем канвас для нового пустого глифа
            this.editor.clear();
        }
        
        console.log('[GlyphEditorApp] Glyph loaded for', char);
        
        // Обновить панель альтернатив
        this.updateAlternativesPanel();
        
        // Обновить тулбар
        // Для пробела показываем визуальное представление, чтобы заголовок не съезжал
        const displayChar = char === ' ' ? 'Space' : char;
        document.getElementById('currentChar').textContent = displayChar;
        document.getElementById('currentMode').textContent = 'Base';
        
        // Включить кнопки
        this.updateButtons();
    }
    
    /**
     * Обновить панель альтернатив
     */
    updateAlternativesPanel() {
        const content = document.getElementById('alternativesContent');
        content.innerHTML = '';
        
        if (!this.selectedChar) {
            // Если глиф не выбран, показываем только пустую ячейку Base
            this.addAlternativePreview(content, null, 'Base', false);
            return;
        }
        
        // Собираем все существующие альтернативы из editedGlyphs
        const existingAlternatives = [];
        const editedGlyphs = this.getEditedGlyphs();
        if (editedGlyphs[this.selectedChar]) {
            Object.keys(editedGlyphs[this.selectedChar]).forEach(key => {
                if (key !== 'base') {
                    existingAlternatives.push(parseInt(key));
                }
            });
        }
        
        // Сортируем альтернативы по индексу
        existingAlternatives.sort((a, b) => a - b);
        
        // Определяем, какие ячейки показывать
        // Всегда показываем Base
        const alternativesToShow = [
            { index: null, label: 'Base' }
        ];
        
        // Добавляем только существующие альтернативы
        existingAlternatives.forEach(index => {
            alternativesToShow.push({ index, label: `Alt ${index}` });
        });
        
        // Показываем все существующие ячейки
        alternativesToShow.forEach(({ index, label }) => {
            // Проверяем, существует ли альтернатива и не является ли она пустой
            // НЕ загружаем оригинальные глифы - только те, что в editedGlyphs
            let hasGlyph = false;
            const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, index);
            
            // Проверяем, что глиф существует и не пустой (ТОЛЬКО editedGlyph, БЕЗ originalGlyph)
            if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
                hasGlyph = true;
            }
            
            this.addAlternativePreview(content, index, label, hasGlyph);
        });
        
        // Добавляем ячейку "+" в конец
        this.addAddButton(content);
        
        // Добавляем обработчики drag-and-drop для контейнера
        this.setupDragAndDrop(content);
    }
    
    /**
     * Настроить drag-and-drop для контейнера альтернатив
     */
    setupDragAndDrop(container) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const dragging = document.querySelector('.alternative-item.dragging');
            if (!dragging) return;
            
            // Находим элемент, над которым находится курсор
            const targetElement = this.getElementUnderCursor(container, e.clientX, e.clientY);
            
            // Убираем все классы drag-over
            document.querySelectorAll('.alternative-item').forEach(el => {
                el.classList.remove('drag-over');
            });
            
            // Подсвечиваем элемент, над которым находится курсор (кроме кнопки "+")
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
            
            // Находим элемент, над которым был drop
            const targetElement = this.getElementUnderCursor(container, e.clientX, e.clientY);
            if (!targetElement || targetElement.dataset.index === 'add') {
                // Убираем все классы drag-over
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                return;
            }
            
            const targetIndex = targetElement.dataset.index;
            const isTargetBase = targetIndex === 'base';
            const targetAltIndex = isTargetBase ? null : parseInt(targetIndex);
            
            // Если перетаскиваем на тот же элемент, ничего не делаем
            if (draggedData === targetIndex) {
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                return;
            }
            
            // Просто меняем местами две ячейки
            this.swapAlternatives(draggedData, targetIndex);
            
            // Убираем все классы drag-over
            document.querySelectorAll('.alternative-item').forEach(el => {
                el.classList.remove('drag-over');
            });
        });
    }
    
    /**
     * Получить элемент, над которым находится курсор
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
     * Поменять местами две ячейки (Base или альтернативы)
     * @param {string} draggedData - индекс перетаскиваемой ячейки ('base' или число)
     * @param {string} targetData - индекс целевой ячейки ('base' или число)
     */
    swapAlternatives(draggedData, targetData) {
        if (!this.selectedChar) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        if (!editedGlyphs[this.selectedChar]) return;
        
        const isDraggingBase = draggedData === 'base';
        const isTargetBase = targetData === 'base';
        const draggedIndex = isDraggingBase ? null : parseInt(draggedData);
        const targetAltIndex = isTargetBase ? null : parseInt(targetData);
        
        // Сохраняем глифы
        const draggedGlyph = isDraggingBase 
            ? editedGlyphs[this.selectedChar]['base']
            : editedGlyphs[this.selectedChar][String(draggedIndex)];
        const targetGlyph = isTargetBase
            ? editedGlyphs[this.selectedChar]['base']
            : editedGlyphs[this.selectedChar][String(targetAltIndex)];
        
        // Меняем местами
        if (isDraggingBase && isTargetBase) {
            // Base на Base - ничего не делаем
            return;
        } else if (isDraggingBase && !isTargetBase) {
            // Base на альтернативу
            editedGlyphs[this.selectedChar]['base'] = targetGlyph;
            editedGlyphs[this.selectedChar][String(targetAltIndex)] = draggedGlyph;
        } else if (!isDraggingBase && isTargetBase) {
            // Альтернатива на Base
            editedGlyphs[this.selectedChar]['base'] = draggedGlyph;
            editedGlyphs[this.selectedChar][String(draggedIndex)] = targetGlyph;
        } else {
            // Альтернатива на альтернативу
            editedGlyphs[this.selectedChar][String(draggedIndex)] = targetGlyph;
            editedGlyphs[this.selectedChar][String(targetAltIndex)] = draggedGlyph;
        }
        
        // Сохраняем изменения
        this.saveEditedGlyphs(editedGlyphs);
        
        // Обновляем выбранный индекс
        if (isDraggingBase) {
            // Если перетаскивали Base, выбираем целевую ячейку
            if (isTargetBase) {
                this.selectedAlternativeIndex = null;
            } else {
                this.selectedAlternativeIndex = targetAltIndex;
            }
        } else {
            // Если перетаскивали альтернативу, выбираем целевую ячейку
            if (isTargetBase) {
                this.selectedAlternativeIndex = null;
            } else {
                this.selectedAlternativeIndex = targetAltIndex;
            }
        }
        
        // Обновляем панель альтернатив
        this.updateAlternativesPanel();
        
        // Выбираем целевую ячейку
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
        
        // Проверяем, существует ли альтернатива в editedGlyphs (даже если пустая)
        let existsInStorage = false;
        if (this.selectedChar) {
            const editedGlyphs = this.getEditedGlyphs();
            const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
            existsInStorage = editedGlyphs[this.selectedChar] && editedGlyphs[this.selectedChar].hasOwnProperty(key);
        }
        
        // Определяем состояние ячейки (как в левой панели)
        const isEmpty = !hasGlyph || !this.selectedChar;
        
        if (isEmpty) {
            item.classList.add('empty'); // Пустая ячейка
            // Если глиф не выбран, делаем ячейку неактивной
            if (!this.selectedChar) {
                item.style.cursor = 'default';
                item.style.opacity = '0.3';
            }
        } else {
            item.classList.add('has-glyph'); // Ячейка с глифом
        }
        
        if (alternativeIndex === this.selectedAlternativeIndex && this.selectedChar) {
            item.classList.add('selected');
        }
        
        // Если есть отредактированный глиф, добавляем класс edited
        if (hasGlyph && this.selectedChar) {
            const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
            if (editedGlyph) {
                item.classList.add('edited');
            }
        }
        
        // Добавляем drag-and-drop для Base и альтернатив (не для кнопки "+")
        if (alternativeIndex !== null || (alternativeIndex === null && this.selectedChar)) {
            item.draggable = true;
            item.classList.add('draggable');
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                // Для Base используем 'base', для альтернатив - индекс
                const data = alternativeIndex === null ? 'base' : String(alternativeIndex);
                e.dataTransfer.setData('text/plain', data);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                // Убираем все классы drag-over
                document.querySelectorAll('.alternative-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });
        }
        
        item.addEventListener('click', (e) => {
            // Не выбирать альтернативу при клике на крестик
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
            
            // Крестик для удаления альтернативы (для ячеек с глифом)
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'alternative-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete alternative';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAlternative(this.selectedChar, alternativeIndex);
            });
            item.appendChild(deleteBtn);
            
            // Подпись внизу для ячеек с глифом
            const labelDiv = document.createElement('div');
            labelDiv.className = 'alternative-label';
            labelDiv.textContent = label;
            item.appendChild(labelDiv);
        } else {
            // Для пустых ячеек показываем только текст метки стандартным шрифтом по центру
            const fallback = document.createElement('div');
            fallback.className = 'char-fallback';
            fallback.textContent = label;
            item.appendChild(fallback);
            
            // Крестик для удаления пустой альтернативы (только если она существует в storage)
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
     * Добавить кнопку "+" для создания новой альтернативы
     */
    addAddButton(container) {
        const item = document.createElement('div');
        item.className = 'alternative-item add-alternative-button';
        item.dataset.index = 'add';
        
        // Если глиф не выбран, делаем кнопку неактивной
        if (!this.selectedChar) {
            item.style.cursor = 'default';
            item.style.opacity = '0.3';
        } else {
            item.style.cursor = 'pointer';
        }
        
        // Показываем "+" по центру (используем тот же размер шрифта, что и для "Base")
        const plus = document.createElement('div');
        plus.className = 'char-fallback';
        plus.textContent = '+';
        item.appendChild(plus);
        
        // Обработчик клика
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
        
        // Загрузить в редактор (ТОЛЬКО из editedGlyphs, БЕЗ оригинального)
        this.editor.selectedAlternativeIndex = alternativeIndex;
        
        // Проверяем, есть ли глиф в editedGlyphs
        const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
        if (editedGlyph && !this.isEmptyGlyph(editedGlyph)) {
            this.editor.loadGlyphWithEdits(this.selectedChar, alternativeIndex);
        } else {
            // Очищаем канвас для нового пустого глифа
            this.editor.clear();
        }
        
        // Обновить UI
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
        
        // Обновить тулбар
        const modeName = alternativeIndex === null ? 'Base' : `Alt ${alternativeIndex}`;
        document.getElementById('currentMode').textContent = modeName;
        
        // Обновить кнопки
        this.updateButtons();
    }
    
    /**
     * Обновить состояние кнопок
     */
    updateButtons() {
        const clearAllBtn = document.getElementById('clearAllBtn');
        
        // Показать Clear All только если есть данные
        const importedChars = this.getImportedCharList();
        if (importedChars && importedChars.length > 0) {
            clearAllBtn.classList.add('visible');
        } else {
            clearAllBtn.classList.remove('visible');
        }
    }
    
    /**
     * Создать новый глиф для нового символа
     */
    createNewGlyph() {
        const input = document.getElementById('newGlyphInput');
        const char = input.value.trim().toUpperCase();
        
        // Валидация
        if (!char) {
            alert('Please enter a character');
            return;
        }
        
        if (char.length !== 1) {
            alert('Please enter exactly one character');
            return;
        }
        
        // Проверить, не существует ли уже в импортированных
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
        
        // НЕ создаем пустой глиф - он будет создан автоматически при первом рисовании
        // Просто добавляем символ в список импортированных
        
        // Добавить в список импортированных (обновить или создать)
        if (!importedChars) {
            importedChars = [];
        }
        if (!importedChars.includes(char)) {
            importedChars.push(char);
            this.saveImportedCharList(importedChars);
        }
        
        // Очистить поле
        input.value = '';
        
        // Обновить список символов
        this.populateCharList();
        
        // Автоматически выбрать новый символ
        this.selectChar(char);
        
        console.log(`[GlyphEditorApp] Created new glyph for "${char}"`);
    }
    
    /**
     * Создать новую альтернативу для текущего символа
     */
    createNewAlternative() {
        if (!this.selectedChar) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        
        // Найти следующий свободный индекс для альтернативы (только из импортированных данных)
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
        
        // Создать ПУСТОЙ глиф (25 модулей E0) вместо копирования оригинального
        const emptyGlyph = 'E0'.repeat(25);
        
        // Сохранить новую альтернативу
        if (!editedGlyphs[this.selectedChar]) {
            editedGlyphs[this.selectedChar] = {};
        }
        
        editedGlyphs[this.selectedChar][String(newIndex)] = emptyGlyph;
        this.saveEditedGlyphs(editedGlyphs);
        
        // Обновить UI
        this.updateAlternativesPanel();
        
        // Автоматически выбрать новую альтернативу для редактирования
        this.selectAlternative(newIndex);
        
        console.log(`[GlyphEditorApp] Created new alternative #${newIndex} for ${this.selectedChar}`);
    }
    
    /**
     * Удалить весь загруженный файл
     */
    clearAll() {
        const confirmed = confirm('Delete all imported glyphs?\n\nThis will clear all data from localStorage.');
        if (!confirmed) return;
        
        // Полная очистка
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(IMPORTED_CHARS_KEY);
        
        // Сбросить выбор
        this.selectedChar = null;
        this.selectedAlternativeIndex = null;
        
        // Очистить канвас
        this.editor.clear();
        
        // Обновить UI
        this.populateCharList();
        this.updateAlternativesPanel();
        this.updateButtons();
        
        // Очистить тулбар
        document.getElementById('currentChar').textContent = '-';
        document.getElementById('currentMode').textContent = 'Base';
        
        // Скрыть кнопку Clear All
        const clearAllBtn = document.getElementById('clearAllBtn');
        clearAllBtn.classList.remove('visible');
        
        console.log('[GlyphEditorApp] All data cleared');
    }
    
    /**
     * Удалить конкретный глиф (вместе с альтернативами)
     */
    deleteGlyph(char) {
        const confirmed = confirm(`Delete glyph "${char}" and all its alternatives?`);
        if (!confirmed) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        
        // Удалить все данные глифа
        delete editedGlyphs[char];
        this.saveEditedGlyphs(editedGlyphs);
        
        // Удалить из списка импортированных
        const importedChars = this.getImportedCharList();
        if (importedChars) {
            const index = importedChars.indexOf(char);
            if (index > -1) {
                importedChars.splice(index, 1);
                this.saveImportedCharList(importedChars);
            }
        }
        
        // Если удаляемый глиф был выбран - сбросить выбор
        if (this.selectedChar === char) {
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            this.editor.clear();
            document.getElementById('currentChar').textContent = '-';
            document.getElementById('currentMode').textContent = 'Base';
        }
        
        // Обновить UI
        this.populateCharList();
        this.updateAlternativesPanel();
        this.updateButtons();
        
        console.log('[GlyphEditorApp] Glyph deleted:', char);
    }
    
    /**
     * Удалить конкретный альтернатив
     */
    deleteAlternative(char, alternativeIndex) {
        const label = alternativeIndex === null ? 'Base' : `Alt ${alternativeIndex}`;
        const confirmed = confirm(`Delete ${char} ${label}?`);
        if (!confirmed) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        const key = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        if (editedGlyphs[char] && editedGlyphs[char][key]) {
            delete editedGlyphs[char][key];
            
            // Если для символа не осталось отредактированных версий, удалить весь символ
            const shouldDeleteChar = Object.keys(editedGlyphs[char]).length === 0;
            if (shouldDeleteChar) {
                delete editedGlyphs[char];
                
                // Удалить из списка импортированных
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
            
            // Если удаляемый альтернатив был выбран
            if (this.selectedChar === char && this.selectedAlternativeIndex === alternativeIndex) {
                // Переключиться на базовый (если он есть) или очистить канвас
                this.selectedAlternativeIndex = null;
                
                // Проверяем, существует ли базовый глиф в editedGlyphs
                const baseGlyph = editedGlyphs[char] && editedGlyphs[char]['base'];
                if (baseGlyph && !this.isEmptyGlyph(baseGlyph)) {
                    this.editor.loadGlyphWithEdits(char, null);
                } else {
                    // Базовый глиф не существует или пустой - очистить канвас
                    this.editor.selectedChar = char;
                    this.editor.selectedAlternativeIndex = null;
                    this.editor.clear();
                    this.editor.render();
                }
                
                document.getElementById('currentMode').textContent = 'Base';
            }
            
            // Обновить UI
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
            
            console.log('[GlyphEditorApp] Alternative deleted:', char, alternativeIndex);
        }
    }
    
    /**
     * Удалить текущий отредактированный глиф (используется кнопкой Delete)
     */
    deleteCurrentGlyph() {
        if (!this.selectedChar) return;
        
        // Используем новый метод deleteAlternative
        this.deleteAlternative(this.selectedChar, this.selectedAlternativeIndex);
    }
    
    /**
     * Показать диалог импорта файла
     */
    showImportDialog() {
        document.getElementById('importFileInput').click();
    }
    
    /**
     * Обработать импорт файла
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
            
            // Подсчитать количество глифов
            const baseCount = Object.keys(imported.base || {}).length;
            const altCount = Object.keys(imported.alternatives || {}).length;
            
            // Проверить, есть ли уже данные в редакторе
            const hasExistingData = this.getImportedCharList() && this.getImportedCharList().length > 0;
            
            // Подтверждение только если есть существующие данные
            let confirmed = true;
            if (hasExistingData) {
                confirmed = confirm(`Import ${baseCount} base glyphs and ${altCount} characters with alternatives?\n\nThis will REPLACE ALL DATA in localStorage.`);
            }
            
            if (!confirmed) return;
            
            // ПОЛНАЯ ОЧИСТКА localStorage
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(IMPORTED_CHARS_KEY);
            
            // Конвертировать в формат localStorage
            const editedGlyphs = {};
            const importedCharsList = new Set();
            
            // Импортировать базовые глифы
            for (const char in imported.base) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                editedGlyphs[char]['base'] = imported.base[char];
                importedCharsList.add(char);
            }
            
            // Импортировать альтернативы
            for (const char in imported.alternatives) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                imported.alternatives[char].forEach((glyph, index) => {
                    editedGlyphs[char][String(index + 1)] = glyph;
                });
                importedCharsList.add(char);
            }
            
            // Сохранить в localStorage
            this.saveEditedGlyphs(editedGlyphs);
            this.saveImportedCharList(Array.from(importedCharsList));
            
            // Сбросить выбор
            this.selectedChar = null;
            this.selectedAlternativeIndex = null;
            
            // Обновить UI
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
            
            // Автоматически выбрать первый глиф (A) после импорта
            // Используем setTimeout, чтобы убедиться, что UI обновлен
            setTimeout(() => {
                const importedChars = Array.from(importedCharsList).sort();
                if (importedChars.length > 0) {
                    // Выбираем 'A' если он есть, иначе первый символ
                    const firstChar = importedChars.includes('A') ? 'A' : importedChars[0];
                    console.log('[GlyphEditorApp] Auto-selecting first char after import:', firstChar);
                    this.selectChar(firstChar);
                }
            }, 0);
            
            // Показать кнопку Clear All после импорта
            const clearAllBtn = document.getElementById('clearAllBtn');
            clearAllBtn.classList.add('visible');
            
        } catch (e) {
            console.error('Import error:', e);
            alert('Failed to import file: ' + e.message);
        }
        
        // Сбросить input
        event.target.value = '';
    }
    
    /**
     * Парсинг файла VoidAlphabet.js
     */
    parseVoidAlphabetFile(text) {
        const result = {
            base: {},
            alternatives: {}
        };
        
        // Извлечь VOID_ALPHABET
        const alphabetMatch = text.match(/export\s+const\s+VOID_ALPHABET\s*=\s*\{([^}]+(?:\}[^}]+)*)\};/s);
        if (alphabetMatch) {
            const content = alphabetMatch[1];
            const entries = content.matchAll(/"([^"]+)":\s*"([^"]+)"/g);
            for (const [, char, glyph] of entries) {
                result.base[char] = glyph;
            }
        }
        
        // Извлечь VOID_ALPHABET_ALTERNATIVES
        const altMatch = text.match(/export\s+const\s+VOID_ALPHABET_ALTERNATIVES\s*=\s*\{([^}]+(?:\}[^}]+)*)\};/s);
        if (altMatch) {
            const content = altMatch[1];
            // Найти каждый символ с его массивом альтернатив
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
     * Экспортировать файл VoidAlphabet.js
     */
    showExportModal() {
        const editedGlyphs = this.getEditedGlyphs();
        const code = this.generateFullVoidAlphabetFile(editedGlyphs);
        
        // Скачать файл
        this.downloadFile('VoidAlphabet.js', code);
    }
    
    /**
     * Скачать файл
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
     * Генерировать ПОЛНЫЙ файл VoidAlphabet.js ТОЛЬКО из импортированных данных
     */
    generateFullVoidAlphabetFile(editedGlyphs) {
        // Собрать базовые глифы ТОЛЬКО из импортированных данных
        // Исключаем пустые глифы (только E0), НО сохраняем пробел
        const allBaseGlyphs = {};
        
        for (const char in editedGlyphs) {
            const glyphString = editedGlyphs[char]['base'];
            // Пробел — это валидный символ, который должен быть "пустым" (все E0)
            const isSpace = char === ' ';
            if (glyphString && (isSpace || !this.isEmptyGlyph(glyphString))) {
                allBaseGlyphs[char] = glyphString;
            }
        }
        
        // VOID_ALPHABET с группировкой: Latin → Cyrillic → Digits → Symbols
        let code = 'export const VOID_ALPHABET = {\n';
        
        // Разделить на группы
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
        
        // Сортировка с учетом локали (для правильного порядка кириллицы и других символов)
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
        
        // VOID_ALPHABET_ALTERNATIVES - ТОЛЬКО из импортированных данных
        const allAlternatives = {};
        
        for (const char in editedGlyphs) {
            const charAlts = [];
            const keys = Object.keys(editedGlyphs[char])
                .filter(k => k !== 'base')
                .map(k => parseInt(k))
                .sort((a, b) => a - b);
            
            keys.forEach(index => {
                // Заполнить пропуски пустыми глифами (если индексы не последовательны)
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
        
        // Разделить на группы: Latin → Cyrillic → Digits → Symbols
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
        
        // Сортировка с учетом локали
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
     * Получить отредактированные глифы из localStorage
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
     * Сохранить отредактированные глифы в localStorage
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('[GlyphEditorApp] DOM loaded');
    
    // Миграция старых данных
    // 1. Очистить старые данные с неправильным ключом "undefined"
    if (localStorage.getItem('undefined')) {
        console.log('[GlyphEditorApp] Found data under "undefined" key, removing...');
        localStorage.removeItem('undefined');
        console.log('[GlyphEditorApp] Removed old "undefined" data');
    }
    
    // 2. Мигрировать данные со старого ключа редактора (если есть)
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
    
    // Проверить, что есть в localStorage
    const currentData = localStorage.getItem(STORAGE_KEY);
    if (currentData) {
        console.log('[GlyphEditorApp] Found edited glyphs in storage:', JSON.parse(currentData));
    } else {
        console.log('[GlyphEditorApp] No edited glyphs in storage');
    }
    
    // Проверить видимость элементов
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

