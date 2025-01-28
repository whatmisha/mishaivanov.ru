let textLines;

function setup() {
  noCanvas();
  textLines = document.querySelectorAll('.text-line');
  
  // Изначальное применение ширины
  updateTextWidth();
  
  // Обновление при изменении размера окна
  window.addEventListener('resize', updateTextWidth);
}

function updateTextWidth() {
  textLines.forEach((line, index) => {
    const text = line.dataset.text;
    const containerWidth = line.parentElement.offsetWidth;
    
    // Начальное значение ширины шрифта
    let wdth = 100;
    
    // Применяем настройку вариативного шрифта
    line.style.fontVariationSettings = `'wdth' ${wdth}`;
    line.textContent = text;
  });
}