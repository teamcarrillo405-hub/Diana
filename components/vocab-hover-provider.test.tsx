// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import { VocabHoverProvider } from './vocab-hover-provider';

function mockSelection(text: string) {
  vi.spyOn(window, 'getSelection').mockReturnValue({
    toString: () => text,
    removeAllRanges: () => {},
  } as any);
}

describe('VocabHoverProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls API on valid alphabetic word selection via double-click', async () => {
    mockSelection('photosynthesis');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ definition: 'How plants make food.' }),
    });
    render(
      <VocabHoverProvider>
        <p data-testid="content">photosynthesis is cool</p>
      </VocabHoverProvider>
    );
    fireEvent.doubleClick(screen.getByTestId('content'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('vocab-hover'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('does nothing on empty selection', async () => {
    mockSelection('');
    render(
      <VocabHoverProvider>
        <p data-testid="c">x</p>
      </VocabHoverProvider>
    );
    fireEvent.doubleClick(screen.getByTestId('c'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects non-alphabetic selection', async () => {
    mockSelection('hello123');
    render(
      <VocabHoverProvider>
        <p data-testid="c">x</p>
      </VocabHoverProvider>
    );
    fireEvent.doubleClick(screen.getByTestId('c'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects too-long selection (>20 chars)', async () => {
    mockSelection('a'.repeat(25));
    render(
      <VocabHoverProvider>
        <p data-testid="c">x</p>
      </VocabHoverProvider>
    );
    fireEvent.doubleClick(screen.getByTestId('c'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders popover with definition after success', async () => {
    mockSelection('mitosis');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ definition: 'Cell division.' }),
    });
    render(
      <VocabHoverProvider>
        <p data-testid="c">mitosis</p>
      </VocabHoverProvider>
    );
    fireEvent.doubleClick(screen.getByTestId('c'));
    await waitFor(() => {
      expect(screen.getByText('Cell division.')).toBeTruthy();
    });
  });

  it('closes popover on Escape', async () => {
    mockSelection('mitosis');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ definition: 'Cell division.' }),
    });
    render(
      <VocabHoverProvider>
        <p data-testid="c">mitosis</p>
      </VocabHoverProvider>
    );
    fireEvent.doubleClick(screen.getByTestId('c'));
    await waitFor(() => screen.getByText('Cell division.'));
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Cell division.')).toBeNull();
    });
  });

  it('renders nothing on API failure (silent)', async () => {
    mockSelection('mitosis');
    (global.fetch as any).mockResolvedValue({ ok: false });
    render(
      <VocabHoverProvider>
        <p data-testid="c">mitosis</p>
      </VocabHoverProvider>
    );
    fireEvent.doubleClick(screen.getByTestId('c'));
    // Give it a tick
    await new Promise(r => setTimeout(r, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
