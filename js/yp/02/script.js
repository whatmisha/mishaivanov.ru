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

    // Заменяем массив углов на исходный
    const angles = [90, 100, 115, 140, 175, 220, 270, 325, 25];

    // Добавляем переменные для отслеживания позиции мыши
    let mouseX = 0;
    let mouseY = 0;
    const attractionRadius = 200; // Радиус действия притяжения
    const maxAttraction = 50; // Максимальное смещение точки

    // Добавляем переменные для заморозки
    let isFrozen = false;
    let frozenPoints = [];

    // Функция для перерисовки всего узора
    function redraw(circleDiameter, spacing) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        angles.forEach((angleDegrees, index) => {
            const angle = (angleDegrees * Math.PI) / 180;
            const endX = centerX + rayLength * Math.cos(angle);
            const endY = centerY + rayLength * Math.sin(angle);
            drawDottedLine(centerX, centerY, endX, endY, circleDiameter / 2, spacing, index);
        });
    }

    function drawDottedLine(startX, startY, endX, endY, circleRadius, spacing, lineIndex) {
        if (isFrozen && frozenPoints[lineIndex]) {
            // Рисуем замороженные точки
            frozenPoints[lineIndex].forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, circleRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.fill();
            });
            return;
        }

        // Оригинальный код для рисования точек
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const effectiveSpacing = circleRadius * 2 + spacing;
        const numDots = Math.max(Math.ceil(distance / effectiveSpacing), 2);
        
        for (let i = 0; i < numDots; i++) {
            const t = i / (numDots - 1);
            let x = startX + dx * t;
            let y = startY + dy * t;
            
            if (!isFrozen) {
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
            }
            
            ctx.beginPath();
            ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }
    }

    // Обработчики событий для размера кругов
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
        redraw(parseInt(sizeSlider.value), newSpacing);
    });

    spacingInput.addEventListener('change', function() {
        let newSpacing = parseInt(this.value);
        newSpacing = Math.min(Math.max(newSpacing, 0), 48);
        this.value = newSpacing;
        spacingSlider.value = newSpacing;
        redraw(parseInt(sizeSlider.value), newSpacing);
    });

    // Обновляем позицию мыши
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
    });

    canvas.addEventListener('mouseleave', function() {
        mouseX = -1000;
        mouseY = -1000;
        redraw(parseInt(sizeSlider.value), parseInt(spacingSlider.value));
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
        angles.forEach(angleDegrees => {
            const angle = (angleDegrees * Math.PI) / 180;
            const endX = centerX + rayLength * Math.cos(angle);
            const endY = centerY + rayLength * Math.sin(angle);
            
            // Вычисляем точки для текущего луча
            const dx = endX - centerX;
            const dy = endY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const effectiveSpacing = circleDiameter/2 * 2 + spacing;
            const numDots = Math.max(Math.ceil(distance / effectiveSpacing), 2);
            
            // Создаем каждую точку
            for (let i = 0; i < numDots; i++) {
                const t = i / (numDots - 1);
                let x = centerX + dx * t;
                let y = centerY + dy * t;
                
                // Применяем эффект притяжения
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
                
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", circleDiameter/2);
                circle.setAttribute("fill", "white");
                svg.appendChild(circle);
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

    // Начальная отрисовка
    redraw(24, 24);
}); 