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
engine.world.gravity.y = 1; // Настраиваем гравитацию

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

// Настраиваем размеры равностороннего треугольника
const triangleWidth = window.innerWidth * 0.3;
const triangleHeight = window.innerHeight * 0.4;
const wallThickness = 20;
const centerY = window.innerHeight/2;
const gapAtTop = 130;

const leftWall = Bodies.rectangle(
    (window.innerWidth/2 - triangleWidth/2) - gapAtTop/2,
    centerY,
    wallThickness,
    triangleHeight,
    { 
        isStatic: true,
        angle: Math.PI/6,
        render: { 
            fillStyle: 'transparent',
            strokeStyle: 'rgba(255, 255, 255, 0.2)',
            lineWidth: 1
        }
    }
);

const rightWall = Bodies.rectangle(
    (window.innerWidth/2 + triangleWidth/2) + gapAtTop/2,
    centerY,
    wallThickness,
    triangleHeight,
    { 
        isStatic: true,
        angle: -Math.PI/6,
        render: { 
            fillStyle: 'transparent',
            strokeStyle: 'rgba(255, 255, 255, 0.2)',
            lineWidth: 1
        }
    }
);

const ground = Bodies.rectangle(
    window.innerWidth/2,
    centerY + triangleHeight/2,
    triangleWidth * 1.8,
    wallThickness,
    { 
        isStatic: true,
        render: { 
            fillStyle: 'transparent',
            strokeStyle: 'rgba(255, 255, 255, 0.2)',
            lineWidth: 1
        }
    }
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

    const font = '500 72px Tosh';
    const letters = text.split('');
    
    letters.forEach((letter, i) => {
        const { width, height } = measureLetterSize(letter, font);
        
        setTimeout(() => {
            const letterBody = Bodies.rectangle(
                window.innerWidth/2,
                centerY - triangleHeight/2 - gapAtTop,
                width + 4,
                height + 4,
                {
                    restitution: 0.3,
                    friction: 0.5,
                    density: 0.002,
                    render: {
                        fillStyle: 'transparent',
                        strokeStyle: 'transparent',
                        lineWidth: 0
                    },
                    collisionFilter: {
                        category: 0x0002
                    },
                    sleepThreshold: Infinity,
                    label: letter
                }
            );
            Body.setVelocity(letterBody, {
                x: (Math.random() - 0.5) * 0.2,
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
            context.font = '500 72px Tosh';
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
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    border-radius: 5px;
    width: 200px;
`;

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
    
    // Обновляем позиции стен
    Body.setPosition(leftWall, {
        x: (window.innerWidth/2 - triangleWidth/2) - gapAtTop/2,
        y: window.innerHeight/2
    });
    Body.setPosition(rightWall, {
        x: (window.innerWidth/2 + triangleWidth/2) + gapAtTop/2,
        y: window.innerHeight/2
    });
    Body.setPosition(ground, {
        x: window.innerWidth/2,
        y: window.innerHeight/2 + triangleHeight/2
    });
}); 