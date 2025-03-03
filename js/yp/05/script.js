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
    let attractionRadius = 200; // Радиус действия притяжения
    let maxAttraction = 1; // Максимальное смещение точки

    // Добавляем переменные для заморозки
    let isFrozen = false;
    let frozenPoints = [];

    // Добавляем обработчики для радиуса притяжения
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusInput = document.getElementById('radiusInput');

    radiusSlider.addEventListener('input', function() {
        const newValue = parseInt(this.value);
        radiusInput.value = newValue;
        attractionRadius = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
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
    });

    // Добавляем обработчики для силы притяжения
    const strengthSlider = document.getElementById('strengthSlider');
    const strengthInput = document.getElementById('strengthInput');

    strengthSlider.addEventListener('input', function() {
        const newValue = parseInt(this.value);
        strengthInput.value = newValue;
        maxAttraction = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    strengthInput.addEventListener('change', function() {
        let newValue = parseInt(this.value);
        newValue = Math.min(Math.max(newValue, 10), 150);
        this.value = newValue;
        strengthSlider.value = newValue;
        maxAttraction = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    // Добавляем переменную для режима гравитации
    let isRepelMode = false;

    // Добавляем обработчик переключателя
    const gravityMode = document.getElementById('gravityMode');
    
    gravityMode.addEventListener('change', function() {
        isRepelMode = this.checked;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    let easingValue = 1;
    const easingSlider = document.getElementById('easingSlider');
    const easingInput = document.getElementById('easingInput');

    easingSlider.addEventListener('input', function() {
        const newValue = parseFloat(this.value);
        easingInput.value = newValue;
        easingValue = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    easingInput.addEventListener('change', function() {
        let newValue = parseFloat(this.value);
        newValue = Math.min(Math.max(newValue, 1), 50);
        this.value = newValue;
        easingSlider.value = newValue;
        easingValue = newValue;
        if (!isFrozen) {
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    // Обновляем функцию applyEasing для более плавного затухания
    function applyEasing(t) {
        // Добавляем плавное затухание на границах
        const smoothT = Math.sin(t * Math.PI / 2);
        return Math.pow(smoothT, 1 / easingValue);
    }

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
            // Уменьшаем начальное смещение
            this.offsetX = 0;
            this.offsetY = 0;
        }

        update() {
            // Уменьшаем начальный дрейф
            const driftSpeed = 0.05;
            this.vx += Math.cos(this.randomAngle) * driftSpeed * 0.01;
            this.vy += Math.sin(this.randomAngle) * driftSpeed * 0.01;
            
            // Увеличиваем возвращающую силу
            const returnStrength = 0.001;
            const dx = (this.originalX + this.offsetX) - this.x;
            const dy = (this.originalY + this.offsetY) - this.y;
            this.vx += dx * returnStrength;
            this.vy += dy * returnStrength;

            // Более сильное затухание
            const friction = 0.98;
            this.vx *= friction;
            this.vy *= friction;

            // Обновляем позицию
            this.x += this.vx;
            this.y += this.vy;

            // Медленнее меняем направление дрейфа и смещение
            this.randomAngle += (Math.random() - 0.5) * 0.01;
            this.offsetX += (Math.random() - 0.5) * 0.05;
            this.offsetY += (Math.random() - 0.5) * 0.05;
            
            // Уменьшаем максимальное смещение
            const maxOffset = 15;
            this.offsetX = Math.max(Math.min(this.offsetX, maxOffset), -maxOffset);
            this.offsetY = Math.max(Math.min(this.offsetY, maxOffset), -maxOffset);
        }

        applyForce(angle, force) {
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

    // Обновляем функцию redraw для использования requestAnimationFrame
    function animate(currentTime) {
        if (!lastTime) lastTime = currentTime;
        const deltaTime = currentTime - lastTime;

        if (deltaTime >= frameInterval) {
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

            lastTime = currentTime;
        }

        requestAnimationFrame(animate);
    }

    // Заменяем начальный вызов redraw на animate
    requestAnimationFrame(animate);

    // Обновляем функцию redraw для пересоздания точек при изменении параметров
    function redraw(circleDiameter, spacing) {
        // Очищаем массив точек при каждой перерисовке
        points = [];
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        angles.forEach((angleDegrees, index) => {
            const angle = (angleDegrees * Math.PI) / 180;
            const endX = centerX + rayLength * Math.cos(angle);
            const endY = centerY + rayLength * Math.sin(angle);
            drawDottedLine(centerX, centerY, endX, endY, circleDiameter / 2, spacing, index);
        });
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
                    const angle = Math.atan2(mouseY - point.y, mouseX - point.x);
                    const force = (1 - effectiveRadius / attractionRadius) * (maxAttraction / 50 + flowStrength * 0.1);
                    
                    if (isRepelMode) {
                        // В режиме отталкивания - отталкиваем от курсора
                        point.applyForce(angle + Math.PI, force);
                        point.applyForce(mouseAngle, flowStrength * 0.1);
                    } else {
                        // В режиме притяжения - тянем к центру области курсора
                        // Чем дальше от центра, тем сильнее притяжение
                        const attractionForce = (effectiveRadius / attractionRadius) * force * 2;
                        point.applyForce(angle, attractionForce);
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

    // Обновляем обработчики событий для пересоздания точек
    sizeSlider.addEventListener('input', function() {
        const newSize = parseInt(this.value);
        sizeInput.value = newSize;
        points = []; // Очищаем массив точек
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
        const rect = canvas.getBoundingClientRect();
        const newMouseX = e.clientX - rect.left;
        const newMouseY = e.clientY - rect.top;
        
        // Вычисляем скорость движения курсора
        mouseVX = newMouseX - mouseX;
        mouseVY = newMouseY - mouseY;
        
        mouseX = newMouseX;
        mouseY = newMouseY;
    });

    canvas.addEventListener('mouseleave', function() {
        mouseX = -1000;
        mouseY = -1000;
        mouseVX = 0;
        mouseVY = 0;
    });

    // Обновляем функцию generateSVG
    function generateSVG(circleDiameter, spacing) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "1080");
        svg.setAttribute("height", "1080");
        svg.setAttribute("viewBox", "0 0 1080 1080");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        
        // Добавляем черный фон
        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background.setAttribute("width", "1080");
        background.setAttribute("height", "1080");
        background.setAttribute("fill", "black");
        svg.appendChild(background);
        
        // Для каждого луча
        angles.forEach((angleDegrees, lineIndex) => {
            if (isFrozen && frozenPoints[lineIndex]) {
                // Используем замороженные точки
                frozenPoints[lineIndex].forEach(point => {
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("cx", point.x);
                    circle.setAttribute("cy", point.y);
                    circle.setAttribute("r", circleDiameter/2);
                    circle.setAttribute("fill", "white");
                    svg.appendChild(circle);
                });
            } else {
                // Стандартная логика для незамороженного состояния
                const angle = (angleDegrees * Math.PI) / 180;
                const endX = centerX + rayLength * Math.cos(angle);
                const endY = centerY + rayLength * Math.sin(angle);
                
                const dx = endX - centerX;
                const dy = endY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const effectiveSpacing = circleDiameter/2 * 2 + spacing;
                const numDots = Math.max(Math.ceil(distance / effectiveSpacing), 2);
                
                for (let i = 0; i < numDots; i++) {
                    const t = i / (numDots - 1);
                    let x = centerX + dx * t;
                    let y = centerY + dy * t;
                    
                    const distToMouse = Math.sqrt(
                        (x - mouseX) * (x - mouseX) + 
                        (y - mouseY) * (y - mouseY)
                    );
                    
                    if (distToMouse < attractionRadius) {
                        const normalizedDist = distToMouse / attractionRadius;
                        const falloff = Math.cos((normalizedDist * Math.PI) / 2);
                        const easedAttraction = applyEasing(falloff) * maxAttraction;
                        const angleToMouse = Math.atan2(mouseY - y, mouseX - x);
                        
                        const direction = isRepelMode ? -1 : 1;
                        x += direction * Math.cos(angleToMouse) * easedAttraction;
                        y += direction * Math.sin(angleToMouse) * easedAttraction;
                    }
                    
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("cx", x);
                    circle.setAttribute("cy", y);
                    circle.setAttribute("r", circleDiameter/2);
                    circle.setAttribute("fill", "white");
                    svg.appendChild(circle);
                }
            }
        });
        
        return svg;
    }

    // Функция для скачивания SVG
    function downloadSVG(svgElement) {
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);
        
        // Добавляем декларацию XML
        if (!source.match(/^<\?xml/)) {
            source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        }
        
        const svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download = "pattern.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
    }

    // Добавляем обработчик для кнопки экспорта
    document.getElementById('exportSVG').addEventListener('click', function() {
        const svg = generateSVG(
            parseInt(sizeSlider.value),
            parseInt(spacingSlider.value)
        );
        downloadSVG(svg);
    });

    // Добавляем обработчик клавиатуры
    document.addEventListener('keydown', function(e) {
        // Проверяем cmd+e (для Mac) или ctrl+e (для Windows)
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault(); // Предотвращаем стандартное действие браузера
            const svg = generateSVG(
                parseInt(sizeSlider.value),
                parseInt(spacingSlider.value)
            );
            downloadSVG(svg);
        }
    });

    // Добавляем обработчик пробела
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            e.preventDefault(); // Предотвращаем прокрутку страницы
            if (!isFrozen) {
                freezePoints();
            }
            isFrozen = !isFrozen;
            redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
        }
    });

    // Функция для сохранения текущих позиций точек
    function freezePoints() {
        frozenPoints = [];
        angles.forEach(angleDegrees => {
            const angle = (angleDegrees * Math.PI) / 180;
            const endX = centerX + rayLength * Math.cos(angle);
            const endY = centerY + rayLength * Math.sin(angle);
            
            const dx = endX - centerX;
            const dy = endY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const effectiveSpacing = parseInt(sizeSlider.value)/2 * 2 + parseInt(spacingSlider.value);
            const numDots = Math.max(Math.ceil(distance / effectiveSpacing), 2);
            
            const linePoints = [];
            for (let i = 0; i < numDots; i++) {
                const t = i / (numDots - 1);
                let x = centerX + dx * t;
                let y = centerY + dy * t;
                
                const distToMouse = Math.sqrt(
                    (x - mouseX) * (x - mouseX) + 
                    (y - mouseY) * (y - mouseY)
                );
                
                if (distToMouse < attractionRadius) {
                    const attraction = (1 - distToMouse / attractionRadius) * maxAttraction;
                    const angleToMouse = Math.atan2(mouseY - y, mouseX - x);
                    
                    x += Math.cos(angleToMouse) * attraction;
                    y += Math.sin(angleToMouse) * attraction;
                }
                
                linePoints.push({x, y});
            }
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

    // Начальная отрисовка
    redraw(24, 24);

    // Обновляем начальное значение силы курсора
    document.getElementById('strengthSlider').value = '1';
    document.getElementById('strengthInput').value = '1';
    maxAttraction = 1;
}); 