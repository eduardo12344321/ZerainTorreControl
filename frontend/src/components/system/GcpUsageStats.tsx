import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';

interface UsageSummary {
    service: string;
    count: number;
    total_cost: number;
}

interface UsageHistory {
    id: number;
    service: string;
    request_type: string;
    timestamp: string;
    cost_est: number;
}

export const GcpUsageStats: React.FC = () => {
    const { apiFetch } = useGlobalContext();
    const [summary, setSummary] = useState<UsageSummary[]>([]);
    const [history, setHistory] = useState<UsageHistory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await apiFetch('/admin/gcp-usage');
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary);
                setHistory(data.history);
            }
        } catch (err) {
            console.error("Error fetching usage data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s
        return () => clearInterval(interval);
    }, []);

    const totalCost = summary.reduce((acc, s) => acc + s.total_cost, 0);

    const serviceIcons: Record<string, string> = {
        'MAPS_SUGGEST': '🔍',
        'MAPS_DISTANCE': '📏',
        'VERTEX_OCR': '📄',
    };

    const serviceNames: Record<string, string> = {
        'MAPS_SUGGEST': 'Google Maps Autocomplete',
        'MAPS_DISTANCE': 'Google Maps Distance Matrix',
        'VERTEX_OCR': 'Vertex AI (Gemini OCR)',
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gasto Total Acumulado</span>
                    <div className="mt-4">
                        <span className="text-4xl font-black">{totalCost.toFixed(3)}€</span>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Estimación Basada en Cuotas Google</div>
                    </div>
                </div>

                {summary.map(s => (
                    <div key={s.service} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <span className="text-2xl">{serviceIcons[s.service] || '⚙️'}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.count} Peticiones</span>
                        </div>
                        <div className="mt-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase truncate mb-1">{serviceNames[s.service] || s.service}</h4>
                            <span className="text-2xl font-black text-slate-800">{s.total_cost.toFixed(3)}€</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Historial de Consumo (Últimas 50)</h3>
                    <button
                        onClick={fetchData}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase"
                    >
                        Actualizar 🔄
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha / Hora</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Servicio</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Detalle de Operación</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Coste Est.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                        {new Date(item.timestamp).toLocaleString('es-ES')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{serviceIcons[item.service]}</span>
                                            <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{item.service}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                                        {item.request_type}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-black text-slate-800 text-right">
                                        {item.cost_est.toFixed(3)}€
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                                        No hay datos de consumo registrados todavía.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
