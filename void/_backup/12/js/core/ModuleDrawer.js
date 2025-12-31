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
     * @param {CanvasGradient|string} fillStyle - цвет или градиент для заливки
     */
    drawModule(ctx, type, rotation, x, y, w, h, stem, color, customStrokesNum = null, fillStyle = null) {
        const angle = rotation * Math.PI / 2;
        
        // Для random mode используем stripes mode с кастомными параметрами
        const originalMode = this.mode;
        const originalStrokesNum = this.strokesNum;
        
        if (customStrokesNum !== null) {
            this.mode = 'stripes';
            this.strokesNum = customStrokesNum;
        }
        
        ctx.save();
        // Используем переданный fillStyle или цвет по умолчанию
        ctx.fillStyle = fillStyle || color;
        ctx.strokeStyle = fillStyle || color;
        
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
        
        ctx.restore();
    }

    /**
     * C — Central: вертикальная линия по центру
     */
    drawCentral(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
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
        
        ctx.restore();
    }

    /**
     * J — Joint: Т-образное соединение
     */
    drawJoint(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        if (this.mode === 'fill') {
            // Вертикальная линия слева со скруглением
            this.fillRoundedRect(ctx, -w / 2, -h / 2, stem / 2, h, this.cornerRadius);
            // Горизонтальная линия по центру со скруглением
            this.fillRoundedRect(ctx, -w / 2, -stem / 4, w, stem / 2, this.cornerRadius);
        } else {
            // Stripes для вертикали
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            let shift = 0;
            for (let i = 0; i < this.strokesNum; i++) {
                this.fillRoundedRect(ctx, shift - w / 2, -h / 2, strokeWidth, h, this.cornerRadius);
                shift += strokeWidth + gap;
            }
            // Stripes для горизонтали (по центру)
            const lineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
            shift = -lineWidth / 2;
            for (let i = 0; i < this.strokesNum; i++) {
                this.fillRoundedRect(ctx, -w / 2, shift, w, strokeWidth, this.cornerRadius);
                shift += strokeWidth + gap;
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
        
        if (this.mode === 'fill') {
            // Вертикальная линия слева со скруглением
            this.fillRoundedRect(ctx, -w / 2, -h / 2, stem / 2, h, this.cornerRadius);
            // Горизонтальная линия снизу со скруглением
            this.fillRoundedRect(ctx, -w / 2, h / 2 - stem / 2, w, stem / 2, this.cornerRadius);
        } else {
            // Stripes для вертикали
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            let shift = 0;
            for (let i = 0; i < this.strokesNum; i++) {
                this.fillRoundedRect(ctx, shift - w / 2, -h / 2, strokeWidth, h, this.cornerRadius);
                shift += strokeWidth + gap;
            }
            // Stripes для горизонтали (снизу)
            shift = h / 2 - stem / 2;
            for (let i = 0; i < this.strokesNum; i++) {
                this.fillRoundedRect(ctx, -w / 2, shift, w, strokeWidth, this.cornerRadius);
                shift += strokeWidth + gap;
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
        
        ctx.restore();
    }
}

