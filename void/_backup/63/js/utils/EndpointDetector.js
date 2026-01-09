/**
 * EndpointDetector - определение концевых точек и стыков в глифах
 */

export class EndpointDetector {
    constructor() {
        // Карта КОНЦОВ ЛИНИЙ для каждого типа модуля (базовая ориентация, rotation=0)
        // Указываем ТОЛЬКО те стороны, где линия ЗАКАНЧИВАЕТСЯ (не просто касается)
        // 
        // Для прямых линий (S, C) - только 2 конца
        // Для дуг (R, B, L) - 2 конца дуги/угла
        // Для Т-образной (J) - 3 конца (top, bottom, right при rotation=0)
        
        this.baseExits = {
            'E': {}, // Пустой модуль
            'S': { top: true, bottom: true }, // Straight: вертикальная линия, 2 конца
            'C': { top: true, bottom: true }, // Central: вертикальная линия по центру, 2 конца
            'J': { top: true, bottom: true, right: true }, // Joint: Т-образная, 3 конца
            'L': { top: true, right: true }, // Link: Г-образная, 2 конца
            'R': { top: true, right: true }, // Round: дуга (rotation=0 - точки на верхней и правой сторонах)
            'B': { top: true, right: true }  // Bend: малая дуга (rotation=0 - точки на верхней и правой сторонах)
        };
    }

    /**
     * Получить выходы модуля с учетом поворота
     */
    getExits(type, rotation) {
        if (type === 'E') return {};
        
        const baseExits = this.baseExits[type] || {};
        const exits = {};
        
        // Поворот: 0=0°, 1=90°, 2=180°, 3=270°
        // При повороте выходы смещаются: top->right->bottom->left->top
        const sides = ['top', 'right', 'bottom', 'left'];
        
        sides.forEach((side, index) => {
            if (baseExits[side]) {
                const newIndex = (index + rotation) % 4;
                exits[sides[newIndex]] = true;
            }
        });
        
        return exits;
    }

    /**
     * Получить координаты точки на стороне модуля
     */
    getPointCoordinates(col, row, side, moduleSize) {
        const baseX = col * moduleSize;
        const baseY = row * moduleSize;
        const half = moduleSize / 2;
        
        switch(side) {
            case 'top':
                return { x: baseX + half, y: baseY };
            case 'right':
                return { x: baseX + moduleSize, y: baseY + half };
            case 'bottom':
                return { x: baseX + half, y: baseY + moduleSize };
            case 'left':
                return { x: baseX, y: baseY + half };
            default:
                return { x: baseX + half, y: baseY + half };
        }
    }

    /**
     * Получить координаты точки на кривой/линии внутри модуля
     * Возвращает координаты точки, где линия заканчивается (не на стороне модуля, а на самой линии)
     * Координаты возвращаются относительно начала модуля (0, 0)
     * @param {string} type - тип модуля (S, C, J, L, R, B)
     * @param {number} rotation - поворот модуля (0, 1, 2, 3)
     * @param {string} side - сторона, на которой находится endpoint (top, right, bottom, left)
     * @param {number} moduleSize - размер модуля
     * @param {number} stem - толщина штриха
     * @returns {Object} {x, y} - координаты точки на кривой относительно начала модуля
     */
    getLineEndPointCoordinates(type, rotation, side, moduleSize, stem) {
        const w = moduleSize;
        const h = moduleSize;
        const half = moduleSize / 2;
        
        // Координаты относительно центра модуля для базового случая (rotation=0)
        // Затем применяем поворот один раз в конце
        let localX = 0;
        let localY = 0;
        
        // Определяем базовую сторону с учетом поворота
        // При повороте стороны смещаются: top->right->bottom->left->top
        const sides = ['top', 'right', 'bottom', 'left'];
        const baseSideIndex = sides.indexOf(side);
        const rotatedSideIndex = (baseSideIndex - rotation + 4) % 4;
        const baseSide = sides[rotatedSideIndex];
        
        switch(type) {
            case 'S': // Straight - вертикальная линия слева (при rotation=0)
                // Позиция линии: -w/2 + stem/4
                const lineX = -w / 2 + stem / 4;
                
                // Для базового случая (rotation=0): вертикальная линия слева
                localX = lineX;
                if (baseSide === 'top') localY = -h / 2;
                else if (baseSide === 'bottom') localY = h / 2;
                break;
                
            case 'C': // Central - вертикальная линия по центру
                localX = 0; // Центр модуля
                if (baseSide === 'top') localY = -h / 2;
                else if (baseSide === 'bottom') localY = h / 2;
                else if (baseSide === 'left') localX = -w / 2;
                else if (baseSide === 'right') localX = w / 2;
                break;
                
            case 'J': // Joint - Т-образное соединение
                // Вертикальная линия слева + горизонтальная по центру (при rotation=0)
                const vertLineX = -w / 2 + stem / 4;
                const horizLineY = 0;
                
                if (baseSide === 'top' || baseSide === 'bottom') {
                    localX = vertLineX;
                    localY = baseSide === 'top' ? -h / 2 : h / 2;
                } else if (baseSide === 'right') {
                    localX = w / 2;
                    localY = horizLineY;
                }
                break;
                
            case 'L': // Link - L-образное соединение
                const vertLineXL = -w / 2 + stem / 4;
                const horizLineYL = h / 2 - stem / 4;
                
                if (baseSide === 'top') {
                    localX = vertLineXL;
                    localY = -h / 2;
                } else if (baseSide === 'right') {
                    localX = w / 2;
                    localY = horizLineYL;
                }
                break;
                
            case 'R': // Round - плавная дуга
                // Радиус дуги: w - stem/4
                const arcRadiusR = w - stem / 4;
                
                // В ModuleDrawer дуга рисуется от PI/2 до PI с центром в (w/2, -h/2)
                // Для R: baseExits = {top: true, right: true}
                // Это означает: exit на top соответствует углу PI/2, exit на right соответствует углу PI
                
                const centerXR = w / 2;
                const centerYR = -h / 2;
                
                // Определяем базовую сторону (до поворота)
                const sides = ['top', 'right', 'bottom', 'left'];
                const sideIndex = sides.indexOf(side);
                const baseSideIndex = (sideIndex - rotation + 4) % 4;
                const baseSideR = sides[baseSideIndex];
                
                // Вычисляем точку пересечения дуги с границей модуля в системе R0
                // Центр: (w/2, -h/2), радиус: w - stem/4, дуга от PI/2 до PI
                
                let angleR;
                if (baseSideR === 'top') {
                    // Точка выхода - это конечная точка дуги при angle = PI
                    angleR = Math.PI;
                    localX = centerXR + arcRadiusR * Math.cos(angleR);
                    localY = centerYR + arcRadiusR * Math.sin(angleR);
                } else if (baseSideR === 'right') {
                    // Точка выхода - это начальная точка дуги при angle = PI/2
                    angleR = Math.PI / 2;
                    localX = centerXR + arcRadiusR * Math.cos(angleR);
                    localY = centerYR + arcRadiusR * Math.sin(angleR);
                }
                
                // Поворачиваем в направлении поворота модуля
                const rotationAngleR = rotation * Math.PI / 2;
                const cosR = Math.cos(rotationAngleR);
                const sinR = Math.sin(rotationAngleR);
                const rotatedBackX = localX * cosR - localY * sinR;
                const rotatedBackY = localX * sinR + localY * cosR;
                
                return {
                    x: half + rotatedBackX,
                    y: half + rotatedBackY
                };
                
            case 'B': // Bend - крутая дуга
                // Радиус дуги: stem/4
                const arcRadiusB = stem / 4;
                
                // В ModuleDrawer дуга рисуется от PI/2 до PI с центром в (w/2, -h/2)
                // Для B: baseExits = {top: true, right: true} (как и для R)
                // Это означает: exit на top соответствует углу PI/2, exit на right соответствует углу PI
                
                const centerXB = w / 2;
                const centerYB = -h / 2;
                
                // Определяем базовую сторону (до поворота)
                const sidesB = ['top', 'right', 'bottom', 'left'];
                const sideIndexB = sidesB.indexOf(side);
                const baseSideIndexB = (sideIndexB - rotation + 4) % 4;
                const baseSideB = sidesB[baseSideIndexB];
                
                // Вычисляем точку пересечения дуги с границей модуля в системе B0
                // Центр: (w/2, -h/2), радиус: stem/4, дуга от PI/2 до PI
                
                let angleB;
                if (baseSideB === 'top') {
                    // Точка выхода - это конечная точка дуги при angle = PI
                    angleB = Math.PI;
                    localX = centerXB + arcRadiusB * Math.cos(angleB);
                    localY = centerYB + arcRadiusB * Math.sin(angleB);
                } else if (baseSideB === 'right') {
                    // Точка выхода - это начальная точка дуги при angle = PI/2
                    angleB = Math.PI / 2;
                    localX = centerXB + arcRadiusB * Math.cos(angleB);
                    localY = centerYB + arcRadiusB * Math.sin(angleB);
                }
                
                // Поворачиваем в направлении поворота модуля
                const rotationAngleB = rotation * Math.PI / 2;
                const cosRB = Math.cos(rotationAngleB);
                const sinRB = Math.sin(rotationAngleB);
                const rotatedBackXB = localX * cosRB - localY * sinRB;
                const rotatedBackYB = localX * sinRB + localY * cosRB;
                
                return {
                    x: half + rotatedBackXB,
                    y: half + rotatedBackYB
                };
        }
        
        // Если координаты не были вычислены (остались 0,0), используем fallback на сторону модуля
        if (localX === 0 && localY === 0 && type !== 'C') {
            // Fallback: возвращаем координаты на стороне модуля
            const sideCoords = {
                'top': { x: half, y: 0 },
                'right': { x: w, y: half },
                'bottom': { x: half, y: h },
                'left': { x: 0, y: half }
            };
            const fallback = sideCoords[side] || { x: half, y: half };
            return fallback;
        }
        
        // Применяем поворот к локальным координатам
        // Поворот: 0=0°, 1=90°, 2=180°, 3=270°
        const rotationAngle = rotation * Math.PI / 2;
        const cosR = Math.cos(rotationAngle);
        const sinR = Math.sin(rotationAngle);
        const rotatedX = localX * cosR - localY * sinR;
        const rotatedY = localX * sinR + localY * cosR;
        
        // Возвращаем координаты относительно начала модуля (0, 0)
        // Эти координаты будут использоваться относительно позиции модуля (x + col*moduleSize, y + row*moduleSize)
        return {
            x: half + rotatedX,
            y: half + rotatedY
        };
    }

    /**
     * Получить противоположную сторону
     */
    getOppositeSide(side) {
        const opposites = {
            'top': 'bottom',
            'bottom': 'top',
            'left': 'right',
            'right': 'left'
        };
        return opposites[side];
    }

    /**
     * Получить координаты соседа
     */
    getNeighborCoords(col, row, side) {
        const offsets = {
            'top': { col: 0, row: -1 },
            'right': { col: 1, row: 0 },
            'bottom': { col: 0, row: 1 },
            'left': { col: -1, row: 0 }
        };
        
        const offset = offsets[side];
        return {
            col: col + offset.col,
            row: row + offset.row
        };
    }

    /**
     * Проанализировать глиф и найти все точки
     * @param {string} glyphString - строка глифа (50 символов)
     * @param {number} cols - количество колонок (обычно 5)
     * @param {number} rows - количество рядов (обычно 5)
     * @returns {Object} {connections: [], endpoints: []}
     */
    analyzeGlyph(glyphString, cols = 5, rows = 5) {
        const connections = []; // Стыки (синие)
        const endpoints = [];   // Концевые точки (красные)
        
        // Преобразуем строку в сетку модулей
        const grid = [];
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                const index = (row * cols + col) * 2;
                const type = glyphString.charAt(index);
                const rotation = parseInt(glyphString.charAt(index + 1));
                grid[row][col] = { type, rotation };
            }
        }
        
        // Анализируем каждый модуль
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const module = grid[row][col];
                if (module.type === 'E') continue; // Пропускаем пустые
                
                const exits = this.getExits(module.type, module.rotation);
                const isCurve = module.type === 'R' || module.type === 'B';
                
                // Для R/B: отслеживаем, на каких сторонах есть соединения
                const curveConnectedSides = new Set();
                
                // Проверяем каждую сторону
                ['top', 'right', 'bottom', 'left'].forEach(side => {
                    // Координаты соседа
                    const neighbor = this.getNeighborCoords(col, row, side);
                    
                    // Проверяем, существует ли сосед в сетке
                    if (neighbor.row < 0 || neighbor.row >= rows || 
                        neighbor.col < 0 || neighbor.col >= cols) {
                        // Вышли за границы - это endpoint только если на этой стороне есть выход
                        if (exits[side]) {
                            endpoints.push({ col, row, side });
                        }
                        return;
                    }
                    
                    const neighborModule = grid[neighbor.row][neighbor.col];
                    
                    // Если сосед пустой - это endpoint только если на этой стороне есть выход
                    if (neighborModule.type === 'E') {
                        if (exits[side]) {
                            // Для R/B: добавим endpoint позже, только если на этой стороне НЕТ соединения
                            if (!isCurve) {
                                endpoints.push({ col, row, side });
                            }
                        }
                        return;
                    }
                    
                    // Проверяем, есть ли у соседа выход на нашей стороне
                    const currentExits = this.getExits(module.type, module.rotation);
                    const neighborExits = this.getExits(neighborModule.type, neighborModule.rotation);
                    const oppositeSide = this.getOppositeSide(side);
                    
                    let isConnected = false;
                    
                    // Проверка 1: Прямое соединение (выход текущего модуля совпадает с выходом соседа)
                    if (neighborExits[oppositeSide]) {
                        isConnected = true;
                    }
                    
                    // Проверка 2: Угловое соединение через общую сторону
                    if (!isConnected) {
                        const allSides = ['top', 'right', 'bottom', 'left'];
                        for (const commonSide of allSides) {
                            if (commonSide === oppositeSide) continue;
                            if (currentExits[commonSide] && neighborExits[commonSide]) {
                                isConnected = true;
                                break;
                            }
                        }
                    }
                    
                    // Проверка 3: Специальная логика для дуг (R и B)
                    // Дуги всегда соединяются с соседними дугами, даже если у них нет общих выходов
                    if (!isConnected) {
                        const isCurve = (type) => type === 'R' || type === 'B';
                        if (isCurve(module.type) && isCurve(neighborModule.type)) {
                            isConnected = true;
                        }
                    }
                    
                    
                    if (isConnected) {
                        // Соединение найдено!
                        if (isCurve) {
                            // Запоминаем, что на этой стороне есть соединение
                            curveConnectedSides.add(side);
                        }
                        
                        const key = `${Math.min(col, neighbor.col)},${Math.min(row, neighbor.row)}-${Math.max(col, neighbor.col)},${Math.max(row, neighbor.row)}`;
                        if (!connections.find(c => c.key === key)) {
                            connections.push({ 
                                col1: col, 
                                row1: row, 
                                side1: side,
                                col2: neighbor.col,
                                row2: neighbor.row,
                                side2: oppositeSide,
                                key 
                            });
                        }
                    } else if (exits[side]) {
                        // Сосед есть, но не соединяется, и у текущего модуля есть выход - endpoint
                        if (!isCurve) {
                            endpoints.push({ col, row, side });
                        }
                    }
                });
                
                // Для R/B: добавляем endpoints только на тех сторонах с выходом,
                // где НЕТ соединения и сосед пустой (E)
                if (isCurve) {
                    Object.keys(exits).forEach(side => {
                        // Если на этой стороне нет соединения - проверяем, есть ли там E
                        if (!curveConnectedSides.has(side)) {
                            const neighbor = this.getNeighborCoords(col, row, side);
                            
                            // За границами или пустой сосед?
                            const isOutOfBounds = neighbor.row < 0 || neighbor.row >= rows || 
                                                  neighbor.col < 0 || neighbor.col >= cols;
                            const isEmpty = !isOutOfBounds && grid[neighbor.row][neighbor.col].type === 'E';
                            
                            if (isOutOfBounds || isEmpty) {
                                endpoints.push({ col, row, side });
                            }
                        }
                    });
                }
            }
        }
        
        return { connections, endpoints };
    }

    /**
     * Отрисовать точки на канвасе
     */
    renderPoints(ctx, connections, endpoints, moduleSize, offsetX = 0, offsetY = 0, letterColor = '#ffffff', backgroundColor = '#000000') {
        // Радиус точек в пикселях (не зависит от масштаба)
        const pointRadius = 6;
        const strokeWidth = 2;
        
        
        // Рисуем стыки (синие кружки)
        // Заливка: Background, Обводка: Letter Color
        ctx.fillStyle = backgroundColor;
        ctx.strokeStyle = letterColor;
        ctx.lineWidth = strokeWidth;
        
        connections.forEach(conn => {
            const point = this.getPointCoordinates(conn.col1, conn.row1, conn.side1, moduleSize);
            ctx.beginPath();
            ctx.arc(
                offsetX + point.x, 
                offsetY + point.y, 
                pointRadius, 
                0, 
                Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
        });
        
        // Рисуем концевые точки (красные кружки)
        // Заливка: Letter Color, Обводка: Letter Color
        ctx.fillStyle = letterColor;
        ctx.strokeStyle = letterColor;
        ctx.lineWidth = strokeWidth;
        
        endpoints.forEach(ep => {
            const point = this.getPointCoordinates(ep.col, ep.row, ep.side, moduleSize);
            ctx.beginPath();
            ctx.arc(
                offsetX + point.x, 
                offsetY + point.y, 
                pointRadius, 
                0, 
                Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
        });
    }
}

