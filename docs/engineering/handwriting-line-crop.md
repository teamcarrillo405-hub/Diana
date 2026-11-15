# Handwriting line preview and crop

The optional handwriting input now opens a local preview before recognition. The student drags around one line or adjusts four labeled number inputs with the keyboard, selects **Use selected line**, then separately chooses **Read into response**. Replacing the image or changing the rectangle clears the prepared selection. Transcription still requires the existing student review and confirmation.

## Input and pixel contract

- PNG or JPEG only; source and encoded crop remain limited to 5,000,000 bytes. Both encoded-header and decoded-image limits remain four million pixels, width 8192 and height 4096.
- One `createImageBitmap` decode with `imageOrientation: 'from-image'` supplies both the preview and crop. Coordinates refer to that displayed orientation. There is no second EXIF transform.
- Drag coordinates map from the displayed bounds to whole source pixels. Captured pointers outside the preview stop at its edges. Numeric rectangles with nonfinite, fractional, empty, zero-size or out-of-bounds values are rejected.
- The canvas copies the rectangle to a PNG of the same pixel dimensions. CSS can scale its display; the export performs no arbitrary resize, automatic line detection, padding, sharpening or quality-based selection.
- A canceled or disabled drag clears its selection. File replacement, unmount, context change and disabling invalidate pending decode or encoding results. Bitmaps and blob preview URLs are released when no longer used.

## Network and recognition boundary

Preview and crop use browser APIs only. They do not call the model, fetch the source image or upload pixels. Only the selected PNG is handed to the existing recognition path after the explicit reading action. Existing optional model-download controls and the configured local-server path retain their prior behavior. Browser recognition remains unverified, and a local-server proof does not replace student confirmation.

This is a manual input workflow for prose on one line. Equations and diagrams still require manual entry. It makes no recognition accuracy or benchmark claim and does not change model weights or activation.

## Verification

Four focused suites passed 43 tests using synthetic metadata, opaque files and mocked decoders/recognition. They cover geometry, limits, orientation option and dimension checks, exact canvas copy dimensions, pointer mapping/cancellation, keyboard fields, stale async results, and browser/local-server handoff of only the selected PNG. Full TypeScript checking and scoped ESLint passed. Actual browser decoder/EXIF behavior and visual acceptance remain separate browser QA; no model execution or download was used for this verification.
