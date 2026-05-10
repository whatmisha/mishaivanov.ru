/**
 * Preset URL share codec: deflate(JSON diff)) → base64url, prefixed `v1.`.
 * Stateless; callers pass pristine `settings.values` for diffing.
 */

/**
 * Target full URL length so a shared link plus user-typed text fits a single
 * Telegram message (4096 chars). When the budget is exceeded we auto-tier
 * downward instead of asking the user to choose.
 */
export const SHARE_SOFT_LIMIT_CHARS = 3600;

/**
 * Float fields safe to round to 4 decimal places when the share payload needs
 * extra trimming. Visually indistinguishable from the original — but cuts
 * "1.808206210844656" tails that don't compress well.
 */
const QUANTIZABLE_FLOAT_KEYS = [
    'stemMultiplier',
    'letterSpacingMultiplier',
    'lineHeightMultiplier',
    'strokeGapRatio',
    'dashLength',
    'gapLength',
    'wobblyAmount',
    'wobblyFrequency',
    'randomStemMin',
    'randomStemMax',
    'randomContrastMin',
    'randomContrastMax',
    'randomDashLengthMin',
    'randomDashLengthMax',
    'randomGapLengthMin',
    'randomGapLengthMax',
    'randomWobblyAmountMin',
    'randomWobblyAmountMax',
    'randomWobblyFrequencyMin',
    'randomWobblyFrequencyMax'
];

function quantizeFloat(v) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return v;
    return Math.round(v * 10000) / 10000;
}

const SHARE_VERSION_PREFIX = 'v1.';

/** Never embed in shared links */
const STRIP_KEYS = new Set(['seeded', 'createdAt', 'updatedAt', 'id']);

/** Dropped when includeCaches=false (exact random/Chaos/visual reproduction). */
export const SHARE_OPTIONAL_CACHE_KEYS = [
    'alternativeGlyphCache',
    'moduleTypeCache',
    'moduleValueCache',
    'moduleColorCache',
    'moduleGradientCache'
];

const EXTRA_SNAPSHOT_KEYS = [
    'alternativeGlyphCache',
    'moduleTypeCache',
    'moduleValueCache',
    'colorPalette',
    'gradientPairs',
    'moduleColorCache',
    'moduleGradientCache'
];

function valuesEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch (_) {
        return false;
    }
}

function isExtraValueEmpty(val) {
    if (val == null) return true;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
}

function defaultExtra(key) {
    if (key === 'colorPalette') return [];
    return {};
}

async function deflateRawUtf8(jsonString) {
    const bytes = new TextEncoder().encode(jsonString);
    if (typeof CompressionStream === 'undefined') {
        throw new Error('CompressionStream is not available in this browser');
    }
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const out = [];
    const reader = cs.readable.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) out.push(value);
    }
    const len = out.reduce((n, x) => n + x.length, 0);
    const merged = new Uint8Array(len);
    let o = 0;
    for (const chunk of out) {
        merged.set(chunk, o);
        o += chunk.length;
    }
    return merged;
}

async function inflateRawToUtf8(compressedBytes) {
    const cs = new DecompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    const out = [];
    const reader = cs.readable.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) out.push(value);
    }
    const len = out.reduce((n, x) => n + x.length, 0);
    const merged = new Uint8Array(len);
    let o = 0;
    for (const chunk of out) {
        merged.set(chunk, o);
        o += chunk.length;
    }
    return new TextDecoder().decode(merged);
}

function bytesToBase64Url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(bin);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlToBytes(str) {
    const padLen = (4 - (str.length % 4)) % 4;
    const padded = str.replace(/-/gu, '+').replace(/_/gu, '/') + '='.repeat(padLen);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
}

/**
 * Build diff object: settings + extras vs pristine; omit equals & empty extras.
 *
 * @param {object} fullBlob flat preset blob (same shape as collectPresetData)
 * @param {object} pristineDefaults `settings.values` snapshot at cold init
 */
function buildDiff(fullBlob, pristineDefaults) {
    const diff = {};
    const pname = fullBlob.shareDisplayName;
    if (typeof pname === 'string' && pname.trim() !== '') {
        diff.shareDisplayName = pname.trim();
    }

    const pristineKeys = new Set(Object.keys(pristineDefaults));

    for (const key of Object.keys(fullBlob)) {
        if (STRIP_KEYS.has(key) || key === 'shareDisplayName') continue;

        const val = fullBlob[key];

        if (pristineKeys.has(key)) {
            const def = pristineDefaults[key];
            if (!valuesEqual(val, def)) {
                diff[key] = val;
            }
            continue;
        }

        if (EXTRA_SNAPSHOT_KEYS.includes(key)) {
            if (!isExtraValueEmpty(val)) {
                diff[key] = JSON.parse(JSON.stringify(val));
            }
            continue;
        }

        diff[key] = JSON.parse(JSON.stringify(val));
    }

    return diff;
}

/**
 * Merge diff into a full-loadable blob on top of pristine defaults + empty extras.
 */
export function expandSharedDiff(diff, pristineDefaults) {
    const full = {
        ...pristineDefaults,
        ...diff
    };
    for (const key of EXTRA_SNAPSHOT_KEYS) {
        if (full[key] === undefined || full[key] === null) {
            full[key] = defaultExtra(key);
        }
    }
    delete full.shareDisplayName;
    const label = typeof diff.shareDisplayName === 'string' && diff.shareDisplayName.trim() !== ''
        ? diff.shareDisplayName.trim()
        : '';
    return { full, shareDisplayName: label };
}

function prepareBlobForEncode(fullBlob, options) {
    const {
        includeCaches = true,
        dropPaletteAndPairs = false,
        quantizeFloats = false
    } = options || {};
    const blob = JSON.parse(JSON.stringify(fullBlob));
    for (const k of STRIP_KEYS) {
        delete blob[k];
    }
    if (!includeCaches) {
        for (const k of SHARE_OPTIONAL_CACHE_KEYS) {
            delete blob[k];
        }
        if (blob.alternativeGlyphCache) delete blob.alternativeGlyphCache;
    }
    if (dropPaletteAndPairs) {
        delete blob.colorPalette;
        delete blob.gradientPairs;
    }
    if (quantizeFloats) {
        for (const key of QUANTIZABLE_FLOAT_KEYS) {
            if (typeof blob[key] === 'number') {
                blob[key] = quantizeFloat(blob[key]);
            }
        }
    }
    for (const key of EXTRA_SNAPSHOT_KEYS) {
        if (blob[key] !== undefined && isExtraValueEmpty(blob[key])) {
            delete blob[key];
        }
    }
    return blob;
}

/**
 * @param {object} fullBlob preset payload (flattened settings + caches + shareDisplayName)
 * @param {object} pristineDefaults frozen `settings.values`
 * @param {{ includeCaches: boolean, dropPaletteAndPairs?: boolean, quantizeFloats?: boolean }} options
 * @returns {Promise<string>} `v1.<base64url>` without `#p=`
 */
export async function encodePresetShare(fullBlob, pristineDefaults, options) {
    const prepared = prepareBlobForEncode(fullBlob, options);
    const diff = buildDiff(prepared, pristineDefaults);
    const json = JSON.stringify(diff);
    const deflated = await deflateRawUtf8(json);
    return SHARE_VERSION_PREFIX + bytesToBase64Url(deflated);
}

/**
 * Try a series of progressively lighter encodings and return the first one
 * whose total URL length (including the supplied prefix) stays under
 * `maxUrlChars`. If none fits, returns the smallest tier we produced.
 *
 * Tier ladder, from best to worst visual fidelity:
 *   0. full caches
 *   1. drop SHARE_OPTIONAL_CACHE_KEYS (palette + pairs still preserved)
 *   2. drop palette + pairs too (receiver recomputes / bootstraps)
 *   3. quantize floats to 4 decimals on top of tier 2
 *
 * @param {object} fullBlob
 * @param {object} pristineDefaults
 * @param {{ urlPrefix?: string, maxUrlChars?: number }} options
 * @returns {Promise<{encoded:string,tier:number,urlChars:number,fits:boolean}>}
 */
export async function encodePresetShareWithBudget(fullBlob, pristineDefaults, options = {}) {
    const { urlPrefix = '', maxUrlChars = SHARE_SOFT_LIMIT_CHARS } = options;
    const ladder = [
        { includeCaches: true },
        { includeCaches: false },
        { includeCaches: false, dropPaletteAndPairs: true },
        { includeCaches: false, dropPaletteAndPairs: true, quantizeFloats: true }
    ];

    let best = null;
    for (let i = 0; i < ladder.length; i++) {
        const opts = ladder[i];
        let encoded;
        try {
            encoded = await encodePresetShare(fullBlob, pristineDefaults, opts);
        } catch (e) {
            if (best) continue;
            throw e;
        }
        const urlChars = urlPrefix.length + encoded.length;
        const candidate = { encoded, tier: i, urlChars, fits: urlChars <= maxUrlChars };
        if (candidate.fits) return candidate;
        // Keep shrinking — remember the smallest tier produced as fallback.
        if (!best || encoded.length < best.encoded.length) best = candidate;
    }
    return best;
}

export function parseSharePayloadFromHash(hash) {
    if (!hash || typeof hash !== 'string') return '';
    const h = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!h.startsWith('p=')) return '';
    return h.slice(2).trim();
}

export function stripSharePayloadForUrl(payload) {
    if (!payload.startsWith(SHARE_VERSION_PREFIX)) return null;
    return payload.slice(SHARE_VERSION_PREFIX.length);
}

/**
 * @param {string} payload fragment value after `#p=` (starts with `v1.`)
 * @returns {Promise<{full:object,shareDisplayName:string}|null>}
 */
export async function decodePresetShare(payload, pristineDefaults) {
    const b64 = stripSharePayloadForUrl(payload.trim());
    if (!b64) return null;
    let utf8;
    try {
        const raw = base64UrlToBytes(b64);
        utf8 = await inflateRawToUtf8(raw);
    } catch (e) {
        console.warn('[share] decode inflate failed:', e);
        return null;
    }
    let diff;
    try {
        diff = JSON.parse(utf8);
    } catch (e) {
        console.warn('[share] decode JSON failed:', e);
        return null;
    }
    if (!diff || typeof diff !== 'object') return null;

    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('voidShareDebug')) {
            const urlLen = encodeURI(`https://example.com/void/#p=${SHARE_VERSION_PREFIX}${b64}`).length;
            console.debug('[share] decoded JSON chars', utf8.length, 'raw deflated', b64.length, 'approx url', urlLen);
        }
    } catch (_) {
        /* ignore */
    }

    return expandSharedDiff(diff, pristineDefaults);
}
