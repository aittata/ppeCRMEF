// frontend/src/shared/layout/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-6">
          <div className="text-center max-w-md">
            <div className="mb-6 text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Une erreur inattendue est survenue</h1>
            <p className="text-gray-500 dark:text-slate-400 mb-6">L'application a rencontré un problème. Veuillez rafraîchir la page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
