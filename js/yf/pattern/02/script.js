document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM
    const canvas = document.getElementById('dotCanvas');
    const ctx = canvas.getContext('2d');
    
    // Получаем элементы управления
    const dotCountInput = document.getElementById('dotCount');
    const radiusInput = document.getElementById('radius');
    const dotSizeInput = document.getElementById('dotSize');
    const dotColorInput = document.getElementById('dotColor');
    const angleInput = document.getElementById('angle');
    const resetButton = document.getElementById('resetButton');
    
    // Элементы для отображения значений
    const dotCountValue = document.getElementById('dotCountValue');
    const radiusValue = document.getElementById('radiusValue');
    const dotSizeValue = document.getElementById('dotSizeValue');
    const angleValue = document.getElementById('angleValue');
    
    // Начальные настройки
    const defaultSettings = {
        dotCount: 300,
        radius: 250,
        dotSize: 3,
        dotColor: '#ffffff',
        angle: 0
    };
    
    // Устанавливаем размер канваса
    function setupCanvas() {
        // Делаем размер канваса фиксированным с нечетной стороной для гарантии центрального пикселя
        let size = 801; // Нечетный размер для гарантии центрального пикселя
        
        canvas.width = size;
        canvas.height = size;
        
        // Проверяем, что радиус не превышает половину размера канваса
        const maxRadius = Math.floor(size / 2) - 20;
        if (parseInt(radiusInput.value) > maxRadius) {
            radiusInput.value = maxRadius;
            radiusValue.textContent = maxRadius;
        }
    }
    
    // Отдебажная функция для рисования перекрестия в центре
    function drawCenterCross() {
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.moveTo(centerX, centerY - 10);
        ctx.lineTo(centerX, centerY + 10);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Функция для отрисовки точек
    function drawDots() {
        // Получаем текущие настройки
        const dotCount = parseInt(dotCountInput.value);
        const radius = parseInt(radiusInput.value);
        const dotSize = parseFloat(dotSizeInput.value);
        const dotColor = dotColorInput.value;
        const angle = parseInt(angleInput.value) * (Math.PI / 180); // Переводим градусы в радианы
        
        // Очищаем канвас
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Точный центр канваса
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        
        // Рисуем опорное перекрестие для дебага
        // drawCenterCross();
        
        // Константа золотого угла (примерно 137.5 градусов в радианах)
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        
        // Массив для хранения точек (исключая центральную)
        const dots = [];
        
        // Рассчитываем положение всех точек, кроме центральной
        for (let i = 1; i < dotCount; i++) {
            // Расчет для точек
            const currAngle = i * goldenAngle + angle;
            
            // Вычисляем расстояние от центра
            // Используем квадратный корень для равномерного распределения
            const dist = radius * Math.sqrt(i / dotCount);
            
            const x = centerX + Math.round(Math.cos(currAngle) * dist);
            const y = centerY + Math.round(Math.sin(currAngle) * dist);
            
            dots.push({ x, y, dist });
        }
        
        // Сортируем точки по расстоянию от центра
        dots.sort((a, b) => a.dist - b.dist);
        
        // Берем первые 6 точек для определения положения центральной
        const closestDots = dots.slice(0, 6);
        
        // Находим среднее положение ближайших точек
        let sumX = 0;
        let sumY = 0;
        closestDots.forEach(dot => {
            sumX += dot.x;
            sumY += dot.y;
        });
        
        // Рассчитываем "правильную" позицию центральной точки
        const trueCenterX = Math.round(sumX / closestDots.length);
        const trueCenterY = Math.round(sumY / closestDots.length);
        
        // Рисуем все точки кроме центральной
        dots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = dotColor;
            ctx.fill();
        });
        
        // Рисуем центральную точку в "правильной" позиции
        ctx.beginPath();
        ctx.arc(trueCenterX, trueCenterY, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
    }
    
    // Функция для обновления отображаемых значений
    function updateDisplayValues() {
        dotCountValue.textContent = dotCountInput.value;
        radiusValue.textContent = radiusInput.value;
        dotSizeValue.textContent = dotSizeInput.value;
        angleValue.textContent = `${angleInput.value}°`;
    }
    
    // Обработчики событий для ползунков
    dotCountInput.addEventListener('input', () => {
        updateDisplayValues();
        drawDots();
    });
    
    radiusInput.addEventListener('input', () => {
        updateDisplayValues();
        drawDots();
    });
    
    dotSizeInput.addEventListener('input', () => {
        updateDisplayValues();
        drawDots();
    });
    
    angleInput.addEventListener('input', () => {
        updateDisplayValues();
        drawDots();
    });
    
    // Обработчик для изменения цвета
    dotColorInput.addEventListener('input', drawDots);
    
    // Функция сброса настроек
    function resetSettings() {
        dotCountInput.value = defaultSettings.dotCount;
        radiusInput.value = defaultSettings.radius;
        dotSizeInput.value = defaultSettings.dotSize;
        dotColorInput.value = defaultSettings.dotColor;
        angleInput.value = defaultSettings.angle;
        
        updateDisplayValues();
        drawDots();
    }
    
    // Обработчик для кнопки сброса
    resetButton.addEventListener('click', resetSettings);
    
    // Обработчик изменения размера окна не меняет размер канваса
    window.addEventListener('resize', () => {
        // Не меняем размер канваса для предотвращения проблем с центрированием
        drawDots();
    });
    
    // Инициализация
    setupCanvas();
    updateDisplayValues();
    drawDots();
}); 