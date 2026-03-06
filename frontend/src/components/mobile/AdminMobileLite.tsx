import React, { useState } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { CreateOrderModal } from '../modals/CreateOrderModal';
import type { Order } from '../../types';

export const AdminMobileLite: React.FC = () => {
    const { orders, trucks, drivers, addOrder } = useGlobalContext();
    const [filter, setFilter] = useState<'ALL' | 'IN_PROGRESS' | 'INCIDENT' | 'PLANNED' | 'DRAFT'>('ALL');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const filteredOrders = orders.filter(o => {
        if (filter === 'ALL') return true;
        return o.status === filter;
    }).sort((a, b) => (b.scheduled_start || '').localeCompare(a.scheduled_start || ''));

    const counts = {
        IN_PROGRESS: orders.filter(o => o.status === 'IN_PROGRESS').length,
        INCIDENT: orders.filter(o => o.status === 'INCIDENT').length,
        PLANNED: orders.filter(o => o.status === 'PLANNED').length,
    };

    const handleConfirmCreateOrder = async (data: any) => {
        const newOrder: Order = {
            id: `ord-${Date.now()}`,
            display_id: 0,
            client_id: 'unknown',
            truck_id: data.truck_id,
            driver_id: data.driver_id,
            client_name: data.client_name,
            origin_address: data.origin_address,
            destination_address: data.destination_address,
            scheduled_start: new Date().toISOString(),
            estimated_duration: (data.prep_duration_minutes || 0) + (data.driving_duration_minutes || 0) + (data.work_duration_minutes || 60),
            description: data.description,
            status: data.status,
            priority: false
        };
        await addOrder(newOrder);
        setIsCreateOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden relative">
            {/* Status Pills */}
            <div className="bg-white px-4 pt-3 pb-2 border-b border-gray-100 shadow-sm shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { id: 'ALL', label: 'Todos', color: 'bg-gray-100 text-gray-600' },
                        { id: 'IN_PROGRESS', label: `En ruta (${counts.IN_PROGRESS})`, color: 'bg-purple-100 text-purple-700' },
                        { id: 'INCIDENT', label: `Incidencias (${counts.INCIDENT})`, color: 'bg-orange-100 text-orange-700' },
                        { id: 'PLANNED', label: `Aprobados (${counts.PLANNED})`, color: 'bg-blue-100 text-blue-700' },
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => setFilter(btn.id as any)}
                            className={`
                                whitespace-nowrap px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border
                                ${filter === btn.id ? `${btn.color} border-current shadow-sm scale-105` : 'bg-white text-gray-400 border-gray-200'}
                            `}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Feed */}
            <div className="flex-grow overflow-y-auto px-4 py-4 space-y-4 pb-24">
                {filteredOrders.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-center animate-in fade-in duration-500">
                        <span className="text-4xl mb-2">🔭</span>
                        <p className="text-sm font-bold uppercase tracking-widest">Sin pedidos en esta vista</p>
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order.id} className="relative group animate-in slide-in-from-bottom-4 duration-300">
                            {/* Simplificamos el card para móvil */}
                            <div className={`p-4 rounded-xl border-l-4 shadow-md bg-white ${order.status === 'INCIDENT' ? 'border-orange-500' :
                                order.status === 'IN_PROGRESS' ? 'border-purple-600' :
                                    order.status === 'COMPLETED' ? 'border-green-600' : 'border-blue-700'
                                }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">#{order.display_id || '---'}</span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${order.status === 'INCIDENT' ? 'bg-orange-100 text-orange-700' :
                                        order.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                                            order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                                <h4 className="font-black text-gray-800 leading-tight mb-1">{order.client_name}</h4>
                                <p className="text-[10px] text-gray-500 font-medium mb-3 line-clamp-1 italic">{order.description}</p>

                                <div className="space-y-1 b-t pt-2 border-t border-gray-50">
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <span className="text-blue-500">📍</span>
                                        <span className="text-gray-600 font-bold truncate">{order.origin_address}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <span className="text-red-500">🏁</span>
                                        <span className="text-gray-600 font-bold truncate">{order.destination_address}</span>
                                    </div>
                                </div>

                                {order.driver_id && (
                                    <div className="mt-4 flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">👤</div>
                                            <span className="text-[10px] font-black text-gray-700">{drivers.find(d => d.id.toString() === order.driver_id?.toString())?.name || 'Asignado'}</span>
                                        </div>
                                        {order.truck_id && <span className="text-[8px] font-black bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-mono tracking-tighter">{trucks.find(t => t.id === order.truck_id)?.plate}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Quick Create Floating Button */}
            <button
                onClick={() => setIsCreateOpen(true)}
                className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-4xl active:scale-90 transition-transform active:bg-blue-700 border-4 border-white ring-4 ring-blue-600/20"
            >
                +
            </button>

            <CreateOrderModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onConfirm={handleConfirmCreateOrder}
            />
        </div>
    );
};
