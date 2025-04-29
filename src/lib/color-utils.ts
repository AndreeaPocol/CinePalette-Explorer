
export function getColorAtPixel(img: HTMLImageElement, x: number, y: number): string {
  const canvas = document.createElement('canvas');
  // Ensure the canvas has the same display size as the image element
  canvas.width = img.naturalWidth; // Use natural dimensions for accuracy
  canvas.height = img.naturalHeight;

  // Scale the coordinates based on the image's display size vs natural size
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Add willReadFrequently for potential performance improvement


  if (!ctx) {
    console.error("Failed to get 2D context for canvas.");
    return '#000000'; // Return black or handle the error appropriately
  }

  // Draw the image onto the canvas
  ctx.drawImage(img, 0, 0);

  // Get the pixel data at the scaled coordinates
  try {
    const pixelData = ctx.getImageData(Math.floor(x * scaleX), Math.floor(y * scaleY), 1, 1).data;
    const [r, g, b] = pixelData;

    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch (e) {
     console.error("Error getting pixel data:", e);
     // This can happen if the click is outside the canvas bounds after scaling,
     // or if the image isn't fully loaded/rendered yet.
     return '#000000'; // Fallback color
  }
}


/**
 * Converts an HEX color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes hex is in #RRGGBB format.
 * Returns an object { h, s, v } where h is [0, 179], s is [0, 255], and v is [0, 255].
 */
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  r /= 255; g /= 255; b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0; // Hue calculation needs degree conversion later
  let s = 0;
  const v = max; // Value is the maximum of R, G, B

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6; // Normalize to [0, 1]
  }

  // Convert h from [0, 1] to OpenCV's [0, 179], s and v from [0, 1] to [0, 255]
  return {
    h: Math.round(h * 179),
    s: Math.round(s * 255),
    v: Math.round(v * 255),
  };
}
