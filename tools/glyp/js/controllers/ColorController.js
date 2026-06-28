/**
 * ColorController — manages color modes (solid, gradient, random).
 */

import { ColorUtils } from '../utils/ColorUtils.js';

export class ColorController {
    constructor() {
        this.mode = 'solid'; // 'solid' | 'gradient' | 'random'
        this.solidColor = '#ffffff';
        this.gradientStart = '#ffffff';
        this.gradientEnd = '#888888';
        this.palette = [];
        this.onChange = null;
    }

    setMode(mode) {
        this.mode = mode;
        this._emit();
    }

    setSolidColor(color) {
        this.solidColor = color;
        this._emit();
    }

    setGradient(start, end) {
        this.gradientStart = start;
        this.gradientEnd = end;
        this._emit();
    }

    setPalette(colors) {
        this.palette = colors;
        this._emit();
    }

    getCurrentColor() {
        if (this.mode === 'solid') return this.solidColor;
        if (this.mode === 'random' && this.palette.length > 0) {
            return this.palette[Math.floor(Math.random() * this.palette.length)];
        }
        return this.solidColor;
    }

    _emit() {
        if (this.onChange) this.onChange(this);
    }
}
