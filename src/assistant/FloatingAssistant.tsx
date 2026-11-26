import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useFloatingPosition } from '../hooks/useFloatingPosition';
import { useAssistant } from './AssistantContext';
import { AssistantChat, PetFace } from './AssistantChat';

const LAUNCHER_SIZE = 56;
const PANEL_GAP = 10;
const VIEWPORT_MARGIN = 12;

export function FloatingAssistant() {
  const { route, focusTimer, activeModal, commandPaletteOpen } = useApp();
  const { petOpen, setPetOpen, busy, companionBusy, companionUnreadCount, setPipTab } = useAssistant();
  const panel = useRef<HTMLDivElement>(null);

  const {
    elementRef: launcher,
    position,
    isDragging,
    wasDraggedRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useFloatingPosition<HTMLButtonElement>({
    storageKey: 'studyflow_floating_pip_pos',
    margin: VIEWPORT_MARGIN,
  });

  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (petOpen) panel.current?.querySelector('textarea')?.focus();
  }, [petOpen]);

  const mini = (focusTimer.miniVisible || focusTimer.running || Boolean(focusTimer.pausedFocus)) && route !== 'focus';

  // Compute smart viewport-safe position for the Pip chat panel anchored to Pip's launcher
  const panelStyle = useMemo<React.CSSProperties>(() => {
    const vw = viewport.width;
    const vh = viewport.height;
    const panelWidth = Math.min(460, vw - 32);

    const anchorX = position ? position.x : vw - 18 - LAUNCHER_SIZE;
    const anchorY = position ? position.y : vh - (mini ? 95 : 18) - LAUNCHER_SIZE;

    const launcherCenterX = anchorX + LAUNCHER_SIZE / 2;
    const alignLeft = launcherCenterX < vw / 2;
    const rawLeft = alignLeft ? anchorX : anchorX + LAUNCHER_SIZE - panelWidth;
    const left = Math.round(
      Math.max(VIEWPORT_MARGIN, Math.min(vw - panelWidth - VIEWPORT_MARGIN, rawLeft)),
    );

    const spaceAbove = anchorY - PANEL_GAP - VIEWPORT_MARGIN;
    const spaceBelow = vh - (anchorY + LAUNCHER_SIZE) - PANEL_GAP - VIEWPORT_MARGIN;
    const openBelow = spaceBelow > spaceAbove && spaceAbove < 380;

    if (openBelow) {
      const top = Math.round(anchorY + LAUNCHER_SIZE + PANEL_GAP);
      const maxHeight = Math.max(260, Math.min(670, vh - top - VIEWPORT_MARGIN));
      return {
        position: 'fixed',
        zIndex: 45,
        left,
        top,
        width: panelWidth,
        height: maxHeight,
      };
    }

    const bottom = Math.round(vh - anchorY + PANEL_GAP);
    const maxHeight = Math.max(260, Math.min(670, vh - bottom - VIEWPORT_MARGIN));
    return {
      position: 'fixed',
      zIndex: 45,
      left,
      bottom,
      width: panelWidth,
      height: maxHeight,
    };
  }, [position, mini, viewport.width, viewport.height]);

  if (route === 'assistant' || activeModal || commandPaletteOpen) return null;
  const mood = busy || companionBusy ? 'working' : focusTimer.running ? focusTimer.phase : 'ready';
  const stateLabel =
    companionUnreadCount > 0
      ? `${companionUnreadCount} unread Companion ${companionUnreadCount === 1 ? 'message' : 'messages'}`
      : mood === 'focus'
        ? 'Focus session running'
        : mood === 'break'
          ? 'Break running'
          : mood === 'working'
            ? 'Preparing reply'
            : 'Study assistant';

  function close() {
    launcher.current?.focus();
    setPetOpen(false);
  }

  return (
    <>
      {petOpen && (
        <div
          ref={panel}
          className="pip-panel-anchor"
          style={panelStyle}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <AssistantChat onClose={close} />
        </div>
      )}

      <button
        ref={launcher}
        type="button"
        className={`pip-launcher pip-launcher-fixed ${!position && mini ? 'pip-launcher-above-timer' : ''} ${isDragging ? 'pip-launcher-dragging' : ''}`}
        style={
          position
            ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
            : undefined
        }
        aria-label={
          petOpen
            ? 'Close Pip chat'
            : companionUnreadCount > 0
              ? `Open Pip chat (${companionUnreadCount} unread Companion messages)`
              : 'Open Pip chat'
        }
        aria-expanded={petOpen}
        title={`Pip · ${stateLabel} · Drag to move`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={() => {
          if (wasDraggedRef.current) {
            wasDraggedRef.current = false;
            return;
          }
          if (!petOpen && companionUnreadCount > 0) {
            setPipTab('companion');
          }
          setPetOpen(!petOpen);
        }}
      >
        <PetFace mood={mood} />
        {companionUnreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-md flex items-center justify-center text-[10.5px] font-mono-num font-semibold shadow-sm"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
              border: '2px solid var(--bg-canvas)',
            }}
          >
            {companionUnreadCount > 9 ? '9+' : companionUnreadCount}
          </span>
        )}
      </button>
    </>
  );
}
