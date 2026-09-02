import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'An unexpected error occurred.' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              We encountered an issue processing that action. Your inventory items in storage are safe.
            </p>
            {this.state.errorMessage && (
              <div className="bg-slate-50 p-3 rounded-xl text-left text-[11px] font-mono text-slate-600 mb-6 overflow-x-auto max-h-24 border border-slate-200">
                {this.state.errorMessage}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                <FaHome size={13} /> Try Again
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all"
              >
                <FaRedo size={12} /> Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
