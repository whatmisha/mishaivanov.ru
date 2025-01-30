const Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Events = Matter.Events;

// Создаем движок
const engine = Engine.create({
    enableSleeping: true
});
engine.world.gravity.y = 0.5; // Настраиваем гравитацию

// Настраиваем рендер
const canvas = document.getElementById('canvas');
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#000000'
    }
});

// Увеличиваем размеры треугольника
const triangleWidth = window.innerWidth * 0.3 * 1.2;
const triangleHeight = window.innerHeight * 0.4 * 1.2;
const wallThickness = 2;
const centerY = window.innerHeight/2;

// Увеличиваем длину стенок, чтобы они смыкались вверху
const wallLength = Math.sqrt(triangleWidth * triangleWidth + triangleHeight * triangleHeight) * 1.1; // Длина боковых стенок

const wallOptions = {
    isStatic: true,
    restitution: 0.2,
    friction: 0.8,
    isSensor: false,
    render: { 
        fillStyle: '#FFFFFF',
        strokeStyle: 'transparent',
        lineWidth: 1,
        opacity: 1,
        visible: true
    },
    collisionFilter: {
        group: 1,
        category: 0x0001,
        mask: 0x0002
    }
};

const leftWall = Bodies.rectangle(
    window.innerWidth/2 - triangleWidth/4.2,
    centerY,
    wallThickness,
    triangleHeight,
    { 
        ...wallOptions,
        angle: Math.PI/6
    }
);

const rightWall = Bodies.rectangle(
    window.innerWidth/2 + triangleWidth/4.2,
    centerY,
    wallThickness,
    triangleHeight,
    { 
        ...wallOptions,
        angle: -Math.PI/6
    }
);

const ground = Bodies.rectangle(
    window.innerWidth/2,
    centerY + triangleHeight/2,
    triangleHeight,
    wallThickness,
    wallOptions
);

World.add(engine.world, [leftWall, rightWall, ground]);

function measureLetterSize(letter, font) {
    // Создаем временный canvas для измерения
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    ctx.font = font;
    
    // Измеряем ширину
    const metrics = ctx.measureText(letter);
    const width = Math.ceil(metrics.width);
    
    // Для пробела используем высоту строчных букв из метрик
    if (letter === ' ') {
        return {
            width: width,
            height: Math.ceil(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) * 0.6 // Берем 60% от полной высоты
        };
    }
    
    // Для остальных букв - прежняя логика
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(letter, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    let top = canvas.height;
    let bottom = 0;
    
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = imageData[(y * canvas.width + x) * 4 + 3];
            if (alpha > 0) {
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
            }
        }
    }
    
    const height = bottom - top + 1;
    return { width, height };
}

function createLetters(text) {
    const bodies = engine.world.bodies;
    const lettersToRemove = bodies.filter(body => !body.isStatic);
    World.remove(engine.world, lettersToRemove);

    const font = '500 108px Tosh';
    const letters = text.split('');
    
    letters.forEach((letter, i) => {
        const { width, height } = measureLetterSize(letter, font);
        
        setTimeout(() => {
            const randomX = window.innerWidth/2 + (Math.random() - 0.5) * (triangleWidth * 0.3);
            const randomY = centerY - triangleHeight/3;
            
            const letterBody = Bodies.rectangle(
                randomX,
                randomY,
                width + 6,
                height + 6,
                {
                    restitution: 0.2,
                    friction: 0.8,
                    frictionAir: 0.02,
                    density: 0.001,
                    render: {
                        fillStyle: 'transparent',
                        strokeStyle: 'transparent',
                        lineWidth: 0
                    },
                    collisionFilter: {
                        category: 0x0002
                    },
                    sleepThreshold: Infinity,
                    label: letter,
                    chamfer: { radius: 2 }
                }
            );
            
            Body.setVelocity(letterBody, {
                x: (Math.random() - 0.5) * 0.1,
                y: 0
            });
            
            World.add(engine.world, letterBody);
        }, i * 100);
    });
}

function createLetterTexture(letter) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    ctx.font = '500 72px Tosh';
    
    // ... rest of the function ...
}

// Обновляем обработчик отрисовки букв
Events.on(render, 'afterRender', function() {
    const context = render.context;
    engine.world.bodies.forEach(function(body) {
        if (body.label && body.label.length === 1) {
            const pos = body.position;
            const angle = body.angle;
            
            context.save();
            context.translate(pos.x, pos.y);
            context.rotate(angle);
            context.font = '500 108px Tosh';
            context.fillStyle = '#ffffff';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(body.label, 0, 0);
            context.restore();
        }
    });
});

// Позиционируем инпут по центру треугольника
const textInput = document.getElementById('textInput');
textInput.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: ${window.innerWidth/2}px;
    transform: translateX(-50%);
    padding: 10px;
    background: #FFFFFF;
    border: none;
    color: #000000 !important;    // Добавили !important для приоритета
    border-radius: 5px;
    width: 200px;
    outline: none;
`;

// Добавляем стили для плейсхолдера
textInput.setAttribute('placeholder', textInput.getAttribute('placeholder') || '');
textInput.style.setProperty('--placeholder-color', '#000000');
textInput.style.setProperty('::placeholder', 'color: #000000');

// Добавляем дополнительные стили через CSS
const style = document.createElement('style');
style.textContent = `
    #textInput::placeholder {
        color: #000000;
        opacity: 0.5;
    }
    #textInput {
        color: #000000 !important;
    }
`;
document.head.appendChild(style);

// Обработчик изменения текста
textInput.addEventListener('input', (e) => {
    createLetters(e.target.value);
});

// Запускаем симуляцию
Engine.run(engine);
Render.run(render);

// Создаем начальные буквы
createLetters(textInput.value);

// Обновляем позицию при изменении размера окна
window.addEventListener('resize', () => {
    textInput.style.left = `${window.innerWidth/2}px`;
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    
    Body.setPosition(leftWall, {
        x: window.innerWidth/2 - triangleWidth/4.2,
        y: window.innerHeight/2
    });
    Body.setPosition(rightWall, {
        x: window.innerWidth/2 + triangleWidth/4.2,
        y: window.innerHeight/2
    });
    Body.setPosition(ground, {
        x: window.innerWidth/2,
        y: window.innerHeight/2 + triangleHeight/2
    });
});

// Добавляем функцию проверки, находится ли точка внутри треугольника
function isInsideTriangle(x, y) {
    const topY = centerY - triangleHeight/2;
    const bottomY = centerY + triangleHeight/2;
    
    // Если точка выше или ниже треугольника
    if (y < topY || y > bottomY) return false;
    
    // Вычисляем допустимую ширину на текущей высоте
    const progress = (y - topY) / triangleHeight;
    const maxWidth = triangleWidth * progress;
    const leftBound = window.innerWidth/2 - maxWidth/2;
    const rightBound = window.innerWidth/2 + maxWidth/2;
    
    // Проверяем, находится ли точка между левой и правой границами
    return x >= leftBound && x <= rightBound;
}

// Добавляем обработчик для проверки позиций букв
Events.on(engine, 'beforeUpdate', function() {
    const bodies = engine.world.bodies;
    bodies.forEach(function(body) {
        if (!body.isStatic && body.label && body.label.length === 1) {
            if (!isInsideTriangle(body.position.x, body.position.y)) {
                // Если буква вышла за пределы, возвращаем её в верхнюю часть треугольника
                const randomX = window.innerWidth/2 + (Math.random() - 0.5) * (triangleWidth * 0.3);
                const randomY = centerY - triangleHeight/3;
                
                Body.setPosition(body, {
                    x: randomX,
                    y: randomY
                });
                
                // Сбрасываем скорость и вращение
                Body.setVelocity(body, {
                    x: (Math.random() - 0.5) * 0.2,
                    y: 0
                });
                Body.setAngularVelocity(body, 0);
                Body.setAngle(body, 0);
            }
        }
    });
});

// Отключаем все события, которые могут влиять на рендеринг
Events.on(engine, 'beforeUpdate', function() {
    [leftWall, rightWall, ground].forEach(wall => {
        wall.render.fillStyle = '#FFFFFF';
        wall.render.opacity = 1;
    });
});

// Отключаем изменение цвета при коллизиях
engine.timing.timeScale = 1;
engine.enableSleeping = false;

// Создаем кнопку для сохранения
const saveButton = document.createElement('button');
saveButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px;
    background-color: #FFFFFF;
    border: none;
    color: #000000;
    border-radius: 5px;
    cursor: pointer;
    font-size: 18px;
`;
saveButton.textContent = 'Сохранить SVG';
document.body.appendChild(saveButton);

// Добавляем загрузку библиотеки
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/opentype.js';
document.head.appendChild(script);

// Проверяем загрузку шрифта
async function loadFont() {
    try {
        const font = await opentype.load('font/tosh.ttf');
        console.log('Шрифт успешно загружен:', font);
        return font;
    } catch (error) {
        console.error('Ошибка загрузки шрифта:', error);
        return null;
    }
}

// Обновленная функция сохранения SVG
async function saveSVG() {
    const font = await loadFont();
    if (!font) {
        alert('Не удалось загрузить шрифт. Проверьте консоль для деталей.');
        return;
    }
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', window.innerWidth);
    svg.setAttribute('height', window.innerHeight);
    svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    
    // Создаем равносторонний треугольник
    const trianglePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const centerX = window.innerWidth/2;
    const centerY = window.innerHeight/2;
    
    // Вычисляем точки равностороннего треугольника
    const sideLength = triangleWidth; // Длина стороны равна ширине
    const height = (sideLength * Math.sqrt(3)) / 2; // Высота равностороннего треугольника
    
    const topY = centerY - height/2;
    const bottomY = centerY + height/2;
    const leftX = centerX - sideLength/2;
    const rightX = centerX + sideLength/2;
    
    const pathData = `
        M ${centerX} ${topY}
        L ${rightX} ${bottomY}
        L ${leftX} ${bottomY}
        Z
    `;
    
    trianglePath.setAttribute('d', pathData);
    trianglePath.setAttribute('fill', '#000000');
    svg.appendChild(trianglePath);
    
    // Добавляем буквы как path
    engine.world.bodies.forEach(body => {
        if (body.label && body.label.length === 1) {
            const path = font.getPath(body.label, 0, 0, 108);
            const pathData = path.toPathData();
            
            const bbox = path.getBoundingBox();
            const centerX = (bbox.x2 + bbox.x1) / 2;
            const centerY = (bbox.y2 + bbox.y1) / 2;
            
            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.setAttribute('d', pathData);
            pathElement.setAttribute('fill', '#FFFFFF');
            pathElement.setAttribute('transform', 
                `translate(${body.position.x - centerX}, ${body.position.y - centerY}) ` +
                `rotate(${body.angle * 180/Math.PI} ${centerX} ${centerY})`
            );
            svg.appendChild(pathElement);
        }
    });
    
    // Конвертируем SVG в строку
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    
    // Создаем Blob и ссылку для скачивания
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'letters.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Обновляем обработчик клика
saveButton.addEventListener('click', () => saveSVG().catch(console.error)); 