// Глобальный обработчик паузы для всех вкладок
document.addEventListener('DOMContentLoaded', function() {
    // Получаем все холсты
    const rayCanvas = document.getElementById('rayCanvas');
    const cationsCanvas = document.getElementById('cationsCanvas');
    const gridCanvas = document.getElementById('gridCanvas');
    
    // Обработчик клика по холсту для паузы
    function handleCanvasClick(e) {
        // Проверяем, что это не клик с модификаторами (Ctrl, Shift, Alt)
        if (e.ctrlKey || e.shiftKey || e.altKey) {
            return; // Не обрабатываем клики с модификаторами
        }
        
        // Определяем, какой холст был кликнут и отправляем соответствующее событие
        if (e.currentTarget === rayCanvas) {
            const event = new Event('ray-toggle-pause');
            window.dispatchEvent(event);
        } else if (e.currentTarget === cationsCanvas) {
            const event = new Event('cations-toggle-pause');
            window.dispatchEvent(event);
        } else if (e.currentTarget === gridCanvas) {
            const event = new Event('grid-toggle-pause');
            window.dispatchEvent(event);
        }
    }
    
    // Добавляем обработчики клика для всех холстов
    if (rayCanvas) rayCanvas.addEventListener('click', handleCanvasClick);
    if (cationsCanvas) cationsCanvas.addEventListener('click', handleCanvasClick);
    if (gridCanvas) gridCanvas.addEventListener('click', handleCanvasClick);
    
    // Обработчик события grid-toggle-pause
    window.addEventListener('grid-toggle-pause', function() {
        // Вызываем функцию freezePoints из grid.js
        if (typeof freezePoints === 'function') {
            freezePoints();
        } else {
            console.warn('freezePoints function not found in grid.js');
        }
    });
    
    // Обработчик нажатия клавиши пробел для всех вкладок
    // Этот обработчик дублирует функциональность из script.js, но нужен для совместимости
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' || e.key === ' ') {
            // Предотвращаем прокрутку страницы при нажатии пробела
            e.preventDefault();
            
            // Определяем активную вкладку и вызываем соответствующую функцию заморозки
            if (document.getElementById('dotted-rays-content').classList.contains('active')) {
                const event = new Event('ray-toggle-pause');
                window.dispatchEvent(event);
            } else if (document.getElementById('cations-content').classList.contains('active')) {
                const event = new Event('cations-toggle-pause');
                window.dispatchEvent(event);
            } else if (document.getElementById('grid-content').classList.contains('active')) {
                const event = new Event('grid-toggle-pause');
                window.dispatchEvent(event);
            }
        }
        
        // Обработка комбинации Cmd+E для экспорта SVG
        if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyE' || e.key === 'e')) {
            // Предотвращаем стандартное поведение браузера (обычно открытие поиска)
            e.preventDefault();
            
            // Определяем активную вкладку и вызываем соответствующую функцию экспорта
            if (document.getElementById('dotted-rays-content').classList.contains('active')) {
                const event = new Event('ray-export-svg');
                window.dispatchEvent(event);
            } else if (document.getElementById('cations-content').classList.contains('active')) {
                const event = new Event('cations-export-svg');
                window.dispatchEvent(event);
            } else if (document.getElementById('grid-content').classList.contains('active')) {
                const event = new Event('grid-export-svg');
                window.dispatchEvent(event);
            }
        }
    });
}); 