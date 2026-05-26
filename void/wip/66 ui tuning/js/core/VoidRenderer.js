/**
 * VoidRenderer - рендеринг текста шрифтом Void на canvas
 */

import { VOID_ALPHABET_ALTERNATIVES, VOID_ALPHABET } from './VoidAlphabet.js';
import { getGlyph } from './GlyphLoader.js';
import { ModuleDrawer } from './ModuleDrawer.js';
import { EndpointDetector } from '../utils/EndpointDetector.js';

export class VoidRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.moduleDrawer = new ModuleDrawer('stroke');
        this.endpointDetector = new EndpointDetector();
        
        // Параметры шрифта (по умолчанию)
        this.params = {
            text: 'VOID TYPEFACE',
            stem: 24,              // толщина штриха
            moduleSize: 24,        // размер одного модуля (в пикселях)
            letterSpacing: 24,     // отступ между буквами
            lineHeight: 144,       // интерлиньяж
            strokesNum: 2,         // количество полосок (для stripes mode)
            strokeGapRatio: 1.0,   // отношение толщины штриха к промежутку
            mode: 'fill',          // 'fill', 'stripes' или 'dash'
            color: '#ffffff',      // цвет букв
            bgColor: '#000000',    // цвет фона
            gridColor: '#333333',  // цвет сетки
            showGrid: true,        // показать сетку
            textAlign: 'center',   // выравнивание текста: 'left', 'center', 'right'
            cornerRadius: 0,       // радиус скругления углов
            roundedCaps: false,    // скругления на концах линий в режиме Stroke (Rounded)
            showEndpoints: false,   // показать концевые точки и стыки (для отладки)
            showTestCircles: false // показать окружности на концевых точках (Test режим)
        };
        
        this.cols = 5; // колонок в сетке
        this.rows = 5; // строк в сетке
        
        // Кэш для значений по типу модуля (для режима random byType)
        this.moduleTypeCache = {};
        // Кэш для значений каждого модуля (для режима random full)
        this.moduleValueCache = {};
        
        // Кэш выбранных альтернативных глифов для каждой буквы
        // Ключ: `${lineIndex}_${charIndex}`, значение: индекс альтернативы (0 = базовый, 1+ = альтернативы)
        // Если ключа нет в кэше, значит буква использует случайную альтернативу (в режиме Random)
        this.alternativeGlyphCache = {};
        
        // Текущая буква под курсором (для эффекта прозрачности)
        this.hoveredLetter = null; // {lineIndex, charIndex} или null
        
        // Сохранить размеры канваса в CSS пикселях
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        
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
     * Очистить кэш альтернативных глифов (при Update в режиме Random)
     */
    clearAlternativeGlyphCache() {
        this.alternativeGlyphCache = {};
    }

    /**
     * Получить случайные значения для модуля (с учетом режима рандома)
     */
    getRandomModuleValues(moduleType) {
        // Используем значения из params, если они определены, иначе значения по умолчанию
        // Значения по умолчанию должны совпадать с дефолтными значениями в main.js
        const stemMin = this.params.randomStemMin !== undefined ? this.params.randomStemMin : 0.5;
        const stemMax = this.params.randomStemMax !== undefined ? this.params.randomStemMax : 1.0;
        const strokesMin = this.params.randomStrokesMin !== undefined ? this.params.randomStrokesMin : 1;
        const strokesMax = this.params.randomStrokesMax !== undefined ? this.params.randomStrokesMax : 8;
        const contrastMin = this.params.randomContrastMin !== undefined ? this.params.randomContrastMin : 0.5;
        const contrastMax = this.params.randomContrastMax !== undefined ? this.params.randomContrastMax : 1.0;
        const dashLengthMin = this.params.randomDashLengthMin !== undefined ? this.params.randomDashLengthMin : 1.0;
        const dashLengthMax = this.params.randomDashLengthMax !== undefined ? this.params.randomDashLengthMax : 1.5;
        const gapLengthMin = this.params.randomGapLengthMin !== undefined ? this.params.randomGapLengthMin : 1.0;
        const gapLengthMax = this.params.randomGapLengthMax !== undefined ? this.params.randomGapLengthMax : 1.5;
        const randomModeType = this.params.randomModeType || 'byType';

        if (randomModeType === 'byType') {
            // Режим по типу модуля: генерируем значения один раз для каждого типа
            if (!this.moduleTypeCache[moduleType]) {
                const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
                const stem = this.params.moduleSize * randomMultiplier * 2;
                const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
                const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
                const dashLength = dashLengthMin + Math.random() * (dashLengthMax - dashLengthMin);
                const gapLength = gapLengthMin + Math.random() * (gapLengthMax - gapLengthMin);
                
                // Определяем useDash для этого типа модуля
                // Dash применяется только если randomDash включен и strokesNum > 1
                const moduleUseDash = this.params.randomDash && strokesNum > 1 
                    ? Math.random() < 0.5  // 50% вероятность dash
                    : false;
                
                this.moduleTypeCache[moduleType] = { stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash: moduleUseDash };
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
            const dashLength = dashLengthMin + Math.random() * (dashLengthMax - dashLengthMin);
            const gapLength = gapLengthMin + Math.random() * (gapLengthMax - gapLengthMin);
            
            // Определяем useDash для этого модуля
            // Dash применяется только если randomDash включен и strokesNum > 1
            const moduleUseDash = this.params.randomDash && strokesNum > 1 
                ? Math.random() < 0.5  // 50% вероятность dash
                : false;
            
            const values = { stem, strokesNum, strokeGapRatio, dashLength, gapLength, useDash: moduleUseDash };
            
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
        
        // Сохранить размеры в CSS пикселях
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;
        
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
        // Проверить, изменились ли параметры random, и очистить кэш если да
        const oldStemMin = this.params.randomStemMin;
        const oldStemMax = this.params.randomStemMax;
        const oldStrokesMin = this.params.randomStrokesMin;
        const oldStrokesMax = this.params.randomStrokesMax;
        const oldContrastMin = this.params.randomContrastMin;
        const oldContrastMax = this.params.randomContrastMax;
        const oldRandomDash = this.params.randomDash;
        
        Object.assign(this.params, newParams);
        
        // Если параметры random изменились, очистить кэш
        if (this.params.mode === 'random' && (
            oldStemMin !== this.params.randomStemMin ||
            oldStemMax !== this.params.randomStemMax ||
            oldStrokesMin !== this.params.randomStrokesMin ||
            oldStrokesMax !== this.params.randomStrokesMax ||
            oldContrastMin !== this.params.randomContrastMin ||
            oldContrastMax !== this.params.randomContrastMax ||
            oldRandomDash !== this.params.randomDash
        )) {
            this.clearModuleTypeCache();
        }
        
        // Обновить параметры модуля
        // Solid mode теперь это Stripes с Lines=1
        // Random mode использует 'stripes' по умолчанию, dash применяется случайно для каждого модуля
        let actualMode;
        if (this.params.mode === 'fill') {
            actualMode = 'stripes';
        } else if (this.params.mode === 'random') {
            // В режиме random используем 'stripes' по умолчанию
            // Dash будет применяться случайно для каждого модуля отдельно
            actualMode = 'stripes';
        } else {
            actualMode = this.params.mode;
        }
        const actualStrokesNum = this.params.mode === 'fill' ? 1 : this.params.strokesNum;
        
        this.moduleDrawer.setMode(actualMode);
        this.moduleDrawer.setStripesParams(actualStrokesNum, this.params.strokeGapRatio);
        this.moduleDrawer.setCornerRadius(this.params.cornerRadius || 0);
        
        // В режиме Random использовать randomRounded, иначе roundedCaps
        const shouldUseRounded = this.params.mode === 'random' 
            ? (this.params.randomRounded || false)
            : (this.params.roundedCaps || false);
        this.moduleDrawer.setRoundedCaps(shouldUseRounded);
        
        // В режиме Random использовать randomCloseEnds, иначе closeEnds
        const shouldUseCloseEnds = this.params.mode === 'random'
            ? (this.params.randomCloseEnds || false)
            : (this.params.closeEnds || false);
        this.moduleDrawer.setCloseEnds(shouldUseCloseEnds);
        
        // shouldUseEndpoints = true если нужны endpoints (для Round или Close Ends)
        // Это нужно для корректного определения концевых модулей
        
        this.moduleDrawer.setDashParams(
            this.params.dashLength || 0.10, 
            this.params.gapLength || 0.30,
            this.params.dashChess || false
        );
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
        // Проверить, изменились ли размеры контейнера, и обновить канвас если нужно
        const rect = this.canvas.getBoundingClientRect();
        if (this.canvasWidth !== rect.width || this.canvasHeight !== rect.height) {
            this.setupCanvas();
        }
        
        // Использовать сохраненные размеры канваса
        const canvasW = this.canvasWidth;
        const canvasH = this.canvasHeight;
        
        // Очистить canvas
        this.ctx.fillStyle = this.params.bgColor;
        this.ctx.fillRect(0, 0, canvasW, canvasH);
        
        // Нарисовать сетку если включена
        if (this.params.showGrid) {
            this.drawGrid(canvasW, canvasH);
        }
        
        const text = this.params.text;
        if (!text) return;
        
        // Разбить текст на строки и удалить пробелы в начале и конце каждой строки
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        
        // Вычислить размеры
        const letterW = this.cols * this.params.moduleSize;
        const letterH = this.rows * this.params.moduleSize;
        
        // Вычислить общие размеры блока текста с учетом разной ширины пробела
        let totalWidth = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // Двойной пробел (и более) имеет ширину 5 модулей (3+2) без letter spacing между пробелами
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // Если предыдущий символ тоже пробел, то этот пробел = 2 модуля и БЕЗ letter spacing перед ним
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * this.params.moduleSize;
                        addSpacing = false; // Не добавляем spacing между пробелами
                    } else {
                        charWidth = 3 * this.params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            // Убрать последний отступ (если последний символ не пробел после пробела)
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            totalWidth = Math.max(totalWidth, lineWidth);
        }
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        // Начальная позиция по вертикали (центрирование)
        const startY = (canvasH - totalHeight) / 2;
        
        // Выравнивание текста
        const textAlign = this.params.textAlign || 'center';
        
        // Отрисовать каждую строку
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            // Вычислить ширину строки с учетом разной ширины пробела
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // Двойной пробел (и более) имеет ширину 5 модулей (3+2) без letter spacing между пробелами
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // Если предыдущий символ тоже пробел, то этот пробел = 2 модуля и БЕЗ letter spacing перед ним
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * this.params.moduleSize;
                        addSpacing = false; // Не добавляем spacing между пробелами
                    } else {
                        charWidth = 3 * this.params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            // Убрать последний отступ (если последний символ не пробел после пробела)
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            
            // Вычислить позицию строки в зависимости от выравнивания
            let lineX;
            if (textAlign === 'left') {
                lineX = (canvasW - totalWidth) / 2;
            } else if (textAlign === 'right') {
                lineX = (canvasW + totalWidth) / 2 - lineWidth;
            } else { // center
                lineX = (canvasW - lineWidth) / 2;
            }
            
            const lineY = startY + lineIndex * (letterH + this.params.lineHeight);
            
            // Отрисовать каждую букву в строке
            let currentX = lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                // Двойной пробел (и более) имеет ширину 5 модулей (3+2) без letter spacing между пробелами
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // Если предыдущий символ тоже пробел, то этот пробел = 2 модуля и БЕЗ letter spacing перед ним
                    if (charIndex > 0 && line[charIndex - 1] === ' ') {
                        charWidth = 2 * this.params.moduleSize;
                        addSpacing = false; // Не добавляем spacing между пробелами
                    } else {
                        charWidth = 3 * this.params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                
                this.drawLetter(char, currentX, lineY, lineIndex, charIndex);
                currentX += charWidth + (addSpacing ? this.params.letterSpacing : 0);
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
        
        // Разбить текст на строки и удалить пробелы в начале и конце каждой строки
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        
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
        
        this.ctx.strokeStyle = this.params.gridColor || '#333333';
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
        // Определяем, использовать ли альтернативу
        let alternativeIndex = null;
        const cacheKey = lineIndex !== null && charIndex !== null ? `${lineIndex}_${charIndex}` : null;
        
        if (cacheKey && this.alternativeGlyphCache.hasOwnProperty(cacheKey)) {
            // Буква зафиксирована в кэше - используем её альтернативу
            alternativeIndex = this.alternativeGlyphCache[cacheKey];
        } else if (this.params.mode === 'random' && this.params.useAlternativesInRandom && cacheKey) {
            // В режиме Random с включенными альтернативами - генерируем случайную альтернативу один раз
            // и сохраняем её в кэш для стабильности между рендерами
            const charUpper = char.toUpperCase();
            const alternatives = VOID_ALPHABET_ALTERNATIVES[charUpper];
            if (alternatives && alternatives.length > 0) {
                // Генерируем случайный индекс (0 = базовый, 1+ = альтернативы)
                const baseGlyph = VOID_ALPHABET[charUpper] || VOID_ALPHABET[" "];
                const allGlyphs = [baseGlyph, ...alternatives];
                const randomIndex = Math.floor(Math.random() * allGlyphs.length);
                // Сохраняем в кэш
                this.alternativeGlyphCache[cacheKey] = randomIndex;
                alternativeIndex = randomIndex;
            }
        }
        
        const glyphCode = getGlyph(char, {
            alternativeIndex: alternativeIndex
        });
        
        const moduleW = this.params.moduleSize;
        const moduleH = this.params.moduleSize;
        // Пробел имеет ширину 3 модуля вместо 5
        const letterCols = char === ' ' ? 3 : this.cols;
        const letterW = letterCols * moduleW;
        const letterH = this.rows * moduleH;
        
        // Проверяем, наведена ли мышь на эту букву (для эффекта прозрачности)
        const isHovered = this.hoveredLetter && 
            this.hoveredLetter.lineIndex === lineIndex && 
            this.hoveredLetter.charIndex === charIndex;
        
        // Сохраняем текущий globalAlpha
        const originalAlpha = this.ctx.globalAlpha;
        if (isHovered) {
            this.ctx.globalAlpha = 0.8;
        }
        
        // Базовое значение stem для окружностей (используется если модуль не найден)
        const baseStem = this.params.stem;
        
        // Определяем, нужно ли применять roundedCaps только к концевым модулям
        const shouldUseRounded = this.params.mode === 'random' 
            ? (this.params.randomRounded || false)
            : (this.params.roundedCaps || false);
        
        // В режиме Random использовать randomCloseEnds, иначе closeEnds
        const shouldUseCloseEnds = this.params.mode === 'random'
            ? (this.params.randomCloseEnds || false)
            : (this.params.closeEnds || false);
        
        // Нужны endpoints если включен Round ИЛИ Close Ends
        const shouldUseEndpoints = shouldUseRounded || shouldUseCloseEnds;
        
        // Анализируем глиф для определения endpoints (если нужны для Round или Close Ends)
        let endpointMap = null; // Карта: "i_j" -> {top, right, bottom, left}
        if (shouldUseEndpoints) {
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.rows);
                endpointMap = {};
                // Создаем карту модулей с endpoints, указывая стороны
                analysis.endpoints.forEach(ep => {
                    const key = `${ep.col}_${ep.row}`;
                    if (!endpointMap[key]) {
                        endpointMap[key] = { top: false, right: false, bottom: false, left: false };
                    }
                    endpointMap[key][ep.side] = true;
                });
            } catch (error) {
                console.error('Error analyzing glyph for endpoints:', error);
            }
        }
        
        // Отрисовать каждый модуль в сетке 5×5 (или 3×5 для пробела)
        for (let i = 0; i < letterCols; i++) {
            for (let j = 0; j < this.rows; j++) {
                const index = (i + j * this.cols) * 2;
                const moduleType = glyphCode.charAt(index);
                const rotation = parseInt(glyphCode.charAt(index + 1));
                
                const moduleX = x + i * moduleW;
                const moduleY = y + j * moduleH;
                
                // Для random mode генерируем случайные значения для каждого модуля
                let stem = baseStem;
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
                
                // Временно обновить параметры в moduleDrawer для этого модуля
                const originalStrokeGapRatio = this.moduleDrawer.strokeGapRatio;
                const originalDashLength = this.moduleDrawer.dashLength;
                const originalGapLength = this.moduleDrawer.gapLength;
                const originalMode = this.moduleDrawer.mode;
                let moduleUseDash = false;
                
                if (this.params.mode === 'random') {
                    this.moduleDrawer.strokeGapRatio = strokeGapRatio;
                    // Применяем dashLength и gapLength из randomValues
                    const cacheKey = this.params.randomModeType === 'full' && lineIndex !== null && charIndex !== null
                        ? `${lineIndex}_${charIndex}_${i}_${j}` 
                        : null;
                    const randomValues = this.getRandomModuleValues(moduleType, cacheKey);
                    this.moduleDrawer.dashLength = randomValues.dashLength;
                    this.moduleDrawer.gapLength = randomValues.gapLength;
                    moduleUseDash = randomValues.useDash || false;
                    
                    // Если модуль должен использовать dash, временно меняем режим на 'sd'
                    if (moduleUseDash) {
                        this.moduleDrawer.mode = 'sd';
                    }
                }
                
                // Устанавливаем endpoints для модуля
                const moduleKey = `${i}_${j}`;
                const endpointSides = endpointMap && endpointMap[moduleKey];
                const hasEndpoints = endpointSides ? true : false;
                const originalRoundedCaps = this.moduleDrawer.roundedCaps;
                const originalEndpointSides = this.moduleDrawer.endpointSides;
                
                // endpointSides нужен для Round и Close Ends
                if (shouldUseEndpoints) {
                    this.moduleDrawer.endpointSides = endpointSides || null;
                }
                
                // roundedCaps управляет скруглением концов линий
                if (shouldUseRounded) {
                    // В dash/sd mode: скругление для всех модулей, укорачивание только для концевых
                    // В solid/stripes: скругление и укорачивание только для концевых
                    // Для random mode с dash используем sd логику
                    const isDashMode = this.params.mode === 'dash' || this.params.mode === 'sd' || moduleUseDash;
                    this.moduleDrawer.roundedCaps = isDashMode ? true : hasEndpoints;
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
                
                // Восстановить оригинальные значения
                if (this.params.mode === 'random') {
                    this.moduleDrawer.strokeGapRatio = originalStrokeGapRatio;
                    this.moduleDrawer.dashLength = originalDashLength;
                    this.moduleDrawer.gapLength = originalGapLength;
                    this.moduleDrawer.mode = originalMode;
                }
                if (shouldUseEndpoints) {
                    this.moduleDrawer.endpointSides = originalEndpointSides;
                }
                if (shouldUseRounded) {
                    this.moduleDrawer.roundedCaps = originalRoundedCaps;
                }
            }
        }
        
        // Восстанавливаем globalAlpha
        this.ctx.globalAlpha = originalAlpha;
        
        // Отрисовать концевые точки и стыки (если включено)
        if (this.params.showEndpoints) {
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.rows);
                this.endpointDetector.renderPoints(
                    this.ctx, 
                    analysis.connections, 
                    analysis.endpoints, 
                    moduleW,
                    x,
                    y,
                    this.params.color,      // Letter Color
                    this.params.bgColor     // Background Color
                );
                
                // Отрисовать окружности на концевых точках (Test режим)
                if (this.params.showTestCircles) {
                    this.renderTestCircles(glyphCode, letterCols, analysis.endpoints, moduleW, x, y, baseStem);
                }
            } catch (error) {
                console.error('Error rendering endpoints:', error);
            }
        } else if (this.params.showTestCircles) {
            // Если только Test включен, но не Endpoints, все равно анализируем и рисуем окружности
            try {
                const analysis = this.endpointDetector.analyzeGlyph(glyphCode, letterCols, this.rows);
                this.renderTestCircles(glyphCode, letterCols, analysis.endpoints, moduleW, x, y, baseStem);
            } catch (error) {
                console.error('Error rendering test circles:', error);
            }
        }
    }

    /**
     * Отрисовать окружности на концевых точках (Test режим)
     */
    renderTestCircles(glyphCode, letterCols, endpoints, moduleW, x, y, stem) {
        if (!endpoints || endpoints.length === 0) return;
        
        // Создаем сетку модулей для получения типа и поворота
        const grid = [];
        for (let row = 0; row < this.rows; row++) {
            grid[row] = [];
            for (let col = 0; col < letterCols; col++) {
                const index = (row * letterCols + col) * 2;
                if (index < glyphCode.length) {
                    const type = glyphCode.charAt(index);
                    const rotation = parseInt(glyphCode.charAt(index + 1));
                    grid[row][col] = { type, rotation };
                } else {
                    grid[row][col] = { type: 'E', rotation: 0 };
                }
            }
        }
        
        this.ctx.save();
        this.ctx.strokeStyle = this.params.color || '#ffffff';
        this.ctx.fillStyle = 'transparent';
        this.ctx.lineWidth = 1;
        
        endpoints.forEach(ep => {
            try {
                const module = grid[ep.row] && grid[ep.row][ep.col];
                if (!module || module.type === 'E') return;
                
                // Получаем координаты точки на кривой относительно начала модуля
                const point = this.endpointDetector.getLineEndPointCoordinates(
                    module.type,
                    module.rotation,
                    ep.side,
                    moduleW,
                    stem
                );
                
                // Проверяем, что координаты были вычислены (не остались 0,0)
                if (!point || (point.x === 0 && point.y === 0 && module.type !== 'C')) {
                    // Fallback: используем координаты на стороне модуля
                    const fallbackPoint = this.endpointDetector.getPointCoordinates(ep.col, ep.row, ep.side, moduleW);
                    const moduleX = x + ep.col * moduleW;
                    const moduleY = y + ep.row * moduleW;
                    const relativeX = fallbackPoint.x - (ep.col * moduleW);
                    const relativeY = fallbackPoint.y - (ep.row * moduleW);
                    
                    const radius = stem / 4;
                    this.ctx.beginPath();
                    this.ctx.arc(moduleX + relativeX, moduleY + relativeY, radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    return;
                }
                
                // Координаты точки относительно модуля, преобразуем в координаты относительно буквы
                const moduleX = x + ep.col * moduleW;
                const moduleY = y + ep.row * moduleW;
                
                // Рисуем окружность диаметром = stem / 2 (толщина линии)
                // В ModuleDrawer lineWidth = stem / 2, поэтому диаметр окружности = stem / 2
                const radius = stem / 4;
                this.ctx.beginPath();
                this.ctx.arc(moduleX + point.x, moduleY + point.y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            } catch (error) {
                console.error('Error rendering test circle:', error, ep);
            }
        });
        
        this.ctx.restore();
    }

    /**
     * Ресайз canvas
     */
    resize() {
        this.setupCanvas();
        this.render();
    }

    /**
     * Определить позицию буквы по координатам клика
     * @param {number} clickX - координата X клика
     * @param {number} clickY - координата Y клика
     * @returns {Object|null} - объект с lineIndex, charIndex, char или null если клик не попал в букву
     */
    getLetterPositionAt(clickX, clickY) {
        const text = this.params.text;
        if (!text) return null;
        
        // Убеждаемся, что размеры canvas установлены
        if (this.canvasWidth === 0 || this.canvasHeight === 0) {
            const rect = this.canvas.getBoundingClientRect();
            this.canvasWidth = rect.width;
            this.canvasHeight = rect.height;
        }
        
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        const moduleW = this.params.moduleSize;
        const moduleH = this.params.moduleSize;
        const letterW = this.cols * moduleW;
        const letterH = this.rows * moduleH;
        
        // Вычислить общие размеры блока текста
        let totalWidth = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * moduleW;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * moduleW;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            totalWidth = Math.max(totalWidth, lineWidth);
        }
        const totalHeight = lines.length * (letterH + this.params.lineHeight) - this.params.lineHeight;
        
        const startY = (this.canvasHeight - totalHeight) / 2;
        const textAlign = this.params.textAlign || 'center';
        
        // Проверяем каждую строку
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * moduleW;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * moduleW;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= this.params.letterSpacing;
            }
            
            let lineX;
            if (textAlign === 'left') {
                lineX = (this.canvasWidth - totalWidth) / 2;
            } else if (textAlign === 'right') {
                lineX = (this.canvasWidth + totalWidth) / 2 - lineWidth;
            } else {
                lineX = (this.canvasWidth - lineWidth) / 2;
            }
            
            const lineY = startY + lineIndex * (letterH + this.params.lineHeight);
            
            // Проверяем каждую букву в строке
            let currentX = lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    if (charIndex > 0 && line[charIndex - 1] === ' ') {
                        charWidth = 2 * moduleW;
                        addSpacing = false;
                    } else {
                        charWidth = 3 * moduleW;
                    }
                } else {
                    charWidth = letterW;
                }
                
                // Проверяем попадание клика в эту букву
                if (clickX >= currentX && clickX < currentX + charWidth &&
                    clickY >= lineY && clickY < lineY + letterH) {
                    return { lineIndex, charIndex, char };
                }
                
                currentX += charWidth + (addSpacing ? this.params.letterSpacing : 0);
            }
        }
        
        return null;
    }

    /**
     * Переключить альтернативу для буквы
     * @param {number} lineIndex - индекс строки
     * @param {number} charIndex - индекс символа в строке
     * @returns {boolean} - true если альтернатива была переключена, false если у символа нет альтернатив
     */
    toggleLetterAlternative(lineIndex, charIndex) {
        const text = this.params.text;
        if (!text) return false;
        
        const lines = text.split('\n').map(line => line.replace(/^\s+|\s+$/g, ''));
        if (lineIndex < 0 || lineIndex >= lines.length) return false;
        
        const line = lines[lineIndex];
        if (charIndex < 0 || charIndex >= line.length) return false;
        
        const char = line[charIndex].toUpperCase();
        
        // Проверяем, есть ли альтернативы для этого символа
        const alternatives = VOID_ALPHABET_ALTERNATIVES[char];
        if (!alternatives || !alternatives.length) return false;
        
        const cacheKey = `${lineIndex}_${charIndex}`;
        
        // Определяем текущий индекс альтернативы
        // Если буква не зафиксирована в кэше, значит используется базовый глиф (индекс 0)
        const currentIndex = this.alternativeGlyphCache.hasOwnProperty(cacheKey) 
            ? this.alternativeGlyphCache[cacheKey] 
            : 0;
        
        // Переключаем на следующую альтернативу по порядку (0 -> 1 -> 2 -> ... -> max -> 0)
        const maxIndex = alternatives.length; // 0 = базовый, 1..max = альтернативы
        const nextIndex = (currentIndex + 1) % (maxIndex + 1);
        
        // Сохраняем следующий индекс в кэш
        if (nextIndex === 0) {
            // Если возвращаемся к базовому, удаляем из кэша (чтобы использовать базовый глиф напрямую)
            delete this.alternativeGlyphCache[cacheKey];
        } else {
            // Сохраняем индекс альтернативы (1, 2, 3, ...)
            this.alternativeGlyphCache[cacheKey] = nextIndex;
        }
        
        return true;
    }

    /**
     * Установить букву под курсором (для эффекта прозрачности)
     * @param {Object|null} position - {lineIndex, charIndex} или null
     */
    setHoveredLetter(position) {
        this.hoveredLetter = position;
    }
}

