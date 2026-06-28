/**
 * ModuleDesigner — UI logic for importing SVG modules and marking connection points.
 * Handles SVG file loading, path extraction, endpoint annotation, and module preview.
 */

import { SVGPathParser } from '../core/SVGPathParser.js';
import { ParametricRenderer } from '../core/ParametricRenderer.js';

export class ModuleDesigner {
    constructor(canvas, registry) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.registry = registry;
        this.renderer = new ParametricRenderer();

        this.currentPaths = [];
        this.currentSvgSource = null;
        this.connections = { top: false, right: false, bottom: false, left: false };
        this.moduleName = '';
        this.moduleShortcut = '';

        this.previewRotation = 0;
        this.padding = 30;

        this._boundClick = this._onClick.bind(this);
        this._active = false;
    }

    activate() {
        if (this._active) return;
        this._active = true;
        this.canvas.addEventListener('click', this._boundClick);
        this.render();
    }

    deactivate() {
        if (!this._active) return;
        this._active = false;
        this.canvas.removeEventListener('click', this._boundClick);
    }

    /**
     * Load an SVG file and extract paths.
     * @param {File} file - SVG file from file input
     */
    async loadSVG(file) {
        const text = await file.text();
        return this.loadSVGString(text);
    }

    /**
     * Load SVG from string.
     */
    loadSVGString(svgString) {
        const { paths } = SVGPathParser.parse(svgString);
        this.currentPaths = paths;
        this.currentSvgSource = svgString;
        this.connections = { top: false, right: false, bottom: false, left: false };
        this._autoDetectConnections();
        this.render();
        return paths;
    }

    /**
     * Auto-detect which sides have connection points based on path endpoints.
     * A connection is assumed when a path starts or ends near a cell edge.
     */
    _autoDetectConnections() {
        const threshold = 0.05;

        for (const path of this.currentPaths) {
            if (!path.commands || path.commands.length === 0) continue;

            const points = this._getPathEndpoints(path.commands);

            for (const pt of points) {
                if (pt.y <= threshold) this.connections.top = true;
                if (pt.y >= 1 - threshold) this.connections.bottom = true;
                if (pt.x <= threshold) this.connections.left = true;
                if (pt.x >= 1 - threshold) this.connections.right = true;
            }
        }
    }

    /**
     * Get the start and end points of a path's commands.
     */
    _getPathEndpoints(commands) {
        const points = [];
        let firstX = null, firstY = null;
        let lastX = 0, lastY = 0;

        for (const cmd of commands) {
            switch (cmd.type) {
                case 'M':
                    if (firstX === null) { firstX = cmd.args[0]; firstY = cmd.args[1]; }
                    lastX = cmd.args[0]; lastY = cmd.args[1];
                    break;
                case 'L':
                case 'T':
                    lastX = cmd.args[0]; lastY = cmd.args[1];
                    break;
                case 'H':
                    lastX = cmd.args[0];
                    break;
                case 'V':
                    lastY = cmd.args[0];
                    break;
                case 'C':
                    lastX = cmd.args[4]; lastY = cmd.args[5];
                    break;
                case 'S':
                case 'Q':
                    lastX = cmd.args[cmd.args.length - 2]; lastY = cmd.args[cmd.args.length - 1];
                    break;
                case 'A':
                    lastX = cmd.args[5]; lastY = cmd.args[6];
                    break;
            }
        }

        if (firstX !== null) points.push({ x: firstX, y: firstY });
        points.push({ x: lastX, y: lastY });

        return points;
    }

    /**
     * Toggle a connection side.
     */
    toggleConnection(side) {
        this.connections[side] = !this.connections[side];
        this.render();
    }

    /**
     * Set connection for a side.
     */
    setConnection(side, value) {
        this.connections[side] = value;
        this.render();
    }

    /**
     * Save the current module to the registry.
     * @returns {string} Module ID
     */
    saveModule() {
        if (this.currentPaths.length === 0) return null;

        const moduleDef = {
            name: this.moduleName || 'Module',
            shortcut: this.moduleShortcut || null,
            paths: this.currentPaths.map(p => ({
                d: p.d,
                commands: p.commands
            })),
            connections: { ...this.connections },
            svgSource: this.currentSvgSource
        };

        const id = this.registry.add(moduleDef);
        this.reset();
        return id;
    }

    /**
     * Update an existing module in the registry.
     */
    updateModule(moduleId) {
        if (this.currentPaths.length === 0) return false;

        this.registry.update(moduleId, {
            name: this.moduleName,
            shortcut: this.moduleShortcut,
            paths: this.currentPaths.map(p => ({
                d: p.d,
                commands: p.commands
            })),
            connections: { ...this.connections },
            svgSource: this.currentSvgSource
        });

        return true;
    }

    /**
     * Load an existing module for editing.
     */
    editModule(moduleId) {
        const mod = this.registry.get(moduleId);
        if (!mod) return false;

        this.currentPaths = mod.paths.map(p => ({
            d: p.d,
            commands: [...p.commands]
        }));
        this.currentSvgSource = mod.svgSource;
        this.connections = { ...mod.connections };
        this.moduleName = mod.name;
        this.moduleShortcut = mod.shortcut || '';
        this.render();
        return true;
    }

    /**
     * Reset the designer to empty state.
     */
    reset() {
        this.currentPaths = [];
        this.currentSvgSource = null;
        this.connections = { top: false, right: false, bottom: false, left: false };
        this.moduleName = '';
        this.moduleShortcut = '';
        this.previewRotation = 0;
        this.render();
    }

    // --- Rendering ---

    render() {
        if (!this._active) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        const cellSize = Math.min(w, h) - this.padding * 2;
        const ox = (w - cellSize) / 2;
        const oy = (h - cellSize) / 2;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, cellSize, cellSize);
        ctx.restore();

        if (this.currentPaths.length > 0) {
            for (const path of this.currentPaths) {
                const rotated = SVGPathParser.rotateCommands(path.commands, this.previewRotation);
                this.renderer.drawPath(ctx, rotated, ox, oy, cellSize, cellSize);
            }
        }

        this._drawConnectionMarkers(ctx, ox, oy, cellSize);
    }

    _drawConnectionMarkers(ctx, ox, oy, cellSize) {
        const sides = ['top', 'right', 'bottom', 'left'];
        const positions = {
            top: { x: ox + cellSize / 2, y: oy },
            bottom: { x: ox + cellSize / 2, y: oy + cellSize },
            left: { x: ox, y: oy + cellSize / 2 },
            right: { x: ox + cellSize, y: oy + cellSize / 2 }
        };

        ctx.save();
        for (const side of sides) {
            const pos = positions[side];
            const active = this.connections[side];

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = active ? 'rgba(100, 200, 100, 0.8)' : 'rgba(80, 80, 80, 0.5)';
            ctx.fill();

            ctx.strokeStyle = active ? 'rgba(100, 200, 100, 1)' : 'rgba(120, 120, 120, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }

    _onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const cellSize = Math.min(w, h) - this.padding * 2;
        const ox = (w - cellSize) / 2;
        const oy = (h - cellSize) / 2;

        const positions = {
            top: { x: ox + cellSize / 2, y: oy },
            bottom: { x: ox + cellSize / 2, y: oy + cellSize },
            left: { x: ox, y: oy + cellSize / 2 },
            right: { x: ox + cellSize, y: oy + cellSize / 2 }
        };

        for (const [side, pos] of Object.entries(positions)) {
            const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
            if (dist < 15) {
                this.toggleConnection(side);
                this.canvas.dispatchEvent(new CustomEvent('connectionchange', {
                    detail: { side, value: this.connections[side] }
                }));
                return;
            }
        }
    }
}
