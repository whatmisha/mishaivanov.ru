/**
 * ModalManager - управление модальными окнами
 * Использует HTML <dialog> элемент
 */

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
        if (this.resolvePromise) {
            this.resolvePromise({
                action,
                inputValue: this.inputEl.value.trim()
            });
            this.resolvePromise = null;
        }
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
     * Prompt for renaming a preset
     * @param {string} currentName - Current preset name
     * @returns {Promise<string|null>} - New name or null if cancelled
     */
    async promptRename(currentName) {
        const result = await this.show({
            title: 'Rename Preset',
            showInput: true,
            inputValue: currentName,
            inputPlaceholder: 'Preset name',
            buttons: [
                { id: 'save', text: 'Rename', type: 'primary' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        
        if (result.action === 'save' && result.inputValue && result.inputValue !== currentName) {
            return result.inputValue;
        }
        return null;
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
            title: 'Delete All Presets?',
            text: 'All saved presets will be deleted. "New" preset will remain.',
            buttons: [
                { id: 'delete', text: 'Delete All', type: 'danger' },
                { id: 'cancel', text: 'Cancel', type: 'ghost' }
            ]
        });
        return result.action === 'delete';
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
