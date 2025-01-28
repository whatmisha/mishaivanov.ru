// Функция для адаптации текста
function adjustFontWidth() {
  const lines = document.querySelectorAll('.line');
  lines.forEach((line) => {
    const containerWidth = window.innerWidth; // Ширина окна
    const textWidth = line.scrollWidth; // Текущая ширина текста

    // Рассчитываем коэффициент для изменения ширины шрифта
    const widthFactor = Math.min(1000, Math.max(100, (containerWidth / textWidth) * 100));
    line.style.fontVariationSettings = `'wdth' ${widthFactor.toFixed(0)}`;
  });
}

// Вызываем функцию при загрузке и изменении размера окна
window.addEventListener('load', adjustFontWidth);
window.addEventListener('resize', adjustFontWidth);