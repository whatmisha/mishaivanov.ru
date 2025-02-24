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

    // Массив углов для лучей
    const angles = [];
    for (let angle = 0; angle < 360; angle += 15) {
        angles.push(angle);
    }

    // Функция для перерисовки всего узора
    function redraw(circleDiameter, spacing) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        angles.forEach(angleDegrees => {
            const angle = (angleDegrees * Math.PI) / 180;
            const endX = centerX + rayLength * Math.cos(angle);
            const endY = centerY + rayLength * Math.sin(angle);
            drawDottedLine(centerX, centerY, endX, endY, circleDiameter / 2, spacing);
        });
    }

    function drawDottedLine(startX, startY, endX, endY, circleRadius, spacing) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const effectiveSpacing = circleRadius * 2 + spacing;
        const numDots = Math.max(Math.ceil(distance / effectiveSpacing), 2);
        const adjustedSpacing = distance / (numDots - 1);
        
        for (let i = 0; i < numDots; i++) {
            const t = i / (numDots - 1);
            const x = startX + dx * t;
            const y = startY + dy * t;
            
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

    // Функция для создания SVG
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
        
        // Создаем круги для каждого луча
        angles.forEach(angleDegrees => {
            const angle = (angleDegrees * Math.PI) / 180;
            const endX = centerX + rayLength * Math.cos(angle);
            const endY = centerY + rayLength * Math.sin(angle);
            
            // Вычисляем точки для кругов на луче
            const dx = endX - centerX;
            const dy = endY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const effectiveSpacing = circleDiameter/2 * 2 + spacing;
            const numDots = Math.max(Math.ceil(distance / effectiveSpacing), 2);
            
            for (let i = 0; i < numDots; i++) {
                const t = i / (numDots - 1);
                const x = centerX + dx * t;
                const y = centerY + dy * t;
                
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

    // Начальная отрисовка
    redraw(24, 24);
}); 