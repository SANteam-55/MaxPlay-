/**
 * Utility to extract dominant vibrant ambient colors from image URLs
 * with precision corner matching (top-left, top-right, top-center)
 * and instant intelligent fallback based on genre/metadata.
 */

export interface AmbientColorPalette {
  primary: string;      // 'rgb(r, g, b)'
  primaryRgb: [number, number, number];
  secondary: string;    // 'rgb(r2, g2, b2)'
  secondaryRgb: [number, number, number];
  topLeftRgb: [number, number, number];     // Corner-matched color for top-left
  topRightRgb: [number, number, number];    // Corner-matched color for top-right
  topCenterRgb: [number, number, number];   // Blended top-center color
  glowTop: string;      // CSS rgba string for top glow
  glowHalo: string;     // CSS rgba string for ambient halo
}

export const NEUTRAL_AMBIENT_PALETTE: AmbientColorPalette = {
  primary: 'rgb(24, 24, 32)',
  primaryRgb: [24, 24, 32],
  secondary: 'rgb(18, 18, 24)',
  secondaryRgb: [18, 18, 24],
  topLeftRgb: [18, 18, 24],
  topRightRgb: [18, 18, 24],
  topCenterRgb: [18, 18, 24],
  glowTop: 'rgba(24, 24, 32, 0.3)',
  glowHalo: 'rgba(24, 24, 32, 0.1)',
};

// In-memory cache for fast instant lookups
const colorCache = new Map<string, AmbientColorPalette>();

export function rgbToStatusBarHex(rgb: [number, number, number], intensity = 1.0): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * intensity)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * intensity)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * intensity)));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Retrieve cached palette from memory or localStorage for 0ms synchronous access
 */
export function getCachedPalette(imageUrl?: string): AmbientColorPalette | null {
  if (!imageUrl) return null;
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl)!;
  try {
    // Generate safe short key (v3 bypasses any old flat-black cached entries)
    const key = 'mp_pal_v3_' + imageUrl.slice(-60).replace(/[^a-zA-Z0-9]/g, '');
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.topLeftRgb) &&
        !(parsed.topLeftRgb[0] === 18 && parsed.topLeftRgb[1] === 18 && parsed.topLeftRgb[2] === 24)
      ) {
        colorCache.set(imageUrl, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

// Preset vibrant palettes for genre & title fallback with distinct corner pairings
interface PresetCornerPalette {
  topLeft: [number, number, number];
  topRight: [number, number, number];
  topCenter: [number, number, number];
  primary: [number, number, number];
  secondary: [number, number, number];
}

const PRESET_PALETTES: Record<string, PresetCornerPalette> = {
  action: {
    topLeft: [225, 29, 72],     // Rose Red
    topRight: [147, 51, 234],   // Purple
    topCenter: [190, 40, 150],
    primary: [225, 29, 72],
    secondary: [147, 51, 234]
  },
  anime: {
    topLeft: [124, 58, 237],    // Deep Violet
    topRight: [236, 72, 153],   // Hot Pink
    topCenter: [168, 85, 247],
    primary: [139, 92, 246],
    secondary: [236, 72, 153]
  },
  fantasy: {
    topLeft: [79, 70, 229],     // Indigo
    topRight: [139, 92, 246],   // Electric Violet
    topCenter: [99, 102, 241],
    primary: [139, 92, 246],
    secondary: [99, 102, 241]
  },
  scifi: {
    topLeft: [6, 182, 212],     // Cyan
    topRight: [59, 130, 246],   // Electric Blue
    topCenter: [14, 165, 233],
    primary: [6, 182, 212],
    secondary: [59, 130, 246]
  },
  horror: {
    topLeft: [185, 28, 28],     // Dark Crimson
    topRight: [127, 29, 29],    // Blood Burgundy
    topCenter: [153, 27, 27],
    primary: [220, 38, 38],
    secondary: [153, 27, 27]
  },
  romance: {
    topLeft: [244, 63, 94],     // Rose
    topRight: [251, 146, 60],   // Warm Amber
    topCenter: [248, 113, 113],
    primary: [244, 63, 94],
    secondary: [251, 146, 60]
  },
  comedy: {
    topLeft: [16, 185, 129],    // Emerald
    topRight: [234, 179, 8],    // Golden Amber
    topCenter: [20, 184, 166],
    primary: [16, 185, 129],
    secondary: [234, 179, 8]
  },
  drama: {
    topLeft: [147, 51, 234],    // Purple
    topRight: [219, 39, 119],   // Deep Pink
    topCenter: [168, 85, 247],
    primary: [168, 85, 247],
    secondary: [236, 72, 153]
  },
  live: {
    topLeft: [239, 68, 68],     // Ruby Red
    topRight: [249, 115, 22],   // Orange
    topCenter: [244, 90, 45],
    primary: [239, 68, 68],
    secondary: [249, 115, 22]
  },
  thriller: {
    topLeft: [217, 119, 6],     // Dark Amber
    topRight: [185, 28, 28],    // Dark Red
    topCenter: [220, 70, 30],
    primary: [245, 158, 11],
    secondary: [220, 38, 38]
  },
  default: {
    topLeft: [124, 58, 237],    // Violet
    topRight: [236, 72, 153],   // Pink
    topCenter: [168, 85, 247],
    primary: [139, 92, 246],
    secondary: [236, 72, 153]
  },
};

function boostSaturation(rgb: [number, number, number], minSat = 0.52): [number, number, number] {
  let [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) {
    // Monochromatic/grey: give a subtle violet/cyan tint rather than flat grey
    return [Math.max(r, 95), Math.max(g, 55), Math.max(b, 165)];
  }

  const l = (max + min) / 510;
  const s = l > 0.5 ? delta / (510 - max - min) : delta / (max + min);
  const targetS = Math.min(1, Math.max(minSat, s * 1.38));

  // RGB to HSL hue calculation
  let h = 0;
  if (max === r) {
    h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / delta + 2) / 6;
  } else {
    h = ((r - g) / delta + 4) / 6;
  }

  // Clamped lightness for rich ambient light visibility
  const targetL = Math.max(0.32, Math.min(0.68, l));

  // HSL to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = targetL < 0.5 ? targetL * (1 + targetS) : targetL + targetS - targetL * targetS;
  const p = 2 * targetL - q;
  const newR = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const newG = Math.round(hue2rgb(p, q, h) * 255);
  const newB = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return [newR, newG, newB];
}

function extractRegionColor(
  imgData: Uint8ClampedArray,
  canvasWidth: number,
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
  defaultFallback: [number, number, number]
): [number, number, number] {
  let bestR = defaultFallback[0];
  let bestG = defaultFallback[1];
  let bestB = defaultFallback[2];
  let maxVibrancy = 0;
  let totalR = 0, totalG = 0, totalB = 0, validPixels = 0;

  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      const idx = (y * canvasWidth + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      if (a < 128) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const brightness = max / 255;
      const saturation = max === 0 ? 0 : (max - min) / max;

      // Ignore pure blacks and pure whites
      if (brightness > 0.08 && brightness < 0.96 && saturation > 0.10) {
        const vibrancy = saturation * Math.sqrt(brightness);
        if (vibrancy > maxVibrancy) {
          maxVibrancy = vibrancy;
          bestR = r;
          bestG = g;
          bestB = b;
        }
        totalR += r;
        totalG += g;
        totalB += b;
        validPixels++;
      }
    }
  }

  if (maxVibrancy > 0.06) {
    return boostSaturation([bestR, bestG, bestB], 0.55);
  }

  if (validPixels > 0) {
    const avgR = Math.round(totalR / validPixels);
    const avgG = Math.round(totalG / validPixels);
    const avgB = Math.round(totalB / validPixels);
    return boostSaturation([avgR, avgG, avgB], 0.48);
  }

  return defaultFallback;
}

export function getFallbackPalette(genreOrTitle?: string, type?: string, seedUrl?: string): AmbientColorPalette {
  const hint = `${genreOrTitle || ''} ${type || ''} ${seedUrl || ''}`.toLowerCase();
  let presetKey = '';
  if (hint.includes('action') || hint.includes('war') || hint.includes('fight')) presetKey = 'action';
  else if (hint.includes('sci-fi') || hint.includes('scifi') || hint.includes('space') || hint.includes('cyber')) presetKey = 'scifi';
  else if (hint.includes('horror') || hint.includes('dark') || hint.includes('evil')) presetKey = 'horror';
  else if (hint.includes('romance') || hint.includes('love')) presetKey = 'romance';
  else if (hint.includes('comedy') || hint.includes('family') || hint.includes('adventure')) presetKey = 'comedy';
  else if (hint.includes('thriller') || hint.includes('crime') || hint.includes('mystery')) presetKey = 'thriller';
  else if (hint.includes('fantasy') || hint.includes('magic')) presetKey = 'fantasy';
  else if (hint.includes('anime')) presetKey = 'anime';
  else if (hint.includes('drama')) presetKey = 'drama';

  if (!presetKey) {
    const keys = ['action', 'anime', 'fantasy', 'scifi', 'romance', 'comedy', 'drama', 'thriller'];
    let hash = 0;
    const str = seedUrl || genreOrTitle || 'maxplay';
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff;
    }
    presetKey = keys[hash % keys.length];
  }

  const p = PRESET_PALETTES[presetKey] || PRESET_PALETTES.default;
  return {
    primary: `rgb(${p.primary.join(',')})`,
    primaryRgb: p.primary,
    secondary: `rgb(${p.secondary.join(',')})`,
    secondaryRgb: p.secondary,
    topLeftRgb: p.topLeft,
    topRightRgb: p.topRight,
    topCenterRgb: p.topCenter,
    glowTop: `rgba(${p.primary.join(',')}, 0.90)`,
    glowHalo: `rgba(${p.primary.join(',')}, 0.65)`,
  };
}

export function extractAmbientPalette(
  imageUrl: string, 
  genreOrTitle?: string, 
  type?: string
): Promise<AmbientColorPalette> {
  // 1. Instant check from cache (memory or localStorage)
  const cached = getCachedPalette(imageUrl);
  if (cached) {
    return Promise.resolve(cached);
  }

  const vibrantFallback = getFallbackPalette(genreOrTitle, type, imageUrl);

  if (!imageUrl) {
    return Promise.resolve(vibrantFallback);
  }

  return new Promise((resolve) => {
    let resolved = false;
    let triedProxy = false;

    const finish = (palette: AmbientColorPalette, shouldCache = true) => {
      if (resolved) return;
      resolved = true;
      colorCache.set(imageUrl, palette);
      if (shouldCache) {
        try {
          const key = 'mp_pal_v3_' + imageUrl.slice(-60).replace(/[^a-zA-Z0-9]/g, '');
          localStorage.setItem(key, JSON.stringify(palette));
        } catch {}
      }
      resolve(palette);
    };

    const img = new Image();
    if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    // Generous 1600ms timeout so slower poster CDNs or proxy retry can finish cleanly
    const timer = setTimeout(() => {
      finish(vibrantFallback, false);
    }, 1600);

    const retryViaProxyOrFallback = () => {
      if (!triedProxy && imageUrl.startsWith('http')) {
        triedProxy = true;
        img.crossOrigin = 'anonymous';
        img.src = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
        return;
      }
      clearTimeout(timer);
      finish(vibrantFallback, true);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          clearTimeout(timer);
          finish(vibrantFallback, false);
          return;
        }

        const width = 64;
        const height = 40;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height).data;
        clearTimeout(timer);

        // Extract corner-matched & overall colors across top & middle regions
        const topLeft = extractRegionColor(imgData, width, 0, 22, 0, 22, vibrantFallback.topLeftRgb);
        const topRight = extractRegionColor(imgData, width, 42, 63, 0, 22, vibrantFallback.topRightRgb);
        const topCenter = extractRegionColor(imgData, width, 18, 46, 0, 24, vibrantFallback.topCenterRgb);

        // Overall most vibrant pixel across the entire image for primary theme
        let bestR = vibrantFallback.primaryRgb[0];
        let bestG = vibrantFallback.primaryRgb[1];
        let bestB = vibrantFallback.primaryRgb[2];
        let maxVibrancy = 0;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const brightness = max / 255;

          if (brightness > 0.12 && brightness < 0.95 && saturation > 0.14) {
            const vibrancy = saturation * Math.sqrt(brightness);
            if (vibrancy > maxVibrancy) {
              maxVibrancy = vibrancy;
              bestR = r;
              bestG = g;
              bestB = b;
            }
          }
        }

        const primaryRgb =
          maxVibrancy > 0.08
            ? boostSaturation([bestR, bestG, bestB], 0.56)
            : topCenter;
        const secondaryRgb = topRight;

        const palette: AmbientColorPalette = {
          primary: `rgb(${primaryRgb.join(',')})`,
          primaryRgb,
          secondary: `rgb(${secondaryRgb.join(',')})`,
          secondaryRgb,
          topLeftRgb: topLeft,
          topRightRgb: topRight,
          topCenterRgb: topCenter,
          glowTop: `rgba(${primaryRgb.join(',')}, 0.92)`,
          glowHalo: `rgba(${primaryRgb.join(',')}, 0.68)`,
        };
        finish(palette, true);
      } catch (_err) {
        retryViaProxyOrFallback();
      }
    };

    img.onerror = () => {
      retryViaProxyOrFallback();
    };

    img.src = imageUrl;
  });
}
