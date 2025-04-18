document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('rayCanvas');
    const ctx = canvas.getContext('2d');
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeInput = document.getElementById('sizeInput');
    const spacingSlider = document.getElementById('spacingSlider');
    const spacingInput = document.getElementById('spacingInput');

    // Фиксированные размеры canvas
    canvas.width = 1080;
    canvas.height = 1080;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const rayLength = Math.min(canvas.width, canvas.height) * 0.45;

    // В начале файла, где определяются переменные
    const raysSlider = document.getElementById('raysSlider');
    const raysInput = document.getElementById('raysInput');
    const baseAngles = [90, 100, 115, 140, 175, 220, 270, 325, 25];
    let angles = [...baseAngles];

    // Добавляем переменные для отслеживания позиции мыши
    let mouseX = 0;
    let mouseY = 0;
    let attractionRadius = 50; // Изменено с 200 на 50
    let maxAttraction = 1; // Максимальное смещение точки

    // Добавляем переменные для заморозки
    let isFrozen = false;
    let frozenPoints = [];

    // Добавляем обработчики для радиуса притяжения
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusInput = document.getElementById('radiusInput');

    // Добавляем переменную для хранения таймера
    let controlsCheckTimer;

    // Добавляем флаг для хранения состояния активности точек при заморозке
    let wasActiveBeforeFreeze = false;

    // Добавляем новые переменные после существующих объявлений
    let isRandomMode = false;
    let randomWalkerX = canvas.width / 2;
    let randomWalkerY = canvas.height / 2;
    let randomWalkerVX = 0;
    let randomWalkerVY = 0;

    // Обновляем функцию для проверки активных точек
    function checkActivePoints() {
        let hasActive = false;
        points.forEach(linePoints => {
            linePoints.forEach(point => {
                if (point.isActivated) {
                    hasActive = true;
                }
            });
        });
        return hasActive;
    }

    // Обновляем функцию проверки состояния с задержкой
    function checkControlsState() {
        clearTimeout(controlsCheckTimer);
        controlsCheckTimer = setTimeout(() => {
            if (checkActivePoints()) {
                disableSpacingAndRaysControls();
            } else {
                enableSpacingAndRaysControls();
            }
        }, 100); // Задержка 100мс
    }

    // Обновляем обработчики для радиуса притяжения
    radiusSlider.addEventListener('input', function() {
        const newValue = parseInt(this.value);
        radiusInput.value = newValue;
        attractionRadius = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
        checkControlsState();
    });

    radiusInput.addEventListener('change', function() {
        let newValue = parseInt(this.value);
        newValue = Math.min(Math.max(newValue, 50), 400);
        this.value = newValue;
        radiusSlider.value = newValue;
        attractionRadius = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
        checkControlsState();
    });

    // Добавляем обработчики для силы притяжения
    const strengthSlider = document.getElementById('strengthSlider');
    const strengthInput = document.getElementById('strengthInput');

    strengthSlider.min = '1';
    strengthSlider.max = '100';
    strengthSlider.value = '1';
    strengthInput.value = '1';
    strengthInput.min = '1';
    strengthInput.max = '100';

    // Обновляем обработчики для силы притяжения
    strengthSlider.addEventListener('input', function() {
        const newValue = Math.max(parseInt(this.value), 1);
        strengthInput.value = newValue;
        maxAttraction = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
        checkControlsState();
    });

    strengthInput.addEventListener('change', function() {
        let newValue = Math.min(Math.max(parseInt(this.value), 1), 100);
        this.value = newValue;
        strengthSlider.value = newValue;
        maxAttraction = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
        checkControlsState();
    });

    // Добавляем переменную для режима гравитации
    let isRepelMode = false;

    // Добавляем обработчик переключателя
    const gravityMode = document.getElementById('gravityMode');
    
    gravityMode.addEventListener('change', function() {
        isRepelMode = this.checked;
    });

    // Добавим отслеживание движения курсора
    let mouseVX = 0;
    let mouseVY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Обновляем класс Point для реализации физики
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.originalX = x;
            this.originalY = y;
            this.vx = 0;
            this.vy = 0;
            this.randomAngle = Math.random() * Math.PI * 2;
            this.offsetX = 0;
            this.offsetY = 0;
            this.isActivated = false; // Флаг активации движения
        }

        update() {
            if (this.isActivated) {
                hasActivePoints = true;  // Отмечаем, что есть активные точки
                
                // Усиленный дрейф для активированных точек
                const driftSpeed = 0.2;
                this.vx += Math.cos(this.randomAngle) * driftSpeed * 0.02;
                this.vy += Math.sin(this.randomAngle) * driftSpeed * 0.02;
                
                // Очень слабое притяжение к исходной позиции
                const returnStrength = 0.00005;
                const dx = (this.originalX + this.offsetX) - this.x;
                const dy = (this.originalY + this.offsetY) - this.y;
                this.vx += dx * returnStrength;
                this.vy += dy * returnStrength;

                // Мягкое затухание для большей инерции
                const friction = 0.99;
                this.vx *= friction;
                this.vy *= friction;

                this.x += this.vx;
                this.y += this.vy;

                // Медленно меняем направление дрейфа и смещение
                this.randomAngle += (Math.random() - 0.5) * 0.1;
                this.offsetX += (Math.random() - 0.5) * 0.1;
                this.offsetY += (Math.random() - 0.5) * 0.1;
                
                const maxOffset = 50;
                this.offsetX = Math.max(Math.min(this.offsetX, maxOffset), -maxOffset);
                this.offsetY = Math.max(Math.min(this.offsetY, maxOffset), -maxOffset);
            } else {
                this.x = this.originalX;
                this.y = this.originalY;
                this.vx = 0;
                this.vy = 0;
            }
        }

        applyForce(angle, force) {
            this.isActivated = true; // Активируем точку при воздействии силы
            this.vx += Math.cos(angle) * force;
            this.vy += Math.sin(angle) * force;
        }
    }

    // Добавляем массив для хранения точек
    let points = [];

    // В начале файла, где определяются переменные
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    // Добавляем функции для управления активностью слайдеров
    function disableSpacingAndRaysControls() {
        // Отключаем слайдеры и инпуты
        spacingSlider.disabled = true;
        spacingInput.disabled = true;
        raysSlider.disabled = true;
        raysInput.disabled = true;

        // Добавляем прозрачность к родительским элементам
        spacingSlider.parentElement.style.opacity = '0.5';
        raysSlider.parentElement.style.opacity = '0.5';
    }

    function enableSpacingAndRaysControls() {
        // Включаем слайдеры и инпуты
        spacingSlider.disabled = false;
        spacingInput.disabled = false;
        raysSlider.disabled = false;
        raysInput.disabled = false;

        // Возвращаем нормальную прозрачность
        spacingSlider.parentElement.style.opacity = '1';
        raysSlider.parentElement.style.opacity = '1';
    }

    // Добавляем флаг для отслеживания активных точек
    let hasActivePoints = false;

    // Обновляем функцию animate
    function animate(currentTime) {
        if (!lastTime) lastTime = currentTime;
        const deltaTime = currentTime - lastTime;

        if (deltaTime >= frameInterval) {
            if (isRandomMode) {
                updateRandomWalker();
            }
            
            hasActivePoints = false;
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            angles.forEach((angleDegrees, index) => {
                const angle = (angleDegrees * Math.PI) / 180;
                const endX = centerX + rayLength * Math.cos(angle);
                const endY = centerY + rayLength * Math.sin(angle);
                drawDottedLine(centerX, centerY, endX, endY, 
                    parseInt(sizeSlider.value) / 2, 
                    parseInt(spacingSlider.value), 
                    index);
            });

            // Добавляем отрисовку точки курсора в режиме рандома
            if (isRandomMode) {
                ctx.beginPath();
                ctx.arc(mouseX, mouseY, parseInt(sizeSlider.value) / 2, 0, Math.PI * 2);
                ctx.fillStyle = '#FF5C19';
                ctx.fill();
            }

            // После отрисовки проверяем состояние точек только если не заморожены
            if (!isFrozen) {
                if (hasActivePoints) {
                    disableSpacingAndRaysControls();
                    wasActiveBeforeFreeze = true;
                } else {
                    enableSpacingAndRaysControls();
                    wasActiveBeforeFreeze = false;
                }
            }

            lastTime = currentTime;
        }

        requestAnimationFrame(animate);
    }

    // Заменяем начальный вызов redraw на animate
    requestAnimationFrame(animate);

    // Обновляем функцию redraw для пересоздания точек при изменении параметров
    function redraw(circleDiameter, spacing) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (isFrozen && frozenPoints.length > 0) {
            // Отрисовываем замороженные точки
            frozenPoints.forEach(linePoints => {
                linePoints.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, circleDiameter / 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'white';
                    ctx.fill();
                });
            });
        } else {
            angles.forEach((angleDegrees, index) => {
                const angle = (angleDegrees * Math.PI) / 180;
                const endX = centerX + rayLength * Math.cos(angle);
                const endY = centerY + rayLength * Math.sin(angle);
                drawDottedLine(centerX, centerY, endX, endY, circleDiameter / 2, spacing, index);
            });
        }
    }

    // Обновляем функцию drawDottedLine
    function drawDottedLine(startX, startY, endX, endY, circleRadius, spacing, lineIndex) {
        if (!points[lineIndex]) {
            points[lineIndex] = [];
            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const effectiveSpacing = circleRadius * 2 + spacing;
            const numDots = Math.max(Math.ceil(distance / effectiveSpacing), 2);
            
            for (let i = 0; i < numDots; i++) {
                const t = i / (numDots - 1);
                const x = startX + dx * t;
                const y = startY + dy * t;
                points[lineIndex].push(new Point(x, y));
            }
        }

        points[lineIndex].forEach(point => {
            if (!isFrozen) {
                const distToMouse = Math.sqrt(
                    (point.x - mouseX) * (point.x - mouseX) + 
                    (point.y - mouseY) * (point.y - mouseY)
                );
                
                const mouseSpeed = Math.sqrt(mouseVX * mouseVX + mouseVY * mouseVY);
                const flowStrength = Math.min(mouseSpeed, 5);
                
                const mouseAngle = Math.atan2(mouseVY, mouseVX);
                const stretchedX = (point.x - mouseX) * Math.cos(-mouseAngle) - (point.y - mouseY) * Math.sin(-mouseAngle);
                const stretchedY = (point.x - mouseX) * Math.sin(-mouseAngle) + (point.y - mouseY) * Math.cos(-mouseAngle);
                
                const stretch = 1 + flowStrength * 0.1;
                const effectiveRadius = Math.sqrt((stretchedX * stretchedX) / (stretch * stretch) + stretchedY * stretchedY);
                
                if (effectiveRadius < attractionRadius) {
                    point.isActivated = true;
                    
                    const angleToMouse = Math.atan2(mouseY - point.y, mouseX - point.x);
                    
                    const normalizedDist = effectiveRadius / attractionRadius;
                    const falloff = Math.cos((normalizedDist * Math.PI) / 2);
                    const force = falloff * (maxAttraction / 100 + flowStrength * 0.05);
                    
                    if (isRepelMode) {
                        point.applyForce(angleToMouse + Math.PI, force);
                        const randomAngle = Math.random() * Math.PI * 2;
                        point.applyForce(randomAngle, force * 0.1);
                    } else {
                        point.applyForce(angleToMouse, force);
                    }
                }
                
                point.update();
            }

            ctx.beginPath();
            ctx.arc(point.x, point.y, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        });
    }

    // Обновляем обработчики событий для изменения размера
    sizeSlider.addEventListener('input', function() {
        const newSize = parseInt(this.value);
        sizeInput.value = newSize;
        redraw(newSize, parseInt(spacingSlider.value));
    });

    sizeInput.addEventListener('change', function() {
        let newSize = parseInt(this.value);
        newSize = Math.max(newSize, 4);
        this.value = newSize;
        sizeSlider.value = newSize;
        redraw(newSize, parseInt(spacingSlider.value));
    });

    // Обработчики событий для расстояния между кругами
    spacingSlider.addEventListener('input', function() {
        const newSpacing = parseInt(this.value);
        spacingInput.value = newSpacing;
        points = []; // Очищаем массив точек
        redraw(parseInt(sizeSlider.value), newSpacing);
    });

    // Обновляем обработчик для spacingInput
    spacingInput.addEventListener('change', function() {
        let newSpacing = parseInt(this.value);
        newSpacing = Math.min(Math.max(newSpacing, 0), 360); // Увеличиваем максимум до 360
        this.value = newSpacing;
        spacingSlider.value = newSpacing;
        redraw(parseInt(sizeSlider.value), newSpacing);
    });

    // Обновляем отслеживание движения курсора
    canvas.addEventListener('mousemove', function(e) {
        if (!isRandomMode) {  // Добавляем проверку
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const newMouseX = (e.clientX - rect.left) * scaleX;
            const newMouseY = (e.clientY - rect.top) * scaleY;
            
            mouseVX = (newMouseX - mouseX) * scaleX;
            mouseVY = (newMouseY - mouseY) * scaleY;
            
            mouseX = newMouseX;
            mouseY = newMouseY;
        }
    });

    canvas.addEventListener('mouseleave', function() {
        if (!isRandomMode) {  // Добавляем проверку
            mouseX = -1000;
            mouseY = -1000;
            mouseVX = 0;
            mouseVY = 0;
        }
    });

    // Обновляем функцию generateSVG
    function generateSVG(circleRadius) {
        let svgContent = `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
        <rect width="1080" height="1080" fill="black"/>`;
        
        const pointsToUse = isFrozen ? frozenPoints : points;
        
        pointsToUse.forEach(linePoints => {
            linePoints.forEach(point => {
                svgContent += `<circle cx="${point.x}" cy="${point.y}" r="${circleRadius}" fill="white"/>`;
            });
        });
        
        svgContent += '</svg>';
        return svgContent;
    }

    // Обновляем функцию downloadSVG
    function downloadSVG(circleRadius) {
        const svgContent = generateSVG(circleRadius);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rays.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Обновляем обработчики экспорта
    document.getElementById('exportSVG').addEventListener('click', function() {
        downloadSVG(parseInt(sizeSlider.value) / 2);
    });

    document.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
            e.preventDefault();
            downloadSVG(parseInt(sizeSlider.value) / 2);
        }
    });

    // Добавляем функцию для управления индикатором паузы
    function updatePauseIndicator() {
        const indicator = document.getElementById('pauseIndicator');
        indicator.style.display = isFrozen ? 'block' : 'none';
    }

    // Обновляем обработчик пробела
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!isFrozen) {
                freezePoints();
                wasActiveBeforeFreeze = checkActivePoints();
                if (isRandomMode) {
                    randomWalkerVX = 0;
                    randomWalkerVY = 0;
                }
            }
            isFrozen = !isFrozen;
            updatePauseIndicator(); // Добавляем обновление индикатора
            
            if (!isFrozen && wasActiveBeforeFreeze) {
                disableSpacingAndRaysControls();
            }
            
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    // Обновляем функцию freezePoints для сохранения текущих позиций
    function freezePoints() {
        frozenPoints = [];
        angles.forEach((angleDegrees, index) => {
            const linePoints = [];
            points[index].forEach(point => {
                linePoints.push({
                    x: point.x,
                    y: point.y
                });
            });
            frozenPoints.push(linePoints);
        });
    }

    // Добавляем функцию для расчета дополнительных углов
    function calculateAngles(additionalRaysPerSegment) {
        if (additionalRaysPerSegment === 0) {
            return [...baseAngles];
        }
        
        const newAngles = [];
        for (let i = 0; i < baseAngles.length; i++) {
            const currentAngle = baseAngles[i];
            const nextAngle = baseAngles[(i + 1) % baseAngles.length];
            
            newAngles.push(currentAngle);
            
            // Вычисляем промежуточные углы
            let deltaAngle = nextAngle - currentAngle;
            // Корректируем для перехода через 360
            if (deltaAngle < -180) deltaAngle += 360;
            if (deltaAngle > 180) deltaAngle -= 360;
            
            // Добавляем промежуточные лучи
            for (let j = 1; j <= additionalRaysPerSegment; j++) {
                const fraction = j / (additionalRaysPerSegment + 1);
                let newAngle = currentAngle + deltaAngle * fraction;
                if (newAngle < 0) newAngle += 360;
                if (newAngle >= 360) newAngle -= 360;
                newAngles.push(newAngle);
            }
        }
        
        return newAngles;
    }

    // Добавляем обработчики событий для слайдера и инпута
    raysSlider.addEventListener('input', function() {
        const newValue = parseInt(this.value);
        raysInput.value = newValue;
        angles = calculateAngles(newValue);
        points = []; // Очищаем массив точек
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    raysInput.addEventListener('change', function() {
        let newValue = parseInt(this.value);
        newValue = Math.min(Math.max(newValue, 0), 8);
        this.value = newValue;
        raysSlider.value = newValue;
        angles = calculateAngles(newValue);
        points = []; // Очищаем массив точек
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    // Устанавливаем начальный размер кругов
    sizeSlider.value = '4';
    sizeInput.value = '4';
    
    // Начальная отрисовка с новым размером
    redraw(4, parseInt(spacingSlider.value));

    // Обновляем минимальное значение для размера
    document.getElementById('sizeSlider').min = '2';
    document.getElementById('sizeInput').min = '2';

    // Обновляем обработчик клика
    document.addEventListener('click', function(e) {
        // Игнорируем клики по кнопке Random и её содержимому
        if (e.target.id === 'randomMode' || e.target.closest('#randomMode')) {
            return;
        }
        
        if (!isFrozen) {
            freezePoints();
            wasActiveBeforeFreeze = checkActivePoints();
            if (isRandomMode) {
                randomWalkerVX = 0;
                randomWalkerVY = 0;
            }
        }
        isFrozen = !isFrozen;
        updatePauseIndicator();
        
        if (!isFrozen && wasActiveBeforeFreeze) {
            disableSpacingAndRaysControls();
        }
        
        redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
    });

    // В HTML также нужно обновить начальные значения
    radiusSlider.value = '50';
    radiusInput.value = '50';

    // Добавляем функцию для случайного блуждания
    function updateRandomWalker() {
        // Если заморожено, не обновляем позицию
        if (isFrozen) return;
        
        // Увеличиваем случайное ускорение
        const acceleration = 2.0;
        randomWalkerVX += (Math.random() - 0.5) * acceleration;
        randomWalkerVY += (Math.random() - 0.5) * acceleration;
        
        // Увеличиваем максимальную скорость
        const maxSpeed = 15;
        const speed = Math.sqrt(randomWalkerVX * randomWalkerVX + randomWalkerVY * randomWalkerVY);
        if (speed > maxSpeed) {
            randomWalkerVX = (randomWalkerVX / speed) * maxSpeed;
            randomWalkerVY = (randomWalkerVY / speed) * maxSpeed;
        }
        
        // Обновляем позицию
        randomWalkerX += randomWalkerVX;
        randomWalkerY += randomWalkerVY;
        
        // Отражаем от границ canvas
        const padding = 50;
        if (randomWalkerX < padding) {
            randomWalkerX = padding;
            randomWalkerVX *= -0.8;
        }
        if (randomWalkerX > canvas.width - padding) {
            randomWalkerX = canvas.width - padding;
            randomWalkerVX *= -0.8;
        }
        if (randomWalkerY < padding) {
            randomWalkerY = padding;
            randomWalkerVY *= -0.8;
        }
        if (randomWalkerY > canvas.height - padding) {
            randomWalkerY = canvas.height - padding;
            randomWalkerVY *= -0.8;
        }
        
        // Обновляем позицию мыши для системы частиц
        mouseX = randomWalkerX;
        mouseY = randomWalkerY;
        mouseVX = randomWalkerVX;
        mouseVY = randomWalkerVY;
    }

    // Обновляем обработчик для кнопки Random
    document.getElementById('randomMode').addEventListener('click', function() {
        isRandomMode = !isRandomMode;
        this.classList.toggle('active');
        
        if (isRandomMode) {
            this.style.backgroundColor = '#666';
            // Инициализируем позицию в центре canvas
            randomWalkerX = canvas.width / 2;
            randomWalkerY = canvas.height / 2;
            // Даём начальный импульс в случайном направлении
            const randomAngle = Math.random() * Math.PI * 2;
            const initialSpeed = 5;
            randomWalkerVX = Math.cos(randomAngle) * initialSpeed;
            randomWalkerVY = Math.sin(randomAngle) * initialSpeed;
            // Сразу обновляем позицию мыши для системы частиц
            mouseX = randomWalkerX;
            mouseY = randomWalkerY;
            mouseVX = randomWalkerVX;
            mouseVY = randomWalkerVY;
        } else {
            this.style.backgroundColor = '';
            // Сбрасываем позицию мыши при выключении режима
            mouseX = -1000;
            mouseY = -1000;
            mouseVX = 0;
            mouseVY = 0;
        }
    });
}); 