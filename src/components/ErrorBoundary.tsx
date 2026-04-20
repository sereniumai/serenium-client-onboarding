import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-bg text-white">
        <div className="max-w-md text-center">
          <div className="h-16 w-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="font-display font-black text-3xl tracking-[-0.025em] mb-3">Something broke.</h1>
          <p className="text-white/60 mb-6">
            We hit an unexpected error. Reload the page and we'll pick up where you left off — your progress is saved.
          </p>
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-mono text-white/50 break-words">{this.state.error.message}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary">
            <RefreshCw className="h-4 w-4" /> Reload page
          </button>
        </div>
      </div>
    );
  }
}
