import React, { useState } from 'react';
import { DeliveryNoteView } from './DeliveryNoteView';
import { useSync } from '../../../context/SyncContext';
import { useGlobalContext } from '../../../context/GlobalContext';

interface OrdersViewProps {
    orders: any[];
    setOrders: React.Dispatch<React.SetStateAction<any[]>>;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, setOrders }) => {
    const { isOnline, addToSyncQueue } = useSync();
    const { apiFetch } = useGlobalContext();
    const [selectedOrderForFinish, setSelectedOrderForFinish] = useState<any | null>(null);

    const handleUpdateOrderStatus = async (orderId: string, status: string, deliveryNoteData?: any) => {
        try {
            const body: any = { status };
            if (deliveryNoteData) {
                body.incidents = deliveryNoteData.notes;
                body.delivery_note_url = deliveryNoteData.signature;
                body.delivery_note_data = deliveryNoteData;
            }

            if (!isOnline) {
                console.log("ZERAIN: Offline. Guardando cambio de estado en cola...");
                addToSyncQueue({
                    endpoint: `/orders/${orderId}/status`,
                    method: 'POST',
                    body,
                    type: 'DELIVERY_NOTE'
                });
                alert("📋 Estado guardado localmente (Offline). Se enviará al servidor al recuperar cobertura.");
                setOrders((prev: any[]) => prev.map(o => o.id === orderId ? { ...o, status, ...body } : o));
                setSelectedOrderForFinish(null);
                return;
            }

            const res = await apiFetch(`/orders/${orderId}/status`, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setOrders((prev: any[]) => prev.map(o => o.id === orderId ? { ...o, status, ...body } : o));
                setSelectedOrderForFinish(null);
            }
        } catch (e) {
            console.error("Error updating status", e);
            alert("❌ Error de red. El cambio se guardará localmente.");
            addToSyncQueue({
                endpoint: `/orders/${orderId}/status`,
                method: 'POST',
                body: { status, ...deliveryNoteData },
                type: 'DELIVERY_NOTE'
            });
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'COMPLETED': return { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-500', icon: 'bg-slate-200' };
            case 'IN_PROGRESS': return { border: 'border-amber-400', bg: 'bg-amber-50/50', text: 'text-amber-700', icon: 'bg-amber-100' };
            default: return { border: 'border-blue-400', bg: 'bg-blue-50/30', text: 'text-blue-700', icon: 'bg-blue-100' };
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans px-4 pt-6">
            {/* Header Section */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-lg shadow-indigo-500/50"></span>
                        Hoja de Ruta Diaria
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Asignaciones para hoy</p>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tight">
                    {orders.length} {orders.length === 1 ? 'Trabajo' : 'Trabajos'}
                </div>
            </div>

            <div className="space-y-6">
                {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-center border border-slate-100">
                        <div className="text-5xl mb-6">🚚</div>
                        <h3 className="text-[#004481] font-black uppercase text-base mb-2">Sin trabajos hoy</h3>
                        <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">No hay pedidos planificados para esta fecha para tu vehículo.</p>
                    </div>
                ) : (
                    orders.map((order) => {
                        const style = getStatusStyle(order.status);
                        const isFinished = order.status === 'COMPLETED';
                        const isInProgress = order.status === 'IN_PROGRESS';

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-t-4 ${style.border} transition-all duration-300 ${isFinished ? 'opacity-70 grayscale-[0.3]' : 'scale-[1.01]'}`}
                            >
                                {/* CARD HEADER: Client & Display ID */}
                                <div className="p-5 pb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.odoo_name || order.display_id || 'ORD-000'}</span>
                                            <h4 className="text-[#004481] font-black text-[17px] leading-tight tracking-tight uppercase">{order.client_name || 'Cliente Sin Nombre'}</h4>
                                        </div>
                                        <div className={`${style.bg} ${style.text} text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-sm border border-black/5 ${isInProgress ? 'animate-pulse' : ''}`}>
                                            {order.status === 'IN_PROGRESS' ? '• EN CURSO' : order.status === 'COMPLETED' ? '✓ FINALIZADO' : '○ PENDIENTE'}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed mt-2 italic">
                                        "{order.description || 'Sin descripción del trabajo'}"
                                    </p>
                                </div>

                                {/* CARD BODY: Technical & Route info */}
                                <div className="px-5 pb-5">
                                    {/* TECHNICAL SPECS (PILLS style) */}
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {order.requires_crane && (
                                            <div className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[9px] font-black border border-blue-100 uppercase flex items-center gap-1">
                                                <span>🏗️</span> Grúa {order.load_length ? `${order.load_length}m` : ''}
                                            </div>
                                        )}
                                        {order.requires_jib && (
                                            <div className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[9px] font-black border border-indigo-100 uppercase flex items-center gap-1">
                                                <span>🖇️</span> JIB
                                            </div>
                                        )}
                                        {order.load_weight > 0 && (
                                            <div className="bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg text-[9px] font-black border border-slate-100 uppercase flex items-center gap-1">
                                                <span>⚖️</span> {order.load_weight}kg
                                            </div>
                                        )}
                                        {order.type === 'MAINTENANCE' && (
                                            <div className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg text-[9px] font-black border border-orange-100 uppercase flex items-center gap-1">
                                                <span>🔧</span> MANTENIMIENTO
                                            </div>
                                        )}
                                    </div>

                                    {/* ROUTE SEGMENTS (Boxes style from planning) */}
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        {/* APROXIMACIÓN */}
                                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex flex-col justify-between group">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                                    <span className="text-[10px]">📍</span>
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Aproximación</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-600 line-clamp-2 leading-tight mb-2">
                                                    {order.previous_location || 'Base / Zerain'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded leading-none">
                                                    {order.km_to_origin || 0} km
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{order.prep_duration_minutes || 0}'</span>
                                            </div>
                                        </div>

                                        {/* TRANSPORTE */}
                                        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                                    <span className="text-[10px]">🏁</span>
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Transporte</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-tight mb-2">
                                                    {order.destination_address || 'Sin destino'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded leading-none">
                                                    {order.km || 0} km
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{order.driving_duration_minutes || 0}'</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* QUICK ACTION BUTTONS (Map / Phone) */}
                                    <div className="grid grid-cols-2 gap-3 mb-1">
                                        <button
                                            onClick={() => order.client_phone ? window.open(`tel:${order.client_phone}`) : alert('Teléfono no disponible')}
                                            className="flex items-center justify-center gap-2 bg-white border-2 border-slate-100 text-slate-600 py-3 rounded-xl font-black text-[11px] uppercase active:scale-95 transition-all shadow-sm"
                                            disabled={!order.client_phone}
                                        >
                                            <span className="text-lg">📞</span> Llamar
                                        </button>
                                        <button
                                            onClick={() => order.destination_address ? window.open(`http://maps.google.com/?q=${order.destination_address}`) : alert('Dirección no disponible')}
                                            className="flex items-center justify-center gap-2 bg-white border-2 border-slate-100 text-slate-600 py-3 rounded-xl font-black text-[11px] uppercase active:scale-95 transition-all shadow-sm"
                                            disabled={!order.destination_address}
                                        >
                                            <span className="text-lg">🗺️</span> Mapa
                                        </button>
                                    </div>
                                </div>

                                {/* MAIN STATE ACTION (Footer Button) */}
                                {!isFinished && (
                                    <div className="p-4 pt-0">
                                        {order.status === 'PLANNED' && (
                                            <button
                                                onClick={() => handleUpdateOrderStatus(order.id, 'IN_PROGRESS')}
                                                className="w-full bg-[#f4b400] text-black border-b-4 border-[#d39e00] font-black py-4 rounded-xl text-xs uppercase shadow-md active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-2"
                                            >
                                                ▶ Iniciar Viaje
                                            </button>
                                        )}
                                        {order.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => setSelectedOrderForFinish(order)}
                                                className="w-full bg-[#004481] text-white border-b-4 border-blue-900 font-black py-4 rounded-xl text-xs uppercase shadow-lg shadow-blue-900/20 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-2"
                                            >
                                                ✓ Finalizar y Albarán
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {selectedOrderForFinish && (
                <DeliveryNoteView
                    order={selectedOrderForFinish}
                    onClose={() => setSelectedOrderForFinish(null)}
                    onConfirm={(data) => handleUpdateOrderStatus(selectedOrderForFinish.id, 'COMPLETED', data)}
                />
            )}
        </div>
    );
};
