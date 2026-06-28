/**
 * PanelManager — manages draggable/collapsible UI panels.
 */

export class PanelManager {
    constructor() {
        this.panels = new Map();
    }

    /**
     * Register a panel element.
     */
    register(id, element, options = {}) {
        const panel = {
            element,
            collapsed: false,
            ...options
        };
        this.panels.set(id, panel);

        const header = element.querySelector('.panel-header');
        if (header && options.collapsible !== false) {
            header.style.cursor = 'pointer';
            header.addEventListener('dblclick', () => this.toggleCollapse(id));
        }
    }

    toggleCollapse(id) {
        const panel = this.panels.get(id);
        if (!panel) return;

        panel.collapsed = !panel.collapsed;
        const body = panel.element.querySelector('.panel-body, .panel-section');
        if (body) {
            body.style.display = panel.collapsed ? 'none' : '';
        }
    }

    collapse(id) {
        const panel = this.panels.get(id);
        if (!panel) return;
        panel.collapsed = true;
        const body = panel.element.querySelector('.panel-body');
        if (body) body.style.display = 'none';
    }

    expand(id) {
        const panel = this.panels.get(id);
        if (!panel) return;
        panel.collapsed = false;
        const body = panel.element.querySelector('.panel-body');
        if (body) body.style.display = '';
    }
}
