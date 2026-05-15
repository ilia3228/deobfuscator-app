import React, { useEffect, useState } from 'react';

// useResizable — small drag-to-resize hook used by Sidebar / IOC panel /
// LogStrip. Returns the current size (in px), a pointerdown handler that
// starts a drag, and a `dragging` flag for visual feedback.
//
//   axis  : 'x' (width) | 'y' (height)
//   edge  : which edge of the container the handle sits on. Determines
//           the sign of the drag delta:
//             'right'  : panel grows to the right  (drag right ⇒ +)
//             'left'   : panel grows to the left   (drag left  ⇒ +)
//             'bottom' : panel grows downward      (drag down  ⇒ +)
//             'top'    : panel grows upward        (drag up    ⇒ +)
//   min/max : clamp range for the resulting size
//   storageKey : optional localStorage key — if set, the size is
//                persisted across reloads (and restored on mount).
//
// We attach pointer listeners to `window` rather than the handle itself
// so the drag survives the cursor leaving the 6 px hit-zone.
export function useResizable({
  initial,
  min,
  max,
  axis = 'x',
  edge = 'right',
  storageKey,
}) {
  const [size, setSize] = useState(() => {
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw != null) {
          const n = Number(raw);
          if (Number.isFinite(n) && n >= min && n <= max) return n;
        }
      } catch { /* private mode — fall through to initial */ }
    }
    return initial;
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, String(size)); }
    catch { /* private mode */ }
  }, [size, storageKey]);

  const startDrag = (e) => {
    // Ignore non-primary mouse buttons; touch/pen still allowed.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = size;
    const isX = axis === 'x';
    const sign = edge === 'right' || edge === 'bottom' ? 1 : -1;
    setDragging(true);

    const onMove = (mv) => {
      const delta = isX ? mv.clientX - startX : mv.clientY - startY;
      const next = Math.min(max, Math.max(min, startSize + sign * delta));
      setSize(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    // Lock the cursor + suppress text selection for the whole document
    // so dragging over the editor / log doesn't highlight content.
    document.body.style.cursor = isX ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return { size, setSize, startDrag, dragging };
}

// ResizeHandle — visual + hit-zone strip rendered inside a panel that
// has `position: relative`. The strip itself is fully transparent; a
// thin 1 px accent line shows up on hover / during drag (see styles.css
// rule `.resize-handle::after`). Pass `hidden` to skip rendering when
// the panel is collapsed.
export function ResizeHandle({
  edge = 'right',
  onPointerDown,
  dragging,
  hidden,
  label,
}) {
  if (hidden) return null;
  const horizontal = edge === 'top' || edge === 'bottom';
  const cls = `resize-handle resize-${edge}` + (dragging ? ' dragging' : '');
  return (
    <div
      role="separator"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-label={label || `Resize ${edge}`}
      className={cls}
      onPointerDown={onPointerDown}
    />
  );
}
