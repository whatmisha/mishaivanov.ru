// JavaScript код будет здесь 

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('patternCanvas');
    const ctx = canvas.getContext('2d');
    
    // Получаем элементы управления
    const dotsCountInput = document.getElementById('dotsCount');
    const radiusInput = document.getElementById('radius');
    const dotSizeInput = document.getElementById('dotSize');
    const dotColorInput = document.getElementById('dotColor');
    const spiralFactorInput = document.getElementById('spiralFactor');
    const generateBtn = document.getElementById('generateBtn');
    
    // Элементы отображения значений
    const dotsCountValue = document.getElementById('dotsCountValue');
    const radiusValue = document.getElementById('radiusValue');
    const dotSizeValue = document.getElementById('dotSizeValue');
    const spiralFactorValue = document.getElementById('spiralFactorValue');
    
    // Исходные значения настроек
    const defaultSettings = {
        dotsCount: 300,
        radius: 250,
        dotSize: 3,
        dotColor: "#ffffff",
        spiralFactor: 1
    };
    
    // Обновление отображения значений при изменении ползунков
    dotsCountInput.addEventListener('input', () => {
        dotsCountValue.textContent = dotsCountInput.value;
        generatePattern();
    });
    
    radiusInput.addEventListener('input', () => {
        radiusValue.textContent = radiusInput.value;
        generatePattern();
    });
    
    dotSizeInput.addEventListener('input', () => {
        dotSizeValue.textContent = dotSizeInput.value;
        generatePattern();
    });
    
    spiralFactorInput.addEventListener('input', () => {
        spiralFactorValue.textContent = spiralFactorInput.value;
        generatePattern();
    });
    
    // Также обновляем при изменении цвета
    dotColorInput.addEventListener('input', generatePattern);
    
    // Установка размеров канваса
    function setupCanvas() {
        // Используем квадратные размеры для канваса, чтобы избежать искажений
        const containerWidth = window.innerWidth;
        const size = Math.min(containerWidth - 380, window.innerHeight - 80);
        
        canvas.width = size;
        canvas.height = size;
    }
    
    // Функция для генерации паттерна
    function generatePattern() {
        const dotsCount = parseInt(dotsCountInput.value);
        const radius = parseInt(radiusInput.value);
        const dotSize = parseFloat(dotSizeInput.value);
        const dotColor = dotColorInput.value;
        const spiralFactor = parseFloat(spiralFactorInput.value);
        
        // Очистка канваса
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Точно вычисляем центр канваса
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        
        // Константа золотого угла в радианах (приблизительно 137.5 градусов)
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        
        // Сначала нарисуем центральную точку
        ctx.beginPath();
        ctx.arc(centerX, centerY, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        
        // Затем рисуем остальные точки
        for (let i = 1; i < dotsCount; i++) {
            // Вычисляем угол и расстояние от центра с использованием золотого угла
            const angle = i * goldenAngle * spiralFactor;
            
            // Вычисляем расстояние от центра (нормализовано от 0 до 1)
            // Равномерное распределение точек по площади
            const normalizedIndex = i / (dotsCount - 1);
            const distance = radius * Math.sqrt(normalizedIndex);
            
            // Вычисляем координаты точки
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Рисуем точку
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = dotColor;
            ctx.fill();
        }
    }
    
    // Функция сброса настроек к исходным значениям
    function resetSettings() {
        dotsCountInput.value = defaultSettings.dotsCount;
        radiusInput.value = defaultSettings.radius;
        dotSizeInput.value = defaultSettings.dotSize;
        dotColorInput.value = defaultSettings.dotColor;
        spiralFactorInput.value = defaultSettings.spiralFactor;
        
        // Обновляем отображаемые значения
        dotsCountValue.textContent = defaultSettings.dotsCount;
        radiusValue.textContent = defaultSettings.radius;
        dotSizeValue.textContent = defaultSettings.dotSize;
        spiralFactorValue.textContent = defaultSettings.spiralFactor;
        
        // Обновляем паттерн
        generatePattern();
    }
    
    // Инициализация
    setupCanvas();
    generatePattern();
    
    // Кнопка теперь сбрасывает настройки
    generateBtn.addEventListener('click', resetSettings);
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        setupCanvas();
        generatePattern();
    });
}); 