import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config';

interface Item {
    name: string;
    qty: number;
    price: number;
    type?: 'product' | 'section' | 'note';
}

interface TransportDetails {
    origin: string;
    dest: string;
    plate: string;
    driver: string;
    load: string;
    notes: string;
    date: string;
}

interface Budget {
    id: string;
    odoo_name: string;
    client_name: string;
    amount_total: number;
    date_order: string;
    phase: 'BORRADOR' | 'APROBADO' | 'FINALIZADO' | 'CANCELADO';
    details: TransportDetails;
    items: Item[];
}

export const PresupuestosPage: React.FC = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'BORRADOR' | 'APROBADO' | 'FINALIZADO' | 'CANCELADO'>('ALL');

    useEffect(() => {
        fetchBudgets();
    }, []);

    const fetchBudgets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE}/odoo/budgets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setBudgets(data);
                if (data.length > 0 && !selectedBudget) {
                    setSelectedBudget(data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching budgets:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPhaseStyle = (phase: Budget['phase']) => {
        const styles: Record<Budget['phase'], string> = {
            BORRADOR: 'bg-slate-100 text-slate-600 border-slate-200',
            APROBADO: 'bg-amber-100 text-amber-700 border-amber-200',
            FINALIZADO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            CANCELADO: 'bg-red-100 text-red-700 border-red-200'
        };
        return styles[phase] || styles.BORRADOR;
    };

    const filteredBudgets = budgets.filter(b => filter === 'ALL' || b.phase === filter);

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* List Side (Left) - NARROWER & FIXED */}
            <div className="w-80 flex flex-col border-r border-gray-200 bg-gray-50 flex-shrink-0 z-10 shadow-xl">
                <div className="sticky top-0 z-20 p-4 border-b border-gray-200 bg-white shadow-sm">
                    <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2 mb-4">
                        <span className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm text-sm">📉</span>
                        Presupuestos
                    </h1>
                    <div className="flex flex-wrap gap-1">
                        {(['ALL', 'BORRADOR', 'APROBADO'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`
                                    px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex-grow text-center
                                    ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                                `}
                            >
                                {f === 'ALL' ? 'Todos' : f.substring(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-[10px] font-bold">Cargando...</p>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto scrollbar-hide p-2 space-y-2">
                        {filteredBudgets.map(budget => (
                            <div
                                key={budget.id}
                                onClick={() => setSelectedBudget(budget)}
                                className={`
                                    cursor-pointer p-3 rounded-xl border transition-all group relative overflow-hidden
                                    ${selectedBudget?.id === budget.id
                                        ? 'bg-white border-blue-600 shadow-md transform scale-[1.02]'
                                        : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm'}
                                `}
                            >
                                {selectedBudget?.id === budget.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                                )}
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black text-gray-900">{budget.odoo_name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getPhaseStyle(budget.phase)}`}>
                                        {budget.phase}
                                    </span>
                                </div>
                                <div className="text-[10px] text-gray-500 font-bold truncate mb-1">
                                    {budget.client_name}
                                </div>
                                <div className="text-right text-xs font-black text-gray-900">
                                    {budget.amount_total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Visualizer Side (Right) - GROWS & ELEGANT TEXT */}
            <div className="flex-grow bg-white flex flex-col relative overflow-hidden">
                {selectedBudget ? (
                    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-300">
                        {/* Header Toolbar (STICKY) */}
                        <div className="sticky top-0 z-20 flex justify-between items-center p-6 border-b border-gray-100 bg-white/95 backdrop-blur-md shadow-sm">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedBudget.odoo_name}</h2>
                                <p className="text-sm font-bold text-gray-400">{selectedBudget.client_name}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right mr-4">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</div>
                                    <div className="text-2xl font-black text-gray-900">
                                        {selectedBudget.amount_total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(`https://transporteszerain.odoo.com/web#id=${selectedBudget.id}&model=sale.order&view_type=form`, '_blank')}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
                                >
                                    Ver en Odoo ↗
                                </button>
                            </div>
                        </div>

                        {/* Document Body - Scrollable */}
                        <div className="flex-grow overflow-y-auto p-8 md:p-12 lg:p-16 bg-gray-50/50">
                            <div className="max-w-4xl mx-auto bg-white shadow-xl shadow-gray-200/50 rounded-2xl min-h-[600px] p-10 border border-gray-100">

                                {/* Header / Doc Info */}
                                <div className="flex justify-between border-b-2 border-gray-100 pb-8 mb-8">
                                    <div className="w-1/2">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente</div>
                                        <div className="text-lg font-bold text-gray-900">{selectedBudget.client_name}</div>
                                        {selectedBudget.details.date && (
                                            <div className="mt-4">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha Operativo</div>
                                                <div className="text-sm font-bold text-gray-700">{selectedBudget.details.date}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-1/2 text-right">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Estado</div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${getPhaseStyle(selectedBudget.phase)}`}>
                                            {selectedBudget.phase}
                                        </span>
                                    </div>
                                </div>

                                {/* Items List - Elegant Text Mode */}
                                <div className="space-y-4 font-serif text-gray-800">
                                    {/* Using font-serif (if available) or standard sans for document feel? sticking to sans for consistency but cleaner */}
                                    <div className="font-sans">
                                        {selectedBudget.items.map((item, idx) => {
                                            // RENDER SECTION
                                            if (item.type === 'section') {
                                                return (
                                                    <div key={idx} className="mt-8 mb-4 border-b-2 border-blue-600 pb-2">
                                                        <h3 className="text-lg font-black text-blue-900 uppercase tracking-wide">
                                                            {item.name}
                                                        </h3>
                                                    </div>
                                                );
                                            }
                                            // RENDER NOTE
                                            if (item.type === 'note') {
                                                return (
                                                    <div key={idx} className="pl-4 border-l-2 border-indigo-200 py-1 my-2 text-sm italic text-gray-500 bg-indigo-50/30 rounded-r-lg">
                                                        {item.name}
                                                    </div>
                                                );
                                            }
                                            // RENDER PRODUCT
                                            return (
                                                <div key={idx} className="flex justify-between items-baseline py-3 border-b border-dashed border-gray-100 hover:bg-gray-50 px-2 rounded-lg transition-colors group">
                                                    <div className="flex-grow pr-8">
                                                        <span className="text-sm font-medium text-gray-700 leading-relaxed block">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex-shrink-0 text-right min-w-[120px]">
                                                        {item.qty > 0 && (
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                                                                {item.qty} x {item.price.toLocaleString('es-ES')}€
                                                            </div>
                                                        )}
                                                        <div className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                                                            {(item.qty * item.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Footer Total */}
                                <div className="mt-12 pt-8 border-t-2 border-gray-100 flex justify-end">
                                    <div className="text-right">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest mr-4">Total Presupuestado</span>
                                        <span className="text-3xl font-black text-gray-900">
                                            {selectedBudget.amount_total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Optional: Minimal Footer Info */}
                            <div className="max-w-4xl mx-auto mt-8 text-center text-[10px] text-gray-300 uppercase tracking-widest font-black">
                                Documento generado desde Odoo • Torre de Control
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gray-50/50">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl shadow-gray-200 border-4 border-white">
                            👀
                        </div>
                        <h3 className="text-xl font-black text-gray-400">Selecciona un presupuesto</h3>
                        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                            Explora los detalles completos del presupuesto seleccionando uno de la lista lateral.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
