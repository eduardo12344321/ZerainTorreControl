import React from 'react';
import type { Order } from '../../types';
import { OrderCard } from '../timeline/OrderCard';

interface InboxProps {
    orders: Order[];
    onOrderClick?: (order: Order) => void;
    onOrderDoubleClick?: (order: Order) => void;
    onCreateOrder?: (clientName?: string) => void;
    onOrderUnplan?: (orderId: string) => void;
}

export const Inbox: React.FC<InboxProps> = ({ orders, onOrderClick, onOrderDoubleClick, onCreateOrder, onOrderUnplan }) => {
    // Unified Filter: Show DRAFT, ANALYZING, and PLANNED orders.
    // We differentiate those that are ALREADY in a truck (planned) VS those that are "missing" (inbox/draft).
    const filteredOrders = orders
        .filter(o =>
            !['COMPLETED', 'CANCELLED', 'PAID', 'INCIDENT'].includes(o.status) &&
            o.type !== 'MEAL' &&
            o.type !== 'MAINTENANCE'
        )
        .sort((a, b) => {
            const aPlanned = !!a.truck_id;
            const bPlanned = !!b.truck_id;

            // 1st Priority: Unplanned (Not in panel) first
            if (!aPlanned && bPlanned) return -1;
            if (aPlanned && !bPlanned) return 1;

            // 2nd Priority: Urgent (priority) first
            if (a.priority && !b.priority) return -1;
            if (!a.priority && b.priority) return 1;

            // 3rd Priority: Status (DRAFT > ANALYZING > PLANNED)
            const statusRank: Record<string, number> = { 'DRAFT': 0, 'ANALYZING': 1, 'PLANNED': 2 };
            return (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3);
        });

    const unplannedCount = filteredOrders.filter(o => !o.truck_id).length;

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'ORDER' && data.orderId && onOrderUnplan) {
                onOrderUnplan(data.orderId);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <aside
            className="h-full bg-white rounded-lg shadow-md border-2 border-gray-200 flex flex-col overflow-hidden w-full transition-colors hover:bg-blue-50/30"
            onDrop={handleDrop}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
        >
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-700">Explorador</h2>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Pendientes</span>
                        <span className="text-xl font-black text-red-600 leading-tight">
                            {unplannedCount}
                        </span>
                    </div>
                    <div className="h-4 w-px bg-gray-200 mx-1"></div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Total</span>
                        <span className="text-lg font-black text-gray-600 leading-tight">
                            {filteredOrders.length}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">

                    {onCreateOrder && (
                        <button
                            onClick={() => onCreateOrder()}
                            className="p-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 shadow-sm transition-all hover:scale-105 active:scale-95"
                            title="Crear Nuevo Pedido"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-3 bg-gray-50/50 space-y-1">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            variant="inbox"
                            pixelsPerHour={60} // 1 hour = 60px
                            onClick={() => {
                                console.log('OrderCard: Clicked', order.id);
                                if (onOrderClick) onOrderClick(order);
                            }}
                            onDoubleClick={() => onOrderDoubleClick && onOrderDoubleClick(order)}
                        />
                    ))
                ) : (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        No hay pedidos pendientes
                    </div>
                )}
            </div>
            <div className="p-3 border-t border-gray-100 bg-white text-xs text-gray-400 text-center">
                Arrastra al calendario o suelta aquí para desplanificar
            </div>
        </aside>
    );
};
