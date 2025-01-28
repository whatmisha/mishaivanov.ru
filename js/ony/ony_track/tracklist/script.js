let textLines;
const MIN_WDTH = 100;
const MAX_WDTH = 1000;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 200;
const BASE_FONT_SIZE = 24;

function setup() {
  noCanvas();
  textLines = document.querySelectorAll('.text-line');
  
  // Ждем загрузки шрифта перед первым обновлением
  document.fonts.ready.then(() => {
    updateTextWidth();
  });
  
  // Обновление при изменении размера окна
  window.addEventListener('resize', updateTextWidth);
}

function updateTextWidth() {
  const containerWidth = document.querySelector('.tracklist').offsetWidth;
  
  textLines.forEach((line) => {
    const text = line.dataset.text;
    fitText(line, text, containerWidth);
  });
}

function measureWidth(element) {
  return element.getBoundingClientRect().width;
}

function fitText(element, text, targetWidth) {
  element.textContent = text;
  
  // Начинаем с базового размера шрифта и максимальной ширины
  let fontSize = BASE_FONT_SIZE;
  let wdth = MAX_WDTH;
  
  // Первая попытка с максимальной шириной
  element.style.fontSize = `${fontSize}px`;
  element.style.fontVariationSettings = `'wdth' ${wdth}`;
  
  let currentWidth = measureWidth(element);
  
  if (currentWidth < targetWidth) {
    // Текст слишком короткий - увеличиваем fontSize
    while (currentWidth < targetWidth && fontSize < MAX_FONT_SIZE) {
      fontSize += 1;
      element.style.fontSize = `${fontSize}px`;
      currentWidth = measureWidth(element);
    }
    // Небольшая коррекция, если перешли за границу
    if (currentWidth > targetWidth) {
      fontSize -= 1;
      element.style.fontSize = `${fontSize}px`;
    }
  } else {
    // Текст слишком длинный - уменьшаем wdth
    while (currentWidth > targetWidth && wdth > MIN_WDTH) {
      wdth -= 10;
      element.style.fontVariationSettings = `'wdth' ${wdth}`;
      currentWidth = measureWidth(element);
    }
    
    // Если все еще не помещается, уменьшаем fontSize
    if (currentWidth > targetWidth) {
      while (currentWidth > targetWidth && fontSize > MIN_FONT_SIZE) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
        currentWidth = measureWidth(element);
      }
    }
  }
}