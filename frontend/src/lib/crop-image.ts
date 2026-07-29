function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getCroppedImageDataUrl(
  imageSrc: string,
  crop: CropArea,
  outputWidth = 800,
  quality = 0.88
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const aspect = crop.width / crop.height;
  canvas.width = outputWidth;
  canvas.height = Math.round(outputWidth / aspect);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supporté');

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Calcule la zone de recadrage à partir du zoom et de la position dans le viewport */
export function computeCropArea(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  aspectRatio: number
): CropArea {
  const cropWidthInViewport = viewportWidth * 0.85;
  const cropHeightInViewport = cropWidthInViewport / aspectRatio;

  const scale = Math.max(viewportWidth / naturalWidth, viewportHeight / naturalHeight) * zoom;

  const displayedWidth = naturalWidth * scale;
  const displayedHeight = naturalHeight * scale;

  const imageLeft = (viewportWidth - displayedWidth) / 2 + offsetX;
  const imageTop = (viewportHeight - displayedHeight) / 2 + offsetY;

  const cropLeft = (viewportWidth - cropWidthInViewport) / 2;
  const cropTop = (viewportHeight - cropHeightInViewport) / 2;

  const x = Math.max(0, (cropLeft - imageLeft) / scale);
  const y = Math.max(0, (cropTop - imageTop) / scale);
  const width = Math.min(naturalWidth - x, cropWidthInViewport / scale);
  const height = Math.min(naturalHeight - y, cropHeightInViewport / scale);

  return { x, y, width, height };
}
