function adjustFontWidth() {
  const lines = document.querySelectorAll('.line'); // Получаем все элементы с классом "line"

  lines.forEach((line) => {
    const containerWidth = window.innerWidth; // Ширина окна браузера
    const testElement = document.createElement('span'); // Создаём временный элемент для измерения текста
    testElement.style.font = getComputedStyle(line).font; // Копируем текущий шрифт строки
    testElement.style.fontVariationSettings = `'wdth' 100`; // Устанавливаем минимальное значение оси
    testElement.style.position = 'absolute'; // Убираем влияние на layout
    testElement.style.visibility = 'hidden'; // Делаем элемент невидимым
    testElement.textContent = line.textContent; // Копируем текст строки
    document.body.appendChild(testElement); // Добавляем временный элемент на страницу

    const textWidth = testElement.offsetWidth; // Измеряем ширину текста с минимальным wdth
    document.body.removeChild(testElement); // Удаляем временный элемент

    // Рассчитываем значение оси wdth, чтобы текст заполнил всю ширину окна
    let wdthValue = (containerWidth / textWidth) * 100;

    // Ограничиваем значение оси wdth в пределах 100–1000
    wdthValue = Math.min(1000, Math.max(100, wdthValue));

    // Применяем вычисленное значение wdth
    line.style.fontVariationSettings = `'wdth' ${wdthValue.toFixed(0)}`;
  });
}

// Обновляем текст при загрузке страницы и изменении размера окна
window.addEventListener('load', adjustFontWidth);
window.addEventListener('resize', adjustFontWidth);