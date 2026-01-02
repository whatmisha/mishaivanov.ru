/**
 * VoidRenderer - рендеринг текста шрифтом Void на canvas
 */

import { getGlyph } from './VoidAlphabet.js';
import { ModuleDrawer } from './ModuleDrawer.js';

export class VoidRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.moduleDrawer = new ModuleDrawer('fill');
        
        // Параметры шрифта (по умолчанию)
        this.params = {
            text: 'VOID TYPEFACE',
            stem: 24,              // толщина штриха
            moduleSize: 24,        // размер одного модуля (в пикселях)
            letterSpacing: 24,     // отступ между буквами
            lineHeight: 144,       // интерлиньяж
            strokesNum: 2,         // количество полосок (для stripes mode)
            strokeGapRatio: 1.0,   // отношение толщины штриха к промежутку
            mode: 'fill',          // 'fill' или 'stripes'
            color: '#ffffff',      // цвет букв
            bgColor: '#000000',    // цвет фона
            gridColor: '#333333',  // цвет сетки
            showGrid: true,        // показать сетку
            cornerRadius: 0        // радиус скругления углов
        };
        
        this.cols = 5; // колонок в сетке
        this.rows = 5; // строк в сетке
        
        // Кэш для значений по типу модуля (для режима random byType)
        this.moduleTypeCache = {};
        // Кэш для значений каждого модуля (для режима random full)
        this.moduleValueCache = {};
        
        this.setupCanvas();
    }

    /**
     * Очистить кэш значений по типу модуля
     */
    clearModuleTypeCache() {
        this.moduleTypeCache = {};
        this.moduleValueCache = {};
    }

    /**
     * Получить случайные значения для модуля (с учетом режима рандома)
     */
    getRandomModuleValues(moduleType) {
        const stemMin = this.params.randomStemMin || 0.5;
        const stemMax = this.params.randomStemMax || 2.0;
        const strokesMin = this.params.randomStrokesMin || 1;
        const strokesMax = this.params.randomStrokesMax || 5;
        const contrastMin = this.params.randomContrastMin || 0.1;
        const contrastMax = this.params.randomContrastMax || 8.0;
        const randomModeType = this.params.randomModeType || 'byType';

        if (randomModeType === 'byType') {
            // Режим по типу модуля: генерируем значения один раз для каждого типа
            if (!this.moduleTypeCache[moduleType]) {
                const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
                const stem = this.params.moduleSize * randomMultiplier * 2;
                const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
                const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
                
                this.moduleTypeCache[moduleType] = { stem, strokesNum, strokeGapRatio };
            }
            return this.moduleTypeCache[moduleType];
        } else {
            // Полный рандом: генерируем новые значения для каждого модуля
            // Но используем кэш, чтобы при экспорте использовать те же значения
            const cacheKey = arguments[1] || null; // ключ кэша передается вторым параметром
            
            if (cacheKey && this.moduleValueCache[cacheKey]) {
                return this.moduleValueCache[cacheKey];
            }
            
            const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
            const stem = this.params.moduleSize * randomMultiplier * 2;
            const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
            const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
            
            const values = { stem, strokesNum, strokeGapRatio };
            
            if (cacheKey) {
                this.moduleValueCache[cacheKey] = values;
            }
            
            return values;
        }
    }

    /**
     * Настройка canvas с учетом devicePixelRatio
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    /**
     * Обновить параметры
     */
    updateParams(newParams) {
        Object.assign(this.params, newParams);
        
        // Обновить параметры модуля
        this.moduleDrawer.setMode(this.params.mode);
        this.moduleDrawer.setStripesParams(this.params.strokesNum, this.params.strokeGapRatio);
        this.moduleDrawer.setCornerRadius(this.params.cornerRadius || 0);
    }

    /**
     * Установить текст
     */
    setText(text) {
        this.params.text = text;
    }

    /**
     * Отрисовать весь текст
     */
    render() {
        const rect = this.canvas.getBoundingClientRect();
        const canvasW = rect.width;
        const canvasH = rect.height;
        
        // Очистить canvas
        this.ctx.fillStyle = this.params.bgColor;
        this.ctx.fillRect(0, 0, canvasW, canvasH);
        
        // Нарисовать сетку если включена
        if (this.params.showGrid) {
            this.drawGrid(canvasW, canvasH);
        }
        
        const text = this.params.text;
        if (!text) return;
        
        // Разбить текст на строки
        const lines = text.split('\n');
        
        // Вычислить размеры
        const letterW = this.cols * this.params.moduleSize;
        const letterH = this.rows * this.params.moduleSize;
        
        // Вычислить общие размеры блока текста
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const totalWidth = maxLineLength * (letterW + this.params.letterSpacing) - this.params.letterSpacing;
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        // Начальная позиция (центрирование)
        const startX = (canvasW - totalWidth) / 2;
        const startY = (canvasH - totalHeight) / 2;
        
        // Отрисовать каждую строку
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineWidth = line.length * (letterW + this.params.letterSpacing) - this.params.letterSpacing;
            const lineX = (canvasW - lineWidth) / 2; // центрировать каждую строку
            const lineY = startY + lineIndex * (letterH + this.params.lineHeight);
            
            // Отрисовать каждую букву в строке
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const x = lineX + charIndex * (letterW + this.params.letterSpacing);
                
                this.drawLetter(char, x, lineY, lineIndex, charIndex);
            }
        }
    }

    /**
     * Отрисовать сетку модулей на весь фон
     * Сетка выравнивается по позиции букв
     */
    drawGrid(canvasW, canvasH) {
        const moduleSize = this.params.moduleSize;
        const letterW = this.cols * moduleSize;
        const letterH = this.rows * moduleSize;
        
        const text = this.params.text;
        if (!text) return;
        
        const lines = text.split('\n');
        
        // Вычислить размеры блока текста (копируем логику из render)
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const totalWidth = maxLineLength * (letterW + this.params.letterSpacing) - this.params.letterSpacing;
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        // Начальная позиция первой буквы (центрирование)
        const startX = (canvasW - totalWidth) / 2;
        const startY = (canvasH - totalHeight) / 2;
        
        // Вычисляем offset для сетки - сетка должна быть кратна moduleSize
        // и проходить через startX, startY
        const offsetX = startX % moduleSize;
        const offsetY = startY % moduleSize;
        
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        
        // Вертикальные линии - начинаем с offsetX
        for (let x = offsetX; x <= canvasW; x += moduleSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, canvasH);
        }
        
        // Горизонтальные линии - начинаем с offsetY
        for (let y = offsetY; y <= canvasH; y += moduleSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(canvasW, y);
        }
        
        this.ctx.stroke();
    }

    /**
     * Отрисовать одну букву
     */
    drawLetter(char, x, y, lineIndex = null, charIndex = null) {
        const glyphCode = getGlyph(char);
        const moduleW = this.params.moduleSize;
        const moduleH = this.params.moduleSize;
        const letterW = this.cols * moduleW;
        const letterH = this.rows * moduleH;
        
        // Отрисовать каждый модуль в сетке 5×5
        for (let i = 0; i < this.cols; i++) {
            for (let j = 0; j < this.rows; j++) {
                const index = (i + j * this.cols) * 2;
                const moduleType = glyphCode.charAt(index);
                const rotation = parseInt(glyphCode.charAt(index + 1));
                
                const moduleX = x + i * moduleW;
                const moduleY = y + j * moduleH;
                
                // Для random mode генерируем случайные значения для каждого модуля
                let stem = this.params.stem;
                let strokesNum = this.params.strokesNum;
                let strokeGapRatio = this.params.strokeGapRatio;
                
                if (this.params.mode === 'random') {
                    // Создаем уникальный ключ для этого модуля (позиция в тексте + позиция в модуле)
                    const cacheKey = this.params.randomModeType === 'full' && lineIndex !== null && charIndex !== null
                        ? `${lineIndex}_${charIndex}_${i}_${j}` 
                        : null;
                    const randomValues = this.getRandomModuleValues(moduleType, cacheKey);
                    stem = randomValues.stem;
                    strokesNum = randomValues.strokesNum;
                    strokeGapRatio = randomValues.strokeGapRatio;
                }
                
                // Временно обновить strokeGapRatio в moduleDrawer для этого модуля
                const originalStrokeGapRatio = this.moduleDrawer.strokeGapRatio;
                if (this.params.mode === 'random') {
                    this.moduleDrawer.strokeGapRatio = strokeGapRatio;
                }
                
                this.moduleDrawer.drawModule(
                    this.ctx,
                    moduleType,
                    rotation,
                    moduleX,
                    moduleY,
                    moduleW,
                    moduleH,
                    stem,
                    this.params.color,
                    this.params.mode === 'random' ? strokesNum : null
                );
                
                // Восстановить оригинальное значение
                if (this.params.mode === 'random') {
                    this.moduleDrawer.strokeGapRatio = originalStrokeGapRatio;
                }
            }
        }
    }

    /**
     * Ресайз canvas
     */
    resize() {
        this.setupCanvas();
        this.render();
    }
}

