# План рефакторинга v2: «Плоские контролы + Per-parameter Random + Effects-панель»

## Текущее состояние (после всех фаз) ✅

- Панель Effects вынесена в отдельную панель (Wobbly + Round Caps + Close Stems + Alt Glyphs + Chaos)
- Табы режимов убраны — все слайдеры видны, mode вычисляется через `getDerivedMode()`
- Per-parameter dice на каждом слайдере (Stem, Lines, Contrast, Dash/Gap, Wobbly Amount/Scale)
- `isRandom` = вычисляемый геттер (любой `randomize*` === true)
- `mode` удалён из settings.values — вычисляется через `getDerivedMode()`
- Панель Random: Range Mode pill → динамический список параметров → Shuffle/Randomize/Reset
- UI: pill-кнопки, section headers с ⏻, inline ↔ toggles
- Legacy настройки удалены: randomRounded, randomCloseEnds, randomDash, randomWobblyEnabled, mode
- Миграция пресетов: old mode → dashEnabled + dice flags

## Целевая архитектура

### Панель Style (геометрия)
```
┌─────────────────────────────────────┐
│ Style                            ∨  │
│                                      │
│  Stem Weight ·················  0.5  │  ← всегда видно
│                                      │
│  Lines ·······················  1    │  ← всегда; 1 = монолайн
│  Contrast ····················  1.0  │  ← dimmed при Lines=1
│  Close Stems [ ]                     │  ← dimmed при Lines=1
│                                      │
│  ── Dashes ──────────────────────── │
│  Enable [✓]                          │
│    Dash Length ···············  0.10 │  ← dimmed при Dashes OFF
│    Gap Length ················  0.30 │  ← dimmed при Dashes OFF
│    Chess Order [ ]                   │  ← dimmed при Dashes OFF
│                                      │
│  ── Random ──────────────────────── │
│    Scope: (○ By Type) (● Full)      │
│    Alternatives [✓]                  │
│                                      │
│  [       Randomize       ]           │
└─────────────────────────────────────┘
```

Каждый слайдер (Stem Weight, Lines, Contrast, Dash/Gap Length) имеет
иконку 🎲 (dice). Нажатие → слайдер превращается в range (min–max).
Кнопка Randomize и секция Random (Scope, Alternatives) видны, когда
хотя бы один параметр в range-режиме.

### Панель Effects (новая, отдельная)
```
┌─────────────────────────────────────┐
│ Effects                          ∨  │
│                                      │
│  Wobbly [✓]                   [🎲]  │
│    Amount ····················  3 px │
│    Scale ·····················  0.1  │
│                                      │
│  Round Caps [✓]                      │
│  Close Stems [✓]                     │  ← dimmed при Lines=1
│                                      │
└─────────────────────────────────────┘
```

Wobbly Amount и Scale также поддерживают dice → range.

### Панель Colors — без изменений

### Как определяется внутренний `mode`

Табов больше нет. `mode` вычисляется из состояния:
- `Lines=1 + dashEnabled=false` → `fill`
- `Lines>1 + dashEnabled=false` → `stripes`
- `Lines≥1 + dashEnabled=true + Lines=1` → `dash`
- `Lines>1 + dashEnabled=true` → `sd`

### Как работает per-parameter Random

Каждый слайдер хранит:
- `randomize{Param}: boolean` — включён ли range-режим для этого параметра
- `random{Param}Min / random{Param}Max` — диапазон (уже существуют)

Глобальный `isRandom` = любой `randomize*` === true.
Кнопка Randomize и секция Random показываются при `isRandom`.

При Randomize: для каждого модуля генерируются случайные значения
только для тех параметров, у которых включён dice.
Параметры без dice используют фиксированное значение из single-слайдера.

---

## Этапы реализации

### Фаза 4: Панель Effects — отдельная панель ✅

**Цель:** вынести Effects из Style-панели в отдельную панель

**Шаг 4.1 — Создать HTML-панель Effects в `index.html`**
- Между панелями Style и Colors
- Структура аналогична другим панелям: `<aside class="controls-panel">` + header + content
- Содержимое:
  - Wobbly (toggle + Amount slider + Scale slider)
  - Round Caps (checkbox)
  - Close Stems (checkbox) — dimmed при Lines=1

**Шаг 4.2 — Удалить Effects-секцию из Style-панели**
- Убрать `effectsSectionWrapper` из `index.html`
- ID элементов остаются прежними (`wobblyCheckbox`, `wobblyAmountSlider`, `roundedCapsCheckbox`, `closeEndsCheckbox`)

**Шаг 4.3 — Зарегистрировать панель в PanelManager**
- `js/main.js`, `initPanels()`: добавить `this.panelManager.registerPanel('effectsPanel', ...)`

**Шаг 4.4 — Обновить CSS**
- Стили `.effects-section` → стили обычной панели
- Удалить `.effects-section-header` (заменён на стандартный `.panel-header`)

**Шаг 4.5 — Обновить visibility-логику**
- `updateWobblyVisibility()`: убрать `effectsSectionWrapper.style.display`, Wobbly-контролы видны всегда
- `updateRoundedCapsVisibility()`: Close Stems dimmed при Lines=1, Round Caps виден всегда
- Chess Order остаётся в Style-панели (привязан к Dashes)

**Проверка:** Effects — отдельная панель. Wobbly/Round Caps/Close Stems работают. Style-панель не содержит эффектов. SVG-экспорт работает.

---

### Фаза 5: Убрать табы стилей, показать все параметры ✅

**Цель:** заменить табы на плоский список параметров с тоглами

**Шаг 5.1 — Удалить кнопки режимов из HTML**
- Удалить `style-buttons-container` с кнопками Monoline/Stripes/Dashes/Dashed Stripes/Random

**Шаг 5.2 — Показать все слайдеры геометрии**
- Убрать `style="display: none"` у:
  - `strokesControlGroup` (Lines)
  - `strokeGapRatioControlGroup` (Contrast)
  - `dashLengthControlGroup` (Dash Length)
  - `gapLengthControlGroup` (Gap Length)
- Сгруппировать Dashes: обернуть Dash Length, Gap Length, Chess Order в секцию `dashes-section` с тоглом Enable

**Шаг 5.3 — Добавить настройку `dashEnabled` в settings**
- `this.settings.values`: добавить `dashEnabled: false`
- Добавить тогл `dashEnabledCheckbox` в HTML

**Шаг 5.4 — Вычисляемый `mode` вместо ручного**
- Добавить метод `getDerivedMode()`:
  ```
  getDerivedMode() {
    const lines = this.settings.get('strokesNum');
    const dash = this.settings.get('dashEnabled');
    if (dash && lines > 1) return 'sd';
    if (dash) return 'dash';
    if (lines > 1) return 'stripes';
    return 'fill';
  }
  ```
- В `updateRenderer()`: `mode: this.getDerivedMode()` вместо `this.settings.get('mode')`

**Шаг 5.5 — Обновить `initModeToggle()` → `initStyleControls()`**
- Полностью переписать: вместо переключения табов — обработчики для Lines и dashEnabled
- При изменении Lines: обновить dimmed-состояние Contrast и Close Stems
- При изменении dashEnabled: обновить dimmed-состояние Dash Length, Gap Length, Chess Order
- Вызвать `updateRenderer()` после каждого изменения

**Шаг 5.6 — Удалить Random-секции из HTML**
- Удалить `randomSectionGeneral`, `randomSectionWobbly`, `randomSectionDash`
- Удалить кнопку `modeRandom` (уже нет табов)
- Оставить `randomSectionButton` (кнопка Randomize)

**Шаг 5.7 — Удалить обработчики режимов**
- Убрать логику `fillButton/stripesButton/dashButton/sdButton/randomButton`
- Убрать `setActiveButton()`, `updateMode()`
- Убрать инициализацию Random-специфичных чекбоксов (`randomFullRandomCheckbox` и т.д.) из `updateMode()`

**Шаг 5.8 — Обновить `updateUIFromSettings()`**
- Вместо установки активной кнопки — установить значения слайдеров и тоглов
- Lines, dashEnabled, Contrast и т.д. восстанавливаются напрямую

**Проверка:** табов нет, все слайдеры видны, Dashes включается/выключается тоглом, рендер корректно определяет mode через `getDerivedMode()`. Random-секции удалены (Random пока не работает — подключится позже).

---

### Фаза 6: Per-parameter dice и DualSlider ✅

**Цель:** каждый слайдер может переключаться в range-режим

**Шаг 6.1 — Добавить per-parameter randomize-флаги в settings**
- `randomizeStem: false`
- `randomizeStrokes: false`
- `randomizeContrast: false`
- `randomizeDashLength: false`
- `randomizeGapLength: false`
- `randomizeWobblyAmount: false`
- `randomizeWobblyFrequency: false`

**Шаг 6.2 — Вычисляемый `isRandom`**
- Убрать `isRandom` из settings.values
- Добавить геттер:
  ```
  get isRandom() {
    return this.values.randomizeStem || this.values.randomizeStrokes ||
           this.values.randomizeContrast || this.values.randomizeDashLength ||
           this.values.randomizeGapLength || this.values.randomizeWobblyAmount ||
           this.values.randomizeWobblyFrequency;
  }
  ```

**Шаг 6.3 — Разработать DiceSlider компонент**
- Новый файл: `js/ui/DiceSliderController.js`
- Обёртка над `SliderController` + `RangeSliderController`
- Каждый DiceSlider: обычный слайдер + иконка dice справа от label
- Клик на dice:
  - single → range: min = max = текущее значение
  - range → single: значение = среднее из min/max
- API: `isDice()`, `toggleDice()`, `getValue()`, `getRange()`
- HTML-разметка: оба варианта (single + range) в одном control-group, один скрыт

**Шаг 6.4 — Применить DiceSlider к Stem Weight**
- HTML: добавить dice-иконку и range-вариант слайдера
- JS: инициализировать DiceSlider, связать с `randomizeStem`, `randomStemMin/Max`, `stemMultiplier`

**Шаг 6.5 — Применить DiceSlider к Lines**
- Связать с `randomizeStrokes`, `randomStrokesMin/Max`, `strokesNum`

**Шаг 6.6 — Применить DiceSlider к Contrast**
- Связать с `randomizeContrast`, `randomContrastMin/Max`, `strokeGapRatio`

**Шаг 6.7 — Применить DiceSlider к Dash Length и Gap Length**
- Связать с `randomizeDashLength/GapLength`, `randomDashLengthMin/Max`, `randomGapLengthMin/Max`

**Шаг 6.8 — Применить DiceSlider к Wobbly Amount и Scale (в Effects-панели)**
- Связать с `randomizeWobblyAmount/Frequency`, `randomWobblyAmountMin/Max`, `randomWobblyFrequencyMin/Max`

**Шаг 6.9 — Секция Random и кнопка Randomize**
- HTML: секция Random в Style-панели (после Dashes) с Scope и Alternatives
- Секция видна когда `isRandom === true`
- Кнопка Randomize видна когда `isRandom === true`

**Проверка после каждого шага 6.4–6.8:** dice переключает single/range, значения сохраняются, UI не ломается. Секция Random появляется/скрывается.

---

### Фаза 7: Рефакторинг VoidRenderer ✅

**Цель:** заменить `mode === 'random'` на per-parameter random

**Шаг 7.1 — Обновить `updateParams()` в VoidRenderer**
- Вместо `this.params.mode === 'random'` для очистки кэшей → `this.params.isRandom`
- `mode` теперь всегда один из `fill/stripes/dash/sd` (вычислен в main.js)

**Шаг 7.2 — Обновить `renderGlyph()`: логику рандомизации**
- Было: `if (this.params.mode === 'random') { randomValues = ... }`
- Стало: `if (this.params.isRandom) { randomValues = ... }`
- `getRandomModuleValues()` теперь учитывает, какие именно параметры рандомизируются:
  - `randomizeStem` → stem из диапазона, иначе фиксированный
  - `randomizeStrokes` → strokesNum из диапазона, иначе фиксированный
  - `randomizeContrast` → strokeGapRatio из диапазона, иначе фиксированный
  - `randomizeDashLength/GapLength` → только если `dashEnabled`
- `mode` не меняется на 'stripes' для random — используется реальный derived mode
- Если `randomizeDashLength` и текущий mode не dash/sd → для отдельных модулей dash вкл/выкл по вероятности (как сейчас `randomDash`)

**Шаг 7.3 — Обновить Round Caps / Close Ends**
- Всегда из `params.roundedCaps` и `params.closeEnds` (Effects-панель)
- Убрать `randomRounded` / `randomCloseEnds`

**Шаг 7.4 — Обновить Wobbly**
- Если `randomizeWobblyAmount` → amount из диапазона
- Если `randomizeWobblyFrequency` → frequency из диапазона
- Если оба выключены → фиксированные значения

**Проверка:** все комбинации dice on/off корректно рандомизируют нужные параметры. Фиксированные параметры не меняются.

---

### Фаза 8: Рефакторинг VoidExporter ✅

**Цель:** SVG-экспорт работает с per-parameter random

**Шаг 8.1 — Заменить `mode === 'random'` → `params.isRandom`**
- `actualMode` берётся из `params.mode` (всегда реальный стиль)
- При `isRandom` модуль может использовать dash → временно `sd`

**Шаг 8.2 — Round Caps / Close Ends — из params напрямую**

**Шаг 8.3 — Alternative glyphs: `params.isRandom && params.useAlternativesInRandom`**

**Проверка:** SVG-экспорт корректен во всех комбинациях. Adobe Illustrator открывает.

---

### Фаза 9: Обновление `updateRenderer()` в main.js ✅

**Цель:** маппинг из settings в params учитывает per-parameter random

**Шаг 9.1 — `mode` из `getDerivedMode()`**

**Шаг 9.2 — `isRandom` из вычисляемого геттера**

**Шаг 9.3 — Per-parameter flags в params**
- Передать `randomizeStem`, `randomizeStrokes`, `randomizeContrast`,
  `randomizeDashLength`, `randomizeGapLength` в params
- Передать `randomizeWobblyAmount`, `randomizeWobblyFrequency`

**Шаг 9.4 — Wobbly маппинг**
- `wobblyEnabled` всегда из settings (Effects-панель)
- `wobblyAmount` и `wobblyFrequency`: если randomize* → передать ranges, иначе фиксированные

**Шаг 9.5 — Обновить Randomize button handler**
- Показывать при `isRandom`
- При нажатии: очистить кэш, пересидировать wobbly, updateRenderer

**Шаг 9.6 — Stem Weight в General-панели**
- Убрать блокировку `stemSlider.disabled = (mode === 'random')`
- Stem Weight в General и в Style (если останется) — синхронизированы

**Проверка:** все параметры корректно маппятся, рендер работает, экспорт работает.

---

### Фаза 10: Обновление `RandomUtils` ✅

**Цель:** `getRandomModuleValues()` работает с per-parameter flags

**Шаг 10.1 — Обновить сигнатуру**
- Принимает объект с флагами: какие параметры рандомизировать
- Для нерандомизированных — возвращает фиксированное значение из params

**Шаг 10.2 — Обновить логику dash в random**
- Было: `randomDash` — глобальный флаг
- Стало: если `dashEnabled` и `randomizeDashLength` → dash для всех модулей
- Если `!dashEnabled` но `randomizeDashLength` → вероятностный dash (50%)

**Проверка:** различные комбинации dice дают корректный результат.

---

### Фаза 11: Очистка и миграция пресетов ✅

**Шаг 11.1 — Удалить неиспользуемые settings**
- `mode` → вычисляется через `getDerivedMode()`
- `isRandom` → вычисляется через геттер
- `randomRounded`, `randomCloseEnds` → убрать (используются roundedCaps, closeEnds)
- `randomColor`, `randomColorChaos*` → убрать (управляются Colors-панелью)
- `randomWobblyEnabled` → заменён на `randomizeWobblyAmount`/`randomizeWobblyFrequency`
- `randomDash` → заменён на `randomizeDashLength`

**Шаг 11.2 — Миграция пресетов**
- `PresetManager`: при загрузке старого пресета:
  - `mode: 'random'` → установить dice-флаги на все параметры + `dashEnabled` из контекста
  - `mode: 'dash'` → `dashEnabled: true`
  - `mode: 'sd'` → `dashEnabled: true`
  - `mode: 'fill'` / `mode: 'stripes'` → `dashEnabled: false`
  - `randomRounded` → `roundedCaps`
  - `randomCloseEnds` → `closeEnds`

**Шаг 11.3 — Удалить мёртвый код**
- HTML: random-секции, табы стилей
- JS: обработчики табов, `initModeToggle()`, `updateMode()`, random-секции
- CSS: `.random-section`, `.style-buttons-container` (если больше нигде)

**Проверка:** старые пресеты корректно мигрируют. Новые сохраняются с новой структурой.

---

### Фаза 12: Финальная полировка ✅

**Шаг 12.1 — Visibility-логика Style**
- Contrast: dimmed при Lines=1
- Close Stems (в Effects-панели): dimmed при Lines=1
- Dash Length / Gap Length / Chess: dimmed при dashEnabled=false
- Секция Random + Randomize: видны при isRandom

**Шаг 12.2 — Dice UX**
- Иконка dice: маленькая, справа от label слайдера
- Активный dice: подсвечен (белый)
- Неактивный dice: приглушён (серый)
- При переключении single→range: min=max=текущее значение (плавный переход)
- При переключении range→single: значение = среднее

**Шаг 12.3 — CSS**
- Стили для DiceSlider (иконка, range-режим)
- Стили для Effects-панели
- Стили для dashes-section
- Анимация переходов
- Адаптив

**Шаг 12.4 — Комплексное тестирование**
- Все комбинации: Lines × dashEnabled × Wobbly × Round Caps × различные dice
- SVG-экспорт каждой комбинации
- Adobe Illustrator
- Пресеты: save / load / migrate

**Проверка:** всё работает, UI чистый, SVG экспортируется, пресеты загружаются.

---

## Зависимости между фазами

```
Фазы 0–3 (уже сделано)
  │
  ├─► Фаза 4 (Effects → отдельная панель)
  │
  ├─► Фаза 5 (убрать табы, плоские контролы)
  │     │
  │     └─► Фаза 6 (DiceSlider + per-parameter random)
  │
  ├─► Фаза 7 (VoidRenderer)  ← зависит от 5, 6
  │     │
  │     └─► Фаза 8 (VoidExporter)  ← зависит от 7
  │
  ├─► Фаза 9 (updateRenderer маппинг)  ← зависит от 5, 6, 7
  │
  ├─► Фаза 10 (RandomUtils)  ← зависит от 7
  │
  ├─► Фаза 11 (очистка + пресеты)  ← зависит от 7, 8, 9, 10
  │
  └─► Фаза 12 (полировка)  ← зависит от всех
```

## Файлы, которые затрагиваются

| Файл | Фазы | Характер изменений |
|------|------|--------------------|
| `index.html` | 4, 5, 6, 11 | Effects-панель, удаление табов, dice-разметка |
| `styles.css` | 4, 6, 12 | Effects-панель, dice-стили, dashes-section |
| `js/main.js` | 4, 5, 6, 9, 11 | Основной рефакторинг |
| `js/core/VoidRenderer.js` | 7 | `mode === 'random'` → per-param |
| `js/core/VoidExporter.js` | 8 | `mode === 'random'` → per-param |
| `js/utils/RandomUtils.js` | 10 | Per-parameter randomization |
| `js/ui/DiceSliderController.js` | 6 | Новый файл |
| `js/core/PresetManager.js` | 11 | Миграция пресетов |

## Оценка объёма

- **Фаза 4:** ~1 час (Effects → отдельная панель)
- **Фаза 5:** ~2 часа (убрать табы, getDerivedMode, плоские контролы)
- **Фаза 6:** ~4 часа (DiceSlider компонент + применение ко всем слайдерам)
- **Фазы 7–8:** ~2 часа (VoidRenderer + VoidExporter)
- **Фаза 9:** ~1 час (updateRenderer маппинг)
- **Фаза 10:** ~1 час (RandomUtils)
- **Фаза 11:** ~1.5 часа (очистка + пресеты)
- **Фаза 12:** ~2 часа (полировка + тестирование)

**Итого: ~14–15 часов работы**
