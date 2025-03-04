// Глобальный обработчик паузы для всех вкладок
document.addEventListener('DOMContentLoaded', function() {
    console.log('pause-handler.js: DOMContentLoaded');
    
    // Добавляем тестовый прямой обработчик на gridCanvas
    setTimeout(function() {
        const gridCanvas = document.getElementById('gridCanvas');
        if (gridCanvas) {
            console.log('Attaching direct click handler to gridCanvas after delay');
            gridCanvas.addEventListener('click', function(e) {
                console.log('Direct click on gridCanvas detected');
                if (!e.ctrlKey && !e.shiftKey && !e.altKey) {
                    if (typeof window.freezePointsGrid === 'function') {
                        console.log('Directly calling freezePointsGrid');
                        window.freezePointsGrid();
                    } else {
                        console.warn('freezePointsGrid not available for direct call');
                    }
                }
            });
        } else {
            console.warn('gridCanvas not found after delay');
        }
    }, 1000);
    
    // Получаем все холсты
    const rayCanvas = document.getElementById('rayCanvas');
    const cationsCanvas = document.getElementById('cationsCanvas');
    const gridCanvas = document.getElementById('gridCanvas');
    
    // Обработчик клика по холсту для паузы
    function handleCanvasClick(e) {
        console.log('Canvas click detected on:', e.currentTarget.id);
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
            console.log('Grid canvas clicked, dispatching grid-toggle-pause event');
            const event = new Event('grid-toggle-pause');
            window.dispatchEvent(event);
        }
    }
    
    // Добавляем обработчики клика для всех холстов
    if (rayCanvas) rayCanvas.addEventListener('click', handleCanvasClick);
    if (cationsCanvas) cationsCanvas.addEventListener('click', handleCanvasClick);
    if (gridCanvas) {
        console.log('Adding click handler to gridCanvas');
        gridCanvas.addEventListener('click', handleCanvasClick);
    } else {
        console.warn('gridCanvas not found in pause-handler.js');
    }
    
    // Функция для проверки доступности freezePointsGrid
    function checkFreezePointsGridAvailability() {
        if (typeof window.freezePointsGrid === 'function') {
            console.log('freezePointsGrid function found in global scope');
            clearInterval(checkInterval);
        } else {
            console.warn('freezePointsGrid function still not found in global scope');
        }
    }
    
    // Проверяем доступность функции каждые 500 мс
    const checkInterval = setInterval(checkFreezePointsGridAvailability, 500);
    
    // Проверяем сразу при загрузке
    checkFreezePointsGridAvailability();
    
    // Обработчик события о готовности функции freezePointsGrid
    window.addEventListener('grid-function-ready', function() {
        console.log('grid-function-ready event received, freezePointsGrid available:', 
                   typeof window.freezePointsGrid === 'function');
        
        // При получении уведомления о готовности повторно проверяем наличие функции
        checkFreezePointsGridAvailability();
    });
    
    // Обработчик события grid-toggle-pause
    window.addEventListener('grid-toggle-pause', function() {
        console.log('grid-toggle-pause event received');
        // Вызываем функцию freezePoints из grid.js через глобальную ссылку
        if (typeof window.freezePointsGrid === 'function') {
            console.log('Calling freezePointsGrid from event handler');
            window.freezePointsGrid();
        } else {
            console.warn('freezePointsGrid function not found in grid.js');
            // Пробуем найти функцию через 100 мс (в случае гонки событий)
            setTimeout(function() {
                if (typeof window.freezePointsGrid === 'function') {
                    console.log('Calling freezePointsGrid after delay');
                    window.freezePointsGrid();
                } else {
                    console.error('freezePointsGrid still not available after delay');
                }
            }, 100);
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