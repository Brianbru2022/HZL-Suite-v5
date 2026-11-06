import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { installLocalCrashReporting, recordLocalCrashReport } from './utils/crashReporting';

type RootErrorBoundaryProps = { children: React.ReactNode };
type RootErrorBoundaryState = { error: Error | null };

class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  declare props: RootErrorBoundaryProps;

  state: RootErrorBoundaryState;

  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('HZL QS Suite render failure', error, info);
    recordLocalCrashReport({
      source: 'react-boundary',
      message: error.message || error.name,
      stack: error.stack,
      componentStack: info.componentStack || undefined,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 px-6 py-10 text-slate-900 dark:bg-surface-950 dark:text-slate-100">
        <div className="workspace-shell max-w-2xl p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-300">
            Startup issue
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">HZL QS Suite could not finish loading</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            The app caught a startup error instead of leaving the window blank. Reload the workspace, and if it repeats, open diagnostics or send the latest log.
          </p>
          <pre className="mt-5 max-h-48 overflow-auto rounded-app border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-app-sm bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');
installLocalCrashReporting();
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);
