/**
 * EndpointDetector - detect endpoints and joints in glyphs
 */

export class EndpointDetector {
    constructor() {
        // Map of LINE ENDS for each module type (base orientation, rotation=0)
        // Specify ONLY sides where line ENDS (not just touches)
        // 
        // For straight lines (S, C) - only 2 ends
        // For arcs (R, B, L) - 2 arc/corner ends
        // For T-shaped (J) - 3 ends (top, bottom, right at rotation=0)
        
        this.baseExits = {
            'E': {}, // Empty module
            'S': { top: true, bottom: true }, // Straight: vertical line, 2 ends
            'C': { top: true, bottom: true }, // Central: vertical line centered, 2 ends
            'J': { top: true, bottom: true, right: true }, // Joint: T-shaped, 3 ends
            'L': { top: true, right: true }, // Link: L-shaped, 2 ends
            'R': { top: true, right: true }, // Round: arc (rotation=0 - points on top and right sides)
            'B': { top: true, right: true }  // Bend: small arc (rotation=0 - points on top and right sides)
        };
    }

    /**
     * Get module exits considering rotation
     */
    getExits(type, rotation) {
        if (type === 'E') return {};
        
        const baseExits = this.baseExits[type] || {};
        const exits = {};
        
        // Rotation: 0=0°, 1=90°, 2=180°, 3=270°
        // On rotation exits shift: top->right->bottom->left->top
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
     * Get point coordinates on module side
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
     * Get point coordinates on curve/line inside module
     * Returns coordinates of point where line ends (not on module side, but on the line itself)
     * Coordinates returned relative to module start (0, 0)
     * @param {string} type - module type (S, C, J, L, R, B)
     * @param {number} rotation - module rotation (0, 1, 2, 3)
     * @param {string} side - side where endpoint is located (top, right, bottom, left)
     * @param {number} moduleSize - module size
     * @param {number} stem - stroke thickness
     * @returns {Object} {x, y} - point coordinates on curve relative to module start
     */
    getLineEndPointCoordinates(type, rotation, side, moduleSize, stem) {
        const w = moduleSize;
        const h = moduleSize;
        const half = moduleSize / 2;
        
        // Coordinates relative to module center for base case (rotation=0)
        // Then apply rotation once at the end
        let localX = 0;
        let localY = 0;
        
        // Determine base side considering rotation
        // On rotation sides shift: top->right->bottom->left->top
        const sides = ['top', 'right', 'bottom', 'left'];
        const baseSideIndex = sides.indexOf(side);
        const rotatedSideIndex = (baseSideIndex - rotation + 4) % 4;
        const baseSide = sides[rotatedSideIndex];
        
        switch(type) {
            case 'S': // Straight - vertical line on left (at rotation=0)
                // Line position: -w/2 + stem/4
                const lineX = -w / 2 + stem / 4;
                
                // For base case (rotation=0): vertical line on left
                localX = lineX;
                if (baseSide === 'top') localY = -h / 2;
                else if (baseSide === 'bottom') localY = h / 2;
                break;
                
            case 'C': // Central - vertical line centered
                localX = 0; // Module center
                if (baseSide === 'top') localY = -h / 2;
                else if (baseSide === 'bottom') localY = h / 2;
                else if (baseSide === 'left') localX = -w / 2;
                else if (baseSide === 'right') localX = w / 2;
                break;
                
            case 'J': // Joint - T-shaped connection
                // Vertical line on left + horizontal centered (at rotation=0)
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
                
            case 'L': // Link - L-shaped connection
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
                
            case 'R': // Round - smooth arc
                // Arc radius: w - stem/4
                const arcRadiusR = w - stem / 4;
                
                // In ModuleDrawer arc drawn from PI/2 to PI with center at (w/2, -h/2)
                // For R: baseExits = {top: true, right: true}
                // This means: exit on top corresponds to angle PI/2, exit on right corresponds to angle PI
                
                const centerXR = w / 2;
                const centerYR = -h / 2;
                
                // Determine base side (before rotation)
                const sides = ['top', 'right', 'bottom', 'left'];
                const sideIndex = sides.indexOf(side);
                const baseSideIndex = (sideIndex - rotation + 4) % 4;
                const baseSideR = sides[baseSideIndex];
                
                // Calculate arc intersection point with module boundary in R0 system
                // Center: (w/2, -h/2), radius: w - stem/4, arc from PI/2 to PI
                
                let angleR;
                if (baseSideR === 'top') {
                    // Exit point is arc end point at angle = PI
                    angleR = Math.PI;
                    localX = centerXR + arcRadiusR * Math.cos(angleR);
                    localY = centerYR + arcRadiusR * Math.sin(angleR);
                } else if (baseSideR === 'right') {
                    // Exit point is arc start point at angle = PI/2
                    angleR = Math.PI / 2;
                    localX = centerXR + arcRadiusR * Math.cos(angleR);
                    localY = centerYR + arcRadiusR * Math.sin(angleR);
                }
                
                // Rotate in module rotation direction
                const rotationAngleR = rotation * Math.PI / 2;
                const cosR = Math.cos(rotationAngleR);
                const sinR = Math.sin(rotationAngleR);
                const rotatedBackX = localX * cosR - localY * sinR;
                const rotatedBackY = localX * sinR + localY * cosR;
                
                return {
                    x: half + rotatedBackX,
                    y: half + rotatedBackY
                };
                
            case 'B': // Bend - sharp arc
                // Arc radius: stem/4
                const arcRadiusB = stem / 4;
                
                // In ModuleDrawer arc drawn from PI/2 to PI with center at (w/2, -h/2)
                // For B: baseExits = {top: true, right: true} (same as R)
                // This means: exit on top corresponds to angle PI/2, exit on right corresponds to angle PI
                
                const centerXB = w / 2;
                const centerYB = -h / 2;
                
                // Determine base side (before rotation)
                const sidesB = ['top', 'right', 'bottom', 'left'];
                const sideIndexB = sidesB.indexOf(side);
                const baseSideIndexB = (sideIndexB - rotation + 4) % 4;
                const baseSideB = sidesB[baseSideIndexB];
                
                // Calculate arc intersection point with module boundary in B0 system
                // Center: (w/2, -h/2), radius: stem/4, arc from PI/2 to PI
                
                let angleB;
                if (baseSideB === 'top') {
                    // Exit point is arc end point at angle = PI
                    angleB = Math.PI;
                    localX = centerXB + arcRadiusB * Math.cos(angleB);
                    localY = centerYB + arcRadiusB * Math.sin(angleB);
                } else if (baseSideB === 'right') {
                    // Exit point is arc start point at angle = PI/2
                    angleB = Math.PI / 2;
                    localX = centerXB + arcRadiusB * Math.cos(angleB);
                    localY = centerYB + arcRadiusB * Math.sin(angleB);
                }
                
                // Rotate in module rotation direction
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
        
        // If coordinates not calculated (remained 0,0), use fallback on module side
        if (localX === 0 && localY === 0 && type !== 'C') {
            // Fallback: return coordinates on module side
            const sideCoords = {
                'top': { x: half, y: 0 },
                'right': { x: w, y: half },
                'bottom': { x: half, y: h },
                'left': { x: 0, y: half }
            };
            const fallback = sideCoords[side] || { x: half, y: half };
            return fallback;
        }
        
        // Apply rotation to local coordinates
        // Rotation: 0=0°, 1=90°, 2=180°, 3=270°
        const rotationAngle = rotation * Math.PI / 2;
        const cosR = Math.cos(rotationAngle);
        const sinR = Math.sin(rotationAngle);
        const rotatedX = localX * cosR - localY * sinR;
        const rotatedY = localX * sinR + localY * cosR;
        
        // Return coordinates relative to module start (0, 0)
        // These coordinates will be used relative to module position (x + col*moduleSize, y + row*moduleSize)
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
     * Analyze glyph and find all points
     * @param {string} glyphString - glyph string (50 characters)
     * @param {number} cols - number of columns (usually 5)
     * @param {number} rows - number of rows (usually 5)
     * @returns {Object} {connections: [], endpoints: []}
     */
    analyzeGlyph(glyphString, cols = 5, rows = 5) {
        const connections = []; // Joints (blue)
        const endpoints = [];   // Endpoints (red)
        
        // Convert string to module grid
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
        
        // Analyze each module
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const module = grid[row][col];
                if (module.type === 'E') continue; // Skip empty
                
                const exits = this.getExits(module.type, module.rotation);
                const isCurve = module.type === 'R' || module.type === 'B';
                
                // For R/B: track which sides have connections
                const curveConnectedSides = new Set();
                
                // Check each side
                ['top', 'right', 'bottom', 'left'].forEach(side => {
                    // Neighbor coordinates
                    const neighbor = this.getNeighborCoords(col, row, side);
                    
                    // Check if neighbor exists in grid
                    if (neighbor.row < 0 || neighbor.row >= rows || 
                        neighbor.col < 0 || neighbor.col >= cols) {
                        // Out of bounds - this is endpoint only if there's exit on this side
                        if (exits[side]) {
                            endpoints.push({ col, row, side });
                        }
                        return;
                    }
                    
                    const neighborModule = grid[neighbor.row][neighbor.col];
                    
                    // If neighbor is empty - this is endpoint only if there's exit on this side
                    if (neighborModule.type === 'E') {
                        if (exits[side]) {
                            // For R/B: add endpoint later, only if there's NO connection on this side
                            if (!isCurve) {
                                endpoints.push({ col, row, side });
                            }
                        }
                        return;
                    }
                    
                    // Check if neighbor has exit on our side
                    const currentExits = this.getExits(module.type, module.rotation);
                    const neighborExits = this.getExits(neighborModule.type, neighborModule.rotation);
                    const oppositeSide = this.getOppositeSide(side);
                    
                    let isConnected = false;
                    
                    // Check 1: Direct connection (current module exit matches neighbor exit)
                    if (neighborExits[oppositeSide]) {
                        isConnected = true;
                    }
                    
                    // Check 2: Corner connection through common side
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
                    
                    // Check 3: Special logic for arcs (R and B)
                    // Arcs always connect with adjacent arcs, even if they have no common exits
                    if (!isConnected) {
                        const isCurve = (type) => type === 'R' || type === 'B';
                        if (isCurve(module.type) && isCurve(neighborModule.type)) {
                            isConnected = true;
                        }
                    }
                    
                    
                    if (isConnected) {
                        // Connection found!
                        if (isCurve) {
                            // Remember that there's a connection on this side
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
                        // Neighbor exists but doesn't connect, and current module has exit - endpoint
                        if (!isCurve) {
                            endpoints.push({ col, row, side });
                        }
                    }
                });
                
                // For R/B: add endpoints only on sides with exit,
                // where there's NO connection and neighbor is empty (E)
                if (isCurve) {
                    Object.keys(exits).forEach(side => {
                        // If no connection on this side - check if there's E there
                        if (!curveConnectedSides.has(side)) {
                            const neighbor = this.getNeighborCoords(col, row, side);
                            
                            // Out of bounds or empty neighbor?
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
        // Point radius in pixels (independent of scale)
        const pointRadius = 6;
        const strokeWidth = 2;
        
        
        // Draw joints (blue circles)
        // Fill: Background, Stroke: Letter Color
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
        
        // Draw endpoints (red circles)
        // Fill: Letter Color, Stroke: Letter Color
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

