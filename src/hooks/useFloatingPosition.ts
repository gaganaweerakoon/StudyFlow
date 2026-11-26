import { useCallback, useEffect, useRef, useState } from 'react';

export interface FloatingPoint {
  x: number;
  y: number;
}

interface UseFloatingPositionOptions {
  storageKey: string;
  margin?: number;
  /** CSS selector for interactive descendants that should not initiate a drag */
  ignoreSelector?: string;
}

function clampPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  margin: number,
): FloatingPoint {
  if (typeof window === 'undefined') return { x, y };
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.round(Math.min(maxX, Math.max(margin, x))),
    y: Math.round(Math.min(maxY, Math.max(margin, y))),
  };
}

function readStoredPosition(storageKey: string): FloatingPoint | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloatingPoint>;
    if (
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function writeStoredPosition(storageKey: string, point: FloatingPoint | null) {
  if (typeof window === 'undefined') return;
  try {
    if (point === null) {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(point));
    }
  } catch {
    // Ignore storage write errors
  }
}

export function useFloatingPosition<T extends HTMLElement = HTMLDivElement>({
  storageKey,
  margin = 12,
  ignoreSelector,
}: UseFloatingPositionOptions) {
  const elementRef = useRef<T | null>(null);
  const [position, setPosition] = useState<FloatingPoint | null>(() =>
    readStoredPosition(storageKey),
  );
  const [isDragging, setIsDragging] = useState(false);

  const wasDraggedRef = useRef(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);

  // Keep custom position clamped inside the viewport on initial mount and window resizes
  useEffect(() => {
    if (!position) return;

    const clampCurrent = () => {
      const el = elementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const clamped = clampPoint(position.x, position.y, rect.width, rect.height, margin);
      if (clamped.x !== position.x || clamped.y !== position.y) {
        setPosition(clamped);
        writeStoredPosition(storageKey, clamped);
      }
    };

    clampCurrent();
    window.addEventListener('resize', clampCurrent);
    return () => window.removeEventListener('resize', clampCurrent);
  }, [position, margin, storageKey]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      if (ignoreSelector && (event.target as HTMLElement | null)?.closest(ignoreSelector)) {
        return;
      }

      const el = elementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      wasDraggedRef.current = false;
      dragStateRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: rect.left,
        originY: rect.top,
        width: rect.width,
        height: rect.height,
        moved: false,
      };

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
    },
    [ignoreSelector],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      const dx = event.clientX - state.startClientX;
      const dy = event.clientY - state.startClientY;

      if (!state.moved && Math.hypot(dx, dy) < 5) {
        return;
      }

      if (!state.moved) {
        state.moved = true;
        wasDraggedRef.current = true;
        setIsDragging(true);
      }

      const next = clampPoint(
        state.originX + dx,
        state.originY + dy,
        state.width,
        state.height,
        margin,
      );
      setPosition(next);
    },
    [margin],
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore release errors
      }

      const moved = state.moved;
      dragStateRef.current = null;
      setIsDragging(false);

      if (moved) {
        const dx = event.clientX - state.startClientX;
        const dy = event.clientY - state.startClientY;
        const finalPos = clampPoint(
          state.originX + dx,
          state.originY + dy,
          state.width,
          state.height,
          margin,
        );
        setPosition(finalPos);
        writeStoredPosition(storageKey, finalPos);
      }
    },
    [margin, storageKey],
  );

  const resetPosition = useCallback(() => {
    setPosition(null);
    writeStoredPosition(storageKey, null);
  }, [storageKey]);

  return {
    elementRef,
    position,
    isDragging,
    wasDraggedRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: finishDrag,
    handlePointerCancel: finishDrag,
    resetPosition,
  };
}
