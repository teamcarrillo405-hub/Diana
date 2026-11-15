// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const api = vi.hoisted(() => ({ decode: vi.fn(), crop: vi.fn() }));
vi.mock('@/lib/learning-engine/handwriting-line-crop', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/learning-engine/handwriting-line-crop')>(), decodeHandwritingCropImage: api.decode, cropHandwritingLine: api.crop,
}));
import { HandwritingLineCrop } from './handwriting-line-crop';
const image = () => ({ width: 720, height: 120, close: vi.fn() });
const source = () => new File(['opaque input'], 'source.png', { type: 'image/png' });
const cropped = () => new File(['opaque crop'], 'handwriting-line.png', { type: 'image/png' });
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(yes => { resolve = yes; }), resolve }; }
beforeEach(() => {
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number; isPrimary: boolean;
    constructor(type: string, options: PointerEventInit = {}) { super(type, options); this.pointerId = options.pointerId ?? 1; this.isPrimary = options.isPrimary ?? true; }
  });
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() }, hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
  api.decode.mockReset().mockResolvedValue(image()); api.crop.mockReset().mockResolvedValue(cropped());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never);
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:local-selection'); static revokeObjectURL = vi.fn(); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function dragPreview() {
  const preview = await screen.findByRole('img', { name: /Handwriting preview/ });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(false));
  vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 360, height: 60 } as DOMRect);
  return preview;
}
it('supports reverse touch or pointer drag in downscaled image coordinates', async () => {
  const onSelection = vi.fn(); render(<HandwritingLineCrop file={source()} disabled={false} onSelection={onSelection}/>);
  const preview = await dragPreview();
  fireEvent.pointerDown(preview, { pointerId: 7, clientX: 310, clientY: 70, button: 0 });
  fireEvent.pointerMove(preview, { pointerId: 7, clientX: 30, clientY: 30 });
  expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.pointerUp(preview, { pointerId: 7, clientX: 30, clientY: 30 });
  expect(preview.releasePointerCapture).toHaveBeenCalledWith(7);
  fireEvent.click(screen.getByRole('button', { name: 'Use selected line' }));
  await waitFor(() => expect(api.crop).toHaveBeenCalledWith(expect.anything(), { x: 40, y: 20, width: 560, height: 80 }));
});
it.each(['cancel', 'lost', 'disabled'] as const)('invalidates an unfinished drag on %s', async reason => {
  const onSelection = vi.fn(), file = source();
  const view = render(<HandwritingLineCrop file={file} disabled={false} onSelection={onSelection}/>);
  const preview = await dragPreview();
  fireEvent.pointerDown(preview, { pointerId: 3, clientX: 20, clientY: 30, button: 0 });
  fireEvent.pointerMove(preview, { pointerId: 3, clientX: 200, clientY: 60 });
  if (reason === 'cancel') fireEvent.pointerCancel(preview, { pointerId: 3 });
  else if (reason === 'lost') fireEvent.lostPointerCapture(preview, { pointerId: 3 });
  else { view.rerender(<HandwritingLineCrop file={file} disabled onSelection={onSelection}/>); view.rerender(<HandwritingLineCrop file={file} disabled={false} onSelection={onSelection}/>); }
  fireEvent.pointerUp(preview, { pointerId: 3, clientX: 200, clientY: 60 });
  expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(true);
  expect(api.crop).not.toHaveBeenCalled(); expect(onSelection).toHaveBeenLastCalledWith(null);
});
it('supports keyboard pixel fields, validates bounds and requires explicit selection', async () => {
  const onSelection = vi.fn(); render(<HandwritingLineCrop file={source()} disabled={false} onSelection={onSelection}/>);
  await screen.findByRole('img', { name: /Handwriting preview, 720 by 120/ });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(false));
  expect(api.crop).not.toHaveBeenCalled(); expect(onSelection).toHaveBeenCalledWith(null);
  fireEvent.change(screen.getByLabelText('Top (pixels)'), { target: { value: '20' } });
  expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Height (pixels)'), { target: { value: '60' } });
  fireEvent.click(screen.getByRole('button', { name: 'Use selected line' }));
  await waitFor(() => expect(onSelection).toHaveBeenLastCalledWith(expect.any(File)));
  expect(api.crop).toHaveBeenCalledWith(expect.objectContaining({ width: 720, height: 120 }), { x: 0, y: 20, width: 720, height: 60 });
  expect(screen.getByAltText('Selected handwritten line to transcribe').getAttribute('src')).toBe('blob:local-selection');
  fireEvent.change(screen.getByLabelText('Left (pixels)'), { target: { value: '' } });
  expect(onSelection).toHaveBeenLastCalledWith(null); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-selection');
  expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(true);
});
it('closes a stale decode after changing files and uses only the new preview', async () => {
  const old = image(), pending = deferred<ReturnType<typeof image>>(); api.decode.mockReturnValueOnce(pending.promise);
  const view = render(<HandwritingLineCrop file={source()} disabled={false} onSelection={vi.fn()}/>);
  view.rerender(<HandwritingLineCrop file={source()} disabled={false} onSelection={vi.fn()}/>);
  await screen.findByRole('img', { name: /Handwriting preview/ });
  await act(async () => pending.resolve(old)); expect(old.close).toHaveBeenCalledOnce();
});
it.each(['disabled', 'unmount', 'file'] as const)('discards crop encoding completed after %s', async reason => {
  const pending = deferred<File>(), onSelection = vi.fn(), file = source(); api.crop.mockReturnValueOnce(pending.promise);
  const view = render(<HandwritingLineCrop file={file} disabled={false} onSelection={onSelection}/>);
  await screen.findByLabelText('Left (pixels)');
  await waitFor(() => expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Use selected line' }));
  await waitFor(() => expect(api.crop).toHaveBeenCalledOnce());
  if (reason === 'unmount') view.unmount();
  else view.rerender(<HandwritingLineCrop file={reason === 'file' ? source() : file} disabled={reason === 'disabled'} onSelection={onSelection}/>);
  await act(async () => pending.resolve(cropped()));
  expect(onSelection.mock.calls.every(([value]) => value === null)).toBe(true); expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('does not revive a delayed decode after disable and re-enable, and can retry', async () => {
  const pending = deferred<ReturnType<typeof image>>(), old = image(), file = source(); api.decode.mockReturnValueOnce(pending.promise);
  const view = render(<HandwritingLineCrop file={file} disabled={false} onSelection={vi.fn()}/>);
  view.rerender(<HandwritingLineCrop file={file} disabled onSelection={vi.fn()}/>);
  view.rerender(<HandwritingLineCrop file={file} disabled={false} onSelection={vi.fn()}/>);
  await act(async () => pending.resolve(old)); expect(old.close).toHaveBeenCalledOnce();
  expect(screen.queryByRole('img', { name: /Handwriting preview/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Load image preview' }));
  await screen.findByRole('img', { name: /Handwriting preview/ });
});
it('keeps selection unavailable when the preview cannot be painted', async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  render(<HandwritingLineCrop file={source()} disabled={false} onSelection={vi.fn()}/>);
  await screen.findByText('This browser could not show the image. Enter the text yourself.');
  expect((screen.getByRole('button', { name: 'Use selected line' }) as HTMLButtonElement).disabled).toBe(true);
});
