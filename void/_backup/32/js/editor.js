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

const STORAGE_KEY = 'voidGlyphEditor_editedGlyphs';
const IMPORTED_CHARS_KEY = 'voidGlyphEditor_importedChars';

class GlyphEditorApp {
    constructor() {
        const canvas = document.getElementById('editorCanvas');
        const moduleDrawer = new ModuleDrawer('fill');  // ИСПРАВЛЕНО: 'fill' вместо 'stroke'
        
        this.editor = new GlyphEditor(canvas, moduleDrawer);
        
        // Установить правильный storageKey
        this.editor.storageKey = STORAGE_KEY;
        
        this.selectedChar = null;
        this.selectedAlternativeIndex = null;
        
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
        
        // Обработчики кнопок
        document.getElementById('importBtn').addEventListener('click', () => this.showImportDialog());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('newGlyphBtn').addEventListener('click', () => this.createNewGlyph());
        document.getElementById('newAlternativeBtn').addEventListener('click', () => this.createNewAlternative());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteCurrentGlyph());
        
        // Слушать события автосохранения для обновления UI
        document.addEventListener('glyphAutoSaved', (e) => {
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
        });
        
        console.log('[GlyphEditorApp] Initialized with storage key:', STORAGE_KEY);
    }
    
    /**
     * Заполнить список символов
     */
    populateCharList() {
        const charList = document.getElementById('charList');
        if (!charList) {
            console.error('[GlyphEditorApp] charList element not found!');
            return;
        }
        
        charList.innerHTML = '';
        
        const importedChars = this.getImportedCharList();
        
        // Если нет импортированных данных - показать сообщение
        if (!importedChars || importedChars.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.style.cssText = 'padding: 20px; text-align: center; color: #666; font-size: 14px;';
            emptyMessage.innerHTML = 'No data<br><br>Import VoidAlphabet.js<br>to start editing';
            charList.appendChild(emptyMessage);
            console.log('[GlyphEditorApp] No imported data, showing empty state');
            return;
        }
        
        console.log('[GlyphEditorApp] Populating', importedChars.length, 'imported characters');
        
        const editedGlyphs = this.getEditedGlyphs();
        
        importedChars.forEach(char => {
            const item = document.createElement('div');
            item.className = 'char-item';
            
            // Проверить, есть ли данные для этого символа
            const hasData = editedGlyphs[char] && Object.keys(editedGlyphs[char]).length > 0;
            if (hasData) {
                item.classList.add('edited');
            }
            
            // Подсчитать количество альтернатив из localStorage
            let altCount = 0;
            if (editedGlyphs[char]) {
                const keys = Object.keys(editedGlyphs[char]).filter(k => k !== 'base');
                altCount = keys.length;
            }
            
            const label = document.createElement('div');
            label.className = 'char-label';
            label.textContent = char;
            
            const count = document.createElement('div');
            count.className = 'char-count';
            count.textContent = altCount > 0 ? `+${altCount} alt` : '';
            
            // Крестик для удаления
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'char-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete glyph';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteGlyph(char);
            });
            
            item.appendChild(label);
            item.appendChild(count);
            item.appendChild(deleteBtn);
            
            item.addEventListener('click', () => {
                this.selectChar(char);
            });
            
            charList.appendChild(item);
        });
    }
    
    /**
     * Выбрать символ
     */
    selectChar(char) {
        console.log('[GlyphEditorApp] Selecting character:', char);
        
        this.selectedChar = char;
        this.selectedAlternativeIndex = null; // Сбросить выбор альтернативы
        
        // Обновить UI
        const items = document.querySelectorAll('.char-item');
        items.forEach(item => {
            if (item.querySelector('.char-label').textContent === char) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Загрузить базовый глиф в редактор
        this.editor.selectedChar = char;
        this.editor.selectedAlternativeIndex = null;
        this.editor.loadGlyphWithEdits(char, null);
        
        console.log('[GlyphEditorApp] Glyph loaded for', char);
        
        // Обновить панель альтернатив
        this.updateAlternativesPanel();
        
        // Обновить тулбар
        document.getElementById('currentChar').textContent = char;
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
        
        if (!this.selectedChar) return;
        
        // Добавить базовый глиф
        this.addAlternativePreview(content, null, 'Base');
        
        // Собрать все индексы альтернатив ТОЛЬКО из импортированных данных (localStorage)
        const alternativeIndexes = new Set();
        
        const editedGlyphs = this.getEditedGlyphs();
        if (editedGlyphs[this.selectedChar]) {
            Object.keys(editedGlyphs[this.selectedChar]).forEach(key => {
                if (key !== 'base') {
                    alternativeIndexes.add(parseInt(key));
                }
            });
        }
        
        // Отсортировать индексы и добавить превью
        const sortedIndexes = Array.from(alternativeIndexes).sort((a, b) => a - b);
        sortedIndexes.forEach(index => {
            this.addAlternativePreview(content, index, `Alt ${index}`);
        });
    }
    
    /**
     * Добавить превью альтернативы
     */
    addAlternativePreview(container, alternativeIndex, label) {
        const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, alternativeIndex);
        const originalGlyph = this.editor.getOriginalGlyph(this.selectedChar, alternativeIndex);
        const glyphString = editedGlyph || originalGlyph;
        
        const item = document.createElement('div');
        item.className = 'alternative-item';
        item.dataset.index = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        if (editedGlyph) {
            item.classList.add('edited');
        }
        
        if (alternativeIndex === this.selectedAlternativeIndex) {
            item.classList.add('selected');
        }
        
        item.addEventListener('click', (e) => {
            // Не выбирать альтернативу при клике на крестик
            if (!e.target.classList.contains('alternative-delete')) {
                this.selectAlternative(alternativeIndex);
            }
        });
        
        const preview = document.createElement('div');
        preview.className = 'alternative-preview';
        
        const canvas = document.createElement('canvas');
        // Квадратное превью для правильных пропорций
        // Размер будет контролироваться CSS через aspect-ratio
        canvas.width = 120;
        canvas.height = 120;
        this.editor.renderGlyphPreview(canvas, glyphString);
        
        preview.appendChild(canvas);
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'alternative-label';
        labelDiv.textContent = label;
        
        // Крестик для удаления альтернативы
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'alternative-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete alternative';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteAlternative(this.selectedChar, alternativeIndex);
        });
        
        item.appendChild(preview);
        item.appendChild(labelDiv);
        item.appendChild(deleteBtn);
        
        container.appendChild(item);
    }
    
    /**
     * Выбрать альтернативу
     */
    selectAlternative(alternativeIndex) {
        this.selectedAlternativeIndex = alternativeIndex;
        
        // Загрузить в редактор
        this.editor.selectedAlternativeIndex = alternativeIndex;
        this.editor.loadGlyphWithEdits(this.selectedChar, alternativeIndex);
        
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
        const newAlternativeBtn = document.getElementById('newAlternativeBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        
        if (this.selectedChar) {
            // Показать кнопку "New Alternative" если выбран символ
            newAlternativeBtn.style.display = 'inline-block';
            
            // Проверить, есть ли сохранённая отредактированная версия
            const editedGlyph = this.editor.getEditedGlyph(this.selectedChar, this.selectedAlternativeIndex);
            
            // Показать кнопку "Delete" только если есть отредактированная версия
            if (editedGlyph) {
                deleteBtn.style.display = 'inline-block';
            } else {
                deleteBtn.style.display = 'none';
            }
        } else {
            newAlternativeBtn.style.display = 'none';
            deleteBtn.style.display = 'none';
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
        if (editedGlyphs[char] && editedGlyphs[char]['base']) {
            alert(`Character "${char}" already exists`);
            return;
        }
        
        // Создать пустой глиф (25 модулей E0)
        const emptyGlyph = 'E0'.repeat(25);
        
        // Сохранить в localStorage
        if (!editedGlyphs[char]) {
            editedGlyphs[char] = {};
        }
        editedGlyphs[char]['base'] = emptyGlyph;
        
        this.saveEditedGlyphs(editedGlyphs);
        
        // Добавить в список импортированных (обновить или создать)
        if (!importedChars) {
            importedChars = [];
        }
        importedChars.push(char);
        this.saveImportedCharList(importedChars);
        
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
        
        // Получить базовый глиф как шаблон
        const baseGlyph = this.editor.getOriginalGlyph(this.selectedChar, null);
        if (!baseGlyph) {
            alert('Base glyph not found!');
            return;
        }
        
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
        
        // Сохранить новую альтернативу (дублируем базовый глиф)
        if (!editedGlyphs[this.selectedChar]) {
            editedGlyphs[this.selectedChar] = {};
        }
        
        editedGlyphs[this.selectedChar][String(newIndex)] = baseGlyph;
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
            
            // Если удаляемый альтернатив был выбран - переключиться на базовый
            if (this.selectedChar === char && this.selectedAlternativeIndex === alternativeIndex) {
                this.selectedAlternativeIndex = null;
                this.editor.loadGlyphWithEdits(char, null);
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
        const allBaseGlyphs = {};
        
        for (const char in editedGlyphs) {
            if (editedGlyphs[char]['base']) {
                allBaseGlyphs[char] = editedGlyphs[char]['base'];
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
    
    // Очистить старые данные с неправильным ключом
    if (localStorage.getItem('undefined')) {
        console.log('[GlyphEditorApp] Found data under "undefined" key, migrating...');
        const oldData = localStorage.getItem('undefined');
        localStorage.setItem(STORAGE_KEY, oldData);
        localStorage.removeItem('undefined');
        console.log('[GlyphEditorApp] Migration complete');
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

