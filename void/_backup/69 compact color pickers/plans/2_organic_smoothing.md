# ПЛАН РЕАЛИЗАЦИИ: Organic Curve Smoothing (Органическое сглаживание)

## 🎯 Концепция

Преобразовать угловатые геометрические формы модулей в плавные органические 
кривые. Все углы и переходы между сегментами становятся мягкими, "текучими".
Эффект достигается применением Catmull-Rom или Bezier сплайнов к контурам.

---

## 📐 Архитектура

### Новые файлы:
```
js/
├── utils/
│   └── CurveSmoothing.js    // Алгоритмы сглаживания кривых
├── effects/
│   └── OrganicEffect.js     // Применение эффекта к модулям
```

### Изменяемые файлы:
- js/core/ModuleDrawer.js    // Интеграция эффекта при рендеринге
- js/core/VoidExporter.js    // Поддержка экспорта в SVG
- js/main.js                 // UI-контролы
- index.html                 // Слайдеры параметров
- styles.css                 // Стили для новых контролов

---

## 🔧 Этап 1: Алгоритмы сглаживания (CurveSmoothing.js)

### 1.1 Catmull-Rom сплайн

Catmull-Rom — интерполирующий сплайн, который проходит через все контрольные 
точки. Идеален для сглаживания контуров.

```javascript
class CurveSmoothing {
    /**
     * Конвертировать точки в Catmull-Rom сплайн
     * @param {Array} points - массив {x, y}
     * @param {number} tension - натяжение (0 = прямые, 1 = максимум)
     * @param {number} segments - сегментов между точками
     * @returns {Array} - сглаженные точки
     */
    static catmullRom(points, tension = 0.5, segments = 10) {
        if (points.length < 2) return points;
        
        const result = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            
            for (let t = 0; t < segments; t++) {
                const s = t / segments;
                result.push(this.catmullRomPoint(p0, p1, p2, p3, s, tension));
            }
        }
        
        // Добавить последнюю точку
        result.push(points[points.length - 1]);
        
        return result;
    }
    
    /**
     * Вычислить точку на Catmull-Rom сплайне
     */
    static catmullRomPoint(p0, p1, p2, p3, t, tension) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const v0 = (p2.x - p0.x) * tension;
        const v1 = (p3.x - p1.x) * tension;
        const x = (2 * p1.x - 2 * p2.x + v0 + v1) * t3 + 
                  (-3 * p1.x + 3 * p2.x - 2 * v0 - v1) * t2 + 
                  v0 * t + p1.x;
        
        const w0 = (p2.y - p0.y) * tension;
        const w1 = (p3.y - p1.y) * tension;
        const y = (2 * p1.y - 2 * p2.y + w0 + w1) * t3 + 
                  (-3 * p1.y + 3 * p2.y - 2 * w0 - w1) * t2 + 
                  w0 * t + p1.y;
        
        return { x, y };
    }
}
```

### 1.2 Конвертация в кубические Bezier

Для SVG-экспорта нужно конвертировать Catmull-Rom в Bezier:

```javascript
/**
 * Конвертировать Catmull-Rom в кубические Bezier кривые
 * @param {Array} points - контрольные точки
 * @param {number} tension - натяжение
 * @returns {Array} - массив Bezier-сегментов [{p0, cp1, cp2, p1}, ...]
 */
static catmullRomToBezier(points, tension = 0.5) {
    const beziers = [];
    
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        
        // Контрольные точки для Bezier
        const cp1 = {
            x: p1.x + (p2.x - p0.x) * tension / 6,
            y: p1.y + (p2.y - p0.y) * tension / 6
        };
        const cp2 = {
            x: p2.x - (p3.x - p1.x) * tension / 6,
            y: p2.y - (p3.y - p1.y) * tension / 6
        };
        
        beziers.push({
            p0: p1,
            cp1: cp1,
            cp2: cp2,
            p1: p2
        });
    }
    
    return beziers;
}
```

### 1.3 Corner Rounding (Скругление углов)

Альтернативный подход — скруглять только углы:

```javascript
/**
 * Скруглить углы полигона
 * @param {Array} points - вершины полигона
 * @param {number} radius - радиус скругления
 * @returns {Array} - точки со скругленными углами
 */
static roundCorners(points, radius) {
    const result = [];
    
    for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const curr = points[i];
        const next = points[(i + 1) % points.length];
        
        // Векторы к соседним точкам
        const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };
        
        // Нормализовать
        const len1 = Math.hypot(v1.x, v1.y);
        const len2 = Math.hypot(v2.x, v2.y);
        
        if (len1 === 0 || len2 === 0) {
            result.push(curr);
            continue;
        }
        
        v1.x /= len1; v1.y /= len1;
        v2.x /= len2; v2.y /= len2;
        
        // Ограничить радиус
        const maxRadius = Math.min(radius, len1 / 2, len2 / 2);
        
        // Точки начала и конца дуги
        const start = {
            x: curr.x + v1.x * maxRadius,
            y: curr.y + v1.y * maxRadius
        };
        const end = {
            x: curr.x + v2.x * maxRadius,
            y: curr.y + v2.y * maxRadius
        };
        
        // Добавить дугу (через квадратичную Bezier)
        result.push(start);
        result.push({ 
            x: curr.x, 
            y: curr.y, 
            isControl: true  // Контрольная точка
        });
        result.push(end);
    }
    
    return result;
}
```

---

## 🔧 Этап 2: Эффект органического сглаживания (OrganicEffect.js)

### 2.1 Основной класс

```javascript
class OrganicEffect {
    /**
     * Применить органическое сглаживание к контуру
     * @param {Array} points - исходные точки контура
     * @param {Object} options - параметры
     * @returns {Array} - сглаженные точки
     */
    applyToPath(points, options) {
        const { 
            smoothness = 0.5,    // 0-1: степень сглаживания
            cornerRadius = 0,    // радиус скругления углов
            mode = 'catmull'     // 'catmull' | 'bezier' | 'corners'
        } = options;
        
        if (mode === 'corners' && cornerRadius > 0) {
            return CurveSmoothing.roundCorners(points, cornerRadius);
        }
        
        if (mode === 'catmull' || mode === 'bezier') {
            const tension = 0.3 + smoothness * 0.4; // 0.3-0.7
            const segments = Math.floor(5 + smoothness * 15); // 5-20
            return CurveSmoothing.catmullRom(points, tension, segments);
        }
        
        return points;
    }
    
    /**
     * Получить Bezier-сегменты для SVG
     */
    toBezierPath(points, smoothness = 0.5) {
        const tension = 0.3 + smoothness * 0.4;
        return CurveSmoothing.catmullRomToBezier(points, tension);
    }
}
```

### 2.2 Обработка разных типов модулей

| Тип модуля | Особенности обработки |
|------------|----------------------|
| straight | Сгладить концы линий |
| round | Сгладить переходы между дугой и прямыми |
| bend | Сгладить внутренний и внешний контуры дуги |
| joint | Сгладить центральное пересечение |
| link | Сгладить короткие концы |
| central | Сгладить крестовину |

---

## 🔧 Этап 3: Интеграция с ModuleDrawer

### 3.1 Режим работы

Organic Smoothing работает как:
a) Отдельный режим (mode: 'organic') — **рекомендую**
b) Toggle-модификатор для любого режима

### 3.2 Изменения в ModuleDrawer

```javascript
// В методе рендеринга
renderModule(type, params) {
    // Получить контуры модуля как массив точек
    let contours = this.getModuleContours(type, params);
    
    // Применить organic эффект
    if (params.mode === 'organic' || params.organicEnabled) {
        contours = contours.map(contour => 
            this.organicEffect.applyToPath(contour, {
                smoothness: params.organicSmoothness,
                mode: 'catmull'
            })
        );
    }
    
    // Отрисовать как заполненный путь или обводку
    this.drawContours(contours, params);
}
```

### 3.3 Метод получения контуров

Нужен универсальный метод для получения контура любого модуля:

```javascript
getModuleContours(type, params) {
    const { x, y, w, h, stem, rotation } = params;
    
    switch(type) {
        case 'straight':
            return this.getStraightContours(x, y, w, h, stem, rotation);
        case 'round':
            return this.getRoundContours(x, y, w, h, stem, rotation);
        case 'bend':
            return this.getBendContours(x, y, w, h, stem, rotation);
        case 'joint':
            return this.getJointContours(x, y, w, h, stem, rotation);
        case 'link':
            return this.getLinkContours(x, y, w, h, stem, rotation);
        case 'central':
            return this.getCentralContours(x, y, w, h, stem, rotation);
        default:
            return [];
    }
}
```

### 3.4 Пример: getStraightContours

```javascript
getStraightContours(x, y, w, h, stem, rotation) {
    // Прямой модуль — это прямоугольник
    const halfStem = stem / 2;
    
    // Базовые точки (до поворота)
    let points;
    if (rotation === 0 || rotation === 180) {
        // Горизонтальный
        points = [
            { x: x, y: y + h/2 - halfStem },
            { x: x + w, y: y + h/2 - halfStem },
            { x: x + w, y: y + h/2 + halfStem },
            { x: x, y: y + h/2 + halfStem }
        ];
    } else {
        // Вертикальный
        points = [
            { x: x + w/2 - halfStem, y: y },
            { x: x + w/2 + halfStem, y: y },
            { x: x + w/2 + halfStem, y: y + h },
            { x: x + w/2 - halfStem, y: y + h }
        ];
    }
    
    return [points]; // Массив контуров
}
```

---

## 🔧 Этап 4: UI-контролы

### 4.1 HTML

```html
<!-- Organic Smoothness (показывается только в режиме Organic или когда toggle включен) -->
<div class="control-group" id="organicSmoothnessControlGroup" style="display: none; margin-top: 18px;">
    <label for="organicSmoothnessSlider">
        <span>Smoothness</span>
        <input type="text" class="value-display" id="organicSmoothnessValue" value="0.5">
    </label>
    <input type="range" id="organicSmoothnessSlider" min="0" max="1" value="0.5" step="0.05">
</div>
```

### 4.2 Параметры

| UI-название | Внутреннее имя | Описание |
|-------------|----------------|----------|
| Smoothness | organicSmoothness | Степень сглаживания (0-1) |

### 4.3 Видимость

Показывать слайдер Smoothness только когда выбран режим Organic 
(или когда будет добавлена кнопка Organic в style-buttons-container).

---

## 🔧 Этап 5: Экспорт в SVG (VoidExporter.js)

### 5.1 Bezier path в SVG

```javascript
renderOrganicToSVG(contours, options) {
    const paths = [];
    
    for (const contour of contours) {
        const beziers = this.organicEffect.toBezierPath(contour, options.smoothness);
        
        let d = `M ${beziers[0].p0.x.toFixed(2)},${beziers[0].p0.y.toFixed(2)}`;
        
        for (const seg of beziers) {
            d += ` C ${seg.cp1.x.toFixed(2)},${seg.cp1.y.toFixed(2)}`;
            d += ` ${seg.cp2.x.toFixed(2)},${seg.cp2.y.toFixed(2)}`;
            d += ` ${seg.p1.x.toFixed(2)},${seg.p1.y.toFixed(2)}`;
        }
        
        d += ' Z'; // Замкнуть контур
        
        paths.push(`<path d="${d}" fill="currentColor"/>`);
    }
    
    return paths.join('\n');
}
```

### 5.2 Оптимизация SVG

- Использовать относительные команды (c вместо C)
- Округлять до 1-2 знаков
- Объединять контуры одного глифа в один path с fill-rule="evenodd"

---

## 📋 Порядок реализации

### Фаза 1: Алгоритмы сглаживания (2-3 часа)
1. ✅ Создать CurveSmoothing.js
2. ✅ Реализовать catmullRom
3. ✅ Реализовать catmullRomToBezier
4. ✅ Реализовать roundCorners (опционально)
5. ✅ Тестирование на простых примерах

### Фаза 2: OrganicEffect (1-2 часа)
1. ✅ Создать OrganicEffect.js
2. ✅ Реализовать applyToPath
3. ✅ Реализовать toBezierPath

### Фаза 3: Получение контуров модулей (3-4 часа)
1. ✅ Реализовать getModuleContours
2. ✅ getStraightContours
3. ✅ getRoundContours
4. ✅ getBendContours
5. ✅ getJointContours
6. ✅ getLinkContours
7. ✅ getCentralContours
8. ✅ Тестирование для всех типов

### Фаза 4: Интеграция с рендерингом (2-3 часа)
1. ✅ Добавить режим 'organic' в ModuleDrawer
2. ✅ Интегрировать OrganicEffect
3. ✅ Тестирование рендеринга

### Фаза 5: UI (1 час)
1. ✅ Добавить кнопку Organic в style-buttons-container
2. ✅ Добавить слайдер Smoothness
3. ✅ Обработчики в main.js

### Фаза 6: SVG экспорт (1-2 часа)
1. ✅ Интегрировать в VoidExporter
2. ✅ Тестирование экспорта
3. ✅ Оптимизация размера

---

## ⚠️ Потенциальные проблемы и решения

| Проблема | Решение |
|----------|---------|
| Контуры самопересекаются | Уменьшить smoothness, проверить направление точек |
| Потеря острых углов где нужны | Добавить параметр "preserve corners" |
| Слишком много точек | Использовать Bezier напрямую, не интерполировать |
| Разрывы в контуре | Правильно замыкать контур (первая точка = последняя) |
| Медленный рендеринг | Уменьшить segments, кэшировать результаты |

---

## 🎨 Ожидаемый результат

- Буквы становятся "текучими", органичными
- Все углы плавно скруглены
- Контуры выглядят как капли жидкости
- Можно регулировать степень сглаживания
- Идеально экспортируется в SVG (компактные Bezier-кривые)

---

## 📊 Сравнение с Wobbly Lines

| Аспект | Wobbly Lines | Organic Smoothing |
|--------|--------------|-------------------|
| Характер | Случайный, "дрожащий" | Детерминированный, плавный |
| Повторяемость | Зависит от seed | Всегда одинаковый |
| Сложность | Низкая | Средняя |
| Влияние на форму | Небольшое | Значительное |
| Размер SVG | Большой (много точек) | Компактный (Bezier) |

---

## 📊 Оценка сложности

| Аспект | Оценка |
|--------|--------|
| Сложность реализации | ⭐⭐ (низкая-средняя) |
| Влияние на производительность | ⭐ (минимальное) |
| Сложность SVG-экспорта | ⭐⭐ (средняя) |
| Визуальный эффект | ⭐⭐⭐⭐⭐ (очень сильный) |

**Общее время реализации: 10-15 часов**

---

## 💡 Комбинация с другими эффектами

Organic Smoothing можно комбинировать с:

1. **Wobbly Lines** — сначала сгладить, потом добавить дрожание
2. **Stripes mode** — органические полоски
3. **Dash mode** — органические пунктиры

Для этого эффекты должны применяться в правильном порядке:
1. Получить базовый контур
2. Применить Organic Smoothing
3. Применить Wobbly (если включен)
4. Отрисовать/экспортировать
