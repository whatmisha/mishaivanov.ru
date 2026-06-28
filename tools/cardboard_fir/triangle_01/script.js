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
    wallLength,
    { 
        ...wallOptions,
        angle: Math.PI/6
    }
);

const rightWall = Bodies.rectangle(
    window.innerWidth/2 + triangleWidth/4.2,
    centerY,
    wallThickness,
    wallLength,
    { 
        ...wallOptions,
        angle: -Math.PI/6
    }
);

const ground = Bodies.rectangle(
    window.innerWidth/2,
    centerY + triangleHeight/2,
    wallLength, // Используем ту же длину, что и для боковых стенок
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

// Создаем контролы размера шрифта
const fontControls = document.createElement('div');
fontControls.className = 'font-size-controls';
fontControls.innerHTML = `
    <button class="font-size-btn decrease">-</button>
    <input type="number" class="font-size-input" value="120" min="32">
    <button class="font-size-btn increase">+</button>
`;
document.body.appendChild(fontControls);

// Добавляем стили для контролов
const fontControlsStyle = document.createElement('style');
fontControlsStyle.textContent = `
    .font-size-controls {
        position: fixed;
        left: 20px;
        bottom: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #FFFFFF;
        padding: 8px;
        border-radius: 5px;
        font-family: 'Tosh', Arial, sans-serif;
    }

    .font-size-btn {
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 3px;
        background: #000000;
        color: #FFFFFF;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .font-size-btn:hover {
        opacity: 0.8;
    }

    .font-size-input {
        width: 60px;
        height: 30px;
        text-align: center;
        border: 1px solid #000000;
        border-radius: 3px;
        font-family: 'Tosh', Arial, sans-serif;
        font-size: 16px;
        -moz-appearance: textfield;
    }

    .font-size-input::-webkit-outer-spin-button,
    .font-size-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
`;
document.head.appendChild(fontControlsStyle);

// Добавляем функционал изменения размера
let currentFontSize = 120;
const fontSizeInput = document.querySelector('.font-size-input');
const decreaseBtn = document.querySelector('.decrease');
const increaseBtn = document.querySelector('.increase');

function updateFontSize(newSize) {
    currentFontSize = Math.max(32, newSize); // Оставляем только минимальное ограничение
    fontSizeInput.value = currentFontSize;
    
    // Обновляем размер шрифта в функциях рендеринга
    context.font = `500 ${currentFontSize}px Tosh`;
    // Пересоздаем буквы с новым размером
    createLetters(textInput.value);
}

decreaseBtn.addEventListener('click', (e) => {
    const currentSize = parseInt(fontSizeInput.value);
    if (e.shiftKey) {
        // Если число заканчивается на 0 (ровное), просто отнимаем 10
        if (currentSize % 10 === 0) {
            updateFontSize(currentSize - 10);
        } else {
            // Иначе округляем вниз до ближайшего десятка
            updateFontSize(Math.floor(currentSize / 10) * 10);
        }
    } else {
        updateFontSize(currentSize - 1);
    }
});

increaseBtn.addEventListener('click', (e) => {
    const currentSize = parseInt(fontSizeInput.value);
    if (e.shiftKey) {
        // Если число заканчивается на 0 (ровное), просто прибавляем 10
        if (currentSize % 10 === 0) {
            updateFontSize(currentSize + 10);
        } else {
            // Иначе округляем вверх до ближайшего десятка
            updateFontSize(Math.ceil(currentSize / 10) * 10);
        }
    } else {
        updateFontSize(currentSize + 1);
    }
});

fontSizeInput.addEventListener('change', (e) => {
    updateFontSize(parseInt(e.target.value));
});

function createLetters(text) {
    const bodies = engine.world.bodies;
    const lettersToRemove = bodies.filter(body => !body.isStatic);
    World.remove(engine.world, lettersToRemove);

    const font = `500 ${currentFontSize}px Tosh`;
    const letters = text.split('');
    
    // Добавляем буквы в обратном порядке
    letters.reverse().forEach((letter, i) => {
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
            context.font = `500 ${currentFontSize}px Tosh`;
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
textInput.value = 'acg';  // Меняем дефолтный текст
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

// Удаляем старый обработчик input, если он есть
textInput.removeEventListener('input', (e) => createLetters(e.target.value));

// Добавляем только обработчик для Enter
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        createLetters(e.target.value);
        e.preventDefault(); // Предотвращаем перенос строки в инпуте
    }
});

// После всей инициализации добавляем кнопку OK
function addOkButton() {
    const textInput = document.getElementById('textInput');
    
    const okButton = document.createElement('button');
    okButton.textContent = 'drop it';
    okButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        padding: 12px 18px;
        background: #FFFFFF;
        border: none;
        border-radius: 5px;
        color: #000000;
        font-family: 'Tosh', Arial, sans-serif;
        font-size: 18px;
        cursor: pointer;
        outline: none;
    `;
    
    document.body.appendChild(okButton);
    
    // Функция для центрирования блока
    function centerElements() {
        const buttonWidth = okButton.offsetWidth;
        const inputWidth = textInput.offsetWidth;
        const gap = 10; // Отступ между элементами
        const totalWidth = inputWidth + buttonWidth + gap;
        
        // Вычисляем позицию для инпута
        const inputLeft = (window.innerWidth - totalWidth) / 2;
        textInput.style.left = inputLeft + 'px';
        textInput.style.transform = 'none';
        
        // Позиционируем кнопку справа от инпута
        okButton.style.left = (inputLeft + inputWidth + gap) + 'px';
    }
    
    // Центрируем элементы при загрузке
    centerElements();
    
    // Обновляем позиции при изменении размера окна
    window.addEventListener('resize', centerElements);
    
    okButton.addEventListener('click', () => {
        createLetters(textInput.value);
    });
}

// Запускаем симуляцию
Engine.run(engine);
Render.run(render);

// Создаем начальные буквы
createLetters(textInput.value);

// Добавляем кнопку OK после инициализации
addOkButton();

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

// Добавляем загрузку библиотеки
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/opentype.js@latest/dist/opentype.min.js';
document.head.appendChild(script);

// Ждем загрузку библиотеки перед использованием
script.onload = () => {
    console.log('OpenType.js успешно загружен');
    
    // Удаляем все существующие кнопки saveButton
    const existingButtons = document.querySelectorAll('#saveButton');
    existingButtons.forEach(button => button.remove());
    
    // Создаем новую кнопку
    const saveButton = document.createElement('button');
    saveButton.id = 'saveButton';
    saveButton.textContent = 'save svg';
    saveButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 18px;
        background: #FFFFFF;
        border: none;
        border-radius: 5px;
        color: #000000;
        font-family: 'Tosh', Arial, sans-serif;
        font-size: 18px;
        outline: none;
        cursor: pointer;
    `;
    document.body.appendChild(saveButton);
    
    // Добавляем обработчик клика только после загрузки библиотеки
    saveButton.addEventListener('click', () => saveSVG().catch(console.error));
};

script.onerror = () => {
    console.error('Ошибка загрузки OpenType.js');
};

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
    
    // Используем те же размеры, что и в браузере
    const height = triangleHeight; // Используем высоту напрямую из настроек
    const sideLength = (height * 2) / Math.sqrt(3); // Вычисляем длину стороны из высоты
    
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
            const path = font.getPath(body.label, 0, 0, currentFontSize, {
                kerning: true,
                features: {
                    liga: true,
                    rlig: true
                },
                weight: 900
            });
            
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