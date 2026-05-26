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
     * @returns {Promise<{action: 'rename'|'delete'|'cancel', newName?: string}>} - Action and new name if renamed
     */
    async promptRename(currentName) {
        // Set content
        this.titleEl.textContent = 'Rename Preset';
        this.textEl.textContent = '';
        
        // Handle input
        this.inputEl.style.display = 'block';
        this.inputEl.value = currentName;
        this.inputEl.placeholder = 'Preset name';
        
        // Create buttons with special layout: Rename and Cancel on left, Delete on right
        this.buttonsEl.innerHTML = '';
        this.buttonsEl.style.display = 'flex';
        this.buttonsEl.style.justifyContent = 'space-between';
        this.buttonsEl.style.alignItems = 'center';
        this.buttonsEl.style.gap = 'var(--spacing-md)';
        
        // Left group: Rename and Cancel
        const leftGroup = document.createElement('div');
        leftGroup.style.display = 'flex';
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
        
        // Right group: Delete
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'modal-btn modal-btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.close('delete'));
        
        this.buttonsEl.appendChild(leftGroup);
        this.buttonsEl.appendChild(deleteBtn);
        
        // Show modal
        this.modal.showModal();
        
        // Focus input
        this.inputEl.focus();
        this.inputEl.select();
        
        // Return promise
        const result = await new Promise(resolve => {
            this.resolvePromise = resolve;
        });
        
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
