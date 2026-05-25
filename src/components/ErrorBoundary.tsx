'use client';
/**
 * Production-safe React Error Boundary.
 *
 * Catches render-time errors in the component subtree and shows a
 * recoverable fallback UI instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeDangerousComponent />
 *   </ErrorBoundary>
 *
 *   // Custom fallback:
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     ...
 *   </ErrorBoundary>
 *
 *   // Compact variant for individual cards/sections:
 *   <ErrorBoundary variant="inline">
 *     <DataCard />
 *   </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children:    ReactNode;
  fallback?:   ReactNode;
  /** 'page' = full-height centered UI (default); 'inline' = compact card-sized error */
  variant?:    'page' | 'inline';
  /** Called when an error is caught — use for Sentry.captureException etc. */
  onError?:    (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Always log to console in dev; in prod this goes to Sentry via logger
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }

    // Capture in Sentry if available (loaded via instrumentation-client.ts)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      try {
        // Dynamic require so Sentry is tree-shaken when not installed
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sentry = require('@sentry/nextjs') as typeof import('@sentry/nextjs');
        Sentry.withScope((scope) => {
          scope.setExtra('componentStack', info.componentStack);
          Sentry.captureException(error);
        });
      } catch { /* Sentry not installed — safe to ignore */ }
    }

    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback)  return this.props.fallback;

    const { variant = 'page' } = this.props;

    if (variant === 'inline') {
      return (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm">
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
          <span className="flex-1 text-red-700 dark:text-red-400">
            {this.state.error?.message ?? 'Something went wrong'}
          </span>
          <button
            onClick={this.handleReset}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-700 transition-colors text-xs font-medium"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          An unexpected error occurred in this section.
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <span className="block mt-2 font-mono text-xs text-red-500 text-left break-all">
              {this.state.error.message}
            </span>
          )}
        </p>
        <button
          onClick={this.handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
