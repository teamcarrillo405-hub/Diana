import { imageDimensions } from './browser-recognition-input';

export type HandwritingImageSize = { width: number; height: number };
export type HandwritingLineRectangle = { x: number; y: number; width: number; height: number };
export type HandwritingPixelPoint = { x: number; y: number };
const MAX_BYTES = 5_000_000;

/** A captured pointer may leave the preview: stop its selection at the image edge. */
export function handwritingPreviewPoint(size: HandwritingImageSize, bounds: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number): HandwritingPixelPoint {
  validateHandwritingImageSize(size);
  if (![bounds.left, bounds.top, bounds.width, bounds.height, clientX, clientY].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error('The image preview is not ready for selection. Use the controls below.');
  }
  return { x: Math.round(Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) * size.width),
    y: Math.round(Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)) * size.height) };
}

export function validateHandwritingImageSize(size: HandwritingImageSize): void {
  if (![size.width, size.height].every(value => Number.isSafeInteger(value) && value > 0)
    || size.width > 8192 || size.height > 4096 || size.width * size.height > 4_000_000) {
    throw new Error('Choose a PNG or JPEG crop under four million pixels.');
  }
}

/** Pixel coordinates are in the decoded, displayed orientation. Never silently clamp or resize. */
export function validateHandwritingLineRectangle(size: HandwritingImageSize, rectangle: HandwritingLineRectangle): void {
  validateHandwritingImageSize(size);
  if (![rectangle.x, rectangle.y, rectangle.width, rectangle.height].every(Number.isSafeInteger) || rectangle.x < 0 || rectangle.y < 0
    || rectangle.width <= 0 || rectangle.height <= 0 || rectangle.x + rectangle.width > size.width
    || rectangle.y + rectangle.height > size.height) {
    throw new Error('Use whole-pixel coordinates and keep the selection inside the image.');
  }
}

/** Decode locally once with browser EXIF orientation; both preview and crop use this bitmap. */
export async function decodeHandwritingCropImage(file: File): Promise<ImageBitmap> {
  if (!file.size || file.size > MAX_BYTES) throw new Error('Choose a file under 5 MB.');
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') throw new Error('Choose a PNG or JPEG image of handwriting.');
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength !== file.size) throw new Error('The image could not be read completely. Choose it again.');
  const header = imageDimensions(bytes, file.type);
  const bitmap = await createImageBitmap(new Blob([bytes], { type: file.type }), { imageOrientation: 'from-image' });
  try {
    validateHandwritingImageSize(bitmap);
    // EXIF can swap dimensions. No second rotation or encoded-coordinate crop follows.
    if (!(bitmap.width === header.width && bitmap.height === header.height)
      && !(bitmap.width === header.height && bitmap.height === header.width)) {
      throw new Error('The image dimensions changed while decoding.');
    }
    return bitmap;
  } catch (error) { bitmap.close(); throw error; }
}

/** Copy exactly the selected pixel rectangle. Canvas output strips orientation metadata. */
export async function cropHandwritingLine(bitmap: ImageBitmap, rectangle: HandwritingLineRectangle): Promise<File> {
  validateHandwritingLineRectangle(bitmap, rectangle);
  const canvas = document.createElement('canvas');
  canvas.width = rectangle.width; canvas.height = rectangle.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the selected line. Enter the text yourself.');
  context.drawImage(bitmap, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 0, 0, rectangle.width, rectangle.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value)
    : reject(new Error('The selected line could not be prepared. Try again.')), 'image/png'));
  if (!blob.size || blob.size > MAX_BYTES) throw new Error('Choose a smaller line selection under 5 MB.');
  if (blob.type !== 'image/png') throw new Error('This browser could not prepare a PNG. Enter the text yourself.');
  return new File([blob], 'handwriting-line.png', { type: 'image/png' });
}
