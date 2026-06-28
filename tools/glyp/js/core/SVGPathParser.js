/**
 * SVGPathParser — parses SVG files and extracts normalized path data.
 * Paths are normalized to [0,1]x[0,1] coordinate space (unit cell).
 */

export class SVGPathParser {
    /**
     * Parse an SVG string and extract all <path> elements as normalized path data.
     * @param {string} svgString - Raw SVG file content
     * @returns {{ paths: Array<{d: string, original: string}>, viewBox: {x:number, y:number, w:number, h:number} }}
     */
    static parse(svgString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.querySelector('svg');

        if (!svg) {
            throw new Error('Invalid SVG: no <svg> element found');
        }

        const viewBox = SVGPathParser.getViewBox(svg);
        const pathElements = svg.querySelectorAll('path');
        const paths = [];

        for (const pathEl of pathElements) {
            const d = pathEl.getAttribute('d');
            if (!d) continue;

            const commands = SVGPathParser.parseDAttribute(d);
            const normalized = SVGPathParser.normalizeCommands(commands, viewBox);
            const normalizedD = SVGPathParser.commandsToString(normalized);

            paths.push({
                d: normalizedD,
                original: d,
                commands: normalized
            });
        }

        return { paths, viewBox };
    }

    /**
     * Extract viewBox from SVG element, falling back to width/height.
     */
    static getViewBox(svg) {
        const vb = svg.getAttribute('viewBox');
        if (vb) {
            const parts = vb.trim().split(/[\s,]+/).map(Number);
            return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
        }

        const w = parseFloat(svg.getAttribute('width')) || 100;
        const h = parseFloat(svg.getAttribute('height')) || 100;
        return { x: 0, y: 0, w, h };
    }

    /**
     * Parse SVG path d-attribute into an array of command objects.
     * Supports: M, L, H, V, C, S, Q, T, A, Z (and lowercase relative variants).
     */
    static parseDAttribute(d) {
        const commands = [];
        const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
        let match;

        while ((match = regex.exec(d)) !== null) {
            const type = match[1];
            const argsStr = match[2].trim();
            const args = argsStr ? argsStr.split(/[\s,]+/).map(Number) : [];
            commands.push({ type, args });
        }

        return commands;
    }

    /**
     * Convert relative commands to absolute and normalize coordinates to [0,1]x[0,1].
     */
    static normalizeCommands(commands, viewBox) {
        const { x: vx, y: vy, w: vw, h: vh } = viewBox;
        const absolute = SVGPathParser.toAbsolute(commands);
        const normalized = [];

        for (const cmd of absolute) {
            const { type, args } = cmd;
            const normArgs = [];

            switch (type) {
                case 'M':
                case 'L':
                case 'T':
                    for (let i = 0; i < args.length; i += 2) {
                        normArgs.push((args[i] - vx) / vw);
                        normArgs.push((args[i + 1] - vy) / vh);
                    }
                    break;
                case 'H':
                    normArgs.push((args[0] - vx) / vw);
                    break;
                case 'V':
                    normArgs.push((args[0] - vy) / vh);
                    break;
                case 'C':
                    for (let i = 0; i < args.length; i += 2) {
                        normArgs.push((args[i] - vx) / vw);
                        normArgs.push((args[i + 1] - vy) / vh);
                    }
                    break;
                case 'S':
                case 'Q':
                    for (let i = 0; i < args.length; i += 2) {
                        normArgs.push((args[i] - vx) / vw);
                        normArgs.push((args[i + 1] - vy) / vh);
                    }
                    break;
                case 'A':
                    normArgs.push(args[0] / vw); // rx
                    normArgs.push(args[1] / vh); // ry
                    normArgs.push(args[2]);       // x-rotation
                    normArgs.push(args[3]);       // large-arc
                    normArgs.push(args[4]);       // sweep
                    normArgs.push((args[5] - vx) / vw); // x
                    normArgs.push((args[6] - vy) / vh); // y
                    break;
                case 'Z':
                    break;
            }

            normalized.push({ type, args: normArgs });
        }

        return normalized;
    }

    /**
     * Convert all relative commands to absolute.
     */
    static toAbsolute(commands) {
        const result = [];
        let cx = 0, cy = 0;
        let sx = 0, sy = 0; // start of subpath

        for (const cmd of commands) {
            const { type, args } = cmd;
            const isRelative = type === type.toLowerCase();
            const absType = type.toUpperCase();

            if (absType === 'Z') {
                result.push({ type: 'Z', args: [] });
                cx = sx;
                cy = sy;
                continue;
            }

            const absArgs = [];

            switch (absType) {
                case 'M':
                    for (let i = 0; i < args.length; i += 2) {
                        const x = isRelative ? cx + args[i] : args[i];
                        const y = isRelative ? cy + args[i + 1] : args[i + 1];
                        absArgs.push(x, y);
                        cx = x;
                        cy = y;
                        if (i === 0) { sx = x; sy = y; }
                    }
                    break;
                case 'L':
                    for (let i = 0; i < args.length; i += 2) {
                        const x = isRelative ? cx + args[i] : args[i];
                        const y = isRelative ? cy + args[i + 1] : args[i + 1];
                        absArgs.push(x, y);
                        cx = x;
                        cy = y;
                    }
                    break;
                case 'H':
                    for (let i = 0; i < args.length; i++) {
                        const x = isRelative ? cx + args[i] : args[i];
                        absArgs.push(x);
                        cx = x;
                    }
                    break;
                case 'V':
                    for (let i = 0; i < args.length; i++) {
                        const y = isRelative ? cy + args[i] : args[i];
                        absArgs.push(y);
                        cy = y;
                    }
                    break;
                case 'C':
                    for (let i = 0; i < args.length; i += 6) {
                        const x1 = isRelative ? cx + args[i] : args[i];
                        const y1 = isRelative ? cy + args[i + 1] : args[i + 1];
                        const x2 = isRelative ? cx + args[i + 2] : args[i + 2];
                        const y2 = isRelative ? cy + args[i + 3] : args[i + 3];
                        const x = isRelative ? cx + args[i + 4] : args[i + 4];
                        const y = isRelative ? cy + args[i + 5] : args[i + 5];
                        absArgs.push(x1, y1, x2, y2, x, y);
                        cx = x;
                        cy = y;
                    }
                    break;
                case 'S':
                    for (let i = 0; i < args.length; i += 4) {
                        const x2 = isRelative ? cx + args[i] : args[i];
                        const y2 = isRelative ? cy + args[i + 1] : args[i + 1];
                        const x = isRelative ? cx + args[i + 2] : args[i + 2];
                        const y = isRelative ? cy + args[i + 3] : args[i + 3];
                        absArgs.push(x2, y2, x, y);
                        cx = x;
                        cy = y;
                    }
                    break;
                case 'Q':
                    for (let i = 0; i < args.length; i += 4) {
                        const x1 = isRelative ? cx + args[i] : args[i];
                        const y1 = isRelative ? cy + args[i + 1] : args[i + 1];
                        const x = isRelative ? cx + args[i + 2] : args[i + 2];
                        const y = isRelative ? cy + args[i + 3] : args[i + 3];
                        absArgs.push(x1, y1, x, y);
                        cx = x;
                        cy = y;
                    }
                    break;
                case 'T':
                    for (let i = 0; i < args.length; i += 2) {
                        const x = isRelative ? cx + args[i] : args[i];
                        const y = isRelative ? cy + args[i + 1] : args[i + 1];
                        absArgs.push(x, y);
                        cx = x;
                        cy = y;
                    }
                    break;
                case 'A':
                    for (let i = 0; i < args.length; i += 7) {
                        const rx = args[i];
                        const ry = args[i + 1];
                        const rot = args[i + 2];
                        const large = args[i + 3];
                        const sweep = args[i + 4];
                        const x = isRelative ? cx + args[i + 5] : args[i + 5];
                        const y = isRelative ? cy + args[i + 6] : args[i + 6];
                        absArgs.push(rx, ry, rot, large, sweep, x, y);
                        cx = x;
                        cy = y;
                    }
                    break;
            }

            result.push({ type: absType, args: absArgs });
        }

        return result;
    }

    /**
     * Serialize commands back to a d-attribute string.
     */
    static commandsToString(commands) {
        return commands.map(cmd => {
            if (cmd.type === 'Z') return 'Z';
            const args = cmd.args.map(n => Math.round(n * 10000) / 10000).join(' ');
            return `${cmd.type} ${args}`;
        }).join(' ');
    }

    /**
     * Rotate a normalized path by 90-degree increments.
     * @param {Array} commands - Normalized path commands
     * @param {number} rotation - 0, 1, 2, or 3 (0°, 90°, 180°, 270° clockwise)
     * @returns {Array} Rotated commands
     */
    static rotateCommands(commands, rotation) {
        if (rotation === 0) return commands;

        return commands.map(cmd => {
            const { type, args } = cmd;
            if (type === 'Z') return { type, args: [] };

            const rotatedArgs = [];

            switch (type) {
                case 'M':
                case 'L':
                case 'T':
                    for (let i = 0; i < args.length; i += 2) {
                        const [rx, ry] = SVGPathParser.rotatePoint(args[i], args[i + 1], rotation);
                        rotatedArgs.push(rx, ry);
                    }
                    break;
                case 'H': {
                    const [rx, ry] = SVGPathParser.rotatePoint(args[0], 0, rotation);
                    return { type: rotation % 2 === 0 ? 'H' : 'V', args: [rotation % 2 === 0 ? rx : ry] };
                }
                case 'V': {
                    const [rx, ry] = SVGPathParser.rotatePoint(0, args[0], rotation);
                    return { type: rotation % 2 === 0 ? 'V' : 'H', args: [rotation % 2 === 0 ? ry : rx] };
                }
                case 'C':
                    for (let i = 0; i < args.length; i += 2) {
                        const [rx, ry] = SVGPathParser.rotatePoint(args[i], args[i + 1], rotation);
                        rotatedArgs.push(rx, ry);
                    }
                    break;
                case 'S':
                case 'Q':
                    for (let i = 0; i < args.length; i += 2) {
                        const [rx, ry] = SVGPathParser.rotatePoint(args[i], args[i + 1], rotation);
                        rotatedArgs.push(rx, ry);
                    }
                    break;
                case 'A': {
                    const rx = args[0];
                    const ry = args[1];
                    const xRot = args[2];
                    const large = args[3];
                    const sweep = args[4];
                    const [ex, ey] = SVGPathParser.rotatePoint(args[5], args[6], rotation);
                    if (rotation % 2 === 0) {
                        rotatedArgs.push(rx, ry, xRot, large, sweep, ex, ey);
                    } else {
                        rotatedArgs.push(ry, rx, (xRot + 90 * rotation) % 360, large, sweep, ex, ey);
                    }
                    break;
                }
            }

            return { type, args: rotatedArgs };
        });
    }

    /**
     * Rotate a point in [0,1]x[0,1] space by 90° increments clockwise around center (0.5, 0.5).
     */
    static rotatePoint(x, y, rotation) {
        const cx = 0.5, cy = 0.5;
        let rx = x - cx, ry = y - cy;

        for (let i = 0; i < rotation; i++) {
            const tmp = rx;
            rx = -ry;
            ry = tmp;
        }

        return [rx + cx, ry + cy];
    }

    /**
     * Get the bounding box of a set of commands.
     */
    static getBounds(commands) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const cmd of commands) {
            const { type, args } = cmd;
            if (type === 'Z') continue;

            switch (type) {
                case 'M':
                case 'L':
                case 'T':
                case 'C':
                case 'S':
                case 'Q':
                    for (let i = 0; i < args.length; i += 2) {
                        minX = Math.min(minX, args[i]);
                        minY = Math.min(minY, args[i + 1]);
                        maxX = Math.max(maxX, args[i]);
                        maxY = Math.max(maxY, args[i + 1]);
                    }
                    break;
                case 'H':
                    minX = Math.min(minX, args[0]);
                    maxX = Math.max(maxX, args[0]);
                    break;
                case 'V':
                    minY = Math.min(minY, args[0]);
                    maxY = Math.max(maxY, args[0]);
                    break;
                case 'A':
                    minX = Math.min(minX, args[5]);
                    minY = Math.min(minY, args[6]);
                    maxX = Math.max(maxX, args[5]);
                    maxY = Math.max(maxY, args[6]);
                    break;
            }
        }

        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }
}
