/**
 * ModalManager — native `<dialog>` host for preset prompts/notifications.
 */

/** Share / delete glyphs — keep in sync with `PresetsController` preset row actions. */
const MODAL_PRESET_SHARE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M5.7410987,3.4304742l.6124561-.6124561c.7810478-.7810478,2.0473765-.7810478,2.8284243,0l.0000028.0000028c.7810478.7810478.7810478,2.0473765,0,2.8284243l-.6124561.6124561"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M6.2589013,8.5695258l-.6124561.6124561c-.7810478.7810478-2.0473765.7810478-2.8284243,0l-.0000028-.0000028c-.7810478-.7810478-.7810478-2.0473765,0-2.8284243l.6124561-.6124561"/><line x1="7.5184826" y1="4.4815174" x2="4.4815174" y2="7.5184826" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"/></svg>';

const MODAL_PRESET_DELETE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true"><defs><style>.preset-del-st0{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.2px}</style></defs><polyline class="preset-del-st0" points="5.001144 2.7699421 5.001144 1.7891858 6.998856 1.7891858 6.998856 2.7699421"/><polyline class="preset-del-st0" points="8.6261951 2.7699421 8.3008282 10 3.6993139 10 3.37286 2.7699421"/><line class="preset-del-st0" x1="2.4330709" y1="2.7699421" x2="9.5669291" y2="2.7699421"/></svg>';

export class ModalManager {
    constructor() {
        this.modal = document.getElementById('presetModal');
        this.titleEl = document.getElementById('modalTitle');
        this.textEl = document.getElementById('modalText');
        this.inputEl = document.getElementById('modalInput');
        this.buttonsEl = document.getElementById('modalButtons');
        
        this.resolvePromise = null;
        
        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close('cancel');
            }
        });
        
        // Close on Escape
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close('cancel');
            }
        });
    }

    /**
     * Show modal with custom options
     * @param {Object} options
     * @param {string} options.title - Modal title
     * @param {string} options.text - Modal text (optional)
     * @param {boolean} options.showInput - Show input field
     * @param {string} options.inputValue - Default input value
     * @param {string} options.inputPlaceholder - Input placeholder
     * @param {Array} options.buttons - Array of button configs [{id, text, type}]
     * @returns {Promise<{action: string, inputValue?: string}>}
     */
    show(options) {
        const {
            title = '',
            text = '',
            showInput = false,
            inputValue = '',
            inputPlaceholder = '',
            buttons = []
        } = options;

        // Set content
        this.titleEl.textContent = title;
        this.textEl.textContent = text;
        
        // Handle input
        if (showInput) {
            this.inputEl.style.display = 'block';
            this.inputEl.value = inputValue;
            this.inputEl.placeholder = inputPlaceholder;
        } else {
            this.inputEl.style.display = 'none';
        }
        
        // Create buttons
        this.buttonsEl.innerHTML = '';
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `modal-btn modal-btn-${btn.type || 'secondary'}`;
            button.textContent = btn.text;
            button.addEventListener('click', () => this.close(btn.id));
            this.buttonsEl.appendChild(button);
        });
        
        // Show modal
        this.modal.showModal();
        
        // Focus input or first button
        if (showInput) {
            this.inputEl.focus();
            this.inputEl.select();
        } else if (this.buttonsEl.firstChild) {
            this.buttonsEl.firstChild.focus();
        }
        
        // Return promise
        return new Promise(resolve => {
            this.resolvePromise = resolve;
        });
    }

    /**
     * Close modal with result
     */
    close(action) {
        this.modal.close();
        // promptRename assigns inline flex layout — reset so other modals look correct.
        if (this.buttonsEl) {
            this.buttonsEl.style.display = '';
            this.buttonsEl.style.justifyContent = '';
            this.buttonsEl.style.alignItems = '';
            this.buttonsEl.style.gap = '';
        }
        if (this.resolvePromise) {
            this.resolvePromise({
                action,
                inputValue: this.inputEl.value.trim()
            });
            this.resolvePromise = null;
        }
    }

    async showIntroPopup() {
        this.titleEl.textContent = 'What is Void?';
        this.textEl.innerHTML = '';
        this.textEl.classList.add('modal-text--intro');

        const intro = document.createElement('p');
        intro.textContent =
            'Void is not just a font. It is a modular generative type system and a web-based tool for designing expressive typography.';
        this.textEl.appendChild(intro);

        const list = document.createElement('ul');
        const items = [
            'If the interface feels too complex, start simple: type your text in the General panel, then press Chaos in the Random panel.',
            'You can use the built-in presets from the preset list, tweak them to your taste, create presets from scratch, and share them with a link.',
            'You can export your graphics as vector artwork and use them for free in non-commercial projects. For commercial use, email <a href="mailto:yo@mishaivanov.com">yo@mishaivanov.com</a>.'
        ];
        items.forEach((text) => {
            const item = document.createElement('li');
            item.innerHTML = text;
            list.appendChild(item);
        });
        this.textEl.appendChild(list);

        this.inputEl.style.display = 'none';
        this.buttonsEl.innerHTML = '';
        const button = document.createElement('button');
        button.className = 'modal-btn modal-btn-primary';
        button.textContent = 'Start creating';
        button.addEventListener('click', () => this.close('ok'));
        this.buttonsEl.appendChild(button);

        this.modal.showModal();
        button.focus();

        await new Promise(resolve => {
            this.resolvePromise = resolve;
        });
        this.textEl.classList.remove('modal-text--intro');
    }

    // ========================================
    // Preset-specific modal methods
    // ========================================

    /**
     * Confirm unsaved changes when switching presets
     * @param {string} presetName - Current preset name
     * @returns {Promise<'save'|'discard'|'cancel'>}
     */
    async confirmUnsavedChanges(presetName) {
        const displayName = presetName.length > 30 
            ? presetName.substring(0, 27) + '...' 
            : presetName;
            
        const result = await this.show({
            title: 'Unsaved Changes',
            text: `You have unsaved changes in "${displayName}".`,
            buttons: [
                { id: 'save', text: 'Save & Switch', type: 'primary' },
                { id: 'discard', text: 'Discard', type: 'secondary' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        return result.action;
    }

    /**
     * Prompt for new preset name
     * @param {string} defaultName - Default preset name
     * @returns {Promise<string|null>} - Preset name or null if cancelled
     */
    async promptPresetName(defaultName) {
        const result = await this.show({
            title: 'Save as New Preset',
            showInput: true,
            inputValue: defaultName,
            inputPlaceholder: 'Preset name',
            buttons: [
                { id: 'save', text: 'Save', type: 'primary' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        
        if (result.action === 'save' && result.inputValue) {
            return result.inputValue;
        }
        return null;
    }

    /**
     * Prompt for renaming a preset — also offers Share + Delete from the same dialog.
     * @param {string} currentName - Current preset name
     * @returns {Promise<{action: 'rename'|'delete'|'share'|'cancel', newName?: string}>}
     */
    async promptRename(currentName) {
        // Set content
        this.titleEl.textContent = 'Rename Preset';
        this.textEl.textContent = '';
        
        // Handle input
        this.inputEl.style.display = 'block';
        this.inputEl.value = currentName;
        this.inputEl.placeholder = 'Preset name';
        
        // Rename + Cancel · Share + Delete (icon-only, same glyphs as preset list)
        this.buttonsEl.innerHTML = '';
        this.buttonsEl.style.display = 'flex';
        this.buttonsEl.style.justifyContent = 'space-between';
        this.buttonsEl.style.alignItems = 'center';
        this.buttonsEl.style.gap = 'var(--spacing-md)';
        
        const leftGroup = document.createElement('div');
        leftGroup.style.display = 'flex';
        leftGroup.style.flexWrap = 'wrap';
        leftGroup.style.gap = 'var(--spacing-md)';
        leftGroup.style.flex = '1';
        
        const renameBtn = document.createElement('button');
        renameBtn.className = 'modal-btn modal-btn-primary';
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', () => this.close('save'));
        leftGroup.appendChild(renameBtn);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn modal-btn-ghost';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this.close('cancel'));
        leftGroup.appendChild(cancelBtn);

        const rightGroup = document.createElement('div');
        rightGroup.style.display = 'flex';
        rightGroup.style.alignItems = 'center';
        rightGroup.style.gap = 'var(--spacing-md)';
        rightGroup.style.flexShrink = '0';

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'modal-btn modal-btn-secondary modal-btn--icon-only';
        shareBtn.innerHTML = MODAL_PRESET_SHARE_SVG;
        shareBtn.title = 'Copy share link';
        shareBtn.setAttribute('aria-label', 'Copy share link');
        shareBtn.addEventListener('click', () => this.close('share'));
        rightGroup.appendChild(shareBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'modal-btn modal-btn-danger modal-btn--icon-only';
        deleteBtn.innerHTML = MODAL_PRESET_DELETE_SVG;
        deleteBtn.title = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete preset');
        deleteBtn.addEventListener('click', () => this.close('delete'));
        rightGroup.appendChild(deleteBtn);
        
        this.buttonsEl.appendChild(leftGroup);
        this.buttonsEl.appendChild(rightGroup);
        
        // Show modal
        this.modal.showModal();
        
        // Focus input
        this.inputEl.focus();
        this.inputEl.select();
        
        // Return promise
        const result = await new Promise(resolve => {
            this.resolvePromise = resolve;
        });
        
        if (result.action === 'share') {
            return { action: 'share' };
        }
        if (result.action === 'save' && result.inputValue && result.inputValue !== currentName) {
            return { action: 'rename', newName: result.inputValue };
        } else if (result.action === 'delete') {
            return { action: 'delete' };
        }
        return { action: 'cancel' };
    }

    /**
     * Ask how to save changes: update current or save as new
     * @param {string} presetName - Current preset name
     * @returns {Promise<'update'|'new'|'cancel'>}
     */
    async confirmSaveOrNew(presetName) {
        const result = await this.show({
            title: 'Save Changes',
            buttons: [
                { id: 'update', text: 'Update Current', type: 'primary' },
                { id: 'new', text: 'Save as New…', type: 'secondary' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        return result.action;
    }

    /**
     * Confirm preset deletion
     * @param {string} presetName - Preset name to delete
     * @returns {Promise<boolean>}
     */
    async confirmDelete(presetName) {
        const displayName = presetName.length > 30 
            ? presetName.substring(0, 27) + '...' 
            : presetName;
            
        const result = await this.show({
            title: 'Delete Preset?',
            text: `"${displayName}" will be permanently deleted.`,
            buttons: [
                { id: 'delete', text: 'Delete', type: 'danger' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        return result.action === 'delete';
    }

    /**
     * Confirm deletion of all presets
     * @returns {Promise<boolean>}
     */
    async confirmDeleteAll() {
        const result = await this.show({
            title: 'Delete saved presets?',
            text: 'Presets you saved yourself will be removed. Built-in defaults stay.',
            buttons: [
                { id: 'delete', text: 'Delete', type: 'danger' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        return result.action === 'delete';
    }

    async confirmRestoreDefaults() {
        const result = await this.show({
            title: 'Restore default presets?',
            text:
                'Every saved preset will be removed and the original library will be re-loaded. This cannot be undone.',
            buttons: [
                { id: 'restore', text: 'Restore', type: 'danger' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        return result.action === 'restore';
    }

    async promptPresetExistsConflict(presetName) {
        const displayName =
            presetName.length > 30 ? presetName.substring(0, 27) + '…' : presetName;
        const result = await this.show({
            title: 'Preset already exists',
            text: `"${displayName}" is already in your library.`,
            buttons: [
                { id: 'replace', text: 'Replace', type: 'danger' },
                { id: 'copy', text: 'Save as copy…', type: 'primary' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        return result.action;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    async showError(message) {
        await this.show({
            title: 'Error',
            text: message,
            buttons: [{ id: 'ok', text: 'OK', type: 'primary' }]
        });
    }
}
