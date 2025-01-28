class TextFitter {
  constructor() {
    this.minWidth = 100;    // Минимальное значение wdth
    this.maxWidth = 1000;   // Максимальное значение wdth
    this.minFontSize = 16;  // Начальный размер шрифта
    this.maxFontSize = 100; // Уменьшили максимальный размер шрифта
  }

  fitText(element) {
    document.fonts.ready.then(() => {
      const containerWidth = window.innerWidth * 0.9;
      
      // Начинаем с минимального размера шрифта
      element.style.fontSize = `${this.minFontSize}px`;
      element.style.fontVariationSettings = '"wdth" 1000';
      
      // Если текст меньше контейнера, постепенно увеличиваем шрифт
      while (element.offsetWidth < containerWidth && 
             parseInt(window.getComputedStyle(element).fontSize) < this.maxFontSize) {
        const currentSize = parseInt(window.getComputedStyle(element).fontSize);
        element.style.fontSize = `${currentSize + 1}px`;
      }
      
      // Если текст стал больше контейнера, уменьшаем на 1px
      if (element.offsetWidth > containerWidth) {
        const currentSize = parseInt(window.getComputedStyle(element).fontSize);
        element.style.fontSize = `${currentSize - 1}px`;
      }
    });
  }

  fitAllText() {
    const textElements = document.querySelectorAll('.text-line');
    textElements.forEach(element => this.fitText(element));
  }

  init() {
    document.fonts.ready.then(() => {
      this.fitAllText();
      
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.fitAllText(), 100);
      });
    });
  }
}

// Создаем и запускаем
const textFitter = new TextFitter();
textFitter.init();
