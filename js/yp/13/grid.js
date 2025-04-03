// Скрипт для вкладки Grid
document.addEventListener('DOMContentLoaded', function() {
    // Объявляем глобальные переменные
    let canvas = document.getElementById('gridCanvas');
    let ctx;
    let points = [];
    let mouseX = -100;
    let mouseY = -100;
    let isPaused = false;
    let pausedPoints = [];
    let isMouseOverCanvas = false;
    let mouseEverMoved = false;
    let animationFrameId = null;
    
    // Получаем элементы управления
    let sizeSlider = document.getElementById('gridSizeSlider');
    let sizeInput = document.getElementById('gridSizeInput');
    let spacingSlider = document.getElementById('gridSpacingSlider');
    let spacingInput = document.getElementById('gridSpacingInput');
    let radiusSlider = document.getElementById('gridRadiusSlider');
    let radiusInput = document.getElementById('gridRadiusInput');
    let strengthSlider = document.getElementById('gridStrengthSlider');
    let strengthInput = document.getElementById('gridStrengthInput');
    let gravityMode = document.getElementById('gridGravityMode');
    let randomMode = document.getElementById('gridRandomMode');
    let exportSVGButton = document.getElementById('gridExportSVG');
    
    // Определение класса Point (перемещено выше)
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.originalX = x;
            this.originalY = y;
            this.vx = 0;
            this.vy = 0;
            this.active = false;
            this.activationTime = 0;
            this.mass = 0.5 + Math.random() * 0.5; // Более легкие точки
            this.inactivityCounter = 0; // Счетчик для отслеживания времени неактивности
            this.randomAngle = Math.random() * Math.PI * 2; // Для совместимости с другими точками
            this.offsetX = 0;
            this.offsetY = 0;
        }

        update() {
            // Обновляем position если точка активна
            if (this.active) {
                // Применяем очень мягкое затухание для эффекта "пыльцы"
                this.vx *= 0.96;
                this.vy *= 0.96;
                
                // Обновляем позицию
                this.x += this.vx;
                this.y += this.vy;
                
                // Увеличиваем счетчик неактивности, если скорость очень мала
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed < 0.05) {
                    this.inactivityCounter++;
                    
                    // Если точка достаточно долго неактивна, деактивируем ее
                    if (this.inactivityCounter > 60) { // 1 секунда при 60 fps
                        this.active = false;
                        this.inactivityCounter = 0;
                    }
                } else {
                    // Сбрасываем счетчик, если точка движется
                    this.inactivityCounter = 0;
                }
                
                // Проверка столкновений с границами холста
                if (this.x < 0) {
                    this.x = 0;
                    this.vx *= -0.5; // Отражение с потерей энергии
                } else if (this.x > canvas.width) {
                    this.x = canvas.width;
                    this.vx *= -0.5;
                }
                
                if (this.y < 0) {
                    this.y = 0;
                    this.vy *= -0.5;
                } else if (this.y > canvas.height) {
                    this.y = canvas.height;
                    this.vy *= -0.5;
                }
            } else {
                // Медленно возвращаем неактивные точки на свои места
                const dx = this.originalX - this.x;
                const dy = this.originalY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0.1) {
                    this.x += dx * 0.03;
                    this.y += dy * 0.03;
                } else {
                    // Точка вернулась на место
                    this.x = this.originalX;
                    this.y = this.originalY;
                }
            }
        }
        
        applyForce(angle, force) {
            // Активируем точку, когда к ней применяется сила
            if (!this.active) {
                this.active = true;
                this.activationTime = Date.now();
            }
            
            // Проверяем режим гравитации
            if (gravityMode && gravityMode.checked) {
                // В режиме гравитации притягиваем точки
                this.vx += Math.cos(angle) * force * 2; // Увеличен множитель для лучшего эффекта
                this.vy += Math.sin(angle) * force * 2;
            } else {
                // В обычном режиме отталкиваем точки
                this.vx -= Math.cos(angle) * force * 2;
                this.vy -= Math.sin(angle) * force * 2;
            }
        }
    }
    
    // Инициализация холста
    if (canvas) {
        ctx = canvas.getContext('2d');
        resizeCanvas(); // Устанавливаем размер холста
        
        // Регистрируем обработчики событий
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('mousemove', updateMousePosition);
        canvas.addEventListener('mouseenter', function() {
            isMouseOverCanvas = true;
            // Скрываем курсор при наведении на холст, если не на паузе
            if (!isPaused) {
                canvas.style.cursor = 'none';
            }
        });
        canvas.addEventListener('mouseleave', function() { 
            isMouseOverCanvas = false; 
        });
        
        // Инициализируем сетку точек
        generateGridPoints();
        
        // Запускаем анимацию
        animate();
        
        // Настраиваем переключение паузы
        setupPause();
    } else {
        console.error("Canvas #gridCanvas not found!");
    }
    
    // Функция для изменения размера холста
    function resizeCanvas() {
        if (!canvas) return;
        
        // Получаем текущий табконтент
        const tabContent = canvas.closest('.tab-content');
        if (!tabContent) return;
        
        // Проверяем, активна ли вкладка
        const isActive = tabContent.classList.contains('active');
        if (!isActive) return;
        
        // Устанавливаем размеры холста равными размерам контейнера
        const container = document.querySelector('.canvas-container');
        if (container) {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            
            // Если у нас уже есть точки, пересоздаем их при изменении размера
            if (points && points.length > 0) {
                generateGridPoints();
            }
        }
    }
    
    // Функция для регистрации обработчиков паузы
    function setupPause() {
        // Кнопка паузы
        const pauseButton = document.getElementById('gridTogglePause');
        if (pauseButton) {
            pauseButton.addEventListener('click', togglePause);
        } else {
            console.error("Pause button #gridTogglePause not found!");
        }
        
        // Обработчик пробела для паузы
        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space' && document.querySelector('.tab-content.active').id === 'grid-content') {
                togglePause();
                e.preventDefault();
            }
        });
        
        // Обработчик пользовательского события
        window.addEventListener('grid-toggle-pause', togglePause);
    }
    
    // Функция переключения паузы
    function togglePause() {
        isPaused = !isPaused;
        
        // Обновляем визуальное состояние кнопки
        const button = document.getElementById('gridTogglePause');
        if (button) {
            button.classList.toggle('active', isPaused);
            button.textContent = isPaused ? 'Продолжить' : 'Пауза';
        }
        
        // Изменяем курсор в зависимости от состояния паузы
        if (canvas) {
            canvas.style.cursor = isPaused ? 'default' : 'none';
        }
        
        // Если ставим на паузу, сохраняем текущее состояние точек
        if (isPaused) {
            pausedPoints = JSON.parse(JSON.stringify(points));
        }
    }
    
    // Обновление позиции мыши
    function updateMousePosition(e) {
        mouseEverMoved = true;
        
        // Получаем позицию мыши относительно холста
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }
    
    // Функция для генерации точек сетки
    function generateGridPoints() {
        // Очищаем массив точек
        points = [];
        
        // Проверяем размеры холста
        if (canvas.width <= 0 || canvas.height <= 0) {
            console.error("Invalid canvas dimensions:", canvas.width, canvas.height);
            // Устанавливаем минимальные размеры
            canvas.width = Math.max(canvas.width, 1000);
            canvas.height = Math.max(canvas.height, 1000);
        }
        
        // Получаем минимальный размер холста для расчета расстояния между точками
        const minDimension = Math.min(canvas.width, canvas.height);
        
        // Получаем расстояние между точками из поля ввода
        let spacing = spacingInput ? parseInt(spacingInput.value) : 50;
        
        // Проверяем, что spacing имеет разумное значение
        if (isNaN(spacing) || spacing <= 0) {
            console.error("Invalid spacing value:", spacing);
            spacing = 50; // Устанавливаем значение по умолчанию
            if (spacingInput) spacingInput.value = spacing;
            if (spacingSlider) spacingSlider.value = spacing;
        }
        
        // Адаптируем расстояние между точками к размеру холста
        // Это обеспечит примерно одинаковое количество точек независимо от размера холста
        const scaleFactor = minDimension / 1000;
        const adjustedSpacing = spacing * scaleFactor;
        
        console.log(`Generating grid with spacing: ${adjustedSpacing} (base: ${spacing}, scale: ${scaleFactor})`);
        
        // Вычисляем количество точек по горизонтали и вертикали
        const cols = Math.floor(canvas.width / adjustedSpacing);
        const rows = Math.floor(canvas.height / adjustedSpacing);
        
        console.log(`Grid dimensions: ${cols} columns x ${rows} rows`);
        
        // Вычисляем общую ширину и высоту сетки
        const totalWidth = cols * adjustedSpacing;
        const totalHeight = rows * adjustedSpacing;
        
        // Вычисляем смещение для центрирования
        const offsetX = (canvas.width - totalWidth) / 2;
        const offsetY = (canvas.height - totalHeight) / 2;
        
        // Создаем точки, центрированные на холсте
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = offsetX + i * adjustedSpacing + adjustedSpacing / 2;
                const y = offsetY + j * adjustedSpacing + adjustedSpacing / 2;
                points.push(new Point(x, y));
            }
        }
        
        console.log(`Created ${points.length} points`);
        
        return points;
    }
    
    // Функция для применения силы к точкам
    function applyForceToPoints() {
        // Проверяем, находится ли мышь над холстом и в пределах холста
        if (!isMouseOverCanvas || mouseX < 0 || mouseY < 0 || mouseX > canvas.width || mouseY > canvas.height) {
            return; // Не применяем силу, если мышь вне холста
        }
        
        let totalAffected = 0;
        
        const cursorRadius = radiusInput ? parseInt(radiusInput.value) : 100;
        const cursorStrength = strengthInput ? parseInt(strengthInput.value) : 10;
        const isRepel = gravityMode ? gravityMode.checked : false;
        
        // Уменьшаем силу воздействия
        const strengthMultiplier = 0.15;
        
        points.forEach(point => {
            // Считаем расстояние от курсора до точки
            const dx = mouseX - point.x;
            const dy = mouseY - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Применяем силу только если точка находится в радиусе курсора
            if (distance < cursorRadius) {
                // Коэффициент затухания на границе радиуса (1 в центре, 0 на границе)
                const falloff = 1 - (distance / cursorRadius);
                
                // Расчитываем угол и силу
                const angle = Math.atan2(dy, dx);
                
                // Базовая сила с учетом расстояния, затухания и силы курсора
                // Используем cursorStrength для масштабирования силы (от 1 до 100)
                const strengthFactor = cursorStrength / 100; // Нормализуем значение от 0.01 до 1
                let force = cursorRadius / Math.max(distance, 1) * strengthMultiplier * falloff * strengthFactor;
                
                // Применяем силу притяжения или отталкивания в зависимости от режима
                if (isRepel) {
                    // Отталкивание: применяем силу в противоположном направлении
                    point.applyForce(angle + Math.PI, force);
                } else {
                    // Притяжение: применяем силу в направлении к курсору
                    point.applyForce(angle, force);
                }
                
                totalAffected++;
            }
        });
    }
    
    // Функция рендеринга кадра
    function renderFrame() {
        // Очищаем холст
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Проверяем, сгенерированы ли точки
        if (!points || points.length === 0) {
            generateGridPoints();
        }
        
        // Отрисовываем каждую точку
        points.forEach(point => {
            // Определяем размер и цвет точки в зависимости от активности
            let size = sizeInput ? parseInt(sizeInput.value) / 2 : 3; // Базовый размер
            let alpha = 1; // Базовая прозрачность
            
            // Для активных точек добавляем визуальные эффекты
            if (point.active) {
                // Увеличиваем размер с учетом скорости
                const speed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
                size += Math.min(speed * 1.5, 3); // Увеличиваем размер в зависимости от скорости
            }
            
            // Рисуем точку
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
            
            // Рисуем линии между ближайшими точками только если не на паузе
            if (!isPaused) {
                // Находим ближайшие точки
                for (let i = 0; i < points.length; i++) {
                    const otherPoint = points[i];
                    if (point === otherPoint) continue; // Пропускаем саму себя
                    
                    // Рассчитываем расстояние
                    const dx = point.x - otherPoint.x;
                    const dy = point.y - otherPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Рисуем линию только если точки достаточно близко
                    // и масштабируем прозрачность линии в зависимости от расстояния
                    const maxDistance = 80; // Максимальное расстояние для отрисовки линий
                    if (distance < maxDistance) {
                        // Чем ближе точки, тем непрозрачнее линия
                        const lineAlpha = 1 - (distance / maxDistance);
                        ctx.beginPath();
                        ctx.moveTo(point.x, point.y);
                        ctx.lineTo(otherPoint.x, otherPoint.y);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha * 0.15})`; // Уменьшаем общую прозрачность
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        });
        
        // Рисуем курсор только если мышь над холстом и анимация не на паузе
        if (isMouseOverCanvas && mouseEverMoved && !isPaused) {
            const cursorRadius = radiusInput ? parseInt(radiusInput.value) : 100;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, cursorRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Рисуем индикатор паузы, если игра на паузе
        if (isPaused) {
            if (typeof window.drawPauseIndicator === 'function') {
                window.drawPauseIndicator(ctx, canvas.width, canvas.height);
            } else {
                // Полупрозрачный фон
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Настройки текста
                ctx.font = 'bold 48px Arial';
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Отображаем текст "ПАУЗА" в центре канваса
                ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
            }
        }
    }
    
    // Функция анимации
    function animate() {
        // Регистрируем событие для следующего кадра
        animationFrameId = requestAnimationFrame(animate);
        
        // Получаем активную вкладку
        const gridContent = document.getElementById('grid-content');
        if (!gridContent || !gridContent.classList.contains('active')) {
            // Если это не наша вкладка, просто возвращаемся
            return;
        }
        
        // Если игра на паузе, не обновляем состояние
        if (isPaused) {
            // Просто перерисовываем кадр, чтобы отобразить индикатор паузы
            renderFrame();
            return;
        }
        
        if (points && points.length > 0) {
            // Применяем силу к точкам в зависимости от положения курсора
            applyForceToPoints();
            
            // Обновляем все точки
            points.forEach(point => {
                point.update();
            });
        }
        
        // Отрисовываем кадр
        renderFrame();
    }
    
    // Подписываемся на событие изменения вкладки
    document.addEventListener('tab-changed', function(e) {
        console.log('Tab changed event received in grid.js');
        
        // Проверяем, активна ли наша вкладка
        const gridContent = document.getElementById('grid-content');
        if (gridContent && gridContent.classList.contains('active')) {
            // Убедимся, что холст подготовлен
            resizeCanvas();
            
            // Убедимся, что точки сгенерированы
            if (!points || points.length === 0) {
                generateGridPoints();
            }
            
            // Перезапускаем анимацию если она была остановлена
            if (!animationFrameId) {
                animate();
            }
        }
    });
}); 