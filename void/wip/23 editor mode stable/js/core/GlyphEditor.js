/**
 * GlyphEditor - редактор для создания и редактирования глифов
 */
export default class GlyphEditor {
    constructor(canvas, moduleDrawer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.moduleDrawer = moduleDrawer;
        
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
        
        // Bind методы
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        
        // Текущая ячейка под курсором
        this.hoveredCell = null;
        
        // Флаг для предотвращения бесконечного цикла при программном обновлении поля
        this.isUpdatingFromGrid = false;
        
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
        this.isActive = true;
        
        // Обновить размеры canvas
        this.updateCanvasSize();
        
        // Инициализировать поле с дефолтной строкой
        this.updateGlyphString();
        
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('keydown', this.handleKeyDown);
        
        // Обработчик изменений текста в поле глифа
        const glyphStringField = document.getElementById('editorGlyphString');
        if (glyphStringField) {
            glyphStringField.addEventListener('input', this.handleGlyphStringChange);
        }
        
        this.render();
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
        
        this.hoveredCell = null;
        
        // Очистить canvas при деактивации
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Обработка клика мыши
     */
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = (e.clientX - rect.left) * dpr;
        const y = (e.clientY - rect.top) * dpr;
        
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
    }
    
    /**
     * Обработка движения мыши
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = (e.clientX - rect.left) * dpr;
        const y = (e.clientY - rect.top) * dpr;
        
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
        const dpr = window.devicePixelRatio || 1;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Фиксированный размер модуля - 48px (умножаем на DPR для canvas)
        const modulePixelSize = 48 * dpr;
        
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
            activeElement.tagName === 'TEXTAREA'
        );
        
        // Если редактируем текст, не обрабатываем стрелки
        if (isTextInputFocused) {
            return;
        }
        
        // Стрелки вверх/вниз или W/S - выбор модуля
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex - 1 + this.moduleTypes.length) % this.moduleTypes.length;
            this.updateModuleInfo();
            this.render();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex + 1) % this.moduleTypes.length;
            this.updateModuleInfo();
            this.render();
        }
        // Стрелки влево/вправо или A/D - поворот
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            this.currentRotation = (this.currentRotation - 1 + 4) % 4;
            this.updateModuleInfo();
            this.render();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
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
        const moduleInfo = document.getElementById('editorCurrentModule');
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
        
        const dpr = window.devicePixelRatio || 1;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Очистить canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Фиксированный размер модуля - 48px (умножаем на DPR для canvas)
        const modulePixelSize = 48 * dpr;
        
        // Центрируем сетку
        const gridPixelSize = modulePixelSize * this.gridSize;
        const offsetX = (canvasWidth - gridPixelSize) / 2;
        const offsetY = (canvasHeight - gridPixelSize) / 2;
        
        // Рисуем фон
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Рисуем сетку
        this.ctx.strokeStyle = '#E0E0E0';
        this.ctx.lineWidth = 1 * dpr;
        
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
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.ctx.fillRect(x, y, modulePixelSize, modulePixelSize);
            
            // Превью текущего модуля (черный с 50% прозрачностью)
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
        
        // Рисуем размещенные модули (черные, 100% непрозрачности)
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
        
        // Установить черный цвет для модулей
        this.ctx.strokeStyle = '#000000';
        this.ctx.fillStyle = '#000000';
        
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
        
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        // Устанавливаем размеры canvas
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        if (this.isActive) {
            this.render();
        }
    }
}

