'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { cropHandwritingLine, decodeHandwritingCropImage, handwritingPreviewPoint, validateHandwritingLineRectangle,
  type HandwritingLineRectangle, type HandwritingPixelPoint } from '@/lib/learning-engine/handwriting-line-crop';
import styles from './learning-material.module.css';

type Props = { file: File; disabled: boolean; onSelection: (file: File | null) => void };
type Fields = Record<keyof HandwritingLineRectangle, string>;
const labels = { x: 'Left (pixels)', y: 'Top (pixels)', width: 'Width (pixels)', height: 'Height (pixels)' };

/** Deliberate student selection only. No line detection, recognition or image upload. */
export function HandwritingLineCrop({ file, disabled, onSelection }: Props) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [fields, setFields] = useState<Fields>({ x: '0', y: '0', width: '', height: '' });
  const [loading, setLoading] = useState(true), [encoding, setEncoding] = useState(false);
  const [notice, setNotice] = useState('Opening image on this device…'), [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [painted, setPainted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; element: HTMLDivElement; start: HandwritingPixelPoint } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null), sequence = useRef(0), alive = useRef(false), disabledRef = useRef(disabled);
  const selection = useRef(onSelection);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  const releaseDrag = useCallback(() => {
    const current = drag.current; drag.current = null;
    if (current?.element.hasPointerCapture(current.id)) current.element.releasePointerCapture(current.id);
  }, []);
  const cancelDrag = useCallback(() => {
    releaseDrag(); setDragging(false); invalidate(); selection.current(null); setPreview(null);
    setFields(previous => ({ ...previous, width: '0', height: '0' })); setNotice('Selection canceled. Drag around one line, or adjust below.');
  }, [invalidate, releaseDrag]);
  useLayoutEffect(() => { selection.current = onSelection; });
  useLayoutEffect(() => {
    alive.current = true;
    return () => { alive.current = false; invalidate(); releaseDrag(); };
  }, [invalidate, releaseDrag]);
  useLayoutEffect(() => {
    disabledRef.current = disabled;
    if (disabled) { sequence.current++; setLoading(false); setEncoding(false);
      if (drag.current) cancelDrag();
      setNotice(value => value.startsWith('Opening') || value.startsWith('Preparing') ? 'Image preparation paused. Load the preview or select the line again when ready.' : value);
    }
  }, [disabled, cancelDrag]);
  useEffect(() => {
    const id = ++sequence.current; let decoded: ImageBitmap | null = null;
    selection.current(null); setBitmap(null); setPreview(null); setPainted(false); setDragging(false);
    setLoading(!disabledRef.current); setNotice('Opening image on this device…');
    if (!disabledRef.current) void decodeHandwritingCropImage(file).then(value => {
      if (!alive.current || id !== sequence.current || disabledRef.current) { value.close(); return; }
      decoded = value; setBitmap(value); setFields({ x: '0', y: '0', width: String(value.width), height: String(value.height) });
      setLoading(false); setNotice('Drag around one line, or adjust below. Then use the selected line.');
    }).catch(error => {
      if (alive.current && id === sequence.current && !disabledRef.current) {
        setLoading(false); setNotice(error instanceof Error ? error.message : 'This image could not open. Choose another image or enter the text yourself.');
      }
    });
    return () => { invalidate(); releaseDrag(); decoded?.close(); };
  }, [file, retry, invalidate, releaseDrag]);
  useEffect(() => {
    if (!bitmap || !canvas.current) return;
    try {
      const context = canvas.current.getContext('2d');
      if (!context) throw new Error('No canvas context');
      context.drawImage(bitmap, 0, 0); setPainted(true);
    } catch { setPainted(false); setNotice('This browser could not show the image. Enter the text yourself.'); }
  }, [bitmap]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const rectangle = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim() === '' ? NaN : Number(value)])) as HandwritingLineRectangle;
  let rectangleError = '';
  try { if (bitmap) validateHandwritingLineRectangle(bitmap, rectangle); } catch (error) { rectangleError = (error as Error).message; }
  const valid = Boolean(bitmap && painted && !rectangleError);
  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId || !bitmap) return;
    const point = handwritingPreviewPoint(bitmap, event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
    setFields({ x: String(Math.min(current.start.x, point.x)), y: String(Math.min(current.start.y, point.y)),
      width: String(Math.abs(point.x - current.start.x)), height: String(Math.abs(point.y - current.start.y)) });
  }
  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!bitmap || !painted || disabledRef.current || encoding || drag.current || event.button !== 0 || event.isPrimary === false) return;
    try {
      const start = handwritingPreviewPoint(bitmap, event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, element: event.currentTarget, start }; sequence.current++;
      setDragging(true); selection.current(null); setPreview(null); updateDrag(event);
      setNotice('Drag around one line. Release to finish the selection.'); event.preventDefault();
    } catch { cancelDrag(); }
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>, finish = false) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    if (disabledRef.current) { cancelDrag(); return; }
    try {
      updateDrag(event); event.preventDefault();
      if (finish) { releaseDrag(); setDragging(false); setNotice('Use the selected line when the rectangle is ready.'); }
    } catch { cancelDrag(); }
  }
  function change(field: keyof Fields, value: string) {
    sequence.current++; setFields(previous => ({ ...previous, [field]: value }));
    selection.current(null); setPreview(null); setNotice('Selection changed. Use the selected line before reading it.');
  }
  async function apply() {
    if (!bitmap || !valid || disabledRef.current || encoding || drag.current) return;
    const id = ++sequence.current; selection.current(null); setPreview(null); setEncoding(true); setNotice('Preparing the selected line on this device…');
    try {
      const result = await cropHandwritingLine(bitmap, rectangle);
      if (!alive.current || id !== sequence.current || disabledRef.current) return;
      const url = URL.createObjectURL(result); setPreview(url); selection.current(result);
      setNotice('Selected line ready. Read it into your response, then check the transcription.');
    } catch (error) {
      if (alive.current && id === sequence.current && !disabledRef.current) setNotice(error instanceof Error ? error.message : 'The selected line could not be prepared. Try again.');
    } finally { if (alive.current && id === sequence.current) setEncoding(false); }
  }
  return <section aria-label="Handwriting line selection" className={styles.section}>
    <p className={styles.label}>Drag around one line, or adjust below. Leave a little space around the writing. Preview stays on this device.</p>
    {bitmap && <>
      <div role="img" aria-label={`Handwriting preview, ${bitmap.width} by ${bitmap.height} pixels. Use the selection controls below.`}
        onPointerDown={beginDrag} onPointerMove={event => moveDrag(event)} onPointerUp={event => moveDrag(event, true)}
        onPointerCancel={event => { if (drag.current?.id === event.pointerId) cancelDrag(); }}
        onLostPointerCapture={event => { if (drag.current?.id === event.pointerId) cancelDrag(); }}
        style={{ position: 'relative', width: '100%', lineHeight: 0, touchAction: disabled || encoding ? 'auto' : 'none', cursor: disabled || encoding ? 'default' : 'crosshair' }}>
        <canvas ref={canvas} width={bitmap.width} height={bitmap.height} aria-hidden="true" style={{ display: 'block', width: '100%', height: 'auto' }}/>
        {valid && <div aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none', boxSizing: 'border-box', border: '2px solid #d5c4fa',
          left: `${rectangle.x / bitmap.width * 100}%`, top: `${rectangle.y / bitmap.height * 100}%`,
          width: `${rectangle.width / bitmap.width * 100}%`, height: `${rectangle.height / bitmap.height * 100}%` }}/>}
      </div>
      <fieldset disabled={disabled || loading || encoding || dragging} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend className={styles.label}>Line selection</legend>
        <div className={styles.toolbar}>{(Object.keys(labels) as Array<keyof Fields>).map(field => <label className={styles.field} key={field} style={{ flex: '1 1 8rem' }}>
          {labels[field]}<input type="number" step="1" min={field === 'x' || field === 'y' ? 0 : 1}
            max={field === 'x' || field === 'width' ? bitmap.width : bitmap.height} value={fields[field]}
            aria-invalid={Boolean(rectangleError)} onChange={event => change(field, event.target.value)}/>
        </label>)}</div>
        {rectangleError && <p className={styles.notice}>{rectangleError}</p>}
        <button type="button" className={styles.button + ' ' + styles.secondary} disabled={!valid || disabled || encoding || dragging} onClick={() => void apply()}>Use selected line</button>
      </fieldset>
    </>}
    {!bitmap && !loading && <button type="button" className={styles.button + ' ' + styles.secondary} disabled={disabled} onClick={() => setRetry(value => value + 1)}>Load image preview</button>}
    {preview && <div><p className={styles.label}>Selected line</p>{/* Local blob only, not a remote image. */}
      <img src={preview} alt="Selected handwritten line to transcribe" style={{ display: 'block', maxWidth: '100%', height: 'auto' }}/></div>}
    <p role="status" className={styles.notice}>{notice}</p>
  </section>;
}
