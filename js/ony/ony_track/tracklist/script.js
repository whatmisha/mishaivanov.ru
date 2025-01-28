const MIN_WDTH = 100;
const MAX_WDTH = 1000;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 200;
const BASE_FONT_SIZE = 24;
const STEP_WDTH = 10;
const STEP_SIZE = 1;

function measureWidth(element) {
    return element.getBoundingClientRect().width;
}

function fitText(element, text, targetWidth) {
    element.textContent = text;
    let fontSize = BASE_FONT_SIZE;
    
    // Устанавливаем начальный размер шрифта
    element.style.fontSize = `${fontSize}px`;
    
    // Пробуем сначала изменять только ширину
    let currentWidth = measureWidth(element);
    let ratio = targetWidth / currentWidth;
    
    // Начинаем с расчета примерного значения wdth на основе соотношения
    let wdth = Math.max(MIN_WDTH, Math.min(MAX_WDTH, Math.floor(ratio * MAX_WDTH)));
    element.style.fontVariationSettings = `'wdth' ${wdth}`;
    
    currentWidth = measureWidth(element);
    
    // Если не получается достичь нужной ширины только через wdth,
    // корректируем размер шрифта
    if (currentWidth < targetWidth && wdth >= MAX_WDTH) {
        // Текст слишком короткий - увеличиваем шрифт
        while (currentWidth < targetWidth && fontSize < MAX_FONT_SIZE) {
            fontSize += STEP_SIZE;
            element.style.fontSize = `${fontSize}px`;
            currentWidth = measureWidth(element);
        }
    } else if (currentWidth > targetWidth && wdth <= MIN_WDTH) {
        // Текст слишком длинный - уменьшаем шрифт
        while (currentWidth > targetWidth && fontSize > MIN_FONT_SIZE) {
            fontSize -= STEP_SIZE;
            element.style.fontSize = `${fontSize}px`;
            currentWidth = measureWidth(element);
        }
    }
    
    // Финальная подгонка ширины
    if (currentWidth < targetWidth) {
        while (currentWidth < targetWidth && wdth < MAX_WDTH) {
            wdth += STEP_WDTH;
            element.style.fontVariationSettings = `'wdth' ${wdth}`;
            currentWidth = measureWidth(element);
        }
    } else {
        while (currentWidth > targetWidth && wdth > MIN_WDTH) {
            wdth -= STEP_WDTH;
            element.style.fontVariationSettings = `'wdth' ${wdth}`;
            currentWidth = measureWidth(element);
        }
    }
}

function updateAllText() {
    const container = document.querySelector('.tracklist');
    const targetWidth = container.offsetWidth;
    const textLines = document.querySelectorAll('.text-line');
    
    textLines.forEach(line => {
        const text = line.dataset.text;
        fitText(line, text, targetWidth);
    });
}

// Ждем загрузки шрифта
const font = new FontFace('Ony Track', 
    `url('https://mishaivanov.ru/js/ony/ony_track/tracklist/font/Ony_Track_VGX.woff2')`
);

font.load().then(function(loadedFont) {
    document.fonts.add(loadedFont);
    console.log('Шрифт загружен');
    updateAllText();
}).catch(function(error) {
    console.error('Ошибка загрузки шрифта:', error);
});

// Обновляем при изменении размера окна
window.addEventListener('resize', updateAllText);