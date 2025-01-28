const MIN_WDTH = 100;
const MAX_WDTH = 1000;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 200;
const BASE_FONT_SIZE = 24;

let fontLoaded = false;

// Проверка загрузки шрифта
const font = new FontFace('Ony Track', 
  `url('https://mishaivanov.ru/js/ony/ony_track/tracklist/font/Ony_Track_VGX.woff2')`
);

font.load().then(function(loadedFont) {
  document.fonts.add(loadedFont);
  fontLoaded = true;
  console.log('Шрифт загружен');
  updateAllText();
}).catch(function(error) {
  console.error('Ошибка загрузки шрифта:', error);
});

function measureWidth(element) {
    return element.getBoundingClientRect().width;
}

function fitText(element, text, targetWidth) {
    if (!fontLoaded) return;
    
    element.textContent = text;
    
    // Начинаем с максимальной ширины и подбираем размер шрифта
    let wdth = MAX_WDTH;
    element.style.fontVariationSettings = `'wdth' ${wdth}`;
    
    // Бинарный поиск подходящего размера шрифта
    let minSize = MIN_FONT_SIZE;
    let maxSize = MAX_FONT_SIZE;
    
    while (minSize <= maxSize) {
        const midSize = Math.floor((minSize + maxSize) / 2);
        element.style.fontSize = `${midSize}px`;
        const currentWidth = measureWidth(element);
        
        if (Math.abs(currentWidth - targetWidth) < 1) {
            break;
        } else if (currentWidth < targetWidth) {
            minSize = midSize + 1;
        } else {
            maxSize = midSize - 1;
        }
    }
    
    // Если текст все еще не помещается, уменьшаем wdth
    let currentWidth = measureWidth(element);
    while (currentWidth > targetWidth && wdth > MIN_WDTH) {
        wdth -= 10;
        element.style.fontVariationSettings = `'wdth' ${wdth}`;
        currentWidth = measureWidth(element);
    }
}

function updateAllText() {
    if (!fontLoaded) return;
    
    const container = document.querySelector('.tracklist');
    const targetWidth = container.offsetWidth;
    const textLines = document.querySelectorAll('.text-line');
    
    textLines.forEach(line => {
        const text = line.dataset.text;
        fitText(line, text, targetWidth);
    });
}

// Обновляем при изменении размера окна
window.addEventListener('resize', updateAllText);