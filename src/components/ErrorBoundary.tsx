import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** 'page' (default): full-screen error screen. 'inline': compact card that doesn't blow away surrounding chrome. */
  variant?: 'page' | 'inline';
  /** Reset key: when this changes, the boundary clears its error and re-renders children. Pass the current route pathname for typical "navigate away" behavior. */
  resetKey?: string;
}
interface State { error: Error | null; lastResetKey?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.resetKey !== undefined && props.resetKey !== state.lastResetKey) {
      return { error: null, lastResetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.variant === 'inline') {
      return (
        <div className="mx-auto max-w-2xl my-10 md:my-16 px-4 md:px-6">
          <div className="card border-error/30 bg-error/5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold mb-1">This section hit an error</p>
              <p className="text-sm text-white/60 mb-3">You can keep using the rest of the page. Reload if it happens repeatedly.</p>
              <p className="text-xs font-mono text-white/40 break-words mb-4">{this.state.error.message}</p>
              <button onClick={() => this.setState({ error: null })} className="btn-secondary text-sm">
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          </div>
          </div>
        </div>
      );
    }

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
