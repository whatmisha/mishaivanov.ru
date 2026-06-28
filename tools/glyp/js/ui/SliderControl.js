/**
 * SliderControl — enhanced slider with label and value display.
 */

export class SliderControl {
    constructor(container, options = {}) {
        this.container = container;
        this.min = options.min ?? 0;
        this.max = options.max ?? 1;
        this.step = options.step ?? 0.01;
        this.value = options.value ?? this.min;
        this.label = options.label ?? '';
        this.onChange = options.onChange ?? (() => {});

        this._build();
    }

    _build() {
        this.container.classList.add('param-row');
        this.container.innerHTML = `
            <label>${this.label}</label>
            <input type="range" min="${this.min}" max="${this.max}" step="${this.step}" value="${this.value}">
            <span class="param-value">${this._formatValue()}</span>
        `;

        this.input = this.container.querySelector('input');
        this.display = this.container.querySelector('.param-value');

        this.input.addEventListener('input', () => {
            this.value = parseFloat(this.input.value);
            this.display.textContent = this._formatValue();
            this.onChange(this.value);
        });
    }

    setValue(v) {
        this.value = v;
        this.input.value = v;
        this.display.textContent = this._formatValue();
    }

    _formatValue() {
        if (Number.isInteger(this.step) || this.step >= 1) {
            return Math.round(this.value).toString();
        }
        return this.value.toFixed(2);
    }
}
