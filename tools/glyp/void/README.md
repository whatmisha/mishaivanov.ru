# Void Typeface (web)

Browser-based generative display type tool deployed at [/void/](https://mishaivanov.ru/void/).

## Sharing a preset

1. Open a saved preset in the dropdown (your own preset or a built‑in one shipped with Void).
2. Open the preset dropdown and click the **share** (link) icon on a row — both your presets and built-in seeded presets can be shared.
3. Built-in seeded presets copy a short URL (`?preset=pool-kuchum`) while unchanged.
4. Edited or custom presets copy a full share URL (`#p=v1…`) automatically.
5. Anyone who opens a full share URL sees the preset as a temporary “shared” slot; **Save to library** keeps it permanently, **Discard** returns to defaults.

Debugging: set `localStorage.voidShareDebug = '1'` for `console.debug` share length logs.
