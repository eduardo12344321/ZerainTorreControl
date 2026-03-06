import React from 'react';
import type { Order } from '../../types';

interface OrderDetailsModalProps {
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onGoToOdoo: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, isOpen, onClose, onGoToOdoo }) => {
    if (!isOpen || !order) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
            case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount?: number) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-1">
                                Detalle Pedido #{order.odoo_id || order.display_id || order.id}
                            </h2>
                            <p className="text-sm text-gray-500 font-bold">{order.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                            {order.status}
                        </span>
                        {order.invoice_status && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Facturación: {order.invoice_status}
                            </span>
                        )}
                        {order.referencia_cliente && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                Ref: {order.referencia_cliente}
                            </span>
                        )}
                    </div>


                    {/* Notes - Moved Up */}
                    {order.notas && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                📝 Notas y Observaciones
                            </h4>
                            <div
                                className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 text-[10px] text-gray-600 leading-relaxed max-h-32 overflow-y-auto italic shadow-inner"
                                dangerouslySetInnerHTML={{ __html: order.notas }}
                            />
                        </div>
                    )}

                    {/* Section 1: Operativo */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            📍 Datos Operativos
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-[8px] uppercase text-gray-400 font-black block mb-1">Fecha</span>
                                <span className="text-[10px] font-bold text-gray-900">{formatDate(order.scheduled_start)}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-[8px] uppercase text-gray-400 font-black block mb-1">Hora</span>
                                <span className="text-[10px] font-bold text-gray-900">{order.scheduled_start ? new Date(order.scheduled_start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-[8px] uppercase text-gray-400 font-black block mb-1">Pedido Odoo</span>
                                <span className="text-[10px] font-mono font-bold text-gray-900">{order.description}</span>
                            </div>
                            <div className="col-span-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-[8px] uppercase text-gray-400 font-black block mb-1">Origen</span>
                                <span className="text-[10px] font-bold text-gray-900 truncate block">{order.origin_address || '-'}</span>
                            </div>
                            <div className="col-span-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-[8px] uppercase text-gray-400 font-black block mb-1">Destino</span>
                                <span className="text-[10px] font-bold text-gray-900 truncate block">{order.destination_address || '-'}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-[8px] uppercase text-gray-400 font-black block mb-1">Vendedor</span>
                                <span className="text-[10px] font-bold text-gray-900">{order.vendedor || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Carga y Camión */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            📦 Detalles de Carga
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100">
                                <span className="text-[8px] uppercase text-indigo-400 font-black block mb-1">Peso</span>
                                <span className="text-[10px] font-bold text-indigo-900">{order.load_weight ? `${order.load_weight}kg` : '-'}</span>
                            </div>
                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100">
                                <span className="text-[8px] uppercase text-indigo-400 font-black block mb-1">Largo</span>
                                <span className="text-[10px] font-bold text-indigo-900">{order.load_length ? `${order.load_length}m` : '-'}</span>
                            </div>
                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100">
                                <span className="text-[8px] uppercase text-indigo-400 font-black block mb-1">Grúa</span>
                                <span className="text-[10px] font-bold text-indigo-900">{order.requires_crane ? 'SÍ' : 'NO'}</span>
                            </div>
                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100 min-w-[200px]">
                                <span className="text-[8px] uppercase text-indigo-400 font-black block mb-1">Accesorios</span>
                                {/* Accessories Logic */}
                                {(() => {
                                    let accs: string[] = [];
                                    const raw = (order as any).accessories;
                                    let list: any[] = [];
                                    if (Array.isArray(raw)) list = raw;
                                    else if (typeof raw === 'string') {
                                        if ((raw as string).trim().startsWith('[')) {
                                            try {
                                                const jsonStr = (raw as string).replace(/'/g, '"');
                                                list = JSON.parse(jsonStr);
                                            } catch { list = [raw]; }
                                        } else { list = [raw]; }
                                    }
                                    accs = list.flatMap(item => {
                                        if (typeof item === 'string' && item.trim().startsWith('[')) {
                                            try { return JSON.parse(item.replace(/'/g, '"')); } catch { return item; }
                                        }
                                        return String(item);
                                    });
                                    const uniqueAccs = Array.from(new Set(accs)).filter(Boolean);

                                    if (uniqueAccs.length === 0) return <span className="text-[10px] font-bold text-indigo-900 truncate block">-</span>;

                                    return (
                                        <div className="flex flex-wrap gap-1">
                                            {uniqueAccs.slice(0, 3).map((acc: string, idx: number) => (
                                                <span key={`${acc}-${idx}`} className="px-1 py-0.5 bg-white border border-indigo-200 text-indigo-700 text-[8px] font-bold rounded">
                                                    {acc}
                                                </span>
                                            ))}
                                            {uniqueAccs.length > 3 && <span className="text-[8px] text-indigo-500">+{uniqueAccs.length - 3}</span>}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Tiempos y Distancias */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                                ⏱️ Tiempos y Distancias
                            </h4>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="bg-orange-50/30 p-2 rounded-lg border border-orange-100 text-center">
                                    <span className="text-[7px] uppercase text-orange-400 font-black block">KM Origen</span>
                                    <span className="text-[10px] font-bold text-orange-900">{order.km_to_origin || 0} km</span>
                                </div>
                                <div className="bg-orange-50/30 p-2 rounded-lg border border-orange-100 text-center">
                                    <span className="text-[7px] uppercase text-orange-400 font-black block">KM Viaje</span>
                                    <span className="text-[10px] font-bold text-orange-900">{order.km || 0} km</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-orange-50/30 p-2 rounded-lg border border-orange-100 text-center">
                                    <span className="text-[7px] uppercase text-orange-400 font-black block">Prep</span>
                                    <span className="text-[10px] font-bold text-orange-900">{order.prep_duration_minutes || 0}</span>
                                </div>
                                <div className="bg-orange-50/30 p-2 rounded-lg border border-orange-100 text-center">
                                    <span className="text-[7px] uppercase text-orange-400 font-black block">Viaje</span>
                                    <span className="text-[10px] font-bold text-orange-900">{order.driving_duration_minutes || 0}</span>
                                </div>
                                <div className="bg-orange-50/30 p-2 rounded-lg border border-orange-100 text-center">
                                    <span className="text-[7px] uppercase text-orange-400 font-black block">Trabajo</span>
                                    <span className="text-[10px] font-bold text-orange-900">{order.work_duration_minutes || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                💶 Resumen Económico
                            </h4>
                            <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100 flex justify-between items-center h-[54px]">
                                <div>
                                    <span className="text-[8px] uppercase text-emerald-400 font-black block">Total</span>
                                    <span className="text-sm font-black text-emerald-900">{formatCurrency(order.amount_total)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] uppercase text-emerald-400 font-black block">IVA</span>
                                    <span className="text-[10px] font-bold text-emerald-700">{formatCurrency(order.amount_tax)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between items-center text-[8px] text-gray-400 font-bold px-1">
                        <div className="flex gap-4">
                            <span>TERMINOS: {order.terminos_pago || 'estándar'}</span>
                            <span>ODOO STATE: {order.odoo_state}</span>
                        </div>
                        <span>ID LOCAL: {order.id}</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col gap-3">
                    <div className="flex gap-3">
                        <button
                            onClick={onGoToOdoo}
                            className="flex-1 bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-2xl font-black uppercase tracking-wider hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs"
                        >
                            <span>📉</span> Listado App
                        </button>
                        <button
                            onClick={() => window.open(`https://transporteszerain.odoo.com/web#id=${order.id}&model=sale.order&view_type=form`, '_blank')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Ver en Odoo ↗️
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
