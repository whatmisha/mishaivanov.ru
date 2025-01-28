function adjustFontSize() {
    const items = document.querySelectorAll('.tracklist li');
    const viewportWidth = window.innerWidth * 0.97;
    let fontSize = 20;
    
    // Оборачиваем каждую букву в span с нормальной шириной для первичной проверки
    items.forEach(item => {
        const text = item.textContent;
        item.textContent = ''; // очищаем содержимое
        [...text].forEach(letter => {
            const span = document.createElement('span');
            span.textContent = letter;
            span.style.fontVariationSettings = "'wdth' 500";
            span.style.transition = 'font-variation-settings 0.2s';
            item.appendChild(span);
        });
    });
    
    // Устанавливаем начальный размер шрифта для каждого элемента
    items.forEach(item => {
        item.style.fontSize = fontSize + 'vw';
    });
    
    // Находим самый широкий элемент
    let maxWidth = Math.max(...Array.from(items).map(item => item.offsetWidth));
    
    // Увеличиваем шрифт большими шагами
    while (maxWidth < viewportWidth && fontSize < 200) {
        fontSize += 5;
        items.forEach(item => {
            item.style.fontSize = fontSize + 'vw';
        });
        maxWidth = Math.max(...Array.from(items).map(item => item.offsetWidth));
    }
    
    // Уменьшаем на 5 и делаем точную подгонку
    fontSize -= 5;
    while (maxWidth < viewportWidth && fontSize < 200) {
        fontSize++;
        items.forEach(item => {
            item.style.fontSize = fontSize + 'vw';
        });
        maxWidth = Math.max(...Array.from(items).map(item => item.offsetWidth));
    }
    
    // Уменьшаем размер шрифта для учета расширения букв
    fontSize = Math.max(1, fontSize * 0.5);
    
    // Применяем финальный размер и добавляем обработчики
    items.forEach(item => {
        item.style.fontSize = fontSize + 'vw';
        item.style.visibility = 'visible';
        
        // Очищаем и заново создаем спаны
        const text = item.textContent;
        item.textContent = '';
        const spans = [...text].map(letter => {
            const span = document.createElement('span');
            span.textContent = letter;
            span.style.fontVariationSettings = "'wdth' 500";
            span.style.transition = 'font-variation-settings 0.2s';
            item.appendChild(span);
            return span;
        });
        
        // Добавляем обработчики с учетом соседних букв
        spans.forEach((span, index) => {
            span.addEventListener('mouseover', () => {
                // Получаем все spans из соседних элементов списка
                const currentItem = span.closest('li');
                const allItems = Array.from(document.querySelectorAll('.tracklist li'));
                const currentItemIndex = allItems.indexOf(currentItem);
                
                // Расширяем текущую букву максимально
                span.style.fontVariationSettings = "'wdth' 1000";
                
                // Расширяем соседние буквы в текущей строке
                for (let i = 1; i <= 2; i++) {
                    if (spans[index - i]) {
                        spans[index - i].style.fontVariationSettings = `'wdth' ${1000 - i * 200}`;
                    }
                    if (spans[index + i]) {
                        spans[index + i].style.fontVariationSettings = `'wdth' ${1000 - i * 200}`;
                    }
                }
                
                // Обрабатываем только одну строку выше и одну строку ниже
                [-1, 1].forEach(offset => {
                    const neighborItem = allItems[currentItemIndex + offset];
                    if (neighborItem) {
                        const neighborSpans = Array.from(neighborItem.querySelectorAll('span'));
                        if (neighborSpans[index]) {
                            neighborSpans[index].style.fontVariationSettings = `'wdth' 800`;
                        }
                        // Соседние буквы в соседней строке
                        for (let j = 1; j <= 2; j++) {
                            if (neighborSpans[index - j]) {
                                neighborSpans[index - j].style.fontVariationSettings = `'wdth' ${800 - j * 200}`;
                            }
                            if (neighborSpans[index + j]) {
                                neighborSpans[index + j].style.fontVariationSettings = `'wdth' ${800 - j * 200}`;
                            }
                        }
                    }
                });
            });
            
            span.addEventListener('mouseout', () => {
                // Сбрасываем все span элементы на странице
                document.querySelectorAll('.tracklist li span').forEach(span => {
                    span.style.fontVariationSettings = "'wdth' 500";
                });
            });
        });
    });

    // Ждем применения стилей и проверяем каждый элемент
    setTimeout(() => {
        // Находим самый широкий элемент после финальной установки размера
        const finalMaxWidth = Math.max(...Array.from(items).map(item => item.offsetWidth));
        console.log('Max width:', finalMaxWidth);
        
        items.forEach(item => {
            const itemWidth = item.offsetWidth;
            console.log(`Item "${item.textContent}": ${itemWidth}px`);
            
            // Если элемент заметно уже максимального
            if (itemWidth < finalMaxWidth - 10) {
                console.log(`Marking as red: ${item.textContent}`);
                item.style.color = '#ff0000';
            }
        });
    }, 100);
}

// Запускаем после загрузки шрифта
document.fonts.ready.then(() => {
    adjustFontSize();
});

// Перерасчет при изменении размера окна
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(adjustFontSize, 100);
}); 