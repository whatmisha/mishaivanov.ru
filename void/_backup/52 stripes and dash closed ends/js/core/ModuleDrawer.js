/**
 * ModuleDrawer - отрисовка базовых модулей шрифта Void
 * 
 * Поддерживает режимы:
 * - fill (Solid): одна линия
 * - stripes: несколько линий с промежутками
 * - dash: пунктирная линия
 * - sd: stripes + dash (несколько пунктирных линий)
 * 
 * Все модули рисуются методом Stroke (линии с обводкой)
 */

export class ModuleDrawer {
    constructor(mode = 'fill') {
        this.mode = mode; // 'fill', 'stripes' или 'dash'
        this.strokesNum = 2; // количество полосок для stripes mode
        this.strokeGapRatio = 1.0; // отношение толщины штриха к промежутку
        this.cornerRadius = 0; // радиус скругления углов (в пикселях)
        this.roundedCaps = false; // скругления на концах линий (Rounded)
        this.dashLength = 0.10; // длина штриха для dash mode (множитель от stem)
        this.gapLength = 0.30; // длина промежутка для dash mode (множитель от stem)
        this.endpointSides = null; // объект {top, right, bottom, left} - стороны с endpoints
        this.closeEnds = false; // закрывающие линии на концах в режиме Stripes
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
     * Установить скругления на концах линий
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
     * Установить закрывающие линии на концах (для режима Stripes)
     */
    setCloseEnds(enabled) {
        this.closeEnds = enabled || false;
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

        // Формула для ПОЛОВИННЫХ концов:
        // lineLength = dashLength/2 + (n-2)*dashLength + dashLength/2 + (n-1)*gap
        // lineLength = (n-1)*dashLength + (n-1)*gap
        // lineLength = (n-1)*(dashLength + gap)
        // n = lineLength/(dashLength + gap) + 1
        let numDashes = Math.round(lineLength / (dashLength + gapLength)) + 1;
        
        // Минимум 2 штриха (начало и конец)
        if (numDashes < 2) {
            numDashes = 2;
        }

        // Вычисляем адаптивный gap для половинных концов:
        // lineLength = (n-1)*(dashLength + gap)
        // gap = lineLength/(n-1) - dashLength
        const adaptiveGap = lineLength / (numDashes - 1) - dashLength;

        // Если gap получился отрицательным, уменьшаем количество штрихов
        if (adaptiveGap < 0 && numDashes > 2) {
            numDashes--;
            const newGap = lineLength / (numDashes - 1) - dashLength;
            return { dashLength, gapLength: Math.max(0, newGap), numDashes };
        }

        return { dashLength, gapLength: Math.max(0, adaptiveGap), numDashes };
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
     * Вспомогательный метод: получить локальные стороны endpoints с учетом поворота
     * @param {number} rotation - поворот модуля (0-3)
     * @returns {Object} {top, right, bottom, left} - локальные стороны с endpoints
     */
    getLocalEndpointSides(rotation) {
        if (!this.endpointSides) return null;
        
        // Преобразуем глобальные стороны в локальные с учетом поворота
        const sides = ['top', 'right', 'bottom', 'left'];
        const local = { top: false, right: false, bottom: false, left: false };
        
        Object.keys(this.endpointSides).forEach(globalSide => {
            if (this.endpointSides[globalSide]) {
                const globalIndex = sides.indexOf(globalSide);
                const localIndex = (globalIndex - rotation + 4) % 4;
                const localSide = sides[localIndex];
                local[localSide] = true;
            }
        });
        
        return local;
    }

    /**
     * S — Straight: вертикальная линия слева
     */
    drawStraight(ctx, x, y, w, h, angle, stem) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(angle);
        
        // Получаем локальные endpoints с учетом поворота
        const rotation = Math.round(angle / (Math.PI / 2)) % 4;
        const localEndpoints = this.getLocalEndpointSides(rotation);
        
        // Укорачивание на 0.5 * stem weight (если включен roundedCaps или closeEnds, и есть endpoints)
        const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        if (this.mode === 'fill') {
            // Solid mode: одна вертикальная линия
            const lineX = -w / 2 + stem / 4;
            const lineWidth = stem / 2;
            
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.moveTo(lineX, -h / 2 + shortenTop);
            ctx.lineTo(lineX, h / 2 - shortenBottom);
            ctx.stroke();
        } else if (this.mode === 'stripes') {
            // Stripes mode: несколько параллельных линий
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            const startX = -w / 2 + strokeWidth / 2;
            
            // Для stripes mode укорачиваем на половину толщины линии (если Round или Close Ends)
            const shouldShortenStripes = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const shortenTopStripes = shouldShortenStripes && localEndpoints.top ? strokeWidth / 2 : 0;
            const shortenBottomStripes = shouldShortenStripes && localEndpoints.bottom ? strokeWidth / 2 : 0;
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.setLineDash([]);
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = startX + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2 + shortenTopStripes);
                ctx.lineTo(lineX, h / 2 - shortenBottomStripes);
                ctx.stroke();
            }
            
            // Закрывающие линии на концах (если включен closeEnds и есть endpoints)
            if (this.closeEnds && localEndpoints) {
                const firstLineX = startX;
                const lastLineX = startX + (this.strokesNum - 1) * (strokeWidth + gap);
                
                ctx.lineCap = 'butt';
                
                if (localEndpoints.top) {
                    const y = -h / 2 + shortenTopStripes;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
                
                if (localEndpoints.bottom) {
                    const y = h / 2 - shortenBottomStripes;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
            }
        } else if (this.mode === 'dash') {
            // Dash mode: одна пунктирная линия с адаптивным gap
            const lineX = -w / 2 + stem / 4;
            const lineWidth = stem / 2;
            
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const lineLength = h - shortenTop - shortenBottom;
            const dashPx = stem * this.dashLength;
            const gapPx = stem * this.gapLength;
            const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
            
            ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
            ctx.lineDashOffset = adaptive.dashLength / 2;
            
            ctx.beginPath();
            ctx.moveTo(lineX, -h / 2 + shortenTop);
            ctx.lineTo(lineX, h / 2 - shortenBottom);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        } else if (this.mode === 'sd') {
            // SD mode: несколько параллельных пунктирных линий
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            const startX = -w / 2 + strokeWidth / 2;
            
            // Для SD mode укорачиваем на половину толщины линии (если Round или Close Ends)
            const shouldShortenSD = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const shortenTopSD = shouldShortenSD && localEndpoints.top ? strokeWidth / 2 : 0;
            const shortenBottomSD = shouldShortenSD && localEndpoints.bottom ? strokeWidth / 2 : 0;
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const lineLength = h - shortenTopSD - shortenBottomSD;
            // В SD mode dash/gap рассчитываются относительно strokeWidth (толщины одной линии)
            const dashPx = strokeWidth * this.dashLength;
            const gapPx = strokeWidth * this.gapLength;
            const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
            
            ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
            ctx.lineDashOffset = adaptive.dashLength / 2;
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = startX + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2 + shortenTopSD);
                ctx.lineTo(lineX, h / 2 - shortenBottomSD);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
            
            // Закрывающие линии на концах (если включен closeEnds и есть endpoints)
            // Close Ends: скругление зависит от состояния Round
            if (this.closeEnds && localEndpoints) {
                const firstLineX = startX;
                const lastLineX = startX + (this.strokesNum - 1) * (strokeWidth + gap);
                const closeLineLength = lastLineX - firstLineX;
                
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                // Закрывающие линии тоже пунктирные в режиме SD
                const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
                ctx.setLineDash([closeAdaptive.dashLength, closeAdaptive.gapLength]);
                ctx.lineDashOffset = closeAdaptive.dashLength / 2;
                
                if (localEndpoints.top) {
                    const y = -h / 2 + shortenTopSD;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
                
                if (localEndpoints.bottom) {
                    const y = h / 2 - shortenBottomSD;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
                
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;
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
        
        // Получаем локальные endpoints с учетом поворота
        const rotation = Math.round(angle / (Math.PI / 2)) % 4;
        const localEndpoints = this.getLocalEndpointSides(rotation);
        
        // Укорачивание на 0.5 * stem weight (если включен roundedCaps или closeEnds, и есть endpoints)
        const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
        const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
        const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
        
        if (this.mode === 'fill') {
            // Solid mode: одна вертикальная линия по центру
            const lineX = 0;
            const lineWidth = stem / 2;
            
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.moveTo(lineX, -h / 2 + shortenTop);
            ctx.lineTo(lineX, h / 2 - shortenBottom);
            ctx.stroke();
        } else if (this.mode === 'stripes') {
            // Stripes mode: несколько параллельных линий, центрированных
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            const totalLineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
            const startX = -totalLineWidth / 2 + strokeWidth / 2;
            
            // Укорачиваем на половину толщины линии (если Round или Close Ends)
            const shouldShortenStripes = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const shortenTopStripes = shouldShortenStripes && localEndpoints.top ? strokeWidth / 2 : 0;
            const shortenBottomStripes = shouldShortenStripes && localEndpoints.bottom ? strokeWidth / 2 : 0;
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.setLineDash([]);
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = startX + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2 + shortenTopStripes);
                ctx.lineTo(lineX, h / 2 - shortenBottomStripes);
                ctx.stroke();
            }
            
            if (this.closeEnds && localEndpoints) {
                const firstLineX = startX;
                const lastLineX = startX + (this.strokesNum - 1) * (strokeWidth + gap);
                
                ctx.lineCap = 'butt';
                
                if (localEndpoints.top) {
                    const y = -h / 2 + shortenTopStripes;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
                
                if (localEndpoints.bottom) {
                    const y = h / 2 - shortenBottomStripes;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
            }
        } else if (this.mode === 'dash') {
            // Dash mode: одна пунктирная линия по центру
            const lineX = 0;
            const lineWidth = stem / 2;
            
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const lineLength = h - shortenTop - shortenBottom;
            const dashPx = stem * this.dashLength;
            const gapPx = stem * this.gapLength;
            const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
            
            ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
            ctx.lineDashOffset = adaptive.dashLength / 2;
            
            ctx.beginPath();
            ctx.moveTo(lineX, -h / 2 + shortenTop);
            ctx.lineTo(lineX, h / 2 - shortenBottom);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        } else if (this.mode === 'sd') {
            // SD mode: несколько параллельных пунктирных линий, центрированных
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            const totalLineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
            const startX = -totalLineWidth / 2 + strokeWidth / 2;
            
            const shortenTopSD = this.roundedCaps && localEndpoints && localEndpoints.top ? strokeWidth / 2 : 0;
            const shortenBottomSD = this.roundedCaps && localEndpoints && localEndpoints.bottom ? strokeWidth / 2 : 0;
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const lineLength = h - shortenTopSD - shortenBottomSD;
            const dashPx = strokeWidth * this.dashLength;
            const gapPx = strokeWidth * this.gapLength;
            const adaptive = this.calculateAdaptiveDash(lineLength, dashPx, gapPx);
            
            ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
            ctx.lineDashOffset = adaptive.dashLength / 2;
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = startX + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2 + shortenTopSD);
                ctx.lineTo(lineX, h / 2 - shortenBottomSD);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
            
            // Close Ends: скругление зависит от состояния Round
            if (this.closeEnds && localEndpoints) {
                const firstLineX = startX;
                const lastLineX = startX + (this.strokesNum - 1) * (strokeWidth + gap);
                const closeLineLength = lastLineX - firstLineX;
                
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                // Закрывающие линии тоже пунктирные в режиме SD
                const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
                ctx.setLineDash([closeAdaptive.dashLength, closeAdaptive.gapLength]);
                ctx.lineDashOffset = closeAdaptive.dashLength / 2;
                
                if (localEndpoints.top) {
                    const y = -h / 2 + shortenTopSD;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
                
                if (localEndpoints.bottom) {
                    const y = h / 2 - shortenBottomSD;
                    ctx.beginPath();
                    ctx.moveTo(firstLineX, y);
                    ctx.lineTo(lastLineX, y);
                    ctx.stroke();
                }
                
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;
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
        
        // Получаем локальные endpoints с учетом поворота
        const rotation = Math.round(angle / (Math.PI / 2)) % 4;
        const localEndpoints = this.getLocalEndpointSides(rotation);
        
        const lineWidth = stem / 2;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        ctx.lineJoin = this.roundedCaps ? 'round' : 'miter';
        
        if (this.mode === 'fill') {
            // Solid mode: T-образное соединение
            const vertLineX = -w / 2 + stem / 4;
            const horizLineY = 0;
            
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(vertLineX, -h / 2);
            ctx.lineTo(vertLineX, h / 2);
            ctx.moveTo(-w / 2, horizLineY);
            ctx.lineTo(w / 2, horizLineY);
            ctx.stroke();
        } else if (this.mode === 'stripes') {
            // Stripes mode
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.setLineDash([]);
            
            const vertStartX = -w / 2 + strokeWidth / 2;
            const totalLineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
            const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
            const lastVertX = vertStartX + (this.strokesNum - 1) * (strokeWidth + gap);
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = vertStartX + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, h / 2);
                ctx.stroke();
            }
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineY = horizStartY + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lastVertX, lineY);
                ctx.lineTo(w / 2, lineY);
                ctx.stroke();
            }
        } else if (this.mode === 'dash') {
            // Dash mode
            ctx.lineWidth = lineWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const vertLineX = -w / 2 + stem / 4;
            const horizLineY = 0;
            
            const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
            const shortenBottom = shouldShorten && localEndpoints.bottom ? stem * 0.25 : 0;
            const shortenRight = shouldShorten && localEndpoints.right ? stem * 0.25 : 0;
            
            const dashPx = stem * this.dashLength;
            const gapPx = stem * this.gapLength;
            
            const vertLength = h - shortenTop - shortenBottom;
            const vertAdaptive = this.calculateAdaptiveDash(vertLength, dashPx, gapPx);
            
            ctx.setLineDash([vertAdaptive.dashLength, vertAdaptive.gapLength]);
            ctx.lineDashOffset = vertAdaptive.dashLength / 2;
            ctx.beginPath();
            ctx.moveTo(vertLineX, -h / 2 + shortenTop);
            ctx.lineTo(vertLineX, h / 2 - shortenBottom);
            ctx.stroke();
            
            const horizStartX = vertLineX;
            const horizEndX = w / 2 - shortenRight;
            const horizLength = horizEndX - horizStartX;
            const horizAdaptive = this.calculateAdaptiveDash(horizLength, dashPx, gapPx);
            
            ctx.setLineDash([horizAdaptive.dashLength, horizAdaptive.gapLength]);
            ctx.lineDashOffset = horizAdaptive.dashLength / 2;
            ctx.beginPath();
            ctx.moveTo(horizStartX, horizLineY);
            ctx.lineTo(horizEndX, horizLineY);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        } else if (this.mode === 'sd') {
            // SD mode: stripes + dash для Joint
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const vertStartX = -w / 2 + strokeWidth / 2;
            const totalLineWidth = (this.strokesNum * strokeWidth) + ((this.strokesNum - 1) * gap);
            const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
            const lastVertX = vertStartX + (this.strokesNum - 1) * (strokeWidth + gap);
            
            const dashPx = strokeWidth * this.dashLength;
            const gapPx = strokeWidth * this.gapLength;
            
            // Вертикальные линии
            const vertAdaptive = this.calculateAdaptiveDash(h, dashPx, gapPx);
            ctx.setLineDash([vertAdaptive.dashLength, vertAdaptive.gapLength]);
            ctx.lineDashOffset = vertAdaptive.dashLength / 2;
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = vertStartX + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, h / 2);
                ctx.stroke();
            }
            
            // Горизонтальные линии
            const horizLength = w / 2 - lastVertX;
            const horizAdaptive = this.calculateAdaptiveDash(horizLength, dashPx, gapPx);
            ctx.setLineDash([horizAdaptive.dashLength, horizAdaptive.gapLength]);
            ctx.lineDashOffset = horizAdaptive.dashLength / 2;
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineY = horizStartY + i * (strokeWidth + gap);
                ctx.beginPath();
                ctx.moveTo(lastVertX, lineY);
                ctx.lineTo(w / 2, lineY);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
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
        
        // Получаем локальные endpoints с учетом поворота
        const rotation = Math.round(angle / (Math.PI / 2)) % 4;
        const localEndpoints = this.getLocalEndpointSides(rotation);
        
        const lineWidth = stem / 2;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        ctx.lineJoin = this.roundedCaps ? 'round' : 'miter';
        
        if (this.mode === 'fill') {
            // Solid mode: L-образное соединение
            const vertLineX = -w / 2 + stem / 4;
            const horizLineY = h / 2 - stem / 4;
            
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(vertLineX, -h / 2);
            ctx.lineTo(vertLineX, horizLineY);
            ctx.lineTo(w / 2, horizLineY);
            ctx.stroke();
        } else if (this.mode === 'stripes') {
            // Stripes mode
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.lineJoin = this.roundedCaps ? 'round' : 'miter';
            ctx.setLineDash([]);
            
            const vertStartX = -w / 2 + strokeWidth / 2;
            const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = vertStartX + i * (strokeWidth + gap);
                const reverseIndex = this.strokesNum - 1 - i;
                const lineY = horizStartY + reverseIndex * (strokeWidth + gap);
                
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, lineY);
                ctx.lineTo(w / 2, lineY);
                ctx.stroke();
            }
        } else if (this.mode === 'dash') {
            // Dash mode
            const vertLineX = -w / 2 + stem / 4;
            const horizLineY = h / 2 - stem / 4;
            
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.lineJoin = this.roundedCaps ? 'round' : 'miter';
            
            const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const shortenTop = shouldShorten && localEndpoints.top ? stem * 0.25 : 0;
            const shortenRight = shouldShorten && localEndpoints.right ? stem * 0.25 : 0;
            
            const dashPx = stem * this.dashLength;
            const gapPx = stem * this.gapLength;
            
            const vertStartY = -h / 2 + shortenTop;
            const horizEndX = w / 2 - shortenRight;
            const vertLength = h / 2 + horizLineY - shortenTop;
            const horizLength = horizEndX - vertLineX;
            const totalLength = vertLength + horizLength;
            
            const adaptive = this.calculateAdaptiveDash(totalLength, dashPx, gapPx);
            
            ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
            ctx.lineDashOffset = adaptive.dashLength / 2;
            
            ctx.beginPath();
            ctx.moveTo(vertLineX, vertStartY);
            ctx.lineTo(vertLineX, horizLineY);
            ctx.lineTo(horizEndX, horizLineY);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        } else if (this.mode === 'sd') {
            // SD mode: stripes + dash для Link (L-образное)
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            ctx.lineJoin = this.roundedCaps ? 'round' : 'miter';
            
            const vertStartX = -w / 2 + strokeWidth / 2;
            const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
            
            const dashPx = strokeWidth * this.dashLength;
            const gapPx = strokeWidth * this.gapLength;
            
            for (let i = 0; i < this.strokesNum; i++) {
                const lineX = vertStartX + i * (strokeWidth + gap);
                const reverseIndex = this.strokesNum - 1 - i;
                const lineY = horizStartY + reverseIndex * (strokeWidth + gap);
                
                const vertLength = h / 2 + lineY;
                const horizLength = w / 2 - lineX;
                const totalLength = vertLength + horizLength;
                
                const adaptive = this.calculateAdaptiveDash(totalLength, dashPx, gapPx);
                
                ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                ctx.lineDashOffset = adaptive.dashLength / 2;
                
                ctx.beginPath();
                ctx.moveTo(lineX, -h / 2);
                ctx.lineTo(lineX, lineY);
                ctx.lineTo(w / 2, lineY);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
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
        
        // Получаем локальные endpoints с учетом поворота
        const rotation = Math.round(angle / (Math.PI / 2)) % 4;
        const localEndpoints = this.getLocalEndpointSides(rotation);
        
        const lineWidth = stem / 2;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        
        if (this.mode === 'fill') {
            // Solid mode: одна дуга
            let arcRadius = w - stem / 4;
            const minRadius = Math.max(lineWidth / 2, 0.1);
            if (arcRadius < minRadius) {
                arcRadius = minRadius;
            }
            
            const shortenAmount = stem * 0.25;
            const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(w / 2, -h / 2, arcRadius, startAngle, endAngle);
            ctx.stroke();
        } else if (this.mode === 'stripes') {
            // Stripes mode
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.setLineDash([]);
            
            const outerRadius = w - strokeWidth / 2;
            const minRadius = Math.max(strokeWidth / 2, 0.1);
            const shortenAmount = strokeWidth / 2;
            
            for (let j = 0; j < this.strokesNum; j++) {
                let arcRadius = outerRadius - j * (strokeWidth + gap);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                if (arcRadius > 0) {
                    // Укорачиваем дуги если Round или Close Ends
                    const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
                    const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
                    const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
                    
                    const startAngle = Math.PI / 2 + deltaAngleRight;
                    const endAngle = Math.PI - deltaAngleTop;
                    
                    ctx.beginPath();
                    ctx.arc(w / 2, -h / 2, arcRadius, startAngle, endAngle);
                    ctx.stroke();
                }
            }
            
            // Close Ends: скругление зависит от состояния Round
            if (this.closeEnds && localEndpoints && this.strokesNum > 0) {
                const centerX = w / 2;
                const centerY = -h / 2;
                const firstRadius = outerRadius;
                let lastRadius = outerRadius - (this.strokesNum - 1) * (strokeWidth + gap);
                if (lastRadius < minRadius) {
                    lastRadius = minRadius;
                }
                
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                if (localEndpoints.right) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI / 2 + deltaAngleFirst;
                    const angle2 = Math.PI / 2 + deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                
                if (localEndpoints.top) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI - deltaAngleFirst;
                    const angle2 = Math.PI - deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        } else if (this.mode === 'dash') {
            // Dash mode
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            let arcRadius = w - stem / 4;
            const minRadius = Math.max(lineWidth / 2, 0.1);
            if (arcRadius < minRadius) {
                arcRadius = minRadius;
            }
            
            const centerX = w / 2;
            const centerY = -h / 2;
            
            const shortenAmount = stem * 0.25;
            const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            const dashPx = stem * this.dashLength;
            const gapPx = stem * this.gapLength;
            
            const arcAngle = endAngle - startAngle;
            const arcLength = arcRadius * arcAngle;
            const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
            
            ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
            ctx.lineDashOffset = adaptive.dashLength / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        } else if (this.mode === 'sd') {
            // SD mode: stripes + dash для Round
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const outerRadius = w - strokeWidth / 2;
            const minRadius = Math.max(strokeWidth / 2, 0.1);
            const shortenAmount = strokeWidth / 2;
            
            const centerX = w / 2;
            const centerY = -h / 2;
            
            const dashPx = strokeWidth * this.dashLength;
            const gapPx = strokeWidth * this.gapLength;
            
            for (let j = 0; j < this.strokesNum; j++) {
                let arcRadius = outerRadius - j * (strokeWidth + gap);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                if (arcRadius > 0) {
                    // Укорачиваем дуги если Round или Close Ends
                    const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
                    const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
                    const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
                    
                    const startAngle = Math.PI / 2 + deltaAngleRight;
                    const endAngle = Math.PI - deltaAngleTop;
                    
                    const arcAngle = endAngle - startAngle;
                    const arcLength = arcRadius * arcAngle;
                    const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
                    
                    ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                    ctx.lineDashOffset = adaptive.dashLength / 2;
                    
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle);
                    ctx.stroke();
                }
            }
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
            
            // Close Ends: скругление зависит от состояния Round
            if (this.closeEnds && localEndpoints && this.strokesNum > 0) {
                const firstRadius = outerRadius;
                let lastRadius = outerRadius - (this.strokesNum - 1) * (strokeWidth + gap);
                if (lastRadius < minRadius) {
                    lastRadius = minRadius;
                }
                
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                // Закрывающие линии тоже пунктирные в режиме SD
                const closeLineLength = firstRadius - lastRadius;
                const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
                ctx.setLineDash([closeAdaptive.dashLength, closeAdaptive.gapLength]);
                ctx.lineDashOffset = closeAdaptive.dashLength / 2;
                
                if (localEndpoints.right) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI / 2 + deltaAngleFirst;
                    const angle2 = Math.PI / 2 + deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                
                if (localEndpoints.top) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI - deltaAngleFirst;
                    const angle2 = Math.PI - deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;
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
        
        // Получаем локальные endpoints с учетом поворота
        const rotation = Math.round(angle / (Math.PI / 2)) % 4;
        const localEndpoints = this.getLocalEndpointSides(rotation);
        
        const lineWidth = stem / 2;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
        
        if (this.mode === 'fill') {
            // Solid mode: одна маленькая дуга
            let arcRadius = stem / 4;
            const minRadius = Math.max(lineWidth / 2, 0.1);
            if (arcRadius < minRadius) {
                arcRadius = minRadius;
            }
            
            const shortenAmount = stem * 0.25;
            const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(w / 2, -h / 2, arcRadius, startAngle, endAngle);
            ctx.stroke();
        } else if (this.mode === 'stripes') {
            // Stripes mode
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.setLineDash([]);
            
            const outerRadius = stem / 2 - strokeWidth / 2;
            const minRadius = Math.max(strokeWidth / 2, 0.1);
            const shortenAmount = strokeWidth / 2;
            
            for (let j = 0; j < this.strokesNum; j++) {
                let arcRadius = outerRadius - j * (strokeWidth + gap);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                if (arcRadius > 0) {
                    // Укорачиваем дуги если Round или Close Ends
                    const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
                    const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
                    const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
                    
                    const startAngle = Math.PI / 2 + deltaAngleRight;
                    const endAngle = Math.PI - deltaAngleTop;
                    
                    ctx.beginPath();
                    ctx.arc(w / 2, -h / 2, arcRadius, startAngle, endAngle);
                    ctx.stroke();
                }
            }
            
            // Close Ends: скругление зависит от состояния Round
            if (this.closeEnds && localEndpoints && this.strokesNum > 0) {
                const centerX = w / 2;
                const centerY = -h / 2;
                const firstRadius = outerRadius;
                let lastRadius = outerRadius - (this.strokesNum - 1) * (strokeWidth + gap);
                if (lastRadius < minRadius) {
                    lastRadius = minRadius;
                }
                
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                if (localEndpoints.right) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI / 2 + deltaAngleFirst;
                    const angle2 = Math.PI / 2 + deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                
                if (localEndpoints.top) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI - deltaAngleFirst;
                    const angle2 = Math.PI - deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        } else if (this.mode === 'dash') {
            // Dash mode
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            let arcRadius = stem / 4;
            const minRadius = Math.max(lineWidth / 2, 0.1);
            if (arcRadius < minRadius) {
                arcRadius = minRadius;
            }
            
            const centerX = w / 2;
            const centerY = -h / 2;
            
            const shortenAmount = stem * 0.25;
            const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
            const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
            const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
            
            const startAngle = Math.PI / 2 + deltaAngleRight;
            const endAngle = Math.PI - deltaAngleTop;
            
            const dashPx = stem * this.dashLength;
            const gapPx = stem * this.gapLength;
            
            const arcAngle = endAngle - startAngle;
            const arcLength = arcRadius * arcAngle;
            const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
            
            ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
            ctx.lineDashOffset = adaptive.dashLength / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        } else if (this.mode === 'sd') {
            // SD mode: stripes + dash для Bend
            const totalWidth = stem / 2;
            const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth);
            
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
            
            const outerRadius = stem / 2 - strokeWidth / 2;
            const minRadius = Math.max(strokeWidth / 2, 0.1);
            const shortenAmount = strokeWidth / 2;
            
            const centerX = w / 2;
            const centerY = -h / 2;
            
            const dashPx = strokeWidth * this.dashLength;
            const gapPx = strokeWidth * this.gapLength;
            
            for (let j = 0; j < this.strokesNum; j++) {
                let arcRadius = outerRadius - j * (strokeWidth + gap);
                if (arcRadius < minRadius) {
                    arcRadius = minRadius;
                }
                if (arcRadius > 0) {
                    // Укорачиваем дуги если Round или Close Ends
                    const shouldShorten = (this.roundedCaps || this.closeEnds) && localEndpoints;
                    const deltaAngleRight = shouldShorten && localEndpoints.right ? shortenAmount / arcRadius : 0;
                    const deltaAngleTop = shouldShorten && localEndpoints.top ? shortenAmount / arcRadius : 0;
                    
                    const startAngle = Math.PI / 2 + deltaAngleRight;
                    const endAngle = Math.PI - deltaAngleTop;
                    
                    const arcAngle = endAngle - startAngle;
                    const arcLength = arcRadius * arcAngle;
                    const adaptive = this.calculateAdaptiveDash(arcLength, dashPx, gapPx);
                    
                    ctx.setLineDash([adaptive.dashLength, adaptive.gapLength]);
                    ctx.lineDashOffset = adaptive.dashLength / 2;
                    
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle);
                    ctx.stroke();
                }
            }
            
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
            
            // Close Ends: скругление зависит от состояния Round
            if (this.closeEnds && localEndpoints && this.strokesNum > 0) {
                const firstRadius = outerRadius;
                let lastRadius = outerRadius - (this.strokesNum - 1) * (strokeWidth + gap);
                if (lastRadius < minRadius) {
                    lastRadius = minRadius;
                }
                
                ctx.lineCap = this.roundedCaps ? 'round' : 'butt';
                
                // Закрывающие линии тоже пунктирные в режиме SD
                const closeLineLength = firstRadius - lastRadius;
                const closeAdaptive = this.calculateAdaptiveDash(closeLineLength, dashPx, gapPx);
                ctx.setLineDash([closeAdaptive.dashLength, closeAdaptive.gapLength]);
                ctx.lineDashOffset = closeAdaptive.dashLength / 2;
                
                if (localEndpoints.right) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI / 2 + deltaAngleFirst;
                    const angle2 = Math.PI / 2 + deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                
                if (localEndpoints.top) {
                    const deltaAngleFirst = shortenAmount / firstRadius;
                    const deltaAngleLast = shortenAmount / lastRadius;
                    const angle1 = Math.PI - deltaAngleFirst;
                    const angle2 = Math.PI - deltaAngleLast;
                    const x1 = centerX + firstRadius * Math.cos(angle1);
                    const y1 = centerY + firstRadius * Math.sin(angle1);
                    const x2 = centerX + lastRadius * Math.cos(angle2);
                    const y2 = centerY + lastRadius * Math.sin(angle2);
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;
            }
        }
        
        ctx.restore();
    }
}

