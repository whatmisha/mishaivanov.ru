/**
 * GlyphEditor - редактор для создания и редактирования глифов
 */
import { VOID_ALPHABET, VOID_ALPHABET_ALTERNATIVES } from './VoidAlphabet.js';
import { getGlyph } from './GlyphLoader.js';

export default class GlyphEditor {
    constructor(canvas, moduleDrawer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.moduleDrawer = moduleDrawer;
        
        // Ключ для сохранения в localStorage (может быть переопределён извне)
        this.storageKey = 'voidGlyphEditor_editedGlyphs';
        
        // Размеры сетки
        this.gridSize = 5; // 5x5 модулей
        this.moduleSize = 48; // размер одного модуля
        
        // Массив модулей на сетке [row][col] = {type, rotation}
        this.grid = this.createEmptyGrid();
        
        // Доступные типы модулей
        this.moduleTypes = ['E', 'S', 'C', 'J', 'L', 'R', 'B'];
        this.currentModuleIndex = 1; // начинаем с 'S'
        this.currentRotation = 0; // 0, 1, 2, 3 (0°, 90°, 180°, 270°)
        
        // Флаг активности редактора
        this.isActive = false;
        
        // Выбранный символ
        this.selectedChar = null;
        
        // Bind методы
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleCharSelectorChange = this.handleCharSelectorChange.bind(this);
        
        // Текущая ячейка под курсором
        this.hoveredCell = null;
        
        // Флаг для предотвращения бесконечного цикла при программном обновлении поля
        this.isUpdatingFromGrid = false;
        
        // Флаг для предотвращения рекурсии между checkForChanges и updateGlyphString
        this.isCheckingChanges = false;
        
        // Bind метод для обработки изменений текста
        this.handleGlyphStringChange = this.handleGlyphStringChange.bind(this);
    }
    
    /**
     * Создать пустую сетку
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
     * Активировать редактор
     */
    activate() {
        console.log('[GlyphEditor] Activating...');
        this.isActive = true;
        
        // Обновить размеры canvas
        this.updateCanvasSize();
        console.log('[GlyphEditor] Canvas size:', this.canvas.width, 'x', this.canvas.height);
        
        // Инициализировать поле с дефолтной строкой
        this.updateGlyphString();
        
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('keydown', this.handleKeyDown);
        console.log('[GlyphEditor] Event listeners attached');
        
        // Обработчик изменений текста в поле глифа
        const glyphStringField = document.getElementById('editorGlyphString');
        if (glyphStringField) {
            glyphStringField.addEventListener('input', this.handleGlyphStringChange);
        }
        
        // Обработчик выбора символа
        const charSelector = document.getElementById('editorCharSelector');
        if (charSelector) {
            charSelector.addEventListener('input', this.handleCharSelectorChange);
            charSelector.addEventListener('keydown', (e) => {
                // Разрешить только один символ
                if (e.target.value.length >= 1 && e.key !== 'Backspace' && e.key !== 'Delete') {
                    e.preventDefault();
                }
            });
        }
        
        // Обработчик кнопки "Save Changes"
        const saveChangesBtn = document.getElementById('editorSaveChangesBtn');
        if (saveChangesBtn) {
            saveChangesBtn.addEventListener('click', () => {
                this.saveChanges();
            });
        }
        
        // Показать панель альтернатив
        const alternativesPanel = document.getElementById('editorAlternativesPanel');
        if (alternativesPanel) {
            alternativesPanel.style.display = 'flex';
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
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Удалить обработчик изменений текста
        const glyphStringField = document.getElementById('editorGlyphString');
        if (glyphStringField) {
            glyphStringField.removeEventListener('input', this.handleGlyphStringChange);
        }
        
        // Удалить обработчик выбора символа
        const charSelector = document.getElementById('editorCharSelector');
        if (charSelector) {
            charSelector.removeEventListener('input', this.handleCharSelectorChange);
        }
        
        this.hoveredCell = null;
        
        // Скрыть панель альтернатив
        const alternativesPanel = document.getElementById('editorAlternativesPanel');
        if (alternativesPanel) {
            alternativesPanel.style.display = 'none';
        }
        
        // Очистить canvas при деактивации
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Обработка клика мыши
     */
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // В standalone редакторе не используем devicePixelRatio для координат
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            // Прямые CSS-координаты
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
            // С учётом DPR для основного приложения
            const dpr = window.devicePixelRatio || 1;
            x = (e.clientX - rect.left) * dpr;
            y = (e.clientY - rect.top) * dpr;
        }
        
        const cell = this.getCellFromCoords(x, y);
        if (!cell) return;
        
        const { row, col } = cell;
        
        // Если ячейка пустая - добавить модуль, если занята - удалить
        if (this.grid[row][col]) {
            this.grid[row][col] = null;
        } else {
            this.grid[row][col] = {
                type: this.getCurrentModuleType(),
                rotation: this.currentRotation
            };
        }
        
        this.render();
        this.updateModuleInfo();
        this.updateGlyphString();
        
        // Автосохранение после каждого изменения
        this.autoSave();
    }
    
    /**
     * Обработка движения мыши
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // В standalone редакторе не используем devicePixelRatio для координат
        const isStandalone = window.location.pathname.includes('/editor');
        
        let x, y;
        if (isStandalone) {
            // Прямые CSS-координаты
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        } else {
            // С учётом DPR для основного приложения
            const dpr = window.devicePixelRatio || 1;
            x = (e.clientX - rect.left) * dpr;
            y = (e.clientY - rect.top) * dpr;
        }
        
        const cell = this.getCellFromCoords(x, y);
        
        // Проверяем, изменилась ли ячейка
        const cellChanged = !cell || !this.hoveredCell ||
            cell.row !== this.hoveredCell.row ||
            cell.col !== this.hoveredCell.col;
        
        if (cellChanged) {
            this.hoveredCell = cell;
            this.render();
        }
    }
    
    /**
     * Получить ячейку из координат
     */
    getCellFromCoords(x, y) {
        // Проверяем, находимся ли мы в standalone редакторе
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
        
        // Центрируем сетку
        const gridPixelSize = modulePixelSize * this.gridSize;
        const offsetX = (canvasWidth - gridPixelSize) / 2;
        const offsetY = (canvasHeight - gridPixelSize) / 2;
        
        // Проверяем, попадает ли клик в сетку
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
        // Проверяем, не находится ли фокус на текстовых полях
        const activeElement = document.activeElement;
        const isTextInputFocused = activeElement && (
            activeElement.id === 'editorGlyphString' ||
            activeElement.id === 'editorSavedGlyphs' ||
            activeElement.id === 'editorCharSelector' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'INPUT'
        );
        
        // Если редактируем текст или поле выбора символа, не обрабатываем стрелки
        if (isTextInputFocused) {
            return;
        }
        
        // Стрелки вверх/вниз или W/S (или Ц/Ы в русской раскладке) - выбор модуля
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex - 1 + this.moduleTypes.length) % this.moduleTypes.length;
            this.updateModuleInfo();
            this.render();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex + 1) % this.moduleTypes.length;
            this.updateModuleInfo();
            this.render();
        }
        // Стрелки влево/вправо или A/D (или Ф/В в русской раскладке) - поворот
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
            e.preventDefault();
            this.currentRotation = (this.currentRotation - 1 + 4) % 4;
            this.updateModuleInfo();
            this.render();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
            e.preventDefault();
            this.currentRotation = (this.currentRotation + 1) % 4;
            this.updateModuleInfo();
            this.render();
        }
    }
    
    /**
     * Получить текущий тип модуля
     */
    getCurrentModuleType() {
        return this.moduleTypes[this.currentModuleIndex];
    }
    
    /**
     * Обновить информацию о текущем модуле в UI
     */
    updateModuleInfo() {
        const moduleInfo = document.getElementById('editorCurrentModule') || document.getElementById('currentModule');
        if (moduleInfo) {
            const type = this.getCurrentModuleType();
            const rotation = this.currentRotation * 90;
            moduleInfo.textContent = `${type}${this.currentRotation} (${rotation}°)`;
        }
    }
    
    /**
     * Отрисовать редактор
     */
    render() {
        if (!this.isActive) return;
        
        // Проверяем, находимся ли мы в standalone редакторе
        const isStandalone = window.location.pathname.includes('/editor');
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Очистить canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Размер модуля: в standalone используем CSS-пиксели, в main app - физические пиксели
        let modulePixelSize;
        let lineWidth;
        
        if (isStandalone) {
            // В standalone canvas 600x600 без DPR масштабирования
            // Модуль занимает 1/6 ширины (5 модулей + отступы)
            modulePixelSize = canvasWidth / 6.25;  // ~96px при canvas 600px
            lineWidth = 0.5; // Тонкая линия (как в основном приложении)
        } else {
            const dpr = window.devicePixelRatio || 1;
            modulePixelSize = 48 * dpr;
            lineWidth = 0.5 * dpr; // Тонкая линия (как в основном приложении)
        }
        
        // Центрируем сетку
        const gridPixelSize = modulePixelSize * this.gridSize;
        const offsetX = (canvasWidth - gridPixelSize) / 2;
        const offsetY = (canvasHeight - gridPixelSize) / 2;
        
        // Рисуем фон (черный)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Рисуем сетку (#666666 - более светлая и заметная)
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = lineWidth;
        
        for (let i = 0; i <= this.gridSize; i++) {
            // Вертикальные линии
            const x = offsetX + i * modulePixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, offsetY);
            this.ctx.lineTo(x, offsetY + gridPixelSize);
            this.ctx.stroke();
            
            // Горизонтальные линии
            const y = offsetY + i * modulePixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(offsetX, y);
            this.ctx.lineTo(offsetX + gridPixelSize, y);
            this.ctx.stroke();
        }
        
        // Подсветка ячейки под курсором
        if (this.hoveredCell) {
            const { row, col } = this.hoveredCell;
            const x = offsetX + col * modulePixelSize;
            const y = offsetY + row * modulePixelSize;
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(x, y, modulePixelSize, modulePixelSize);
            
            // Превью текущего модуля (белый с 50% прозрачностью)
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
        
        // Рисуем размещенные модули (белые, 100% непрозрачности)
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
     * Нарисовать модуль
     */
    drawModule(centerX, centerY, size, type, rotation) {
        const angle = rotation * Math.PI / 2;
        // ModuleDrawer делит stem на 2 для lineWidth, поэтому передаём size * 1.0
        // чтобы получить толщину линии = 0.5 от размера ячейки
        const stem = size * 1.0;
        
        // Установить белый цвет для модулей
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.fillStyle = '#FFFFFF';
        
        this.ctx.save();
        
        switch (type) {
            case 'E':
                // Пустой модуль - ничего не рисуем
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
        
        // Обновить textarea только если поле не в фокусе (чтобы не мешать редактированию)
        const outputField = document.getElementById('editorGlyphString');
        if (outputField && document.activeElement !== outputField) {
            this.isUpdatingFromGrid = true;
            // Форматировать строку с пробелами каждые 10 символов
            outputField.value = this.formatGlyphString(glyphString);
            this.isUpdatingFromGrid = false;
        }
        
        return glyphString;
    }
    
    /**
     * Обработчик изменений текста в поле глифа
     */
    handleGlyphStringChange(e) {
        // Не обрабатывать, если обновление идет из сетки
        if (this.isUpdatingFromGrid) {
            return;
        }
        
        // Удалить пробелы из строки перед обработкой
        const glyphString = this.removeSpaces(e.target.value);
        
        // Проверка длины строки (должна быть 25 модулей * 2 символа = 50)
        if (glyphString.length !== 50) {
            // Если длина неправильная, не обновляем сетку
            return;
        }
        
        // Импортировать глиф из строки без обновления поля (чтобы избежать цикла)
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
        
        // Выделить текст для копирования
        const outputField = document.getElementById('editorGlyphString');
        if (outputField) {
            outputField.select();
            
            // Копировать в буфер обмена
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
        
        // Генерируем рандомный эмодзи
        const emojis = ['😎', '🎨', '✨', '🔥', '💎', '🌟', '⚡', '🎯', '🚀', '💫', '🎭', '🎪', '🎬', '🎮', '🎲', '🎸', '🎺', '🎻', '🎤', '🎧'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        // Формат: "😎": "E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0",
        // Без пробелов в начале, с пустой строкой между записями
        const currentValue = savedGlyphsField.value.trim();
        const newEntry = `"${randomEmoji}": "${glyphString}",\n`;
        const separator = currentValue ? '\n\n' : '';
        
        savedGlyphsField.value = currentValue + separator + newEntry;
        
        // Прокручиваем вниз
        savedGlyphsField.scrollTop = savedGlyphsField.scrollHeight;
        
        // Сбросить сетку и первое поле до дефолтного состояния
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
        // Удалить пробелы из строки перед обработкой
        glyphString = this.removeSpaces(glyphString);
        
        // Проверка длины строки (должна быть 25 модулей * 2 символа = 50)
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
        
        // Обновлять поле только если указано явно (чтобы избежать цикла при редактировании)
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
        
        // Проверяем, находимся ли мы в standalone редакторе
        const isStandalone = window.location.pathname.includes('/editor');
        
        if (isStandalone) {
            // В standalone редакторе используем фиксированный размер
            const size = 600;
            this.canvas.width = size;
            this.canvas.height = size;
            console.log('[GlyphEditor.updateCanvasSize] Standalone mode: fixed size', size);
        } else {
            // В основном приложении используем размер окна
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            
            // Устанавливаем размеры canvas
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
        
        // Проверяем, есть ли глиф для этого символа
        if (char && VOID_ALPHABET[char]) {
            this.selectedChar = char;
            this.selectedAlternativeIndex = null; // Сбрасываем выбор альтернативы
            this.loadBaseGlyph(char);
            this.updateAlternativesPanel();
        } else if (char === '') {
            // Если поле очищено, очищаем сетку
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
        
        // Убедиться, что панель видна
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
        }
        
        // Очистить панель
        content.innerHTML = '';
        
        // Добавить превью базового глифа (индекс null)
        this.addAlternativePreview(content, null, 'Base');
        
        // Получить альтернативы для выбранного символа
        const alternatives = VOID_ALPHABET_ALTERNATIVES[this.selectedChar];
        
        if (alternatives && alternatives.length > 0) {
            // Создать миниатюры для каждой альтернативы
            alternatives.forEach((altGlyphString, index) => {
                const altIndex = index + 1; // Индекс 1+ для альтернатив
                this.addAlternativePreview(content, altIndex, `Alt ${altIndex}`);
            });
        }
    }
    
    /**
     * Добавить превью альтернативы в панель
     */
    addAlternativePreview(container, alternativeIndex, label) {
        // Проверить, есть ли сохранённая версия
        const editedGlyph = this.getEditedGlyph(this.selectedChar, alternativeIndex);
        
        // Получить оригинальный глиф
        const originalGlyph = this.getOriginalGlyph(this.selectedChar, alternativeIndex);
        const glyphStringToShow = editedGlyph || originalGlyph;
        
        const item = document.createElement('div');
        item.className = 'editor-alternative-item';
        item.dataset.index = alternativeIndex === null ? 'base' : String(alternativeIndex);
        
        // Добавить класс "edited" если есть сохранённые изменения
        if (editedGlyph) {
            item.classList.add('edited');
        }
        
        // Добавить обработчик клика
        item.addEventListener('click', () => {
            console.log(`[addAlternativePreview] Clicked on alternative: ${alternativeIndex}`);
            this.selectAlternative(alternativeIndex);
        });
        
        // Контейнер для превью
        const preview = document.createElement('div');
        preview.className = 'editor-alternative-preview';
        
        // Canvas для миниатюры
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 120;
        previewCanvas.height = 80;
        this.renderGlyphPreview(previewCanvas, glyphStringToShow);
        
        preview.appendChild(previewCanvas);
        
        // Метка
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
        
        // Загрузить выбранную альтернативу с учётом сохранённых изменений
        this.loadGlyphWithEdits(this.selectedChar, index);
        
        // Обновить визуальное выделение
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
        
        // Используем размеры canvas как есть (CSS-пиксели)
        const width = canvas.width;
        const height = canvas.height;
        
        // Очистить canvas (темный фон панели)
        ctx.fillStyle = '#1a1a1a'; // var(--color-bg-panel)
        ctx.fillRect(0, 0, width, height);
        
        // Размер модуля для превью (меньше, чем на основном канвасе)
        const moduleSize = Math.min(width, height) / (this.gridSize + 1);
        const gridSize = moduleSize * this.gridSize;
        const offsetX = (width - gridSize) / 2;
        const offsetY = (height - gridSize) / 2;
        
        // Парсим строку глифа
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
        
        // Рисуем модули
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const module = grid[row][col];
                if (module) {
                    const x = offsetX + col * moduleSize + moduleSize / 2;
                    const y = offsetY + row * moduleSize + moduleSize / 2;
                    const angle = module.rotation * Math.PI / 2;
                    const stem = moduleSize * 1.0;
                    
                    // Белый цвет для превью на темном фоне
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
     * Получить оригинальный глиф (из VOID_ALPHABET или альтернатив)
     */
    getOriginalGlyph(char, alternativeIndex) {
        // Сначала проверяем, есть ли в VoidAlphabet
        const glyph = getGlyph(char, { alternativeIndex: alternativeIndex || null });
        
        // Если глиф не найден (вернулся пробел), проверяем, может это новый символ из localStorage
        if (glyph === VOID_ALPHABET[" "]) {
            // Проверить localStorage
            const editedGlyph = this.getEditedGlyph(char, alternativeIndex);
            if (editedGlyph) {
                return editedGlyph;
            }
            // Вернуть пустой глиф для новых символов
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
        
        // Получить текущую строку глифа без вызова updateGlyphString (чтобы избежать рекурсии)
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
        
        const originalGlyphString = this.getOriginalGlyph(this.selectedChar, this.selectedAlternativeIndex);
        const editedGlyphString = this.getEditedGlyph(this.selectedChar, this.selectedAlternativeIndex);
        
        // Используем сохранённую версию, если есть, иначе оригинальную
        const referenceGlyphString = editedGlyphString || originalGlyphString;
        
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
        
        // Также обновить кнопку "Save" в standalone редакторе
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = !show;
        }
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
        
        // Инициализировать объект для символа, если его нет
        if (!editedGlyphs[this.selectedChar]) {
            editedGlyphs[this.selectedChar] = {};
        }
        
        // Сохранить глиф с ключом 'base' для базового или индексом для альтернативы
        const key = this.selectedAlternativeIndex === null ? 'base' : String(this.selectedAlternativeIndex);
        
        console.log(`[saveChanges] Saving glyph for char: ${this.selectedChar}, selectedAlternativeIndex: ${this.selectedAlternativeIndex}, key: ${key}`);
        console.log(`[saveChanges] Glyph string length: ${glyphString.length}`);
        
        editedGlyphs[this.selectedChar][key] = glyphString;
        
        // Сохранить в localStorage
        this.saveEditedGlyphs(editedGlyphs);
        
        console.log(`[saveChanges] ✓ Saved. Current storage for ${this.selectedChar}:`, Object.keys(editedGlyphs[this.selectedChar]));
        
        // Обновить превью в панели альтернатив, если это альтернатива
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
        
        // Используем debounce чтобы не сохранять слишком часто
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            const glyphString = this.updateGlyphString();
            const editedGlyphs = this.getEditedGlyphs();
            
            // Инициализировать объект для символа, если его нет
            if (!editedGlyphs[this.selectedChar]) {
                editedGlyphs[this.selectedChar] = {};
            }
            
            // Сохранить глиф с ключом 'base' для базового или индексом для альтернативы
            const key = this.selectedAlternativeIndex === null ? 'base' : String(this.selectedAlternativeIndex);
            
            editedGlyphs[this.selectedChar][key] = glyphString;
            
            // Сохранить в localStorage
            this.saveEditedGlyphs(editedGlyphs);
            
            // Вызвать событие для обновления UI в editor.js
            const event = new CustomEvent('glyphAutoSaved', {
                detail: {
                    char: this.selectedChar,
                    alternativeIndex: this.selectedAlternativeIndex
                }
            });
            document.dispatchEvent(event);
        }, 300); // Задержка 300ms
    }
    
    /**
     * Загрузить глиф с учётом сохранённых изменений
     */
    loadGlyphWithEdits(char, alternativeIndex) {
        // Установить выбранный символ и индекс альтернативы
        this.selectedChar = char;
        this.selectedAlternativeIndex = alternativeIndex;
        
        console.log(`[loadGlyphWithEdits] Loading glyph for char: ${char}, alternativeIndex: ${alternativeIndex} (type: ${typeof alternativeIndex})`);
        
        // Сначала проверяем сохранённые изменения
        const editedGlyph = this.getEditedGlyph(char, alternativeIndex);
        if (editedGlyph) {
            console.log(`[loadGlyphWithEdits] ✓ Found edited glyph, loading it`);
            this.importGlyph(editedGlyph, true);
            return;
        }
        
        console.log(`[loadGlyphWithEdits] No edited glyph found, loading original`);
        // Если нет сохранённых изменений, загружаем оригинал
        const originalGlyph = this.getOriginalGlyph(char, alternativeIndex);
        if (originalGlyph) {
            this.importGlyph(originalGlyph, true);
        }
    }
}

