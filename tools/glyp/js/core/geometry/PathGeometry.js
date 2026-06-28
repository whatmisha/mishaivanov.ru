/**
 * PathGeometry — geometric operations on normalized path data.
 * Provides utilities for sampling points along paths, computing tangents,
 * creating parallel offsets, and transforming paths.
 */

export class PathGeometry {
    /**
     * Sample a point along a path at parameter t (0..1 along total arc length).
     * @param {Array} commands - Normalized path commands
     * @param {number} t - Parameter [0,1]
     * @returns {{x: number, y: number, angle: number}}
     */
    static sampleAt(commands, t) {
        const points = PathGeometry.toPolyline(commands, 64);
        if (points.length < 2) return { x: 0, y: 0, angle: 0 };

        const totalLength = PathGeometry.polylineLength(points);
        const targetDist = t * totalLength;
        let accumulated = 0;

        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            const segLen = Math.sqrt(dx * dx + dy * dy);

            if (accumulated + segLen >= targetDist) {
                const frac = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
                return {
                    x: points[i - 1].x + dx * frac,
                    y: points[i - 1].y + dy * frac,
                    angle: Math.atan2(dy, dx)
                };
            }
            accumulated += segLen;
        }

        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        return {
            x: last.x,
            y: last.y,
            angle: Math.atan2(last.y - prev.y, last.x - prev.x)
        };
    }

    /**
     * Convert path commands to a polyline (array of {x, y} points).
     * @param {Array} commands - Path commands
     * @param {number} [subdivisions=32] - Curve subdivision count
     * @returns {Array<{x: number, y: number}>}
     */
    static toPolyline(commands, subdivisions = 32) {
        const points = [];
        let cx = 0, cy = 0;
        let sx = 0, sy = 0;

        for (const cmd of commands) {
            const { type, args } = cmd;

            switch (type) {
                case 'M':
                    cx = args[0];
                    cy = args[1];
                    sx = cx;
                    sy = cy;
                    points.push({ x: cx, y: cy });
                    break;

                case 'L':
                    cx = args[0];
                    cy = args[1];
                    points.push({ x: cx, y: cy });
                    break;

                case 'H':
                    cx = args[0];
                    points.push({ x: cx, y: cy });
                    break;

                case 'V':
                    cy = args[0];
                    points.push({ x: cx, y: cy });
                    break;

                case 'C': {
                    const x1 = args[0], y1 = args[1];
                    const x2 = args[2], y2 = args[3];
                    const x = args[4], y = args[5];
                    for (let i = 1; i <= subdivisions; i++) {
                        const t = i / subdivisions;
                        const pt = PathGeometry.cubicBezierPoint(cx, cy, x1, y1, x2, y2, x, y, t);
                        points.push(pt);
                    }
                    cx = x;
                    cy = y;
                    break;
                }

                case 'Q': {
                    const x1 = args[0], y1 = args[1];
                    const x = args[2], y = args[3];
                    for (let i = 1; i <= subdivisions; i++) {
                        const t = i / subdivisions;
                        const pt = PathGeometry.quadBezierPoint(cx, cy, x1, y1, x, y, t);
                        points.push(pt);
                    }
                    cx = x;
                    cy = y;
                    break;
                }

                case 'A': {
                    const rx = args[0], ry = args[1];
                    const xRot = args[2], largeArc = args[3], sweep = args[4];
                    const ex = args[5], ey = args[6];
                    const arcPoints = PathGeometry.arcToPoints(cx, cy, rx, ry, xRot, largeArc, sweep, ex, ey, subdivisions);
                    points.push(...arcPoints);
                    cx = ex;
                    cy = ey;
                    break;
                }

                case 'Z':
                    if (cx !== sx || cy !== sy) {
                        cx = sx;
                        cy = sy;
                        points.push({ x: cx, y: cy });
                    }
                    break;
            }
        }

        return points;
    }

    /**
     * Calculate total length of a polyline.
     */
    static polylineLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    /**
     * Point on cubic Bezier curve.
     */
    static cubicBezierPoint(x0, y0, x1, y1, x2, y2, x3, y3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        return {
            x: mt2 * mt * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t2 * t * x3,
            y: mt2 * mt * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t2 * t * y3
        };
    }

    /**
     * Point on quadratic Bezier curve.
     */
    static quadBezierPoint(x0, y0, x1, y1, x2, y2, t) {
        const mt = 1 - t;
        return {
            x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
            y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
        };
    }

    /**
     * Convert SVG arc to polyline points.
     */
    static arcToPoints(cx, cy, rx, ry, xRotDeg, largeArc, sweep, ex, ey, subdivisions) {
        if (rx === 0 || ry === 0) return [{ x: ex, y: ey }];

        const xRot = xRotDeg * Math.PI / 180;
        const cosR = Math.cos(xRot);
        const sinR = Math.sin(xRot);

        let dx = (cx - ex) / 2;
        let dy = (cy - ey) / 2;
        const x1p = cosR * dx + sinR * dy;
        const y1p = -sinR * dx + cosR * dy;

        let rxSq = rx * rx;
        let rySq = ry * ry;
        const x1pSq = x1p * x1p;
        const y1pSq = y1p * y1p;

        let lambda = x1pSq / rxSq + y1pSq / rySq;
        if (lambda > 1) {
            const lambdaSqrt = Math.sqrt(lambda);
            rx *= lambdaSqrt;
            ry *= lambdaSqrt;
            rxSq = rx * rx;
            rySq = ry * ry;
        }

        let num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
        let den = rxSq * y1pSq + rySq * x1pSq;
        let sq = Math.max(0, num / den);
        sq = Math.sqrt(sq) * (largeArc === sweep ? -1 : 1);

        const cxp = sq * rx * y1p / ry;
        const cyp = -sq * ry * x1p / rx;

        const ccx = cosR * cxp - sinR * cyp + (cx + ex) / 2;
        const ccy = sinR * cxp + cosR * cyp + (cy + ey) / 2;

        const startAngle = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
        let deltaAngle = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx) - startAngle;

        if (sweep && deltaAngle < 0) deltaAngle += 2 * Math.PI;
        if (!sweep && deltaAngle > 0) deltaAngle -= 2 * Math.PI;

        const points = [];
        for (let i = 1; i <= subdivisions; i++) {
            const t = i / subdivisions;
            const angle = startAngle + deltaAngle * t;
            const px = rx * Math.cos(angle);
            const py = ry * Math.sin(angle);
            points.push({
                x: cosR * px - sinR * py + ccx,
                y: sinR * px + cosR * py + ccy
            });
        }

        return points;
    }

    /**
     * Create a parallel offset of a polyline at a given distance.
     * Positive distance = left side, negative = right side.
     * @param {Array<{x, y}>} points - Source polyline
     * @param {number} distance - Offset distance
     * @returns {Array<{x, y}>}
     */
    static offsetPolyline(points, distance) {
        if (points.length < 2) return points;

        const normals = [];
        for (let i = 0; i < points.length; i++) {
            let nx, ny;
            if (i === 0) {
                const dx = points[1].x - points[0].x;
                const dy = points[1].y - points[0].y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                nx = -dy / len;
                ny = dx / len;
            } else if (i === points.length - 1) {
                const dx = points[i].x - points[i - 1].x;
                const dy = points[i].y - points[i - 1].y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                nx = -dy / len;
                ny = dx / len;
            } else {
                const dx1 = points[i].x - points[i - 1].x;
                const dy1 = points[i].y - points[i - 1].y;
                const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;

                const dx2 = points[i + 1].x - points[i].x;
                const dy2 = points[i + 1].y - points[i].y;
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

                nx = -(dy1 / len1 + dy2 / len2) / 2;
                ny = (dx1 / len1 + dx2 / len2) / 2;
                const nLen = Math.sqrt(nx * nx + ny * ny) || 1;
                nx /= nLen;
                ny /= nLen;
            }
            normals.push({ x: nx, y: ny });
        }

        return points.map((p, i) => ({
            x: p.x + normals[i].x * distance,
            y: p.y + normals[i].y * distance
        }));
    }

    /**
     * Get the tangent angle at the start of the path.
     */
    static startAngle(commands) {
        const points = PathGeometry.toPolyline(commands, 8);
        if (points.length < 2) return 0;
        return Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
    }

    /**
     * Get the tangent angle at the end of the path.
     */
    static endAngle(commands) {
        const points = PathGeometry.toPolyline(commands, 8);
        if (points.length < 2) return 0;
        const n = points.length;
        return Math.atan2(points[n - 1].y - points[n - 2].y, points[n - 1].x - points[n - 2].x);
    }

    /**
     * Scale path commands by cell size (from [0,1] to pixel space).
     * @param {Array} commands - Normalized commands
     * @param {number} cellW - Cell width in pixels
     * @param {number} cellH - Cell height in pixels
     * @param {number} offsetX - Cell x offset in pixels
     * @param {number} offsetY - Cell y offset in pixels
     * @returns {Array} Scaled commands
     */
    static scaleToCell(commands, cellW, cellH, offsetX = 0, offsetY = 0) {
        return commands.map(cmd => {
            const { type, args } = cmd;
            if (type === 'Z') return { type, args: [] };

            const scaled = [];
            switch (type) {
                case 'M':
                case 'L':
                case 'T':
                    for (let i = 0; i < args.length; i += 2) {
                        scaled.push(args[i] * cellW + offsetX);
                        scaled.push(args[i + 1] * cellH + offsetY);
                    }
                    break;
                case 'H':
                    scaled.push(args[0] * cellW + offsetX);
                    break;
                case 'V':
                    scaled.push(args[0] * cellH + offsetY);
                    break;
                case 'C':
                case 'S':
                case 'Q':
                    for (let i = 0; i < args.length; i += 2) {
                        scaled.push(args[i] * cellW + offsetX);
                        scaled.push(args[i + 1] * cellH + offsetY);
                    }
                    break;
                case 'A':
                    scaled.push(args[0] * cellW);  // rx
                    scaled.push(args[1] * cellH);  // ry
                    scaled.push(args[2]);           // x-rotation
                    scaled.push(args[3]);           // large-arc
                    scaled.push(args[4]);           // sweep
                    scaled.push(args[5] * cellW + offsetX);
                    scaled.push(args[6] * cellH + offsetY);
                    break;
            }

            return { type, args: scaled };
        });
    }
}
