import React from 'react';
import type { Truck } from '../../types';
import { useDragContext } from '../../context/DragContext';

interface TruckRowProps {
    truck: Truck;
    children?: React.ReactNode;
    className?: string;
    onDrop?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onOptimize?: () => void;
}

export const TruckRow: React.FC<TruckRowProps> = ({ truck, children, className = '', onDrop, onDragOver, onOptimize }) => {
    const { draggedOrder } = useDragContext();

    // Compatibility check
    const isCompatible = React.useMemo(() => {
        if (!draggedOrder) return true;

        // 1. Crane Check
        if (draggedOrder.requires_crane && !truck.has_crane) return false;

        // 2. Weight Check (DB is Kg, Order is Kg)
        const truckMaxWeightKg = (truck.max_weight || 0);
        if (truckMaxWeightKg > 0 && (draggedOrder.load_weight || 0) > truckMaxWeightKg) return false;

        // 3. Length Check
        if (truck.max_length && (draggedOrder.load_length || 0) > truck.max_length) return false;

        return true;
    }, [draggedOrder, truck]);

    const isITVExpired = React.useMemo(() => {
        if (!truck.itv_expiration) return false;
        const expiry = new Date(truck.itv_expiration);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiry < today;
    }, [truck.itv_expiration]);

    // Highlight if compatible (and something is being dragged)
    const highlight = draggedOrder && isCompatible;
    // Dim if incompatible
    const dim = draggedOrder && !isCompatible;

    return (
        <div
            className={`flex border-b border-gray-100 h-16 transition-all duration-300 ${className} ${dim ? 'opacity-20 bg-gray-400 grayscale blur-[1px]' :
                highlight ? 'bg-blue-50/50' :
                    'hover:bg-gray-50'
                }`}
        >
            <div className={`w-56 flex-shrink-0 border-r border-gray-200 p-2 flex flex-col justify-center bg-white z-30 sticky left-0 shadow-sm transition-opacity ${dim ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-1 relative group">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                            className="font-mono font-bold text-xs p-1 rounded text-white shadow-sm border border-black/10 text-shadow-sm whitespace-nowrap"
                            style={{ backgroundColor: truck.color || '#333', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                        >
                            {truck.plate}
                        </span>

                        {/* Status Pin/Dot */}
                        <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${truck.status === 'AVAILABLE' ? 'bg-green-500' :
                            truck.status === 'BUSY' ? 'bg-yellow-400' : 'bg-red-500'
                            }`} title={`Status: ${truck.status}`} />

                        {/* Badges on the same line */}
                        {!!truck.is_box_body && <span className="text-[8px] px-1 bg-blue-100 text-blue-700 rounded border border-blue-200 font-black">CAJA</span>}
                        {!!truck.has_crane && <span className="text-[8px] px-1 bg-orange-100 text-orange-700 rounded border border-orange-200 font-black">GRÚA</span>}
                        {!!truck.has_jib && <span className="text-[8px] px-1 bg-purple-100 text-purple-700 rounded border border-purple-200 font-black">JIB</span>}
                    </div>

                    {/* Secondary Info: Alias & ITV */}
                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <div className="text-[10px] text-gray-400 font-bold truncate max-w-[80%] uppercase tracking-tighter">
                            {truck.alias}
                        </div>
                        {isITVExpired && (
                            <span className="shrink-0 px-1 rounded bg-red-600 text-white text-[8px] font-black animate-pulse">ITV</span>
                        )}

                        {/* Optimize Button (Visible on Hover) */}
                        {onOptimize && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onOptimize(); }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all scale-100 hover:scale-110 shadow-lg border border-blue-500 z-40 active:scale-95"
                                title="Optimizar Ruta"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Content: The Timeline Area */}
            <div
                className={`flex-grow relative border-2 border-gray-200 ${dim ? 'bg-gray-200' : 'bg-gray-50/50'}`}
                onDrop={(e) => {
                    console.log('TruckRow: onDrop triggered!', truck.id, 'draggedOrder:', draggedOrder?.id);
                    if (onDrop) onDrop(e);
                }}
                onDragOver={(e) => {
                    // console.log('TruckRow: onDragOver', truck.id); // Spammy
                    if (onDragOver) onDragOver(e);
                }}
                onDragEnter={() => {
                    console.log('TruckRow: onDragEnter', truck.id);
                }}
            >
                {/* Grid Lines for Hours would go here as background */}
                {children}
            </div>
        </div>
    );
};
