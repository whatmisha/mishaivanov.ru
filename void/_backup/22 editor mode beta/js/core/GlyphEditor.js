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
        this.moduleSize = 24; // размер одного модуля
        
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
        
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('keydown', this.handleKeyDown);
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
        this.hoveredCell = null;
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
        
        // Фиксированный размер модуля - 24px (умножаем на DPR для canvas)
        const modulePixelSize = 24 * dpr;
        
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
        // Стрелки вверх/вниз - выбор модуля
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex - 1 + this.moduleTypes.length) % this.moduleTypes.length;
            this.updateModuleInfo();
            this.render();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.currentModuleIndex = (this.currentModuleIndex + 1) % this.moduleTypes.length;
            this.updateModuleInfo();
            this.render();
        }
        // Стрелки влево/вправо - поворот
        else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.currentRotation = (this.currentRotation - 1 + 4) % 4;
            this.updateModuleInfo();
            this.render();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.currentRotation = (this.currentRotation + 1) % 4;
            this.updateModuleInfo();
            this.render();
        }
        // Ctrl/Cmd + C - очистить
        else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            this.clear();
        }
        // Ctrl/Cmd + E - экспортировать
        else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            this.exportGlyph();
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
        
        // Фиксированный размер модуля - 24px (умножаем на DPR для canvas)
        const modulePixelSize = 24 * dpr;
        
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
    }
    
    /**
     * Экспортировать глиф в строку
     */
    exportGlyph() {
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
        
        // Вывести в textarea
        const outputField = document.getElementById('editorGlyphOutput');
        if (outputField) {
            outputField.value = glyphString;
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
     * Импортировать глиф из строки
     */
    importGlyph(glyphString) {
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

