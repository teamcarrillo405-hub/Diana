// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cropHandwritingLine, decodeHandwritingCropImage, handwritingPreviewPoint, validateHandwritingImageSize, validateHandwritingLineRectangle } from './handwriting-line-crop';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const bitmap = (width = 720, height = 80) => ({ width, height, close: vi.fn() }) as unknown as ImageBitmap;
function png(width = 720, height = 80) {
  const bytes = new ArrayBuffer(24), view = new DataView(bytes);
  view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a); view.setUint32(16, width); view.setUint32(20, height);
  const file = new File([bytes], 'line.png', { type: 'image/png' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes }); return file;
}
describe('bounded local line cropping', () => {
  it('maps a downscaled pointer to decoded pixels and stops at the image edges', () => {
    const size = { width: 720, height: 120 }, bounds = { left: 10, top: 20, width: 360, height: 60 };
    expect(handwritingPreviewPoint(size, bounds, 190, 35)).toEqual({ x: 360, y: 30 });
    expect(handwritingPreviewPoint(size, bounds, -20, 100)).toEqual({ x: 0, y: 120 });
    expect(() => handwritingPreviewPoint(size, bounds, NaN, 35)).toThrow('not ready');
    expect(() => handwritingPreviewPoint(size, { ...bounds, width: 0 }, 10, 35)).toThrow('not ready');
  });
  it('accepts the exact whole-image rectangle and a one-pixel edge without clamping', () => {
    expect(() => validateHandwritingLineRectangle({ width: 720, height: 80 }, { x: 0, y: 0, width: 720, height: 80 })).not.toThrow();
    expect(() => validateHandwritingLineRectangle({ width: 720, height: 80 }, { x: 719, y: 79, width: 1, height: 1 })).not.toThrow();
  });
  it.each([
    { x: -1, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 0, height: 10 },
    { x: 710, y: 0, width: 11, height: 10 }, { x: 0, y: 75, width: 10, height: 6 },
    { x: 0.5, y: 0, width: 10, height: 10 }, { x: 0, y: NaN, width: 10, height: 10 },
    { x: 0, y: 0, width: Infinity, height: 10 }, { x: 0, y: 0, width: 10, height: undefined },
  ])('rejects invalid rectangle %j', rectangle => {
    expect(() => validateHandwritingLineRectangle({ width: 720, height: 80 }, rectangle as never)).toThrow('whole-pixel');
  });
  it.each([{ width: 8193, height: 1 }, { width: 1, height: 4097 }, { width: 2001, height: 2000 }, { width: NaN, height: 10 }, { width: 0, height: 10 }])('retains image limits %j', size => {
    expect(() => validateHandwritingImageSize(size)).toThrow('four million');
  });
  it('bounds bytes, MIME and header pixels before decoding', async () => {
    const decode = vi.fn(); vi.stubGlobal('createImageBitmap', decode);
    for (const file of [new File([], 'empty.png', { type: 'image/png' }), new File(['x'.repeat(5_000_001)], 'big.png', { type: 'image/png' }),
      new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' }), png(5000, 5000)]) {
      await expect(decodeHandwritingCropImage(file)).rejects.toThrow();
    }
    expect(decode).not.toHaveBeenCalled();
  });
  it('uses decoder orientation once and permits the corresponding swapped dimensions', async () => {
    const oriented = bitmap(80, 720), decode = vi.fn(async () => oriented); vi.stubGlobal('createImageBitmap', decode);
    expect(await decodeHandwritingCropImage(png())).toBe(oriented);
    expect(decode).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), { imageOrientation: 'from-image' });
    expect(oriented.close).not.toHaveBeenCalled();
  });
  it('closes a mismatched or oversized decoded bitmap', async () => {
    const changed = bitmap(721, 80); vi.stubGlobal('createImageBitmap', vi.fn(async () => changed));
    await expect(decodeHandwritingCropImage(png())).rejects.toThrow('dimensions changed'); expect(changed.close).toHaveBeenCalledOnce();
  });
  it('copies exactly the oriented rectangle to the same-size PNG without resampling', async () => {
    const image = bitmap(80, 720), drawImage = vi.fn();
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(['opaque PNG'], { type: 'image/png' }))) };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as never);
    const result = await cropHandwritingLine(image, { x: 4, y: 200, width: 60, height: 100 });
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(image, 4, 200, 60, 100, 0, 0, 60, 100);
    expect(canvas.width).toBe(60); expect(canvas.height).toBe(100); expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    expect(result.type).toBe('image/png'); expect(result.name).toBe('handwriting-line.png');
  });
  it('rejects unavailable and oversized encodings', async () => {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: vi.fn((callback: BlobCallback) => callback(null)) };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as never);
    await expect(cropHandwritingLine(bitmap(), { x: 0, y: 0, width: 40, height: 40 })).rejects.toThrow('could not be prepared');
    canvas.toBlob.mockImplementation(callback => callback(new Blob(['x'.repeat(5_000_001)])));
    await expect(cropHandwritingLine(bitmap(), { x: 0, y: 0, width: 40, height: 40 })).rejects.toThrow('smaller');
    canvas.toBlob.mockImplementation(callback => callback(new Blob(['opaque unsupported'], { type: 'image/webp' })));
    await expect(cropHandwritingLine(bitmap(), { x: 0, y: 0, width: 40, height: 40 })).rejects.toThrow('prepare a PNG');
  });
});
