/**
 * ModuleDrawer - отрисовка базовых модулей шрифта Void
 * 
 * Поддерживает два режима:
 * - Fill: сплошная заливка (modules_fill.pde)
 * - Stripes: полоски с промежутками (modules_stripes.pde)
 */

export class ModuleDrawer {
    constructor(mode = 'fill') {
        this.mode = mode; // 'fill' или 'stripes'
        this.strokesNum = 2; // количество полосок для stripes mode
        this.strokeGapRatio = 1.0; // отношение толщины штриха к промежутку
        this.cornerRadius = 0; // радиус скругления углов (в пикселях)
        this.renderMethod = 'stroke'; // 'fill' или 'stroke'
        this.roundedCaps = false; // скругления на концах линий в режиме Stroke (Rounded)
        this.dashLength = 0.10; // длина штриха для dash mode (множитель от stem)
        this.gapLength = 0.30; // длина промежутка для dash mode (множитель от stem)
    }

    /**
     * Установить режим отрисовки
     */
    setMode(mode) {
        this.mode = mode;
    }

    /**
     * Установить параметры для stripes mode
     */
    setStripesParams(strokesNum, strokeGapRatio) {
        this.strokesNum = strokesNum;
        this.strokeGapRatio = strokeGapRatio;
    }

    /**
     * Установить радиус скругления углов
     */
    setCornerRadius(radius) {
        this.cornerRadius = radius;
    }

    /**
     * Установить метод отрисовки
     */
    setRenderMethod(method) {
        this.renderMethod = method || 'stroke';
    }

    /**
     * Установить скругления на концах линий (для режима Stroke)
     */
    setRoundedCaps(enabled) {
        this.roundedCaps = enabled || false;
    }

    /**
     * Установить параметры для dash mode
     */
    setDashParams(dashLength, gapLength) {
        this.dashLength = dashLength;
        this.gapLength = gapLength;
    }

    /**
     * Вычислить адаптивный Gap для режима Dash
     * Линия начинается и заканчивается штрихом длиной dashLength
     * @param {number} lineLength - длина линии в пикселях
     * @param {number} dashLength - длина штриха в пикселях
     * @param {number} gapLength - начальная длина промежутка (используется для оценки)
     * @returns {Object} {dashLength, gapLength, numDashes} - адаптивные параметры
     */
    calculateAdaptiveDash(lineLength, dashLength, gapLength) {
        // Минимум один штрих
        if (lineLength <= dashLength) {
            return { dashLength: lineLength, gapLength: 0, numDashes: 1 };
        }

        // Оценочное количество штрихов на основе оригинального gap
        // Формула: n*dashLength + (n-1)*gapLength = lineLength
        // n = (lineLength + gapLength) / (dashLength + gapLength)
        let numDashes = Math.round((lineLength + gapLength) / (dashLength + gapLength));
        
        // Минимум 2 штриха (начало и конец)
        if (numDashes < 2) {
            numDashes = 2;
        }

        // Вычисляем адаптивный gap
        // lineLength = n*dashLength + (n-1)*gap
        // gap = (lineLength - n*dashLength) / (n-1)
        const adaptiveGap = (lineLength - numDashes * dashLength) / (numDashes - 1);

        // Если gap получился отрицательным, уменьшаем количество штрихов
        if (adaptiveGap < 0 && numDashes > 1) {
            numDashes = Math.floor(lineLength / dashLength);
            if (numDashes < 1) numDashes = 1;
            const newGap = numDashes > 1 ? (lineLength - numDashes * dashLength) / (numDashes - 1) : 0;
            return { dashLength, gapLength: Math.max(0, newGap), numDashes };
        }

        return { dashLength, gapLength: Math.max(0, adaptiveGap), numDashes };
    }

    /**
     * Вспомогательная функция для рисования скругленного прямоугольника
     */
    fillRoundedRect(ctx, x, y, width, height, radius) {
        if (radius <= 0) {
            ctx.fillRect(x, y, width, height);
            return;
        }
        
        // Ограничиваем радиус половиной меньшей стороны
        const maxRadius = Math.min(width, height) / 2;
        const r = Math.min(radius, maxRadius);
        
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Вычислить gap и strokeWidth на основе общей ширины
     * @param {number} totalWidth - общая ширина для размещения штрихов
     * @returns {Object} {gap, strokeWidth}
     */
    calculateGapAndStrokeWidth(totalWidth) {
        // gap = totalWidth / (strokesNum * (strokeGapRatio + 1) - 1)
        const gap = totalWidth / (this.strokesNum * (this.strokeGapRatio + 1) - 1);
        const strokeWidth = gap * this.strokeGapRatio;
        return { gap, strokeWidth };
    }

    /**
     * Отрисовать модуль по коду
     * @param {number} customStrokesNum - кастомное количество полосок (для random mode)
     */
    drawModule(ctx, type, rotation, x, y, w, h, stem, color, customStrokesNum = null) {
        const angle = rotation * Math.PI / 2;
        
        // Для random mode используем stripes mode с кастомными параметрами
        const originalMode = this.mode;
        const originalStrokesNum = this.strokesNum;
        
        if (customStrokesNum !== null) {
            this.mode = 'stripes';
            this.strokesNum = customStrokesNum;
        }
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        
        switch (type) {
            case 'S':
                this.drawStraight(ctx, x, y, w, h, angle, stem);
                break;
            case 'C':
                this.drawCentral(ctx, x, y, w, h, angle, stem);
                break;
            case 'J':
                this.drawJoint(ctx, x, y, w, h, angle, stem);
                break;
            case 'L':
                this.drawLink(ctx, x, y, w, h, angle, stem);
                break;
            case 'R':
                this.drawRound(ctx, x, y, w, h, angle, stem);
                break;
            case 'B':
                this.drawBend(ctx, x, y, w, h, angle, stem);
                break;
            case 'E':
                // Empty - ничего не рисуем
                break;
        }
        
        // Восстанавливаем оригинальные значения
        if (customStrokesNum !== null) {
            this.mode = originalMode;
            this.strokesNum = originalStrokesNum;
        }
        
        ctx.restore();
    }

    /**
     * S — Straight: вертикальная линия слева
     */
    drawStraight(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        if (this.renderMethod === 'stroke') {
            // Stroke method: рисуем линии с обводкой
            if (this.mode === 'fill') {
                // Одна вертикальная линия
                // Центр линии: -w/2 + stem/4 (чтобы визуальный центр толщины совпадал с fill mode)
                const lineX = -w / 2 + stem / 4;
                const lineWidth = stem / 2;
                
                ctx.lineWidth = lineWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                ctx.setLineDash([]); // Сброс dash для solid
                
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, h / 2);
                ctx.stroke();
            } else if (this.mode === 'stripes') {
                // Stripes mode: несколько параллельных линий
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                const startX = -w / 2 + strokeWidth / 2;
                
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                ctx.setLineDash([]); // Сброс dash для stripes
                
                for (let i = 0; i < this.strokesNum; i++) {
                    const lineX = startX + i * (strokeWidth + gap);
                    ctx.beginPath();
                    ctx.moveTo(lineX, -h / 2);
                    ctx.lineTo(lineX, h / 2);
                    ctx.stroke();
                }
            } else if (this.mode === 'dash') {
                // Dash mode: одна пунктирная линия с адаптивным gap
                const lineX = -w / 2 + stem / 4;
                const lineWidth = stem / 2;
                
                ctx.lineWidth = lineWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                // Вычисляем адаптивный dash и gap
                const lineLength = h; // Длина вертикальной линии
                const dashPx = stem * this.dashLength;
                const gapPx = stem * this.gapLength;
                const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
                
                ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, h / 2);
                ctx.stroke();
                
                ctx.setLineDash([]); // Сброс после рисования
            }
        } else {
            // Fill method (оригинальный способ)
            if (this.mode === 'fill') {
                // Сплошная заливка со скруглением
                this.fillRoundedRect(ctx, -w / 2, -h / 2, stem / 2, h, this.cornerRadius);
            } else {
                // Stripes mode
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                let shift = 0;
                for (let i = 0; i < this.strokesNum; i++) {
                    this.fillRoundedRect(ctx, shift - w / 2, -h / 2, strokeWidth, h, this.cornerRadius);
                    shift += strokeWidth + gap;
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * C — Central: вертикальная линия по центру
     */
    drawCentral(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        if (this.renderMethod === 'stroke') {
            // Stroke method: рисуем линии с обводкой
            if (this.mode === 'fill') {
                // Одна вертикальная линия строго по центру
                const lineX = 0; // Центр модуля
                const lineWidth = stem / 2;
                
                ctx.lineWidth = lineWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                ctx.setLineDash([]); // Сброс dash для solid
                
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, h / 2);
                ctx.stroke();
            } else if (this.mode === 'stripes') {
                // Stripes mode: несколько параллельных линий, центрированных
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                const totalLineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
                const startX = -totalLineWidth / 2 + strokeWidth / 2; // Центр первой линии
                
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                ctx.setLineDash([]); // Сброс dash для stripes
                
                for (let i = 0; i < this.strokesNum; i++) {
                    const lineX = startX + i * (strokeWidth + gap);
                    ctx.beginPath();
                    ctx.moveTo(lineX, -h / 2);
                    ctx.lineTo(lineX, h / 2);
                    ctx.stroke();
                }
            } else if (this.mode === 'dash') {
                // Dash mode: одна пунктирная линия по центру с адаптивным gap
                const lineX = 0;
                const lineWidth = stem / 2;
                
                ctx.lineWidth = lineWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                // Вычисляем адаптивный dash и gap
                const lineLength = h; // Длина вертикальной линии
                const dashPx = stem * this.dashLength;
                const gapPx = stem * this.gapLength;
                const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
                
                ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, h / 2);
                ctx.stroke();
                
                ctx.setLineDash([]); // Сброс после рисования
            }
        } else {
            // Fill method (оригинальный способ)
            if (this.mode === 'fill') {
                // Сплошная заливка по центру со скруглением
                this.fillRoundedRect(ctx, -stem / 4, -h / 2, stem / 2, h, this.cornerRadius);
            } else {
                // Stripes mode по центру
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                const lineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
                let shift = -lineWidth / 2;
                for (let i = 0; i < this.strokesNum; i++) {
                    this.fillRoundedRect(ctx, shift, -h / 2, strokeWidth, h, this.cornerRadius);
                    shift += strokeWidth + gap;
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * J — Joint: Т-образное соединение
     */
    drawJoint(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        if (this.renderMethod === 'stroke') {
            // Stroke method: рисуем линии с обводкой
            const lineWidth = stem / 2;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.lineJoin = this.roundedCaps ? 'round' : 'miter'; // Для соединения линий
            
            if (this.mode === 'fill') {
                // Вертикальная линия слева
                const vertLineX = -w / 2 + stem / 4;
                
                // Горизонтальная линия по центру
                const horizLineY = 0; // Центр модуля
                
                ctx.setLineDash([]); // Сброс dash для solid
                ctx.beginPath();
                // Вертикальная линия
                ctx.moveTo(vertLineX, -h / 2);
                ctx.lineTo(vertLineX, h / 2);
                // Горизонтальная линия
                ctx.moveTo(-w / 2, horizLineY);
                ctx.lineTo(w / 2, horizLineY);
                ctx.stroke();
            } else if (this.mode === 'stripes') {
                // Stripes mode: несколько параллельных линий для каждой части
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                ctx.setLineDash([]); // Сброс dash для stripes
                
                // Рисуем T-образные линии без пересечений
                const vertStartX = -w / 2 + strokeWidth / 2;
                const totalLineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
                const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
                
                // Позиция самой правой вертикальной линии - от нее начинаются горизонтальные
                const lastVertX = vertStartX + (this.strokesNum - 1) * (strokeWidth + gap);
                
                // Сначала все вертикальные линии полной высоты
                for (let i = 0; i < this.strokesNum; i++) {
                    const lineX = vertStartX + i * (strokeWidth + gap);
                    
                    ctx.beginPath();
                    ctx.moveTo(lineX, -h / 2);
                    ctx.lineTo(lineX, h / 2);
                    ctx.stroke();
                }
                
                // Затем все горизонтальные линии от самой правой вертикальной
                for (let i = 0; i < this.strokesNum; i++) {
                    const lineY = horizStartY + i * (strokeWidth + gap);
                    
                    ctx.beginPath();
                    ctx.moveTo(lastVertX, lineY);
                    ctx.lineTo(w / 2, lineY);
                    ctx.stroke();
                }
            } else if (this.mode === 'dash') {
                // Dash mode: T-образное соединение с адаптивным пунктиром
                const vertLineX = -w / 2 + stem / 4;
                const horizLineY = 0;
                
                const dashPx = stem * this.dashLength;
                const gapPx = stem * this.gapLength;
                
                // Вертикальная линия
                const vertLength = h;
                const vertAdaptive = this.calculateAdaptiveDash(vertLength, dashPx, gapPx);
                
                ctx.setLineDash([vertAdaptive.dashLength, vertAdaptive.gapLength]);
                ctx.beginPath();
                ctx.moveTo(vertLineX, -h / 2);
                ctx.lineTo(vertLineX, h / 2);
                ctx.stroke();
                
                // Горизонтальная линия
                const horizLength = w;
                const horizAdaptive = this.calculateAdaptiveDash(horizLength, dashPx, gapPx);
                
                ctx.setLineDash([horizAdaptive.dashLength, horizAdaptive.gapLength]);
                ctx.beginPath();
                ctx.moveTo(-w / 2, horizLineY);
                ctx.lineTo(w / 2, horizLineY);
                ctx.stroke();
                
                ctx.setLineDash([]); // Сброс после рисования
            }
        } else {
            // Fill method (оригинальный способ)
            if (this.mode === 'fill') {
                // Вертикальная линия слева (полная высота)
                this.fillRoundedRect(ctx, -w / 2, -h / 2, stem / 2, h, this.cornerRadius);
                // Горизонтальная линия: от вертикальной до правого края, центрирована
                const horizStartX = -w / 2 + stem / 2;
                const horizWidth = w - stem / 2;
                this.fillRoundedRect(ctx, horizStartX, -stem / 4, horizWidth, stem / 2, this.cornerRadius);
            } else {
                // Stripes для вертикали (полная высота)
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                let shiftX = 0;
                for (let i = 0; i < this.strokesNum; i++) {
                    this.fillRoundedRect(ctx, shiftX - w / 2, -h / 2, strokeWidth, h, this.cornerRadius);
                    shiftX += strokeWidth + gap;
                }
                // Stripes для горизонтали: от последней вертикальной до правого края
                const horizStartX = -w / 2 + totalWidth;
                const horizWidth = w - totalWidth;
                const totalLineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
                let shiftY = -totalLineWidth / 2;
                for (let i = 0; i < this.strokesNum; i++) {
                    this.fillRoundedRect(ctx, horizStartX, shiftY, horizWidth, strokeWidth, this.cornerRadius);
                    shiftY += strokeWidth + gap;
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * L — Link/Corner: L-образное соединение
     */
    drawLink(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        if (this.renderMethod === 'stroke') {
            // Stroke method: рисуем линии с обводкой
            const lineWidth = stem / 2;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.lineJoin = this.roundedCaps ? 'round' : 'miter'; // Для соединения линий
            
            if (this.mode === 'fill') {
                // Вертикальная линия слева
                const vertLineX = -w / 2 + stem / 4;
                
                // Горизонтальная линия снизу
                const horizLineY = h / 2 - stem / 4;
                
                ctx.setLineDash([]); // Сброс dash для solid
                // Рисуем L-образное соединение одним путем для правильного соединения
                ctx.beginPath();
                ctx.moveTo(vertLineX, -h / 2);
                ctx.lineTo(vertLineX, horizLineY);
                ctx.lineTo(w / 2, horizLineY);
                ctx.stroke();
            } else if (this.mode === 'stripes') {
                // Stripes mode: несколько L-образных линий без пересечений
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                ctx.lineJoin = this.roundedCaps ? 'round' : 'miter';
                ctx.setLineDash([]); // Сброс dash для stripes
                
                // Рисуем L-образные линии
                // Первая линия (внутренняя) самая короткая, последняя (внешняя) самая длинная
                const vertStartX = -w / 2 + strokeWidth / 2;
                const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
                
                for (let i = 0; i < this.strokesNum; i++) {
                    const lineX = vertStartX + i * (strokeWidth + gap);
                    
                    // Порядок обратный - первая линия идет до последней горизонтальной позиции
                    const reverseIndex = this.strokesNum - 1 - i;
                    const lineY = horizStartY + reverseIndex * (strokeWidth + gap);
                    
                    ctx.beginPath();
                    // Вертикальная часть: от верха до линии Y
                    ctx.moveTo(lineX, -h / 2);
                    ctx.lineTo(lineX, lineY);
                    // Горизонтальная часть: от линии X до правого края
                    ctx.lineTo(w / 2, lineY);
                    ctx.stroke();
                }
            } else if (this.mode === 'dash') {
                // Dash mode: L-образное соединение с адаптивным пунктиром
                const vertLineX = -w / 2 + stem / 4;
                const horizLineY = h / 2 - stem / 4;
                
                const dashPx = stem * this.dashLength;
                const gapPx = stem * this.gapLength;
                
                // Для L-образного соединения вычисляем общую длину пути
                const vertLength = h / 2 + horizLineY; // От верха до начала горизонтальной части
                const horizLength = w - (-w / 2 - vertLineX); // От вертикальной линии до правого края
                const totalLength = vertLength + horizLength;
                
                // Вычисляем адаптивный dash для всего пути
                const adaptive = this.calculateAdaptiveDash(totalLength, dashPx, gapPx);
                
                ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                
                ctx.beginPath();
                ctx.moveTo(vertLineX, -h / 2);
                ctx.lineTo(vertLineX, horizLineY);
                ctx.lineTo(w / 2, horizLineY);
                ctx.stroke();
                
                ctx.setLineDash([]); // Сброс после рисования
            }
        } else {
            // Fill method: повторяет логику Stroke mode
            if (this.mode === 'fill') {
                // Вертикальный прямоугольник: высота = 1 mod, выравнен по левому верхнему углу
                this.fillRoundedRect(ctx, -w / 2, -h / 2, stem / 2, w, this.cornerRadius);
                // Горизонтальный прямоугольник: ширина = 1 mod, выравнен по правому нижнему углу
                this.fillRoundedRect(ctx, w / 2 - w, h / 2 - stem / 2, w, stem / 2, this.cornerRadius);
            } else {
                // Stripes: L-образные формы "ступеньками"
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                
                for (let i = 0; i < this.strokesNum; i++) {
                    const offset = i * (strokeWidth + gap);
                    
                    // Вертикальная часть: высота уменьшается с каждым шагом
                    const vertX = -w / 2 + offset;
                    const vertY = -h / 2;
                    const vertHeight = w - offset; // Уменьшается!
                    
                    // Горизонтальная часть: ширина уменьшается с каждым шагом
                    const horizX = -w / 2 + offset; // Начинается с той же X, что и вертикальная
                    const horizY = h / 2 - strokeWidth - offset; // Y уменьшается (сдвигается вверх)
                    const horizWidth = w - offset; // Уменьшается!
                    
                    // Рисуем вертикальный прямоугольник
                    this.fillRoundedRect(ctx, vertX, vertY, strokeWidth, vertHeight, this.cornerRadius);
                    // Рисуем горизонтальный прямоугольник
                    this.fillRoundedRect(ctx, horizX, horizY, horizWidth, strokeWidth, this.cornerRadius);
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * R — Round: плавная дуга (радиус = размер модуля)
     * В Processing arc() использует ДИАМЕТР, в Canvas — РАДИУС
     * Рисуем кольцевой сектор (arc ring), а не сплошной
     * Processing: arc(w/2, -h/2, w*2-stem, h*2-stem) -> радиус = w - stem/2
     */
    drawRound(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        if (this.renderMethod === 'stroke') {
            // Stroke method: рисуем дуги с обводкой
            const lineWidth = stem / 2;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            if (this.mode === 'fill') {
                // В fill mode: внешний радиус = w, внутренний = w - stem/2
                // Визуальный центр толщины: w - stem/4
                // В stroke mode: радиус дуги = w - stem/4 (чтобы визуальный центр совпадал)
                let arcRadius = w - stem / 4;
                // Защита от отрицательного или слишком маленького радиуса
                // Минимальный радиус должен быть хотя бы равен половине толщины линии
                const minRadius = Math.max(lineWidth / 2, 0.1);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                
                ctx.setLineDash([]); // Сброс dash для solid
                const centerX = w / 2;
                const centerY = -h / 2;
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, arcRadius, Math.PI / 2, Math.PI);
                ctx.stroke();
            } else if (this.mode === 'stripes') {
                // Stripes mode: несколько концентрических дуг
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                
                ctx.lineWidth = strokeWidth;
                ctx.setLineDash([]); // Сброс dash для stripes
                
                // Внешний радиус первой дуги: w - strokeWidth/2
                // Каждая следующая дуга смещается внутрь на (strokeWidth + gap)
                const outerRadius = w - strokeWidth / 2;
                const minRadius = Math.max(strokeWidth / 2, 0.1);
                
                for (let j = 0; j < this.strokesNum; j++) {
                    let arcRadius = outerRadius - j * (strokeWidth + gap);
                    // Защита от отрицательного или слишком маленького радиуса
                    if (arcRadius < minRadius) {
                        arcRadius = minRadius;
                    }
                    if (arcRadius > 0) {
                        ctx.beginPath();
                        ctx.arc(w / 2, -h / 2, arcRadius, Math.PI / 2, Math.PI);
                        ctx.stroke();
                    }
                }
            } else if (this.mode === 'dash') {
                // Dash mode: одна дуга с адаптивным пунктиром
                let arcRadius = w - stem / 4;
                const minRadius = Math.max(lineWidth / 2, 0.1);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                
                const centerX = w / 2;
                const centerY = -h / 2;
                
                const dashPx = stem * this.dashLength;
                const gapPx = stem * this.gapLength;
                
                // Вычисляем длину дуги: L = radius * angle
                // Угол от PI/2 до PI = PI/2 радиан
                const arcLength = arcRadius * (Math.PI / 2);
                const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
                
                ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, arcRadius, Math.PI / 2, Math.PI);
                ctx.stroke();
                
                ctx.setLineDash([]); // Сброс после рисования
            }
        } else {
            // Fill method (оригинальный способ)
            if (this.mode === 'fill') {
                // Внешний радиус = w, внутренний = w - stem/2
                const outerRadius = w;
                const innerRadius = w - stem / 2;
                
                if (innerRadius > 0) {
                    // Рисуем кольцевой сектор одним путем
                    ctx.beginPath();
                    // Внешняя дуга
                    ctx.arc(w / 2, -h / 2, outerRadius, Math.PI / 2, Math.PI);
                    // Линия к началу внутренней дуги
                    ctx.lineTo(
                        w / 2 + innerRadius * Math.cos(Math.PI),
                        -h / 2 + innerRadius * Math.sin(Math.PI)
                    );
                    // Внутренняя дуга (в обратном направлении)
                    ctx.arc(w / 2, -h / 2, innerRadius, Math.PI, Math.PI / 2, true);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Если stem больше радиуса, рисуем сплошной сектор
                    ctx.beginPath();
                    ctx.arc(w / 2, -h / 2, outerRadius, Math.PI / 2, Math.PI);
                    ctx.lineTo(w / 2, -h / 2);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                // Stripes mode - несколько концентрических дуг
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                let shift = 0;
                
                for (let j = 0; j < this.strokesNum; j++) {
                    const R1 = w - shift;
                    const R2 = R1 - strokeWidth;
                    
                    if (R2 > 0) {
                        ctx.beginPath();
                        ctx.arc(w / 2, -h / 2, R1, Math.PI / 2, Math.PI);
                        ctx.arc(w / 2, -h / 2, R2, Math.PI, Math.PI / 2, true);
                        ctx.closePath();
                        ctx.fill();
                    }
                    
                    shift += strokeWidth + gap;
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * B — Bend: крутая дуга (радиус = половина модуля)
     * В Processing: arc(w/2, -h/2, stem, stem, HALF_PI, PI)
     * stem — это ДИАМЕТР, значит радиус = stem/2
     * ВАЖНО: внешний радиус = stem/2 (как в fill mode), а НЕ w/2!
     */
    drawBend(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        if (this.renderMethod === 'stroke') {
            // Stroke method: рисуем дуги с обводкой
            const lineWidth = stem / 2;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            if (this.mode === 'fill') {
                // В fill mode: радиус = stem/2
                // Визуальный центр толщины: stem/4
                // В stroke mode: радиус дуги = stem/4 (чтобы визуальный центр совпадал)
                let arcRadius = stem / 4;
                // Защита от отрицательного или слишком маленького радиуса
                // Минимальный радиус должен быть хотя бы равен половине толщины линии
                const minRadius = Math.max(lineWidth / 2, 0.1);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                
                ctx.setLineDash([]); // Сброс dash для solid
                const centerX = w / 2;
                const centerY = -h / 2;
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, arcRadius, Math.PI / 2, Math.PI);
                ctx.stroke();
            } else if (this.mode === 'stripes') {
                // Stripes mode: несколько концентрических дуг
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                
                ctx.lineWidth = strokeWidth;
                ctx.setLineDash([]); // Сброс dash для stripes
                
                // Внешний радиус первой дуги: stem/2 - strokeWidth/2
                // Каждая следующая дуга смещается внутрь на (strokeWidth + gap)
                const outerRadius = stem / 2 - strokeWidth / 2;
                const minRadius = Math.max(strokeWidth / 2, 0.1);
                
                for (let j = 0; j < this.strokesNum; j++) {
                    let arcRadius = outerRadius - j * (strokeWidth + gap);
                    // Защита от отрицательного или слишком маленького радиуса
                    if (arcRadius < minRadius) {
                        arcRadius = minRadius;
                    }
                    if (arcRadius > 0) {
                        ctx.beginPath();
                        ctx.arc(w / 2, -h / 2, arcRadius, Math.PI / 2, Math.PI);
                        ctx.stroke();
                    }
                }
            } else if (this.mode === 'dash') {
                // Dash mode: одна маленькая дуга с адаптивным пунктиром
                let arcRadius = stem / 4;
                const minRadius = Math.max(lineWidth / 2, 0.1);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                
                const centerX = w / 2;
                const centerY = -h / 2;
                
                const dashPx = stem * this.dashLength;
                const gapPx = stem * this.gapLength;
                
                // Вычисляем длину дуги: L = radius * angle
                // Угол от PI/2 до PI = PI/2 радиан
                const arcLength = arcRadius * (Math.PI / 2);
                const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
                
                ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, arcRadius, Math.PI / 2, Math.PI);
                ctx.stroke();
                
                ctx.setLineDash([]); // Сброс после рисования
            }
        } else {
            // Fill method (оригинальный способ)
            if (this.mode === 'fill') {
                // Маленькая дуга с радиусом stem/2
                ctx.beginPath();
                ctx.arc(w / 2, -h / 2, stem / 2, Math.PI / 2, Math.PI);
                ctx.lineTo(w / 2, -h / 2);
                ctx.closePath();
                ctx.fill();
            } else {
                // Stripes mode
                // КЛЮЧЕВОЕ ОТЛИЧИЕ: начинаем с stem/2 (как в fill mode), а не w/2!
                const totalWidth = stem / 2;
                const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
                let shift = 0;
                
                for (let j = 0; j < this.strokesNum; j++) {
                    const R1 = stem / 2 - shift;
                    const R2 = R1 - strokeWidth;
                    
                    // Изменили проверку с > 0 на >= 0, чтобы рисовать даже самые маленькие дуги
                    if (R2 >= 0 && R1 > 0) {
                        ctx.beginPath();
                        ctx.arc(w / 2, -h / 2, R1, Math.PI / 2, Math.PI);
                        // Если R2 = 0, рисуем линию к центру вместо дуги
                        if (R2 > 0) {
                            ctx.arc(w / 2, -h / 2, R2, Math.PI, Math.PI / 2, true);
                        } else {
                            ctx.lineTo(w / 2, -h / 2);
                        }
                        ctx.closePath();
                        ctx.fill();
                    }
                    
                    shift += strokeWidth + gap;
                }
            }
        }
        
        ctx.restore();
    }
}

