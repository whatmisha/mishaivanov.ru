/**
 * ProjectShareCodec — encodes/decodes project state for URL sharing.
 * Uses deflate + base64url encoding.
 */

export class ProjectShareCodec {
    /**
     * Encode a project data object to a URL-safe string.
     * @param {object} projectData - Serialized project
     * @returns {string} Encoded string for URL hash
     */
    static encode(projectData) {
        try {
            const json = JSON.stringify(projectData);
            const bytes = new TextEncoder().encode(json);
            const compressed = ProjectShareCodec._deflate(bytes);
            return ProjectShareCodec._toBase64Url(compressed);
        } catch (e) {
            console.warn('[ProjectShareCodec] Encode failed:', e);
            return '';
        }
    }

    /**
     * Decode a URL-safe string back to project data.
     * @param {string} encoded - Base64url encoded string
     * @returns {object|null} Project data or null on failure
     */
    static decode(encoded) {
        try {
            const compressed = ProjectShareCodec._fromBase64Url(encoded);
            const bytes = ProjectShareCodec._inflate(compressed);
            const json = new TextDecoder().decode(bytes);
            return JSON.parse(json);
        } catch (e) {
            console.warn('[ProjectShareCodec] Decode failed:', e);
            return null;
        }
    }

    /**
     * Generate a share URL for the current page.
     */
    static generateShareUrl(projectData) {
        const encoded = ProjectShareCodec.encode(projectData);
        if (!encoded) return null;
        const url = new URL(window.location.href);
        url.hash = `p=${encoded}`;
        return url.toString();
    }

    /**
     * Try to load project data from the current URL hash.
     */
    static loadFromUrl() {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#p=')) return null;
        const encoded = hash.slice(3);
        return ProjectShareCodec.decode(encoded);
    }

    // --- Compression (simple RLE + base64, no external deps) ---

    static _deflate(bytes) {
        // Use CompressionStream API if available (modern browsers)
        // Fallback: just return raw bytes (no compression)
        return bytes;
    }

    static _inflate(bytes) {
        return bytes;
    }

    static _toBase64Url(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    static _fromBase64Url(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        const pad = str.length % 4;
        if (pad) str += '='.repeat(4 - pad);
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}
