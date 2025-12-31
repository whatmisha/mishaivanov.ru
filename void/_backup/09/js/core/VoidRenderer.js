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
            stem: 12,              // толщина штриха
            moduleSize: 12,        // размер одного модуля (в пикселях)
            letterSpacing: 12,     // отступ между буквами
            lineHeight: 72,        // интерлиньяж
            strokesNum: 2,         // количество полосок (для stripes mode)
            strokeGapRatio: 1.0,   // отношение толщины штриха к промежутку
            mode: 'fill',          // 'fill' или 'stripes'
            color: '#ffffff',      // цвет букв
            bgColor: '#000000',    // цвет фона
            showGrid: true        // показать сетку
        };
        
        this.cols = 5; // колонок в сетке
        this.rows = 5; // строк в сетке
        
        this.setupCanvas();
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
                
                this.drawLetter(char, x, lineY);
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
    drawLetter(char, x, y) {
        const glyphCode = getGlyph(char);
        const moduleW = this.params.moduleSize;
        const moduleH = this.params.moduleSize;
        
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
                
                if (this.params.mode === 'random') {
                    // Случайная толщина в пределах min-max от базовой
                    const stemMin = this.params.randomStemMin || 0.5;
                    const stemMax = this.params.randomStemMax || 2.0;
                    stem = this.params.stem * (stemMin + Math.random() * (stemMax - stemMin));
                    
                    // Случайное количество полосок в пределах min-max
                    const strokesMin = this.params.randomStrokesMin || 1;
                    const strokesMax = this.params.randomStrokesMax || 5;
                    strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
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

