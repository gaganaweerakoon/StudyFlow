import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAssistant } from './AssistantContext';
import { AssistantChat, PetFace } from './AssistantChat';

export function FloatingAssistant() {
  const { route, focusTimer, activeModal, commandPaletteOpen } = useApp();
  const { petOpen, setPetOpen, busy } = useAssistant();
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const lastOpen = useRef(false);
  useEffect(() => {
    if (petOpen) panel.current?.querySelector('textarea')?.focus();
    else if (lastOpen.current && panel.current?.contains(document.activeElement)) launcher.current?.focus();
    lastOpen.current = petOpen;
  }, [petOpen]);

  if (route === 'assistant' || activeModal || commandPaletteOpen) return null;
  const mini = (focusTimer.miniVisible || focusTimer.running) && route !== 'focus';
  const mood = busy ? 'working' : focusTimer.running ? focusTimer.phase : 'ready';
  const stateLabel = mood === 'focus' ? 'Focus session running' : mood === 'break' ? 'Break running' : mood === 'working' ? 'Preparing reply' : 'Study assistant';

  return (
    <div className={`pip-float ${mini ? 'pip-above-timer' : ''}`}>
      {petOpen && <div ref={panel} onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          launcher.current?.focus();
          setPetOpen(false);
        }
      }}><AssistantChat floating /></div>}
      <button ref={launcher} type="button" className="pip-launcher" aria-label={petOpen ? 'Close Pip chat' : 'Open Pip chat'} aria-expanded={petOpen} title={`Pip · ${stateLabel}`} onClick={() => setPetOpen(!petOpen)}>
        <PetFace mood={mood} />
      </button>
    </div>
  );
}
