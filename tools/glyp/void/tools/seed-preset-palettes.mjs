/**
 * Bake a deterministic colorPalette + gradientPairs into shipped presets so
 * Bender / Bushy / Ellipsis (and any randomGradient/randomChaos preset listed
 * below) open identically every time — both from the dropdown and from a
 * shared link.
 *
 * Re-runs the same algorithm as ColorController.generateColorPalette(),
 * but with mulberry32 seeded by the preset name. The script DOES NOT mutate
 * settings (gradientStartColor / gradientEndColor / bgColor / gridColor):
 * those still belong to the JSON itself, only colorPalette + gradientPairs
 * get materialized.
 *
 * Usage:
 *   node tools/seed-preset-palettes.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_DIR = path.join(__dirname, '..', 'presets');

/** Presets that should carry a frozen palette/pairs in JSON. */
const TARGETS = ['bender', 'bushy', 'ellipsis'];

function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seedFromName(name) {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function toHex(n) {
    return n.toString(16).padStart(2, '0');
}

function randomColor(rand) {
    const r = Math.floor(rand() * 256);
    const g = Math.floor(rand() * 256);
    const b = Math.floor(rand() * 256);
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function randomGrayscale(rand) {
    const v = Math.floor(rand() * 256);
    const h = toHex(v);
    return '#' + h + h + h;
}

function deriveColorMode(s) {
    if (s.colorMode) return s.colorMode;
    const source = s.colorSource || 'solid';
    const random = !!s.randomizeColor;
    if (source === 'gradient') return random ? 'randomGradient' : 'gradient';
    return random ? 'randomChaos' : 'manual';
}

function buildPaletteAndPairs(settings, rand) {
    const colorMode = deriveColorMode(settings);
    const numColors = settings.colorChaosColors || 16;

    const isGrayscale = !!settings.colorBW;
    const gen = isGrayscale ? () => randomGrayscale(rand) : () => randomColor(rand);

    const diceL = !!settings.paletteDiceLetter;
    const diceGS = !!settings.paletteDiceGradientStart;
    const diceGE = !!settings.paletteDiceGradientEnd;

    const colorPalette = [];
    if (colorMode === 'randomChaos' && diceL) {
        for (let i = 0; i < numColors; i++) colorPalette.push(gen());
    }

    const gradientPairs = [];
    if (colorMode === 'randomGradient' && (diceGS || diceGE)) {
        const pairCount = Math.max(1, Math.floor(numColors / 2));
        for (let i = 0; i < pairCount; i++) {
            gradientPairs.push({
                start: diceGS ? gen() : settings.gradientStartColor,
                end: diceGE ? gen() : settings.gradientEndColor
            });
        }
    }

    return { colorPalette, gradientPairs };
}

async function processOne(slug) {
    const file = path.join(PRESETS_DIR, `${slug}.json`);
    const raw = await fs.readFile(file, 'utf8');
    const json = JSON.parse(raw);

    const name = json.name || slug;
    const settings = json.settings || {};
    const seed = seedFromName(name);
    const rand = mulberry32(seed);

    const { colorPalette, gradientPairs } = buildPaletteAndPairs(settings, rand);

    const next = {
        ...json,
        colorPalette,
        gradientPairs,
        moduleColorCache: json.moduleColorCache || {},
        moduleGradientCache: json.moduleGradientCache || {}
    };

    const out = JSON.stringify(next, null, 2) + '\n';
    await fs.writeFile(file, out, 'utf8');
    console.log(
        `[${name}] palette=${colorPalette.length} pairs=${gradientPairs.length} ` +
        `(seed=0x${seed.toString(16)}, mode=${deriveColorMode(settings)}, bw=${!!settings.colorBW})`
    );
}

async function main() {
    for (const slug of TARGETS) {
        try {
            await processOne(slug);
        } catch (err) {
            console.error(`Failed for ${slug}:`, err.message);
            process.exitCode = 1;
        }
    }
}

main();
