/**
 * EndpointDetector - detect endpoints and joints in glyphs
 */

export class EndpointDetector {
    constructor() {
        
        this.baseExits = {
            'E': {},
            'S': { top: true, bottom: true },
            'C': { top: true, bottom: true },
            'J': { top: true, bottom: true, right: true },
            'L': { top: true, right: true },
            'R': { top: true, right: true },
            'B': { top: true, right: true }
        };
    }

    /**
     * Получить выходы модуля с учетом поворота
     */
    getExits(type, rotation) {
        if (type === 'E') return {};
        
        const baseExits = this.baseExits[type] || {};
        const exits = {};
        
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
        
        let localX = 0;
        let localY = 0;
        
        const sides = ['top', 'right', 'bottom', 'left'];
        const baseSideIndex = sides.indexOf(side);
        const rotatedSideIndex = (baseSideIndex - rotation + 4) % 4;
        const baseSide = sides[rotatedSideIndex];
        
        switch(type) {
            case 'S':
                const lineX = -w / 2 + stem / 4;
                
                localX = lineX;
                if (baseSide === 'top') localY = -h / 2;
                else if (baseSide === 'bottom') localY = h / 2;
                break;
                
            case 'C':
                localX = 0;
                if (baseSide === 'top') localY = -h / 2;
                else if (baseSide === 'bottom') localY = h / 2;
                else if (baseSide === 'left') localX = -w / 2;
                else if (baseSide === 'right') localX = w / 2;
                break;
                
            case 'J':
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
                
            case 'L':
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
                
            case 'R':
                const arcRadiusR = w - stem / 4;
                
                
                const centerXR = w / 2;
                const centerYR = -h / 2;
                
                const sides = ['top', 'right', 'bottom', 'left'];
                const sideIndex = sides.indexOf(side);
                const baseSideIndex = (sideIndex - rotation + 4) % 4;
                const baseSideR = sides[baseSideIndex];
                
                
                let angleR;
                if (baseSideR === 'top') {
                    angleR = Math.PI;
                    localX = centerXR + arcRadiusR * Math.cos(angleR);
                    localY = centerYR + arcRadiusR * Math.sin(angleR);
                } else if (baseSideR === 'right') {
                    angleR = Math.PI / 2;
                    localX = centerXR + arcRadiusR * Math.cos(angleR);
                    localY = centerYR + arcRadiusR * Math.sin(angleR);
                }
                
                const rotationAngleR = rotation * Math.PI / 2;
                const cosR = Math.cos(rotationAngleR);
                const sinR = Math.sin(rotationAngleR);
                const rotatedBackX = localX * cosR - localY * sinR;
                const rotatedBackY = localX * sinR + localY * cosR;
                
                return {
                    x: half + rotatedBackX,
                    y: half + rotatedBackY
                };
                
            case 'B':
                const arcRadiusB = stem / 4;
                
                
                const centerXB = w / 2;
                const centerYB = -h / 2;
                
                const sidesB = ['top', 'right', 'bottom', 'left'];
                const sideIndexB = sidesB.indexOf(side);
                const baseSideIndexB = (sideIndexB - rotation + 4) % 4;
                const baseSideB = sidesB[baseSideIndexB];
                
                
                let angleB;
                if (baseSideB === 'top') {
                    angleB = Math.PI;
                    localX = centerXB + arcRadiusB * Math.cos(angleB);
                    localY = centerYB + arcRadiusB * Math.sin(angleB);
                } else if (baseSideB === 'right') {
                    angleB = Math.PI / 2;
                    localX = centerXB + arcRadiusB * Math.cos(angleB);
                    localY = centerYB + arcRadiusB * Math.sin(angleB);
                }
                
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
        
        if (localX === 0 && localY === 0 && type !== 'C') {
            const sideCoords = {
                'top': { x: half, y: 0 },
                'right': { x: w, y: half },
                'bottom': { x: half, y: h },
                'left': { x: 0, y: half }
            };
            const fallback = sideCoords[side] || { x: half, y: half };
            return fallback;
        }
        
        const rotationAngle = rotation * Math.PI / 2;
        const cosR = Math.cos(rotationAngle);
        const sinR = Math.sin(rotationAngle);
        const rotatedX = localX * cosR - localY * sinR;
        const rotatedY = localX * sinR + localY * cosR;
        
        return {
            x: half + rotatedX,
            y: half + rotatedY
        };
    }

    /**
     * Get opposite side
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
     * Get neighbor coordinates
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
        const connections = [];
        const endpoints = [];
        
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
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const module = grid[row][col];
                if (module.type === 'E') continue;
                
                const exits = this.getExits(module.type, module.rotation);
                const isCurve = module.type === 'R' || module.type === 'B';
                
                const curveConnectedSides = new Set();
                
                ['top', 'right', 'bottom', 'left'].forEach(side => {
                    const neighbor = this.getNeighborCoords(col, row, side);
                    
                    if (neighbor.row < 0 || neighbor.row >= rows || 
                        neighbor.col < 0 || neighbor.col >= cols) {
                        if (exits[side]) {
                            endpoints.push({ col, row, side });
                        }
                        return;
                    }
                    
                    const neighborModule = grid[neighbor.row][neighbor.col];
                    
                    if (neighborModule.type === 'E') {
                        if (exits[side]) {
                            if (!isCurve) {
                                endpoints.push({ col, row, side });
                            }
                        }
                        return;
                    }
                    
                    const currentExits = this.getExits(module.type, module.rotation);
                    const neighborExits = this.getExits(neighborModule.type, neighborModule.rotation);
                    const oppositeSide = this.getOppositeSide(side);
                    
                    let isConnected = false;
                    
                    if (neighborExits[oppositeSide]) {
                        isConnected = true;
                    }
                    
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
                    
                    if (!isConnected) {
                        const isCurve = (type) => type === 'R' || type === 'B';
                        if (isCurve(module.type) && isCurve(neighborModule.type)) {
                            isConnected = true;
                        }
                    }
                    
                    
                    if (isConnected) {
                        if (isCurve) {
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
                        if (!isCurve) {
                            endpoints.push({ col, row, side });
                        }
                    }
                });
                
                if (isCurve) {
                    Object.keys(exits).forEach(side => {
                        if (!curveConnectedSides.has(side)) {
                            const neighbor = this.getNeighborCoords(col, row, side);
                            
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
     * Render points on canvas
     */
    renderPoints(ctx, connections, endpoints, moduleSize, offsetX = 0, offsetY = 0, letterColor = '#ffffff', backgroundColor = '#000000') {
        const pointRadius = 6;
        const strokeWidth = 2;
        
        
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

