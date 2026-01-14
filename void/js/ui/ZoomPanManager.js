/**
 * ZoomPanManager - Zoom and pan canvas like in Figma
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
        
        this.zoom = 1;
        this.baseZoom = 1;
        this.minZoom = 1.0;
        this.maxZoom = 10;
        this.panX = 0;
        this.panY = 0;
        
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        this.isPanning = false;
        this.isSpacePressed = false;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;
        
        this.initializeSVG();
        
        this.initEventListeners();
    }
    
    /**
     * Инициализирует SVG для векторного зума через viewBox
     */
    initializeSVG() {
        requestAnimationFrame(() => {
            try {
                const width = parseFloat(this.svg.getAttribute('width')) || 0;
                const height = parseFloat(this.svg.getAttribute('height')) || 0;
                
                if (width > 0 && height > 0) {
                    this.originalWidth = width;
                    this.originalHeight = height;
                } else {
                    const bbox = this.svg.getBBox();
                    this.originalWidth = bbox.width || 1000;
                    this.originalHeight = bbox.height || 1000;
                }
                
                const viewBoxWidth = this.originalWidth / this.zoom;
                const viewBoxHeight = this.originalHeight / this.zoom;
                this.panX = 0;
                this.panY = 0;
                
                this.svg.setAttribute('viewBox', `${this.panX} ${this.panY} ${viewBoxWidth} ${viewBoxHeight}`);
            } catch (e) {
                console.warn('Could not get SVG dimensions, using fallback');
                this.originalWidth = 1000;
                this.originalHeight = 1000;
                this.svg.setAttribute('viewBox', `0 0 ${this.originalWidth} ${this.originalHeight}`);
            }
        });
        
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        
        this.svg.style.shapeRendering = 'geometricPrecision';
        this.svg.style.textRendering = 'geometricPrecision';
        
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.cursor = 'default';
    }
    
    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        this.container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        this.container.addEventListener('contextmenu', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Handle mouse wheel for zoom and pan
     */
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (e.metaKey || e.ctrlKey) {
            const delta = -Math.sign(e.deltaY);
            const zoomSpeed = 0.05;
            const newZoom = this.zoom * (1 + delta * zoomSpeed);
            
            this.zoomTo(newZoom, mouseX, mouseY);
        } else {
            const viewBox = this.getViewBox();
            
            const deltaXSvg = (e.deltaX / rect.width) * viewBox.width;
            const deltaYSvg = (e.deltaY / rect.height) * viewBox.height;
            
            this.panX += deltaXSvg;
            this.panY += deltaYSvg;
            
            this.updateTransform();
        }
    }
    
    /**
     * Zoom to specified point
     */
    zoomTo(newZoom, mouseX, mouseY) {
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        if (newZoom === this.zoom) return;
        
        const viewBox = this.getViewBox();
        
        const rect = this.container.getBoundingClientRect();
        const svgX = viewBox.x + (mouseX / rect.width) * viewBox.width;
        const svgY = viewBox.y + (mouseY / rect.height) * viewBox.height;
        
        const newWidth = this.originalWidth / newZoom;
        const newHeight = this.originalHeight / newZoom;
        
        const newX = svgX - (mouseX / rect.width) * newWidth;
        const newY = svgY - (mouseY / rect.height) * newHeight;
        
        this.zoom = newZoom;
        this.panX = newX;
        this.panY = newY;
        
        this.updateTransform();
        this.notifyZoomChange();
    }
    
    /**
     * Handle key press
     */
    handleKeyDown(e) {
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
     * Обработчик отпускания клавиш
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
     * Обработчик нажатия кнопки мыши
     */
    handleMouseDown(e) {
        if ((this.isSpacePressed && e.button === 0) || e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            this.isPanning = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.lastX = this.panX;
            this.lastY = this.panY;
            this.container.style.cursor = 'grabbing';
        }
    }
    
    /**
     * Handle mouse movement
     */
    handleMouseMove(e) {
        if (this.isPanning) {
            e.preventDefault();
            
            const dxPixels = e.clientX - this.startX;
            const dyPixels = e.clientY - this.startY;
            
            const rect = this.container.getBoundingClientRect();
            const viewBox = this.getViewBox();
            const dxSvg = (dxPixels / rect.width) * viewBox.width;
            const dySvg = (dyPixels / rect.height) * viewBox.height;
            
            this.panX = this.lastX - dxSvg;
            this.panY = this.lastY - dySvg;
            
            this.updateTransform();
        }
    }
    
    /**
     * Обработчик отпускания кнопки мыши
     */
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.container.style.cursor = this.isSpacePressed ? 'grab' : 'default';
        }
    }
    
    /**
     * Получает текущий viewBox
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
     * Применяет текущую трансформацию через viewBox (векторное масштабирование)
     */
    updateTransform() {
        const width = this.originalWidth / this.zoom;
        const height = this.originalHeight / this.zoom;
        
        this.svg.setAttribute('viewBox', `${this.panX} ${this.panY} ${width} ${height}`);
    }
    
    /**
     * Zoom in (увеличение)
     */
    zoomIn() {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.zoomTo(this.zoom * 1.2, centerX, centerY);
    }
    
    /**
     * Zoom out (уменьшение)
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
        this.zoom = 1.0;
        this.baseZoom = 1.0;
        
        const bbox = this.svg.getBBox();
        
        const viewBoxWidth = this.originalWidth / this.zoom;
        const viewBoxHeight = this.originalHeight / this.zoom;
        
        this.panX = bbox.x - (viewBoxWidth - bbox.width) / 2;
        this.panY = bbox.y - (viewBoxHeight - bbox.height) / 2;
        
        this.updateTransform();
        this.notifyZoomChange();
    }
    
    /**
     * Fit to screen - scale content to container size with fixed padding
     * Minimum zoom limited to 100%
     */
    fitToScreen() {
        const bbox = this.svg.getBBox();
        const containerRect = this.container.getBoundingClientRect();
        
        const paddingHorizontal = 360;
        const paddingVertical = 120;
        
        const availableWidth = Math.max(100, containerRect.width - paddingHorizontal * 2);
        const availableHeight = Math.max(100, containerRect.height - paddingVertical * 2);
        
        const scaleX = availableWidth / bbox.width;
        const scaleY = availableHeight / bbox.height;
        const scale = Math.min(scaleX, scaleY);
        
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, scale));
        
        if (this.zoom <= 1.0) {
            this.zoom = 1.0;
            this.baseZoom = 1.0;
        } else {
            this.baseZoom = this.zoom;
        }
        
        const viewBoxWidth = this.originalWidth / this.zoom;
        const viewBoxHeight = this.originalHeight / this.zoom;
        
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
     * Уведомляет об изменении зума (для обновления UI)
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
     * Переинициализирует размеры SVG после изменения содержимого
     * Вызывается после updateGrid() для обновления originalWidth/Height
     */
    reinitializeSVGDimensions() {
        try {
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
     * Очистка обработчиков
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

