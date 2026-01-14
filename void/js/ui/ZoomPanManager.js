/**
 * ZoomPanManager - Zoom and pan management for canvas like in Figma
 * 
 * Features:
 * - Zoom: mouse wheel centered on cursor (vector via viewBox)
 * - Pan: space + drag or middle mouse button
 * - Pinch-to-zoom on trackpads
 * - Fit to screen
 * - Reset zoom (100%)
 * 
 * IMPORTANT: Uses SVG viewBox for true vector scaling
 */
export class ZoomPanManager {
    constructor(containerElement, svgElement) {
        this.container = containerElement;
        this.svg = svgElement;
        
        // Transform state
        this.zoom = 1;
        this.baseZoom = 1; // Base zoom (fit to screen), considered as 100%
        this.minZoom = 1.0; // Minimum zoom 100% (don't allow zooming smaller)
        this.maxZoom = 10;
        this.panX = 0;
        this.panY = 0;
        
        // Original SVG dimensions
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        // Dragging state
        this.isPanning = false;
        this.isSpacePressed = false;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;
        
        // Initialize SVG for vector zoom
        this.initializeSVG();
        
        // Initialize handlers
        this.initEventListeners();
    }
    
    /**
     * Initialize SVG for vector zoom via viewBox
     */
    initializeSVG() {
        // Wait for next frame so SVG is rendered
        requestAnimationFrame(() => {
            try {
                // Get dimensions from SVG attributes if set
                const width = parseFloat(this.svg.getAttribute('width')) || 0;
                const height = parseFloat(this.svg.getAttribute('height')) || 0;
                
                if (width > 0 && height > 0) {
                    // Use dimensions from attributes
                    this.originalWidth = width;
                    this.originalHeight = height;
                } else {
                    // Fallback: use getBBox
                    const bbox = this.svg.getBBox();
                    this.originalWidth = bbox.width || 1000;
                    this.originalHeight = bbox.height || 1000;
                }
                
                // Set initial viewBox (full size, 100% zoom)
                const viewBoxWidth = this.originalWidth / this.zoom;
                const viewBoxHeight = this.originalHeight / this.zoom;
                this.panX = 0;
                this.panY = 0;
                
                this.svg.setAttribute('viewBox', `${this.panX} ${this.panY} ${viewBoxWidth} ${viewBoxHeight}`);
            } catch (e) {
                // Fallback if getBBox doesn't work
                console.warn('Could not get SVG dimensions, using fallback');
                this.originalWidth = 1000;
                this.originalHeight = 1000;
                this.svg.setAttribute('viewBox', `0 0 ${this.originalWidth} ${this.originalHeight}`);
            }
        });
        
        // Remove fixed sizes so SVG scales
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        
        // Improve rendering quality for vector graphics clarity
        this.svg.style.shapeRendering = 'geometricPrecision';
        this.svg.style.textRendering = 'geometricPrecision';
        
        // Make container positioned for proper operation
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.cursor = 'default';
    }
    
    /**
     * Initialize all event handlers
     */
    initEventListeners() {
        // Zoom: mouse wheel
        this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Pan: space key
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Pan: mouse
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Prevent context menu on middle button
        this.container.addEventListener('contextmenu', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Mouse wheel handler for zoom and pan
     */
    handleWheel(e) {
        e.preventDefault();
        
        // Get cursor coordinates relative to container
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // If Cmd/Ctrl pressed - zoom (like in Figma/Apple apps)
        if (e.metaKey || e.ctrlKey) {
            // Determine zoom direction
            const delta = -Math.sign(e.deltaY);
            const zoomSpeed = 0.05; // Reduced by 2x (was 0.1)
            const newZoom = this.zoom * (1 + delta * zoomSpeed);
            
            // Apply zoom centered on cursor
            this.zoomTo(newZoom, mouseX, mouseY);
        } else {
            // Otherwise - panning (for Apple Magic Mouse and trackpads)
            const viewBox = this.getViewBox();
            
            // Convert movement to SVG coordinates
            const deltaXSvg = (e.deltaX / rect.width) * viewBox.width;
            const deltaYSvg = (e.deltaY / rect.height) * viewBox.height;
            
            // Update viewBox position
            this.panX += deltaXSvg;
            this.panY += deltaYSvg;
            
            this.updateTransform();
        }
    }
    
    /**
     * Zoom to specified point
     */
    zoomTo(newZoom, mouseX, mouseY) {
        // Constrain zoom
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        if (newZoom === this.zoom) return;
        
        // Get current viewBox
        const viewBox = this.getViewBox();
        
        // Convert mouse coordinates to SVG coordinates
        const rect = this.container.getBoundingClientRect();
        const svgX = viewBox.x + (mouseX / rect.width) * viewBox.width;
        const svgY = viewBox.y + (mouseY / rect.height) * viewBox.height;
        
        // Calculate new viewBox dimensions
        const newWidth = this.originalWidth / newZoom;
        const newHeight = this.originalHeight / newZoom;
        
        // Calculate new viewBox position for zoom relative to cursor
        const newX = svgX - (mouseX / rect.width) * newWidth;
        const newY = svgY - (mouseY / rect.height) * newHeight;
        
        this.zoom = newZoom;
        this.panX = newX;
        this.panY = newY;
        
        this.updateTransform();
        this.notifyZoomChange();
    }
    
    /**
     * Key press handler
     */
    handleKeyDown(e) {
        // Check that focus is not on input elements
        if (e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT') {
            return;
        }
        
        if (e.code === 'Space' && !this.isSpacePressed) {
            e.preventDefault();
            this.isSpacePressed = true;
            this.container.style.cursor = 'grab';
        }
        
        // Zoom shortcuts
        // Cmd/Ctrl + 0: Fit to screen
        if ((e.metaKey || e.ctrlKey) && e.key === '0') {
            e.preventDefault();
            this.fitToScreen();
        }
        
        // Cmd/Ctrl + 1: Reset to 100%
        if ((e.metaKey || e.ctrlKey) && e.key === '1') {
            e.preventDefault();
            this.resetZoom();
        }
        
        // Cmd/Ctrl + Plus: Zoom in
        if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            this.zoomIn();
        }
        
        // Cmd/Ctrl + Minus: Zoom out
        if ((e.metaKey || e.ctrlKey) && e.key === '-') {
            e.preventDefault();
            this.zoomOut();
        }
    }
    
    /**
     * Key release handler
     */
    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            if (!this.isPanning) {
                this.container.style.cursor = 'default';
            }
        }
    }
    
    /**
     * Mouse button press handler
     */
    handleMouseDown(e) {
        // Space + left button or middle mouse button
        if ((this.isSpacePressed && e.button === 0) || e.button === 1) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            this.isPanning = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.lastX = this.panX;
            this.lastY = this.panY;
            this.container.style.cursor = 'grabbing';
        }
    }
    
    /**
     * Mouse movement handler
     */
    handleMouseMove(e) {
        if (this.isPanning) {
            e.preventDefault();
            
            // Calculate movement in pixels
            const dxPixels = e.clientX - this.startX;
            const dyPixels = e.clientY - this.startY;
            
            // Convert movement to SVG coordinates
            const rect = this.container.getBoundingClientRect();
            const viewBox = this.getViewBox();
            const dxSvg = (dxPixels / rect.width) * viewBox.width;
            const dySvg = (dyPixels / rect.height) * viewBox.height;
            
            // Update position (when panning move viewBox in opposite direction)
            this.panX = this.lastX - dxSvg;
            this.panY = this.lastY - dySvg;
            
            this.updateTransform();
        }
    }
    
    /**
     * Mouse button release handler
     */
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.container.style.cursor = this.isSpacePressed ? 'grab' : 'default';
        }
    }
    
    /**
     * Get current viewBox
     */
    getViewBox() {
        const viewBoxAttr = this.svg.getAttribute('viewBox');
        if (!viewBoxAttr) {
            return { x: 0, y: 0, width: this.originalWidth, height: this.originalHeight };
        }
        const [x, y, width, height] = viewBoxAttr.split(' ').map(Number);
        return { x, y, width, height };
    }
    
    /**
     * Apply current transformation via viewBox (vector scaling)
     */
    updateTransform() {
        const width = this.originalWidth / this.zoom;
        const height = this.originalHeight / this.zoom;
        
        this.svg.setAttribute('viewBox', `${this.panX} ${this.panY} ${width} ${height}`);
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.zoomTo(this.zoom * 1.2, centerX, centerY);
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.zoomTo(this.zoom / 1.2, centerX, centerY);
    }
    
    /**
     * Reset zoom to 100% (return to baseZoom) with centering and padding
     */
    resetZoom() {
        // At 100% zoom (baseZoom = 1.0) center layout with padding
        this.zoom = 1.0;
        this.baseZoom = 1.0;
        
        // Get SVG content dimensions
        const bbox = this.svg.getBBox();
        
        // Calculate viewBox dimensions for 100% zoom
        const viewBoxWidth = this.originalWidth / this.zoom;
        const viewBoxHeight = this.originalHeight / this.zoom;
        
        // Center content
        this.panX = bbox.x - (viewBoxWidth - bbox.width) / 2;
        this.panY = bbox.y - (viewBoxHeight - bbox.height) / 2;
        
        this.updateTransform();
        this.notifyZoomChange();
    }
    
    /**
     * Fit to screen - scales content to container size with fixed padding
     * Minimum zoom limited to 100%
     */
    fitToScreen() {
        // Get SVG content dimensions
        const bbox = this.svg.getBBox();
        const containerRect = this.container.getBoundingClientRect();
        
        // Fixed padding in pixels
        const paddingHorizontal = 360; // 360px left and right
        const paddingVertical = 120;   // 120px top and bottom
        
        // Calculate available area for layout placement
        const availableWidth = Math.max(100, containerRect.width - paddingHorizontal * 2);
        const availableHeight = Math.max(100, containerRect.height - paddingVertical * 2);
        
        // Calculate required zoom
        const scaleX = availableWidth / bbox.width;
        const scaleY = availableHeight / bbox.height;
        const scale = Math.min(scaleX, scaleY);
        
        // Constrain zoom (minimum 100%, i.e., 1.0)
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, scale));
        
        // If zoom is less than 1.0 (now impossible due to minZoom),
        // or equals 1.0, this will be base zoom 100%
        if (this.zoom <= 1.0) {
            this.zoom = 1.0;
            this.baseZoom = 1.0;
        } else {
            // Save this zoom as base (will be considered as 100%)
            this.baseZoom = this.zoom;
        }
        
        // Calculate viewBox dimensions
        const viewBoxWidth = this.originalWidth / this.zoom;
        const viewBoxHeight = this.originalHeight / this.zoom;
        
        // Center content
        this.panX = bbox.x - (viewBoxWidth - bbox.width) / 2;
        this.panY = bbox.y - (viewBoxHeight - bbox.height) / 2;
        
        this.updateTransform();
        this.notifyZoomChange();
    }
    
    /**
     * Get current zoom level in percent (relative to baseZoom)
     */
    getZoomPercent() {
        return Math.round((this.zoom / this.baseZoom) * 100);
    }
    
    /**
     * Notify about zoom change (for UI update)
     */
    notifyZoomChange() {
        const event = new CustomEvent('zoomchange', { 
            detail: { 
                zoom: this.zoom, 
                percent: this.getZoomPercent() 
            } 
        });
        this.container.dispatchEvent(event);
    }
    
    /**
     * Reinitialize SVG dimensions after content change
     * Called after updateGrid() to update originalWidth/Height
     */
    reinitializeSVGDimensions() {
        try {
            // Get dimensions from SVG attributes
            const width = parseFloat(this.svg.getAttribute('width')) || this.originalWidth;
            const height = parseFloat(this.svg.getAttribute('height')) || this.originalHeight;
            
            if (width > 0 && height > 0) {
                this.originalWidth = width;
                this.originalHeight = height;
            }
        } catch (e) {
            console.warn('Could not reinitialize SVG dimensions', e);
        }
    }
    
    /**
     * Cleanup handlers
     */
    destroy() {
        this.container.removeEventListener('wheel', this.handleWheel);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.container.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
}

