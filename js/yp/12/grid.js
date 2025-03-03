document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gridCanvas');
    const ctx = canvas.getContext('2d');
    const sizeSlider = document.getElementById('gridSizeSlider');
    const sizeInput = document.getElementById('gridSizeInput');
    const spacingSlider = document.getElementById('gridSpacingSlider');
    const spacingInput = document.getElementById('gridSpacingInput');

    // Фиксированные размеры canvas
    canvas.width = 1080;
    canvas.height = 1080;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Gravity controls
    const radiusSlider = document.getElementById('gridRadiusSlider');
    const radiusInput = document.getElementById('gridRadiusInput');
    const strengthSlider = document.getElementById('gridStrengthSlider');
    const strengthInput = document.getElementById('gridStrengthInput');
    const gravityMode = document.getElementById('gridGravityMode');
    const randomMode = document.getElementById('gridRandomMode');
    const exportSVGButton = document.getElementById('gridExportSVG');
    const pauseIndicator = document.getElementById('gridPauseIndicator');

    let mouseX = centerX;
    let mouseY = centerY;
    let isRandom = false;
    let isPaused = false;
    let points = [];
    let lastTime = 0;
    let deltaTime = 0;
    let isMouseOverCanvas = false;
    let isCursorActive = false;

    // Синхронизация слайдеров и числовых полей
    function syncInputs(slider, input) {
        slider.addEventListener('input', () => {
            input.value = slider.value;
            if (slider === spacingSlider) {
                // При изменении расстояния между точками пересоздаем сетку
                points = [];
            }
            redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
            
            // Если изменились параметры курсора, сразу применяем изменения
            if (slider === radiusSlider || slider === strengthSlider) {
                if (!isPaused) {
                    applyForceToPoints();
                    redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
                }
            }
        });

        input.addEventListener('input', () => {
            slider.value = input.value;
            if (input === spacingInput) {
                // При изменении расстояния между точками пересоздаем сетку
                points = [];
            }
            redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
            
            // Если изменились параметры курсора, сразу применяем изменения
            if (input === radiusInput || input === strengthInput) {
                if (!isPaused) {
                    applyForceToPoints();
                    redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
                }
            }
        });
    }

    syncInputs(sizeSlider, sizeInput);
    syncInputs(spacingSlider, spacingInput);
    syncInputs(radiusSlider, radiusInput);
    syncInputs(strengthSlider, strengthInput);

    // Обработка событий мыши
    canvas.addEventListener('mousemove', (e) => {
        if (!document.getElementById('grid-content').classList.contains('active')) {
            return; // Не выполняем, если вкладка не активна
        }
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        mouseX = (e.clientX - rect.left) * scaleX;
        mouseY = (e.clientY - rect.top) * scaleY;
        
        // Активируем интерактив при движении мыши
        if (!isPaused) {
            // Гарантируем, что хотя бы некоторые точки активны
            const radius = parseInt(radiusInput.value);
            let activatedPoints = 0;
            
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const dx = mouseX - point.x;
                const dy = mouseY - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius) {
                    point.active = true;
                    activatedPoints++;
                }
            }
            
            console.log("Активированы точки: " + activatedPoints);
            
            applyForceToPoints();
            redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
        }
        
        isMouseOverCanvas = true;
    });

    canvas.addEventListener('mouseout', () => {
        isMouseOverCanvas = false;
    });

    // Обработка клика для заморозки точек
    canvas.addEventListener('click', freezePoints);

    // Обработка пробела для заморозки точек
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.getElementById('grid-content').classList.contains('active')) {
            freezePoints();
        } else if (e.key === 'e' && (e.metaKey || e.ctrlKey) && document.getElementById('grid-content').classList.contains('active')) {
            e.preventDefault();
            downloadSVG(parseInt(sizeInput.value));
        }
    });

    // Обработка режима случайного движения
    randomMode.addEventListener('click', () => {
        isRandom = !isRandom;
        randomMode.textContent = isRandom ? "Stop Random" : "Random";
    });

    // Обработка режима отталкивания
    gravityMode.addEventListener('change', () => {
        if (!isPaused) {
            applyForceToPoints();
            redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
        }
    });

    // Обработка экспорта SVG
    exportSVGButton.addEventListener('click', () => {
        downloadSVG(parseInt(sizeInput.value));
    });

    // Обработка события заморозки из основного скрипта
    window.addEventListener('grid-toggle-pause', function() {
        freezePoints();
    });

    // Обработка события экспорта из основного скрипта
    window.addEventListener('grid-export-svg', function() {
        downloadSVG(parseInt(sizeInput.value));
    });

    // Обработка события отрисовки из основного скрипта
    window.addEventListener('grid-render-frame', function() {
        const currentTime = performance.now();
        
        if (lastTime === 0) {
            lastTime = currentTime;
            return;
        }
        
        deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        if (isPaused) {
            return;
        }
        
        if (isRandom) {
            updateRandomWalker();
        }
        
        // Применяем силы к точкам
        applyForceToPoints();
        
        // Перерисовываем
        redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
    });

    function checkActivePoints() {
        // Проверяем, есть ли активные точки
        for (let i = 0; i < points.length; i++) {
            if (points[i].active) {
                return true;
            }
        }
        return false;
    }

    function checkControlsState() {
        const hasActivePoints = checkActivePoints();
        
        // Если есть активные точки, деактивируем контролы
        sizeSlider.disabled = hasActivePoints;
        sizeInput.disabled = hasActivePoints;
        spacingSlider.disabled = hasActivePoints;
        spacingInput.disabled = hasActivePoints;
    }

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
        }

        update() {
            // Обновляем position если точка активна
            if (this.active) {
                // Применяем затухание
                this.vx *= 0.95;
                this.vy *= 0.95;
                
                // Обновляем позицию
                this.x += this.vx;
                this.y += this.vy;
                
                // Постепенно возвращаем точку к исходной позиции
                const dx = this.originalX - this.x;
                const dy = this.originalY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Чем дальше точка от исходной позиции, тем сильнее её тянет обратно
                const returnForce = 0.01 * Math.min(distance * 0.1, 1);
                
                if (distance > 0.1) {
                    this.vx += dx * returnForce;
                    this.vy += dy * returnForce;
                } else {
                    // Если точка очень близко к исходной позиции и почти не движется, 
                    // деактивируем её
                    if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) {
                        this.x = this.originalX;
                        this.y = this.originalY;
                        this.vx = 0;
                        this.vy = 0;
                        this.active = false;
                    }
                }
            }
        }

        applyForce(angle, force) {
            if (!this.active) {
                // Если точка не активна, активируем её
                this.active = true;
                this.activationTime = Date.now();
            }
            
            // Применяем силу
            this.vx += Math.cos(angle) * force;
            this.vy += Math.sin(angle) * force;
        }
    }

    function disableSpacingControls() {
        spacingSlider.disabled = true;
        spacingInput.disabled = true;
    }

    function enableSpacingControls() {
        spacingSlider.disabled = false;
        spacingInput.disabled = false;
    }

    function redraw(circleDiameter, spacing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Если точки еще не созданы, создаем их
        if (points.length === 0) {
            generateGridPoints();
        }
        
        // Рисуем точки
        const circleRadius = circleDiameter / 2;
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, circleRadius, 0, Math.PI * 2);
            
            // Активные точки рисуем ярко-голубым цветом
            if (point.active) {
                ctx.fillStyle = '#00FFFF';
            } else {
                ctx.fillStyle = 'white';
            }
            
            ctx.fill();
        }
        
        // Рисуем курсор
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, parseInt(radiusInput.value), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Обновляем индикатор паузы
        updatePauseIndicator();
    }

    // Функция для генерации сетки точек
    function generateGridPoints() {
        points = [];
        
        // Получаем размеры холста
        const width = canvas.width;
        const height = canvas.height;
        
        // Получаем расстояние между точками
        const spacing = Math.max(parseInt(spacingInput.value), 10);
        console.log("Spacing: " + spacing);
        
        // Вычисляем количество точек по горизонтали и вертикали
        const numX = Math.floor(width / spacing);
        const numY = Math.floor(height / spacing);
        
        console.log(`Grid boundaries: ${width}x${height}, Points: ${numX}x${numY} = ${numX * numY} total`);
        
        // Проверяем, не слишком ли много точек (максимум 5000)
        const totalPoints = numX * numY;
        if (totalPoints > 5000) {
            const scaleFactor = Math.sqrt(5000 / totalPoints);
            const newSpacing = Math.ceil(spacing / scaleFactor);
            console.log(`Too many points (${totalPoints}), adjusting spacing to ${newSpacing}`);
            spacingInput.value = newSpacing;
            return generateGridPoints();
        }
        
        // Вычисляем отступы для центрирования сетки
        const offsetX = (width - (numX - 1) * spacing) / 2;
        const offsetY = (height - (numY - 1) * spacing) / 2;
        
        // Создаем сетку точек
        for (let y = 0; y < numY; y++) {
            for (let x = 0; x < numX; x++) {
                const pointX = offsetX + x * spacing;
                const pointY = offsetY + y * spacing;
                points.push(new Point(pointX, pointY));
            }
        }
        
        console.log(`Generated ${points.length} points`);
        
        return points;
    }

    function generateSVG(circleRadius) {
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`;
        svg += `<rect width="100%" height="100%" fill="black"/>`;
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            svg += `<circle cx="${point.x}" cy="${point.y}" r="${circleRadius}" fill="white" />`;
        }
        
        svg += '</svg>';
        return svg;
    }

    function downloadSVG(circleRadius) {
        const svg = generateSVG(circleRadius);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grid.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function updatePauseIndicator() {
        if (isPaused) {
            pauseIndicator.style.display = 'flex';
        } else {
            pauseIndicator.style.display = 'none';
        }
    }

    function freezePoints() {
        isPaused = !isPaused;
        updatePauseIndicator();
        
        if (!isPaused) {
            // Если разморозили, проверяем состояние контролов
            checkControlsState();
        }
    }

    function updateRandomWalker() {
        // Случайное движение курсора
        const maxSpeed = 5;
        const acceleration = 0.2;
        
        // Добавляем случайное ускорение
        const randomAccelX = (Math.random() - 0.5) * acceleration;
        const randomAccelY = (Math.random() - 0.5) * acceleration;
        
        // Обновляем скорость
        let randomWalkerVX = (Math.random() - 0.5) * maxSpeed;
        let randomWalkerVY = (Math.random() - 0.5) * maxSpeed;
        
        // Ограничиваем скорость
        randomWalkerVX = Math.max(-maxSpeed, Math.min(maxSpeed, randomWalkerVX));
        randomWalkerVY = Math.max(-maxSpeed, Math.min(maxSpeed, randomWalkerVY));
        
        // Обновляем позицию
        mouseX += randomWalkerVX;
        mouseY += randomWalkerVY;
        
        // Ограничиваем позицию в пределах холста
        mouseX = Math.max(0, Math.min(canvas.width, mouseX));
        mouseY = Math.max(0, Math.min(canvas.height, mouseY));
    }

    // Функция для применения силы к точкам
    function applyForceToPoints() {
        let totalAffected = 0;
        let totalActivated = 0;
        
        const cursorRadius = parseInt(radiusInput.value);
        const isRepel = gravityMode.checked;
        
        points.forEach(point => {
            // Считаем расстояние от курсора до точки
            const dx = mouseX - point.x;
            const dy = mouseY - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Применяем силу только если точка находится в радиусе курсора
            if (distance < cursorRadius) {
                // Активируем точку, если она не активна
                if (!point.active) {
                    point.active = true;
                    totalActivated++;
                }
                
                // Расчитываем угол и силу
                const angle = Math.atan2(dy, dx);
                const force = cursorRadius / Math.max(distance, 1) * 0.2;
                
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
        
        console.log(`Affected points: ${totalAffected}, Activated points: ${totalActivated}`);
        
        // Обновляем состояние контролов
        checkControlsState();
    }

    // Обработка нажатия мыши
    canvas.addEventListener('mousedown', function(e) {
        isCursorActive = true;
        
        if (!isPaused) {
            // Активируем все точки в зоне действия курсора
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const radius = parseInt(radiusInput.value);
            
            // Активируем или деактивируем точки
            points.forEach(point => {
                const dx = clickX - point.x;
                const dy = clickY - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius) {
                    // Инвертируем состояние active
                    point.active = !point.active;
                    
                    if (point.active) {
                        // Даем точке импульс в случайном направлении
                        const angle = Math.random() * Math.PI * 2;
                        const impulse = 2 + Math.random() * 3;
                        point.vx = Math.cos(angle) * impulse;
                        point.vy = Math.sin(angle) * impulse;
                    } else {
                        // Останавливаем точку
                        point.vx = 0;
                        point.vy = 0;
                    }
                }
            });
        }
    });

    // Инициализация
    console.log("Инициализация Grid...");
    generateGridPoints();
    console.log("Создано точек: " + points.length);
    
    // Запускаем анимацию
    animate();

    // Добавляем обработчики событий для элементов управления
    pauseButton.addEventListener('click', function() {
        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    });
    
    sizeInput.addEventListener('input', function() {
        sizeSlider.value = sizeInput.value;
    });
    
    sizeSlider.addEventListener('input', function() {
        sizeInput.value = sizeSlider.value;
    });
    
    spacingInput.addEventListener('input', function() {
        spacingSlider.value = spacingInput.value;
        // Перегенерируем точки при изменении расстояния
        generateGridPoints();
    });
    
    spacingSlider.addEventListener('input', function() {
        spacingInput.value = spacingSlider.value;
        // Перегенерируем точки при изменении расстояния
        generateGridPoints();
    });
    
    radiusInput.addEventListener('input', function() {
        radiusSlider.value = radiusInput.value;
    });
    
    radiusSlider.addEventListener('input', function() {
        radiusInput.value = radiusSlider.value;
    });
    
    strengthInput.addEventListener('input', function() {
        strengthSlider.value = strengthInput.value;
    });
    
    strengthSlider.addEventListener('input', function() {
        strengthInput.value = strengthSlider.value;
    });
    
    // Добавляем обработчики для кнопки сохранения
    downloadButton.addEventListener('click', function() {
        const link = document.createElement('a');
        link.download = 'grid.svg';
        link.href = generateSVG();
        link.click();
    });
    
    // Добавляем обработчики для событий мыши
    canvas.addEventListener('mousedown', function(e) {
        isCursorActive = true;
    });
    
    canvas.addEventListener('mouseup', function(e) {
        isCursorActive = false;
    });
    
    canvas.addEventListener('mousemove', function(e) {
        // Получаем координаты мыши относительно холста
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        
        // Отмечаем, что курсор находится над холстом
        isMouseOverCanvas = true;
    });
    
    canvas.addEventListener('mouseout', function() {
        isMouseOverCanvas = false;
    });
    
    // Добавляем обработчик для кнопки очистки
    clearButton.addEventListener('click', function() {
        points = [];
        generateGridPoints();
    });

    // Функция анимации
    function animate() {
        if (!isPaused) {
            // Обновить все точки
            points.forEach(point => point.update());
            
            // Если курсор находится над холстом и не на паузе, применяем силу
            if (isMouseOverCanvas) {
                applyForceToPoints();
            }
        }
        
        // Перерисовываем сцену
        redraw(parseInt(sizeInput.value), parseInt(spacingInput.value));
        
        // Запускаем следующий кадр анимации
        requestAnimationFrame(animate);
    }

    // Добавляем обработчик для события изменения вкладки
    window.addEventListener('tab-changed', function() {
        // Проверяем, активна ли вкладка Grid
        if (document.getElementById('grid-content').classList.contains('active')) {
            console.log('Switched to Grid tab');
            // Сбрасываем время анимации
            lastTime = 0;
            
            // Проверяем, созданы ли точки
            if (points.length === 0) {
                generateGridPoints();
            }
        }
    });
}); 