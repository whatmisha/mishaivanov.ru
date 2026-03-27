# Рефакторинг v3: «Colors ↔ Source/Random + Панель Random + Dice-логика»

## Три направления

1. **Colors → Source + Random dice** (вариант B)
2. **Панель Random** — отдельная панель с Reset All Dice
3. **Баг-фикс:** выключение Dashes не сбрасывает dice-флаги

## Зависимости

```
Фаза 1 (баг-фикс dash dice) ← независимая, делаем первой
  │
Фаза 2 (панель Random)      ← независимая от Colors
  │
Фаза 3 (Colors → Source/Random)
  │
Фаза 4 (интеграция + полировка) ← зависит от 2 и 3
```

---

## Фаза 1: Баг-фикс — выключение Dashes не сбрасывает dice

**Проблема:** если включить Dashes → включить dice на Dash Length/Gap Length → выключить Dashes, то dice-флаги остаются и параметры продолжают участвовать в рандоме.

**Аналогичная проблема:** если выключить Wobbly → dice на Amount/Frequency должны сброситься.

### Шаг 1.1 — При выключении Dashes сбросить dice Dash/Gap

**Файл:** `js/main.js`, обработчик `dashEnabledCheckbox`

Добавить при `enabled === false`:
```js
if (!enabled) {
    // Reset dice for Dash Length and Gap Length
    for (const param of ['dashLength', 'gapLength']) {
        const cfg = DICE_CONFIG[param];
        this.settings.set(cfg.flag, false);
        const singleWrap = document.getElementById(cfg.singleWrap);
        const rangeWrap = document.getElementById(cfg.rangeWrap);
        const diceBtn = document.getElementById(cfg.diceBtnId);
        if (singleWrap) singleWrap.style.display = '';
        if (rangeWrap) rangeWrap.style.display = 'none';
        if (diceBtn) diceBtn.classList.remove('active');
    }
    this.updateRandomSectionVisibility();
}
```

### Шаг 1.2 — При выключении Wobbly сбросить dice Amount/Frequency

**Файл:** `js/main.js`, обработчик `wobblyCheckbox`

Аналогично: при `wobblyEnabled === false` сбросить `randomizeWobblyAmount` и `randomizeWobblyFrequency`.

### Шаг 1.3 — При Lines=1 сбросить dice для Contrast

**Файл:** `js/main.js`, обработчик `strokesSlider`

Если `strokesNum` стало 1, сбросить `randomizeContrast`, показать single-слайдер Contrast.

**Проверка:** включить dice на Dash Length → выключить Dashes → dice выключен, секция Random скрылась (если других dice нет). Аналогично для Wobbly и Contrast.

---

## Фаза 2: Панель Random — отдельная панель

**Цель:** вынести Random из Style-панели в отдельную мини-панель, которая появляется когда `isRandom === true`.

### Шаг 2.1 — Создать HTML-панель Random

**Файл:** `index.html`

Удалить `randomSection` из Style-панели. Создать отдельную панель:

```html
<!-- Random Panel (visible when any dice is on) -->
<aside class="controls-panel controls-panel-random" id="randomPanel" style="display: none;">
    <div class="panel-header" id="randomPanelHeader">
        <span>Random <span class="dice-count" id="diceCountBadge"></span></span>
        <span class="collapse-icon">...</span>
    </div>
    <div class="panel-content">
        <section class="control-section">
            <div class="control-group toggle-group-row">
                <label class="radio-label">
                    <input type="radio" name="randomScope" value="byType" id="randomScopeByType" checked>
                    <span>By Type</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="randomScope" value="full" id="randomScopeFull">
                    <span>Full</span>
                </label>
            </div>
            <div class="control-group toggle-group-row">
                <label class="checkbox-label" for="alternativeGlyphsCheckbox">
                    <input type="checkbox" id="alternativeGlyphsCheckbox" checked>
                    <span>Alternative Glyphs</span>
                </label>
            </div>
            <div class="control-group" style="display: flex; gap: 8px;">
                <button type="button" class="btn-secondary" id="resetAllDiceBtn" style="flex: 1;">Reset</button>
                <button type="button" class="btn-secondary" id="renewRandomBtn" style="flex: 1;">Randomize</button>
            </div>
        </section>
    </div>
</aside>
```

Размещение: после Effects-панели, перед Colors-панелью. Позиция CSS: правый нижний угол, ниже Effects.

### Шаг 2.2 — CSS для панели Random

**Файл:** `styles.css`

```css
.controls-panel-random {
    /* Позиционирование — под Effects, справа */
}

.dice-count {
    font-size: 0.7rem;
    background: var(--color-accent, #fff);
    color: var(--color-bg, #000);
    padding: 1px 5px;
    border-radius: 8px;
    margin-left: 4px;
}
```

### Шаг 2.3 — Зарегистрировать панель в PanelManager

**Файл:** `js/main.js`, `initPanels()`

Добавить `this.panelManager.registerPanel('randomPanel', ...)`.

### Шаг 2.4 — Перенести обработчики из `initRandomSection()`

**Файл:** `js/main.js`

Метод `initRandomSection()` уже работает с нужными ID. Перенести нечего — ID элементов совпадают.

### Шаг 2.5 — Обновить `updateRandomSectionVisibility()`

**Файл:** `js/main.js`

Было: показывать/скрывать `randomSection` (div внутри Style).
Стало: показывать/скрывать `randomPanel` (отдельную aside-панель).

```js
updateRandomSectionVisibility() {
    const panel = document.getElementById('randomPanel');
    if (!panel) return;
    const isRandom = this.settings.get('isRandom');
    panel.style.display = isRandom ? '' : 'none';
    
    // Update dice count badge
    const badge = document.getElementById('diceCountBadge');
    if (badge) {
        const count = Object.values(DICE_CONFIG)
            .filter(cfg => this.settings.get(cfg.flag)).length;
        badge.textContent = count > 0 ? `(${count})` : '';
    }
}
```

### Шаг 2.6 — Добавить Reset All Dice

**Файл:** `js/main.js`

```js
initResetAllDice() {
    const btn = document.getElementById('resetAllDiceBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        for (const cfg of Object.values(DICE_CONFIG)) {
            this.settings.set(cfg.flag, false);
            const singleWrap = document.getElementById(cfg.singleWrap);
            const rangeWrap = document.getElementById(cfg.rangeWrap);
            const diceBtn = document.getElementById(cfg.diceBtnId);
            if (singleWrap) singleWrap.style.display = '';
            if (rangeWrap) rangeWrap.style.display = 'none';
            if (diceBtn) diceBtn.classList.remove('active');
        }
        // TODO: Phase 3 — also reset color dice
        this.updateRandomSectionVisibility();
        this.updateRenderer();
        this.markAsChanged();
    });
}
```

Вызвать `this.initResetAllDice()` после `initRandomSection()` в `init()`.

### Шаг 2.7 — Удалить `randomSection` из Style-панели

**Файл:** `index.html`

Удалить div `#randomSection` из `<aside id="stylePanel">`.

**Проверка:**
- Включить любой dice → панель Random появляется
- Badge показывает количество активных dice
- Scope, Alternatives, Randomize работают
- Reset All → все dice выключены, панель скрылась
- Панель сворачивается/разворачивается через PanelManager

---

## Фаза 3: Colors → Source + Random dice

**Цель:** 6 кнопок → 3 кнопки (Color, Palette, Gradient) + dice 🎲 (Fixed/Random)

### Текущая матрица (6 кнопок)

| Кнопка         | Source   | Random? |
|----------------|----------|---------|
| Manual         | Color    | ✗       |
| Random         | Color    | ✓ (рандомит 3 цвета) |
| Chaos          | Palette  | ✗ (фиксированная палитра) |
| Auto           | Palette  | ✓ (рандомная палитра) |
| Gradient       | Gradient | ✗       |
| Rand Grad      | Gradient | ✓ (рандомные концы) |

### Целевая матрица (3 кнопки + dice)

| Source   | dice OFF (Fixed) | dice ON (Random)         |
|----------|-------------------|--------------------------|
| Color    | manual            | random (3 цвета)         |
| Palette  | chaos             | randomChaos (auto)       |
| Gradient | gradient          | randomGradient           |

### Шаг 3.1 — Добавить `randomizeColor` в settings

**Файл:** `js/main.js`

```js
// В settings.values:
randomizeColor: false,

// В settings.get():
if (key === 'isRandom') {
    return !!(this.values.randomizeStem || ... || this.values.randomizeColor);
}
```

### Шаг 3.2 — Обновить HTML кнопок Colors

**Файл:** `index.html`

Было:
```html
<div class="style-buttons-container" id="colorModeButtons">
    <button ... data-color-mode="manual">Manual</button>
    <button ... data-color-mode="random">Random</button>
    <button ... data-color-mode="chaos">Chaos</button>
    <button ... data-color-mode="randomChaos">Auto</button>
    <button ... data-color-mode="gradient">Gradient</button>
    <button ... data-color-mode="randomGradient">Rand Grad</button>
</div>
```

Стало:
```html
<div class="color-source-row">
    <div class="style-buttons-container" id="colorSourceButtons">
        <button ... data-color-source="color" class="style-button active">Color</button>
        <button ... data-color-source="palette" class="style-button">Palette</button>
        <button ... data-color-source="gradient" class="style-button">Gradient</button>
    </div>
    <button type="button" class="dice-btn" id="colorDiceBtn" title="Random colors">🎲</button>
</div>
```

### Шаг 3.3 — Добавить `colorSource` в settings

**Файл:** `js/main.js`

Новая настройка:
```js
colorSource: 'color',  // 'color', 'palette', 'gradient'
```

`colorMode` теперь вычисляется:
```js
getDerivedColorMode() {
    const source = this.settings.get('colorSource');
    const random = this.settings.get('randomizeColor');
    if (source === 'palette' && random) return 'randomChaos';
    if (source === 'palette') return 'chaos';
    if (source === 'gradient' && random) return 'randomGradient';
    if (source === 'gradient') return 'gradient';
    if (random) return 'random';
    return 'manual';
}
```

### Шаг 3.4 — Обновить `initColorModeButtons()` → `initColorSourceButtons()`

**Файл:** `js/main.js`

Переписать обработчик: вместо 6 data-color-mode → 3 data-color-source кнопки + dice-кнопка.

```js
initColorSourceButtons() {
    const buttons = document.querySelectorAll('#colorSourceButtons .style-button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newSource = btn.dataset.colorSource;
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.settings.set('colorSource', newSource);
            
            const colorMode = this.getDerivedColorMode();
            this.settings.set('colorMode', colorMode);
            this.applyColorMode(colorMode);
            this.updateColorModeUI();
            this.markAsChanged();
        });
    });

    // Dice button for color randomization
    const diceBtn = document.getElementById('colorDiceBtn');
    if (diceBtn) {
        diceBtn.addEventListener('click', () => {
            const enabled = !this.settings.get('randomizeColor');
            this.settings.set('randomizeColor', enabled);
            diceBtn.classList.toggle('active', enabled);
            
            const colorMode = this.getDerivedColorMode();
            this.settings.set('colorMode', colorMode);
            this.applyColorMode(colorMode);
            this.updateColorModeUI();
            this.updateRandomSectionVisibility();
            this.markAsChanged();
        });
    }
}
```

### Шаг 3.5 — Метод `applyColorMode(mode)` — авто-действия при смене режима

**Файл:** `js/main.js`

Вынести из `initColorModeButtons`:
```js
applyColorMode(mode) {
    if (mode === 'random') {
        this.randomizeColors();
    } else if (mode === 'chaos' || mode === 'randomChaos') {
        this.generateColorPalette();
        this.updateRenderer();
    } else if (mode === 'randomGradient') {
        this.settings.set('gradientStartColor', this.generateRandomColor());
        this.settings.set('gradientEndColor', this.generateRandomColor());
        this.updateGradientPreviews();
        this.randomizeColors();
    } else {
        this.updateRenderer();
    }
}
```

### Шаг 3.6 — Обновить `updateColorModeUI()`

**Файл:** `js/main.js`

Убрать логику 6 кнопок, заменить на:
- 3 source-кнопки: активная = `colorSource`
- Dice-кнопка: active = `randomizeColor`
- Контролы (chaos/gradient): видимость зависит от `colorSource`
  - `colorSource === 'color'`: Type свотч видим, всегда
  - `colorSource === 'palette'`: chaos-контролы видимы (Colors input ИЛИ range + BW/Lock)
    - dice OFF → exact Colors input
    - dice ON → range slider + BW + Lock BG + Lock Grid
  - `colorSource === 'gradient'`: gradient-контролы видимы
- Swatches (Back, Grid): видимы всегда
- Type swatch: disabled в palette и gradient

### Шаг 3.7 — Объединить Chaos/Auto контролы

**Файл:** `index.html`

Объединить `colorChaosControls` и `colorRandomChaosControls` в один блок `colorPaletteControls`:

```html
<div id="colorPaletteControls" style="display: none;">
    <!-- Fixed mode: exact Colors input -->
    <div class="dice-single" id="paletteFixedWrap">
        <div class="control-group" style="display: flex; align-items: center; gap: 10px;">
            <label style="margin-bottom: 0; flex: 1;"><span>Colors</span></label>
            <div class="compact-input-group" id="colorChaosColorsInputGroup">
                <input type="number" class="compact-input" id="colorChaosColorsValue" value="16" min="3" max="32" step="1">
            </div>
        </div>
    </div>
    <!-- Random mode: range slider + options -->
    <div class="dice-range" id="paletteRandomWrap" style="display: none;">
        <div class="control-group toggle-group-row" style="display: flex;">
            <label class="checkbox-label" for="paletteBWCheckbox">
                <input type="checkbox" id="paletteBWCheckbox">
                <span>BW</span>
            </label>
            <label class="checkbox-label" for="paletteLockBgCheckbox">
                <input type="checkbox" id="paletteLockBgCheckbox">
                <span>Lock BG</span>
            </label>
            <label class="checkbox-label" for="paletteLockGridCheckbox">
                <input type="checkbox" id="paletteLockGridCheckbox">
                <span>Lock Grid</span>
            </label>
        </div>
        <div class="control-group">
            <label><span>Colors</span></label>
            <div class="range-slider-wrapper">
                <div id="paletteColorsRangeSlider" class="range-slider-container"></div>
                <div class="range-slider-values">
                    <input type="text" class="value-display" id="paletteColorsMinValue" value="16">
                    <input type="text" class="value-display" id="paletteColorsMaxValue" value="32">
                </div>
            </div>
        </div>
    </div>
</div>
```

### Шаг 3.8 — Маппинг старых ID → новые

Для обратной совместимости или миграции:
- `randomColorChaosGrayscaleCheckbox` → `paletteBWCheckbox`
- `randomColorChaosKeepBgCheckbox` → `paletteLockBgCheckbox`
- `randomColorChaosKeepGridCheckbox` → `paletteLockGridCheckbox`
- `randomColorChaosRangeSlider` → `paletteColorsRangeSlider`
- `randomColorChaosMinValue` → `paletteColorsMinValue`
- `randomColorChaosMaxValue` → `paletteColorsMaxValue`

Обновить все ссылки в `main.js` и `styles.css`.

### Шаг 3.9 — Обновить `updateRenderer()` params

**Файл:** `js/main.js`

Добавить `randomizeColor` в params. `colorMode` вычисляется через `getDerivedColorMode()`.

```js
const colorMode = this.getDerivedColorMode();
// ...
const params = {
    // ...
    randomizeColor: this.settings.get('randomizeColor') || false,
    // colorMode → gradientMode (уже есть)
    gradientMode: colorMode,
    useCustomModuleColor: ['chaos', 'randomChaos'].includes(colorMode),
    // ...
};
```

### Шаг 3.10 — Обновить Randomize в Colors

**Файл:** `js/main.js`

Кнопка Randomize Colors (`randomColorsBtn`) теперь вызывает `applyColorMode()`.
Но: если dice OFF (fixed mode), кнопка генерирует новую палитру/градиент, но не рандомит 3 цвета.
Если dice ON — рандомит.

Логика:
```js
randomColorsBtn.click → {
    const source = this.settings.get('colorSource');
    const random = this.settings.get('randomizeColor');
    if (source === 'palette') {
        this.generateColorPalette();
        this.updateRenderer();
    } else if (source === 'gradient') {
        this.settings.set('gradientStartColor', this.generateRandomColor());
        this.settings.set('gradientEndColor', this.generateRandomColor());
        this.updateGradientPreviews();
        this.updateRenderer();
    } else if (source === 'color' && random) {
        this.randomizeColors();
    } else {
        // Manual mode, no dice — nothing to randomize or just randomize
        this.randomizeColors();
    }
}
```

### Шаг 3.11 — Миграция пресетов

**Файл:** `js/main.js`, `loadPreset()`

При загрузке старого пресета (нет `colorSource`):
```js
if (preset.colorMode && !preset.colorSource) {
    // Migrate colorMode → colorSource + randomizeColor
    const modeMap = {
        'manual':        { source: 'color',    random: false },
        'random':        { source: 'color',    random: true  },
        'chaos':         { source: 'palette',  random: false },
        'randomChaos':   { source: 'palette',  random: true  },
        'gradient':      { source: 'gradient', random: false },
        'randomGradient':{ source: 'gradient', random: true  },
    };
    const mapped = modeMap[preset.colorMode] || { source: 'color', random: false };
    this.settings.set('colorSource', mapped.source);
    this.settings.set('randomizeColor', mapped.random);
}
```

### Шаг 3.12 — Обновить `updateUIFromSettings()`

**Файл:** `js/main.js`

Восстанавливать `colorSource`, `randomizeColor`, состояние dice-кнопки Colors, single/range для palette-контролов.

**Проверка:**
- 3 кнопки (Color, Palette, Gradient) переключают источник
- Dice 🎲 переключает Fixed/Random
- Palette: dice OFF → exact Colors input; dice ON → range + BW/Lock
- Gradient: dice OFF → ручные Start/End; dice ON → рандомные Start/End
- Color: dice OFF → manual; dice ON → random 3 цвета
- Dice на Colors участвует в `isRandom` → панель Random появляется
- Reset All Dice (Фаза 2) сбрасывает и colorDice
- SVG-экспорт работает во всех комбинациях
- Старые пресеты мигрируются

---

## Фаза 4: Интеграция и полировка

### Шаг 4.1 — Reset All Dice включает colorDice

**Файл:** `js/main.js`, `initResetAllDice()`

Добавить сброс `randomizeColor` и обновление UI dice-кнопки Colors.

### Шаг 4.2 — Dice count badge включает colorDice

**Файл:** `js/main.js`, `updateRandomSectionVisibility()`

```js
let count = Object.values(DICE_CONFIG).filter(cfg => this.settings.get(cfg.flag)).length;
if (this.settings.get('randomizeColor')) count++;
badge.textContent = count > 0 ? `(${count})` : '';
```

### Шаг 4.3 — Randomize в панели Random также рандомит цвет

**Файл:** `js/main.js`

Если `randomizeColor`, кнопка Randomize в панели Random вызывает `applyColorMode()` вместе с geometry randomize.

### Шаг 4.4 — Удалить мёртвый код

- `initColorModeButtons()` → заменён на `initColorSourceButtons()`
- Старые 6-кнопочные обработчики
- Legacy `colorChaos`, `randomColor`, `randomColorChaos` из settings (оставить в миграции)
- `colorRandomChaosControls`, `colorChaosControls` (заменены на `colorPaletteControls`)

### Шаг 4.5 — CSS полировка

- `.color-source-row` — flex-контейнер для 3 кнопок + dice
- Dice-кнопка Colors стилизована как остальные dice
- Transition анимации при переключении
- Панель Random: responsive positioning

### Шаг 4.6 — Комплексное тестирование

- Color × Palette × Gradient × dice ON/OFF
- Style dice + Color dice → панель Random появляется
- Reset All → все dice выключены
- SVG-экспорт каждой комбинации
- Пресеты: save / load / migrate старых

**Проверка:** всё работает, UI чистый, SVG экспортируется, пресеты загружаются.

---

## Файлы, которые затрагиваются

| Файл | Фазы | Характер изменений |
|------|------|--------------------|
| `index.html` | 1, 2, 3 | Colors кнопки, Random-панель, palette-контролы |
| `styles.css` | 2, 3, 4 | Random-панель, color-source-row, dice-count |
| `js/main.js` | 1, 2, 3, 4 | Основной рефакторинг |
| `js/core/PresetManager.js` | — | Без изменений (миграция в main.js) |
| `js/core/VoidRenderer.js` | — | Без изменений (colorMode приходит через params) |
| `js/core/VoidExporter.js` | — | Без изменений |

## Оценка объёма

- **Фаза 1:** ~20 мин (баг-фикс dash/wobbly dice)
- **Фаза 2:** ~1.5 часа (панель Random + Reset All)
- **Фаза 3:** ~3 часа (Colors Source/Random)
- **Фаза 4:** ~1.5 часа (интеграция + полировка)

**Итого: ~6–7 часов**

---

## Визуальный результат

### Панель Style (без изменений)
```
┌─────────────────────────────────────┐
│ Style                            ∨  │
│  Stem Weight ···········  0.5 [🎲]  │
│  Lines ·················  2   [🎲]  │
│  Contrast ··············  1.0 [🎲]  │
│  Close Stems [ ]                     │
│  ── Dashes [✓] ─────────────────── │
│    Dash Length ·········  1.0 [🎲]  │
│    Gap Length ··········  1.5 [🎲]  │
│    Chess Order [ ]                   │
└─────────────────────────────────────┘
```

### Панель Effects (без изменений)
```
┌─────────────────────────────────────┐
│ Effects                          ∨  │
│  Wobbly [✓]                         │
│    Amount ··············  3px [🎲]  │
│    Scale ···············  0.1 [🎲]  │
│  Round Caps [✓]                      │
└─────────────────────────────────────┘
```

### Панель Random (НОВАЯ, видна при isRandom)
```
┌─────────────────────────────────────┐
│ Random (3)                       ∨  │
│  Scope: (○ By Type) (● Full)       │
│  Alternative Glyphs [✓]            │
│  [ Reset ]           [ Randomize ]  │
└─────────────────────────────────────┘
```

### Панель Colors (ОБНОВЛЁННАЯ)
```
┌─────────────────────────────────────┐
│ Colors                           ∨  │
│  ○ Color  ○ Palette  ○ Gradient 🎲 │
│                                      │
│  Back ████   Grid ████               │
│                                      │
│  (Color:)                            │
│  Type ████                           │
│                                      │
│  (Palette, dice OFF:)                │
│  Colors ···········  16              │
│                                      │
│  (Palette, dice ON:)                 │
│  BW [ ] Lock BG [ ] Lock Grid [ ]  │
│  Colors ···········  16 – 32        │
│                                      │
│  (Gradient:)                         │
│  Start ████   End ████               │
│                                      │
│  [       Randomize       ]           │
└─────────────────────────────────────┘
```
