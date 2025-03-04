// Глобальный обработчик паузы для всех вкладок
document.addEventListener('DOMContentLoaded', function() {
    console.log('pause-handler.js: DOMContentLoaded');
    
    // Проверка наличия элементов DOM
    console.log('Проверка элементов DOM:');
    console.log('dotted-rays-content существует:', !!document.getElementById('dotted-rays-content'));
    console.log('cations-content существует:', !!document.getElementById('cations-content'));
    console.log('grid-content существует:', !!document.getElementById('grid-content'));
    console.log('rayCanvas существует:', !!document.getElementById('rayCanvas'));
    console.log('cationsCanvas существует:', !!document.getElementById('cationsCanvas'));
    console.log('gridCanvas существует:', !!document.getElementById('gridCanvas'));
    
    // Добавляю отладочный код для проверки вкладок
    console.log('Активная вкладка при загрузке:');
    console.log('dotted-rays-content активен:', document.getElementById('dotted-rays-content')?.classList.contains('active'));
    console.log('cations-content активен:', document.getElementById('cations-content')?.classList.contains('active'));
    console.log('grid-content активен:', document.getElementById('grid-content')?.classList.contains('active'));
    
    // Слушаем событие tab-changed для логирования переключения вкладок
    window.addEventListener('tab-changed', function(e) {
        console.log('Событие tab-changed получено');
        console.log('dotted-rays-content активен:', document.getElementById('dotted-rays-content')?.classList.contains('active'));
        console.log('cations-content активен:', document.getElementById('cations-content')?.classList.contains('active'));
        console.log('grid-content активен:', document.getElementById('grid-content')?.classList.contains('active'));
    });
    
    // Специальный прямой обработчик пробела для вкладки Grid
    document.addEventListener('keydown', function(e) {
        // Проверяем, что это пробел и активна вкладка Grid
        if ((e.code === 'Space' || e.key === ' ') && document.activeElement.tagName !== 'INPUT') {
            // Проверяем статус вкладки Grid
            const gridActive = document.getElementById('grid-content')?.classList.contains('active');
            console.log('Прямой обработчик пробела: grid-content активен:', gridActive);
            
            if (gridActive) {
                e.preventDefault(); // Предотвращаем прокрутку
                console.log('Пробел нажат во вкладке Grid - прямой обработчик');
                
                // Генерируем событие grid-toggle-pause вместо прямого вызова
                const event = new Event('grid-toggle-pause');
                console.log('Dispatching grid-toggle-pause event from direct handler');
                window.dispatchEvent(event);
                return; // Выходим, чтобы избежать двойного вызова
            }
        }
    }, true); // Используем capturing для перехвата события до других обработчиков
    
    // Добавляем тестовый прямой обработчик на gridCanvas
    let gridCanvasChecked = false;
    
    function setupGridCanvasClickHandler() {
        if (gridCanvasChecked) return;
        gridCanvasChecked = true;
        
        const gridCanvas = document.getElementById('gridCanvas');
        if (gridCanvas) {
            console.log('Найден gridCanvas, добавляю прямой обработчик клика');
            
            gridCanvas.addEventListener('click', function(e) {
                // Игнорируем клики с модификаторами
                if (e.ctrlKey || e.shiftKey || e.altKey) {
                    console.log('Клик с модификатором, игнорирую');
                    return;
                }
                
                console.log('Клик на gridCanvas - прямой обработчик');
                // Генерируем событие grid-toggle-pause вместо прямого вызова
                const event = new Event('grid-toggle-pause');
                console.log('Dispatching grid-toggle-pause event from canvas click');
                window.dispatchEvent(event);
            });
        } else {
            console.warn('gridCanvas не найден при инициализации обработчика клика');
            // Попробуем найти canvas через 500ms (возможно, он создается динамически)
            setTimeout(function() {
                const retryCanvas = document.getElementById('gridCanvas');
                if (retryCanvas) {
                    console.log('gridCanvas найден после задержки, добавляю обработчик клика');
                    // Тот же обработчик что и выше
                    retryCanvas.addEventListener('click', function(e) {
                        if (e.ctrlKey || e.shiftKey || e.altKey) return;
                        console.log('Клик на gridCanvas - прямой обработчик (отложенная инициализация)');
                        // Генерируем событие grid-toggle-pause вместо прямого вызова
                        const event = new Event('grid-toggle-pause');
                        console.log('Dispatching grid-toggle-pause event from canvas click (delayed init)');
                        window.dispatchEvent(event);
                    });
                }
            }, 500);
        }
    }
    
    // Вызываем функцию настройки обработчика клика
    setupGridCanvasClickHandler();
    
    // Получаем все холсты
    const rayCanvas = document.getElementById('rayCanvas');
    const cationsCanvas = document.getElementById('cationsCanvas');
    
    // Обработчик клика по холсту для паузы
    function handleCanvasClick(e) {
        // Не обрабатываем клики с модификаторами (они используются для других действий)
        if (e.ctrlKey || e.shiftKey || e.altKey) return;

        console.log('Canvas clicked:', e.currentTarget.id);
        
        if (e.currentTarget === rayCanvas) {
            console.log('Ray canvas clicked, dispatching ray-toggle-pause event');
            const event = new Event('ray-toggle-pause');
            window.dispatchEvent(event);
        } else if (e.currentTarget === cationsCanvas) {
            console.log('Cations canvas clicked, dispatching cations-toggle-pause event');
            const event = new Event('cations-toggle-pause');
            window.dispatchEvent(event);
        }
        // Обработчик для Grid canvas теперь реализован отдельно
    }

    // Добавляем обработчики клика на холсты
    if (rayCanvas) rayCanvas.addEventListener('click', handleCanvasClick);
    if (cationsCanvas) cationsCanvas.addEventListener('click', handleCanvasClick);
    
    // Функция для проверки доступности freezePointsGrid
    function checkFreezePointsGrid(callback) {
        if (typeof window.freezePointsGrid === 'function') {
            if (callback && typeof callback === 'function') {
                callback();
            } else {
                console.log('freezePointsGrid доступна, но callback не указан');
                // Можем вызвать напрямую
                window.freezePointsGrid();
            }
        } else {
            console.warn('freezePointsGrid function is not available yet, retrying in 100ms');
            setTimeout(() => {
                if (typeof window.freezePointsGrid === 'function') {
                    if (callback && typeof callback === 'function') {
                        callback();
                    } else {
                        console.log('freezePointsGrid доступна после задержки, но callback не указан');
                        window.freezePointsGrid();
                    }
                } else {
                    console.error('freezePointsGrid function is still not available after delay');
                }
            }, 100);
        }
    }
    
    // Обработчик нажатия пробела для всех вкладок
    document.addEventListener('keydown', function(e) {
        if ((e.code === 'Space' || e.key === ' ') && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault(); // Предотвращаем прокрутку страницы
            
            // Отладочная информация о статусе вкладок
            console.log('Space pressed - tab statuses:');
            console.log('dotted-rays-content активен:', document.getElementById('dotted-rays-content')?.classList.contains('active'));
            console.log('cations-content активен:', document.getElementById('cations-content')?.classList.contains('active'));
            console.log('grid-content активен:', document.getElementById('grid-content')?.classList.contains('active'));
            console.log('freezePointsGrid доступен:', typeof window.freezePointsGrid === 'function');
            
            // Определяем активную вкладку и отправляем соответствующее событие
            if (document.getElementById('dotted-rays-content').classList.contains('active')) {
                console.log('Space pressed in Dotted Rays tab');
                const event = new Event('ray-toggle-pause');
                window.dispatchEvent(event);
            } else if (document.getElementById('cations-content').classList.contains('active')) {
                console.log('Space pressed in Cations tab');
                const event = new Event('cations-toggle-pause');
                window.dispatchEvent(event);
            } else if (document.getElementById('grid-content').classList.contains('active')) {
                console.log('Space pressed in Grid tab');
                // Генерируем событие grid-toggle-pause вместо прямого вызова
                const event = new Event('grid-toggle-pause');
                console.log('Dispatching grid-toggle-pause event');
                window.dispatchEvent(event);
            } else {
                console.warn('No active tab found when space pressed');
            }
        }
    });
    
    // Обработчик Cmd+E/Ctrl+E для экспорта
    document.addEventListener('keydown', function(e) {
        if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            
            // Определяем активную вкладку и отправляем соответствующее событие
            if (document.getElementById('dotted-rays-content').classList.contains('active')) {
                console.log('Cmd+E pressed in Dotted Rays tab');
                const event = new Event('ray-export-svg');
                window.dispatchEvent(event);
            } else if (document.getElementById('cations-content').classList.contains('active')) {
                console.log('Cmd+E pressed in Cations tab');
                const event = new Event('cations-export-svg');
                window.dispatchEvent(event);
            } else if (document.getElementById('grid-content').classList.contains('active')) {
                console.log('Cmd+E pressed in Grid tab');
                const event = new Event('grid-export-svg');
                window.dispatchEvent(event);
            }
        }
    });
});

// Одноразовая проверка наличия функции freezePointsGrid при загрузке
console.log('pause-handler.js: Проверка наличия freezePointsGrid при загрузке:', typeof window.freezePointsGrid === 'function'); 