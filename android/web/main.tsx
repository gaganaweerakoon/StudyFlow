import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MobileCompanionApp } from '../../src/mobile/MobileCompanionApp';
import './index.css';

function AndroidPreview() {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) return <MobileCompanionApp installed />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-5 py-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Welcome to StudyFlow</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Your phone starts with a fresh workspace. PC pairing and sync are still in development.
        </p>
      </div>
      <button
        type="button"
        className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-medium text-[var(--accent-fg)]"
        onClick={() => setShowDemo(true)}
      >
        Explore the demo
      </button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AndroidPreview />);
