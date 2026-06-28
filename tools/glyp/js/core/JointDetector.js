/**
 * JointDetector — detects connections (joints) between adjacent modules in a glyph grid.
 * Determines which sides of each cell have free endpoints vs connected joints.
 */

export class JointDetector {
    /**
     * Analyze a glyph grid and return connection info for each cell.
     * @param {Array<{module: string|null, rotation: number}>} cells - Grid cells
     * @param {number} cols - Grid columns
     * @param {number} rows - Grid rows
     * @param {import('./ModuleRegistry.js').ModuleRegistry} registry - Module registry
     * @returns {Array<{top: string, right: string, bottom: string, left: string}>}
     *   Each cell gets a status per side: 'joint' | 'endpoint' | 'none'
     */
    static analyze(cells, cols, rows, registry) {
        const result = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const index = r * cols + c;
                const cell = cells[index];

                if (!cell || !cell.module) {
                    result.push({ top: 'none', right: 'none', bottom: 'none', left: 'none' });
                    continue;
                }

                const connections = registry.getRotatedConnections(cell.module, cell.rotation);
                const sides = {};

                for (const side of ['top', 'right', 'bottom', 'left']) {
                    if (!connections[side]) {
                        sides[side] = 'none';
                        continue;
                    }

                    const neighbor = JointDetector.getNeighbor(cells, cols, rows, r, c, side);
                    if (neighbor && neighbor.module) {
                        const neighborConns = registry.getRotatedConnections(neighbor.module, neighbor.rotation);
                        const oppositeSide = JointDetector.opposite(side);
                        sides[side] = neighborConns[oppositeSide] ? 'joint' : 'endpoint';
                    } else {
                        sides[side] = 'endpoint';
                    }
                }

                result.push(sides);
            }
        }

        return result;
    }

    /**
     * Get the neighbor cell in a given direction.
     */
    static getNeighbor(cells, cols, rows, row, col, side) {
        let nr = row, nc = col;
        switch (side) {
            case 'top': nr = row - 1; break;
            case 'bottom': nr = row + 1; break;
            case 'left': nc = col - 1; break;
            case 'right': nc = col + 1; break;
        }
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return null;
        return cells[nr * cols + nc];
    }

    /**
     * Get opposite side.
     */
    static opposite(side) {
        switch (side) {
            case 'top': return 'bottom';
            case 'bottom': return 'top';
            case 'left': return 'right';
            case 'right': return 'left';
        }
        return side;
    }

    /**
     * Get all free endpoints in a glyph (cells + sides that are endpoints).
     * Useful for visual highlighting.
     */
    static getFreeEndpoints(cells, cols, rows, registry) {
        const analysis = JointDetector.analyze(cells, cols, rows, registry);
        const endpoints = [];

        for (let i = 0; i < analysis.length; i++) {
            const info = analysis[i];
            const row = Math.floor(i / cols);
            const col = i % cols;

            for (const side of ['top', 'right', 'bottom', 'left']) {
                if (info[side] === 'endpoint') {
                    endpoints.push({ row, col, side });
                }
            }
        }

        return endpoints;
    }

    /**
     * Get all joints in a glyph (pairs of connected sides).
     * Returns unique pairs (not duplicates).
     */
    static getJoints(cells, cols, rows, registry) {
        const analysis = JointDetector.analyze(cells, cols, rows, registry);
        const joints = [];
        const seen = new Set();

        for (let i = 0; i < analysis.length; i++) {
            const info = analysis[i];
            const row = Math.floor(i / cols);
            const col = i % cols;

            for (const side of ['right', 'bottom']) {
                if (info[side] === 'joint') {
                    const key = `${row},${col},${side}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        const nr = side === 'bottom' ? row + 1 : row;
                        const nc = side === 'right' ? col + 1 : col;
                        joints.push({
                            cell1: { row, col },
                            cell2: { row: nr, col: nc },
                            orientation: side === 'right' ? 'vertical' : 'horizontal'
                        });
                    }
                }
            }
        }

        return joints;
    }
}
