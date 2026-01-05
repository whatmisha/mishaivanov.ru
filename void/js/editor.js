/**
 * Standalone Glyph Editor
 * Отдельный инструмент для создания и редактирования глифов
 */

import GlyphEditor from './core/GlyphEditor.js';
import { VOID_ALPHABET, VOID_ALPHABET_ALTERNATIVES } from './core/VoidAlphabet.js';
import { ModuleDrawer } from './core/ModuleDrawer.js';

const STORAGE_KEY = 'voidGlyphEditor_editedGlyphs';

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
        document.getElementById('newGlyphBtn').addEventListener('click', () => this.createNewGlyph());
        document.getElementById('newAlternativeBtn').addEventListener('click', () => this.createNewAlternative());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteCurrentGlyph());
        document.getElementById('copyCodeBtn').addEventListener('click', () => this.copyCode());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        
        // Закрыть модальное окно по клику вне его
        document.getElementById('exportModal').addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                this.closeModal();
            }
        });
        
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
        
        const allChars = Object.keys(VOID_ALPHABET);
        const editedGlyphs = this.getEditedGlyphs();
        
        console.log('[GlyphEditorApp] Populating', allChars.length, 'characters');
        
        allChars.forEach(char => {
            const item = document.createElement('div');
            item.className = 'char-item';
            
            // Проверить, есть ли отредактированные версии
            const hasEdits = editedGlyphs[char] && Object.keys(editedGlyphs[char]).length > 0;
            if (hasEdits) {
                item.classList.add('edited');
            }
            
            // Подсчитать количество альтернатив
            const alternatives = VOID_ALPHABET_ALTERNATIVES[char];
            const altCount = alternatives ? alternatives.length : 0;
            
            const label = document.createElement('div');
            label.className = 'char-label';
            label.textContent = char;
            
            const count = document.createElement('div');
            count.className = 'char-count';
            count.textContent = altCount > 0 ? `+${altCount} alt` : '';
            
            item.appendChild(label);
            item.appendChild(count);
            
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
        
        // Собрать все индексы альтернатив (из оригинала + из localStorage)
        const alternativeIndexes = new Set();
        
        // Из оригинала
        const alternatives = VOID_ALPHABET_ALTERNATIVES[this.selectedChar];
        if (alternatives && alternatives.length > 0) {
            for (let i = 0; i < alternatives.length; i++) {
                alternativeIndexes.add(i + 1);
            }
        }
        
        // Из localStorage (отредактированные/новые)
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
        
        item.addEventListener('click', () => {
            this.selectAlternative(alternativeIndex);
        });
        
        const preview = document.createElement('div');
        preview.className = 'alternative-preview';
        
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 80;
        this.editor.renderGlyphPreview(canvas, glyphString);
        
        preview.appendChild(canvas);
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'alternative-label';
        labelDiv.textContent = label;
        
        item.appendChild(preview);
        item.appendChild(labelDiv);
        
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
        
        // Проверить, не существует ли уже
        if (VOID_ALPHABET[char]) {
            alert(`Character "${char}" already exists in VoidAlphabet.js`);
            return;
        }
        
        const editedGlyphs = this.getEditedGlyphs();
        if (editedGlyphs[char] && editedGlyphs[char]['base']) {
            alert(`Character "${char}" already exists as a custom glyph`);
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
        
        // Найти следующий свободный индекс для альтернативы
        const alternatives = VOID_ALPHABET_ALTERNATIVES[this.selectedChar] || [];
        const editedGlyphs = this.getEditedGlyphs();
        
        // Проверить существующие индексы (как в оригинале, так и в отредактированных)
        let maxIndex = alternatives.length; // Количество оригинальных альтернатив
        
        // Проверить отредактированные
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
     * Удалить текущий отредактированный глиф
     */
    deleteCurrentGlyph() {
        if (!this.selectedChar) return;
        
        const label = this.selectedAlternativeIndex === null ? 'Base' : `Alt ${this.selectedAlternativeIndex}`;
        const confirmed = confirm(`Delete edited version of ${this.selectedChar} ${label}?\n\nThis will restore the original glyph from VoidAlphabet.js`);
        if (!confirmed) return;
        
        const editedGlyphs = this.getEditedGlyphs();
        const key = this.selectedAlternativeIndex === null ? 'base' : String(this.selectedAlternativeIndex);
        
        if (editedGlyphs[this.selectedChar] && editedGlyphs[this.selectedChar][key]) {
            delete editedGlyphs[this.selectedChar][key];
            
            // Если для символа не осталось отредактированных версий, удалить весь символ
            if (Object.keys(editedGlyphs[this.selectedChar]).length === 0) {
                delete editedGlyphs[this.selectedChar];
            }
            
            this.saveEditedGlyphs(editedGlyphs);
            
            // Перезагрузить оригинальный глиф
            this.editor.loadGlyphWithEdits(this.selectedChar, this.selectedAlternativeIndex);
            
            // Обновить UI
            this.populateCharList();
            this.updateAlternativesPanel();
            this.updateButtons();
            
            console.log('[GlyphEditorApp] Glyph deleted:', this.selectedChar, this.selectedAlternativeIndex);
        }
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
            
            // Подтверждение
            const baseCount = Object.keys(imported.base || {}).length;
            const altCount = Object.keys(imported.alternatives || {}).length;
            const confirmed = confirm(`Import ${baseCount} base glyphs and ${altCount} characters with alternatives?\n\nThis will REPLACE all current edits in localStorage.`);
            
            if (!confirmed) return;
            
            // Конвертировать в формат localStorage
            const editedGlyphs = {};
            
            // Импортировать базовые глифы
            for (const char in imported.base) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                editedGlyphs[char]['base'] = imported.base[char];
            }
            
            // Импортировать альтернативы
            for (const char in imported.alternatives) {
                if (!editedGlyphs[char]) editedGlyphs[char] = {};
                imported.alternatives[char].forEach((glyph, index) => {
                    editedGlyphs[char][String(index + 1)] = glyph;
                });
            }
            
            // Сохранить в localStorage
            this.saveEditedGlyphs(editedGlyphs);
            
            // Обновить UI
            this.populateCharList();
            if (this.selectedChar) {
                this.updateAlternativesPanel();
            }
            
            alert(`Successfully imported ${baseCount} base glyphs and alternatives for ${altCount} characters!`);
            
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
     * Показать модальное окно экспорта
     */
    showExportModal() {
        const editedGlyphs = this.getEditedGlyphs();
        const code = this.generateFullVoidAlphabetFile(editedGlyphs);
        
        document.getElementById('codeOutput').textContent = code;
        document.getElementById('exportModal').classList.add('active');
    }
    
    /**
     * Закрыть модальное окно
     */
    closeModal() {
        document.getElementById('exportModal').classList.remove('active');
    }
    
    /**
     * Скопировать код в буфер обмена
     */
    async copyCode() {
        const code = document.getElementById('codeOutput').textContent;
        try {
            await navigator.clipboard.writeText(code);
            const btn = document.getElementById('copyCodeBtn');
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = 'Copy to Clipboard';
            }, 2000);
        } catch (e) {
            console.error('Failed to copy:', e);
            alert('Failed to copy to clipboard');
        }
    }
    
    /**
     * Генерировать ПОЛНЫЙ файл VoidAlphabet.js
     */
    generateFullVoidAlphabetFile(editedGlyphs) {
        let code = '/**\n';
        code += ' * VoidAlphabet - данные модульного шрифта Void\n';
        code += ' * Generated by Void Glyph Editor\n';
        code += ' */\n\n';
        
        // Собрать все базовые глифы (оригинальные + отредактированные + новые)
        const allBaseGlyphs = {};
        
        // Сначала все оригинальные
        for (const char in VOID_ALPHABET) {
            allBaseGlyphs[char] = VOID_ALPHABET[char];
        }
        
        // Перезаписать/добавить отредактированные и новые
        for (const char in editedGlyphs) {
            if (editedGlyphs[char]['base']) {
                allBaseGlyphs[char] = editedGlyphs[char]['base'];
            }
        }
        
        // VOID_ALPHABET
        code += 'export const VOID_ALPHABET = {\n';
        
        const sortedChars = Object.keys(allBaseGlyphs).sort((a, b) => {
            const getPriority = (char) => {
                if (/[0-9]/.test(char)) return 0;
                if (/[A-Z]/.test(char)) return 1;
                if (/[А-ЯЁ]/.test(char)) return 2;
                return 3;
            };
            const priorityDiff = getPriority(a) - getPriority(b);
            if (priorityDiff !== 0) return priorityDiff;
            return a.localeCompare(b);
        });
        
        sortedChars.forEach((char, i) => {
            const comma = i < sortedChars.length - 1 ? ',' : '';
            code += `    "${char}": "${allBaseGlyphs[char]}"${comma}\n`;
        });
        
        code += '};\n\n';
        
        // VOID_ALPHABET_ALTERNATIVES
        const allAlternatives = {};
        
        // Сначала все оригинальные
        for (const char in VOID_ALPHABET_ALTERNATIVES) {
            allAlternatives[char] = [...VOID_ALPHABET_ALTERNATIVES[char]];
        }
        
        // Добавить/перезаписать отредактированные
        for (const char in editedGlyphs) {
            const charAlts = [];
            const keys = Object.keys(editedGlyphs[char]).filter(k => k !== 'base').map(k => parseInt(k)).sort((a, b) => a - b);
            
            keys.forEach(index => {
                // Заполнить пропуски оригинальными
                while (charAlts.length < index - 1) {
                    const origIndex = charAlts.length;
                    charAlts.push(allAlternatives[char]?.[origIndex] || 'E0'.repeat(25));
                }
                charAlts.push(editedGlyphs[char][String(index)]);
            });
            
            if (charAlts.length > 0) {
                allAlternatives[char] = charAlts;
            }
        }
        
        code += 'export const VOID_ALPHABET_ALTERNATIVES = {\n';
        
        const sortedAltChars = Object.keys(allAlternatives).sort((a, b) => {
            const getPriority = (char) => {
                if (/[0-9]/.test(char)) return 0;
                if (/[A-Z]/.test(char)) return 1;
                if (/[А-ЯЁ]/.test(char)) return 2;
                return 3;
            };
            const priorityDiff = getPriority(a) - getPriority(b);
            if (priorityDiff !== 0) return priorityDiff;
            return a.localeCompare(b);
        });
        
        sortedAltChars.forEach((char, i) => {
            const comma = i < sortedAltChars.length - 1 ? ',' : '';
            code += `    "${char}": [\n`;
            allAlternatives[char].forEach((glyph, j) => {
                const glyphComma = j < allAlternatives[char].length - 1 ? ',' : '';
                code += `        "${glyph}"${glyphComma}\n`;
            });
            code += `    ]${comma}\n`;
        });
        
        code += '};\n\n';
        
        // Функция getGlyph (упрощенная версия)
        code += '// Helper function\n';
        code += 'export function getGlyph(char, options = {}) {\n';
        code += '    const upperChar = char.toUpperCase();\n';
        code += '    const alternativeIndex = options.alternativeIndex;\n';
        code += '    const baseGlyph = VOID_ALPHABET[upperChar] || VOID_ALPHABET[" "];\n';
        code += '    const alternatives = VOID_ALPHABET_ALTERNATIVES[upperChar];\n';
        code += '    \n';
        code += '    if (alternativeIndex === null || alternativeIndex === undefined) {\n';
        code += '        return baseGlyph;\n';
        code += '    }\n';
        code += '    \n';
        code += '    if (alternativeIndex === "random") {\n';
        code += '        const allGlyphs = [baseGlyph, ...(alternatives || [])];\n';
        code += '        const randomIndex = Math.floor(Math.random() * allGlyphs.length);\n';
        code += '        return allGlyphs[randomIndex];\n';
        code += '    }\n';
        code += '    \n';
        code += '    if (typeof alternativeIndex === "number") {\n';
        code += '        if (alternativeIndex === 0) return baseGlyph;\n';
        code += '        if (!alternatives || !alternatives.length) return baseGlyph;\n';
        code += '        const altIndex = alternativeIndex - 1;\n';
        code += '        if (altIndex >= 0 && altIndex < alternatives.length) {\n';
        code += '            return alternatives[altIndex];\n';
        code += '        }\n';
        code += '    }\n';
        code += '    \n';
        code += '    return baseGlyph;\n';
        code += '}\n';
        
        return code;
    }
    
    /**
     * Сгенерировать код для экспорта (СТАРАЯ ВЕРСИЯ - только изменения)
     */
    generateExportCode(editedGlyphs) {
        let code = '/**\n';
        code += ' * Generated by Void Glyph Editor\n';
        code += ' * Only EDITED and NEW glyphs are shown below\n';
        code += ' * Copy sections into VoidAlphabet.js\n';
        code += ' */\n\n';
        
        // Разделить на базовые, новые и альтернативные
        const baseGlyphs = {};
        const newGlyphs = {};
        const alternativeGlyphs = {};
        
        for (const char in editedGlyphs) {
            const isNewChar = !VOID_ALPHABET[char];
            
            for (const key in editedGlyphs[char]) {
                if (key === 'base') {
                    if (isNewChar) {
                        newGlyphs[char] = editedGlyphs[char][key];
                    } else {
                        baseGlyphs[char] = editedGlyphs[char][key];
                    }
                } else {
                    if (!alternativeGlyphs[char]) {
                        alternativeGlyphs[char] = {};
                    }
                    alternativeGlyphs[char][key] = editedGlyphs[char][key];
                }
            }
        }
        
        // Экспорт НОВЫХ символов
        if (Object.keys(newGlyphs).length > 0) {
            code += '// ========== NEW GLYPHS ==========\n';
            code += '// Add these to VOID_ALPHABET:\n\n';
            for (const char in newGlyphs) {
                code += `    "${char}": "${newGlyphs[char]}",\n`;
            }
            code += '\n';
        }
        
        // Экспорт базовых глифов
        if (Object.keys(baseGlyphs).length > 0) {
            code += '// ========== EDITED BASE GLYPHS ==========\n';
            code += '// Replace these entries in VOID_ALPHABET:\n\n';
            for (const char in baseGlyphs) {
                code += `    "${char}": "${baseGlyphs[char]}",\n`;
            }
            code += '\n';
        }
        
        // Экспорт альтернативных глифов
        if (Object.keys(alternativeGlyphs).length > 0) {
            code += '// ========== ALTERNATIVE GLYPHS ==========\n';
            code += '// Replace/add these entries in VOID_ALPHABET_ALTERNATIVES:\n\n';
            for (const char in alternativeGlyphs) {
                code += `    "${char}": [\n`;
                const indices = Object.keys(alternativeGlyphs[char]).sort((a, b) => parseInt(a) - parseInt(b));
                indices.forEach((index, i) => {
                    const comma = i < indices.length - 1 ? ',' : '';
                    code += `        "${alternativeGlyphs[char][index]}"${comma}\n`;
                });
                code += `    ],\n`;
            }
        }
        
        if (Object.keys(editedGlyphs).length === 0) {
            code += '// No edited glyphs to export.\n';
        }
        
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

