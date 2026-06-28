/**
 * ColorPicker — simple color selection widget.
 */

import { ColorUtils } from '../utils/ColorUtils.js';

export class ColorPicker {
    constructor(element, options = {}) {
        this.element = element;
        this.value = options.value ?? '#ffffff';
        this.onChange = options.onChange ?? (() => {});

        this._init();
    }

    _init() {
        this.element.type = 'color';
        this.element.value = this.value;

        this.element.addEventListener('input', () => {
            this.value = this.element.value;
            this.onChange(this.value);
        });
    }

    setValue(color) {
        this.value = color;
        this.element.value = color;
    }

    getValue() {
        return this.value;
    }
}
