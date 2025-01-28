function adjustTextToWidth() {
  const textElements = document.querySelectorAll('.text-line'); // предполагаем, что у строк есть класс text-line
  const windowWidth = window.innerWidth;

  textElements.forEach(element => {
    let fontSize = parseInt(window.getComputedStyle(element).fontSize);
    let width = 100; // начальное значение wdth

    // Сначала пробуем регулировать через wdth
    while (element.offsetWidth < windowWidth && width < 1000) {
      width += 10;
      element.style.fontVariationSettings = `"wdth" ${width}`;
      
      // Если достигли максимума wdth, но всё ещё не заполнили ширину
      if (width >= 1000 && element.offsetWidth < windowWidth) {
        // Увеличиваем размер шрифта
        fontSize += 1;
        element.style.fontSize = `${fontSize}px`;
      }
    }
  });
}

// Запускаем при загрузке и изменении размера окна
window.addEventListener('load', adjustTextToWidth);
window.addEventListener('resize', adjustTextToWidth);
