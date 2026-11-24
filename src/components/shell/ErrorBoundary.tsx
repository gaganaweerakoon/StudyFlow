import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    let message = 'Something went wrong while rendering StudyFlow.';
    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message) as { error?: string };
        if (parsed?.error) message = parsed.error;
        else message = error.message;
      } catch {
        message = error.message;
      }
    }
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error('StudyFlow ErrorBoundary caught:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2.5 text-rose-500">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h1 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
              Workspace Recovery
            </h1>
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }
}
