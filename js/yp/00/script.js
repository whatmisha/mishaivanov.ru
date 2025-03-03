document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('rayCanvas');
    const ctx = canvas.getContext('2d');

    // Устанавливаем реальные размеры canvas
    canvas.width = 1080;
    canvas.height = 1080;

    // Центр canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Длина луча
    const rayLength = 360;

    // Количество лучей
    const angles = [90, 100, 115, 140, 175, 220, 270, 325, 25];
    const numberOfRays = angles.length;

    // Очищаем canvas черным цветом
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Настройки для лучей
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    // Рисуем лучи
    angles.forEach(angleDegrees => {
        // Конвертируем градусы в радианы
        const angle = (angleDegrees * Math.PI) / 180;
        
        // Начинаем путь
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        
        // Вычисляем конечную точку луча
        const endX = centerX + rayLength * Math.cos(angle);
        const endY = centerY + rayLength * Math.sin(angle);
        
        // Рисуем линию
        ctx.lineTo(endX, endY);
        ctx.stroke();
    });
}); 