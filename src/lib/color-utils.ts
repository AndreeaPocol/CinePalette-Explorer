export function getColorAtPixel(img: HTMLImageElement, x: number, y: number): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '#000000';
  }

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const pixelData = ctx.getImageData(x, y, 1, 1).data;
  const [r, g, b] = pixelData;

  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}