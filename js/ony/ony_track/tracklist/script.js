class TextFitter {
  constructor() {
    this.minWidth = 100;    // Минимальное значение wdth
    this.maxWidth = 1000;   // Максимальное значение wdth
    this.minFontSize = 16;  // Начальный размер шрифта
    this.maxFontSize = 500; // Увеличил максимальный размер шрифта
    this.containerWidth = window.innerWidth * 0.9;
  }

  // Получаем реальную ширину текстового элемента
  getElementWidth(element) {
    const rect = element.getBoundingClientRect();
    return rect.width;
  }

  // Устанавливаем параметр wdth
  setWidth(element, width) {
    element.style.fontVariationSettings = `"wdth" ${width}`;
    return new Promise(resolve => setTimeout(resolve, 10)); // Даем время на применение стилей
  }

  // Устанавливаем размер шрифта
  setFontSize(element, size) {
    element.style.fontSize = `${size}px`;
    return new Promise(resolve => setTimeout(resolve, 10));
  }

  // Основная функция подгонки текста
  async fitText(element) {
    // Сбрасываем стили
    this.setWidth(element, this.minWidth);
    this.setFontSize(element, this.minFontSize);
    
    let currentWidth = this.minWidth;
    let currentFontSize = this.minFontSize;
    
    while (this.getElementWidth(element) < this.containerWidth) {
      if (currentWidth < this.maxWidth) {
        currentWidth += 50; // Увеличил шаг изменения ширины
        if (currentWidth > this.maxWidth) currentWidth = this.maxWidth;
        await this.setWidth(element, currentWidth);
      }
      
      if (this.getElementWidth(element) < this.containerWidth) {
        currentFontSize += 2; // Увеличил шаг изменения размера
        if (currentFontSize > this.maxFontSize) break;
        await this.setFontSize(element, currentFontSize);
      }
    }
  }

  // Обработка всех текстовых элементов
  async fitAllText() {
    this.containerWidth = window.innerWidth * 0.9;
    const textElements = document.querySelectorAll('.text-line');
    for (const element of textElements) {
      await this.fitText(element);
    }
  }

  // Инициализация
  init() {
    window.addEventListener('load', () => this.fitAllText());
    window.addEventListener('resize', () => this.fitAllText());
  }
}

// Создаем и запускаем
const textFitter = new TextFitter();
textFitter.init();
