import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="h-screen w-screen flex items-center justify-center bg-red-50 p-8">
                    <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border-2 border-red-100 flex flex-col items-center text-center">
                        <span className="text-6xl mb-6">⚠️</span>
                        <h2 className="text-2xl font-black text-gray-800 mb-2 uppercase tracking-tight">Error de Interfaz</h2>
                        <p className="text-gray-500 text-sm mb-6 font-medium">
                            Se ha producido un error crítico en esta pestaña. Por favor, intenta recargar la página.
                        </p>
                        <div className="w-full bg-gray-50 p-4 rounded-xl mb-6 overflow-hidden">
                            <p className="text-[10px] font-mono text-red-600 break-words line-clamp-3">
                                {this.state.error?.message}
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black transition-all active:scale-95 shadow-lg shadow-red-200"
                        >
                            RECARGAR APLICACIÓN
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
