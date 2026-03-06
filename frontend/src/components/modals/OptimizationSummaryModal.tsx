import React from 'react';

interface Combination {
    names: string[];
    duration: number;
    distance: number;
}

interface OptimizationSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        optimized_count: number;
        total_distance_km: number;
        combinations: Combination[];
        summary?: {
            best_km: number;
            worst_km: number;
            difference_km: number;
            time_saved_mins: number;
        }
    } | null;
}

export const OptimizationSummaryModal: React.FC<OptimizationSummaryModalProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Inteligencia de Rutas</h2>
                                <h1 className="text-3xl font-black tracking-tight">Optimización Completada</h1>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Se han analizado todas las combinaciones posibles para {data.optimized_count ?? 0} pedidos.</p>
                    </div>
                </div>

                <div className="p-8">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mejor Opción</div>
                            <div className="text-2xl font-black text-slate-900">{data.summary?.best_km ?? 0}<span className="text-xs ml-1 text-slate-500">km</span></div>
                        </div>
                        <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100">
                            <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Ahorro Máximo</div>
                            <div className="text-2xl font-black text-blue-600">-{data.summary?.difference_km ?? 0}<span className="text-xs ml-1 opacity-70">km</span></div>
                        </div>
                        <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
                            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Tiempo Ganado</div>
                            <div className="text-2xl font-black text-indigo-600">{data.summary?.time_saved_mins ?? 0}<span className="text-xs ml-1 opacity-70">min</span></div>
                        </div>
                    </div>

                    {/* Combinations List */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Análisis de Combinaciones</h3>
                        {data.combinations?.map((combo, idx) => (
                            <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${idx === 0 ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {combo.names.map((name, i) => (
                                            <React.Fragment key={i}>
                                                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]" title={name}>{name}</span>
                                                {i < combo.names.length - 1 && <span className="text-slate-300 text-[10px]">➜</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-xs font-black text-slate-900">{combo.distance} km</div>
                                    <div className="text-[10px] font-bold text-slate-400">{combo.duration} min</div>
                                </div>
                                {idx === 0 && (
                                    <div className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter">
                                        Elegida
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-8 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                    >
                        Entendido, cerrar análisis
                    </button>
                </div>
            </div>
        </div>
    );
};
