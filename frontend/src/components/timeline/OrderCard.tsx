import React from 'react';
import type { Order } from '../../types';
import { useGlobalContext } from '../../context/GlobalContext';
import { useDragContext } from '../../context/DragContext';

interface OrderCardProps {
    order: Order;
    pixelsPerHour?: number; // Scaling factor
    onClick?: () => void;
    onDrop?: (driverId: string) => void;
    variant?: 'timeline' | 'list' | 'inbox';
    travelMinutes?: number;
    isOverlapping?: boolean;
    isSelected?: boolean;
    onDoubleClick?: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
    order,
    pixelsPerHour = 100, // Default width for 1 hour
    onClick,
    onDrop,
    variant = 'timeline',
    travelMinutes = 0,
    isOverlapping = false,
    isSelected = false,
    onDoubleClick
}) => {
    const { setDraggedOrder, draggedOrder, draggedDriver } = useDragContext();
    const { drivers, trucks } = useGlobalContext();

    // Check if this specific order is the one being dragged
    const isBeingDragged = draggedOrder?.id === order.id;

    const dragPreviewRef = React.useRef<HTMLDivElement>(null);

    // Native HTML5 Drag Setup
    const handleDragStart = (e: React.DragEvent) => {
        console.log('OrderCard: handleDragStart', order.id, variant);
        // Set data for the drop zone
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'ORDER',
            orderId: order.id,
            // Calculate offset logic if needed (e.g. where in the card we grabbed)
            // For now simple ID is enough, or we can add offset
            offsetMinutes: 0
        }));
        e.dataTransfer.effectAllowed = 'move';

        // Update visual state
        setDraggedOrder(order);

        // Custom Drag Image (Simplified View)
        if (dragPreviewRef.current) {
            // We need to ensure the element is visible for the browser to snapshot it, 
            // but we don't want it visible in the layout.
            // Usually, absolute positioning off-screen works, but browsers differ.
            // Best trick: The element is rendered but hidden behind something or strictly for this.
            // Actually, if it's already in the DOM hidden, some browsers won't render it.
            // Let's try pointing to the *standard* rendering if variant is list/inbox, 
            // OR pointing to a specific hidden div if timeline.

            e.dataTransfer.setDragImage(dragPreviewRef.current, 0, 0);
        }
    };

    // We don't need onDrop/onDragOver here typically unless we want to nest (e.g. drop driver ON order)
    // The previous logic allowed dropping drivers onto orders. We keep that.
    const handleDragOver = (e: React.DragEvent) => {
        // If we are dragging an ORDER, we want it to bubble up to the TimelineGrid/TruckRow
        if (draggedOrder) return;

        // If dragging a DRIVER (checked via Context or assume if null order), allow drop here
        if (draggedDriver) {
            console.log('OrderCard: onDragOver (Driver)', draggedDriver); // DEBUG
            e.preventDefault();
            e.stopPropagation(); // Stop bubbling to TruckRow (which might handle order drops)
            e.dataTransfer.dropEffect = 'copy';
        } else {
            // If unknown drag (not order, not context driver), still preventDefault to allow drop from native?
            // But actually we only want to accept drivers.
            // If we don't preventDefault here, dragging a file/etc might be default handled or bubble.
            // Let's be safe: if NO draggedOrder, assume draggedDriver or external.
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        // If we are dragging an ORDER, let it bubble up
        if (draggedOrder) return;

        e.preventDefault();

        // Robust Driver Drop Logic
        let driverId: string | undefined;

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (rawData) {
                const data = JSON.parse(rawData);
                if (data.type === 'DRIVER') {
                    driverId = data.driverId;
                }
            }
        } catch (err) {
            console.warn('OrderCard: JSON parse failed for drop', err);
        }

        // Fallback to Context
        if (!driverId && draggedDriver) {
            console.log('OrderCard: Using fallback draggedDriver', draggedDriver);
            driverId = draggedDriver;
        }

        if (driverId && onDrop) {
            onDrop(driverId);
        }
    };

    // Calculate width based on duration
    const durationHours = order.estimated_duration / 60;

    // In TIMELINE mode, we want the card to fill the parent wrapper (which knows the % width).
    // In LIST mode, we might want fixed or variable width. For now, let's keep list dynamic or just full.
    // FIX: Only apply pixel width if explicitly needed for list view, otherwise 100%.
    const width = variant === 'list' ? durationHours * pixelsPerHour : undefined;

    // Travel Time Visual (Internal now)
    // const travelWidthPercent = order.estimated_duration > 0 ? (travelMinutes / order.estimated_duration) * 100 : 0;

    const baseClasses = "rounded border shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-center px-2 overflow-hidden";
    // List mode: relative, height fixed, but width dynamic
    const positionClasses = variant === 'timeline' ? "absolute top-1 bottom-1" : (variant === 'inbox' ? "relative mb-1 w-full" : "relative h-16 mb-2");

    // Completeness check for Blue/Gray logic
    const isComplete = !!(order.driver_id && order.truck_id && order.origin_address && order.destination_address);

    // Dynamic Color Logic (Punto 5 del Plan de Reestructuración)
    let colorClass = "bg-gray-100 border-gray-300 text-gray-500 shadow-sm"; // Default Gray (DRAFT/Incomplete)

    if (order.status === 'COMPLETED') {
        colorClass = 'bg-green-600 border-green-700 text-white shadow-sm'; // Finalizado (Verde)
    } else if (order.status === 'IN_PROGRESS') {
        colorClass = 'bg-orange-500 border-orange-600 text-white shadow-lg'; // En ejecución (Naranja)
    } else if (order.status === 'PLANNED') {
        // Updated to a softer blue per user feedback (was blue-800)
        colorClass = 'bg-blue-600 border-blue-700 text-white shadow-md ring-1 ring-blue-500/50';
    } else if (order.status === 'ANALYZING' || (order.status === 'DRAFT' && isComplete)) {
        // Updated to be distinct but not "dark intense" (was sky-400, kept similar but maybe slightly softer or different hue if needed)
        // User complained about "dark blue" for analyzing, maybe they meant the PLANNED one was appearing for ANALYZING?
        // Let's make ANALYZING a clear light blue/cyan.
        colorClass = 'bg-cyan-500 border-cyan-600 text-white shadow-sm';
    } else if (isOverlapping) {
        colorClass = 'bg-yellow-100 border-yellow-400 text-yellow-800 shadow-lg ring-1 ring-yellow-200'; // Conflict (Yellow)
    } else if (order.status === 'DRAFT') {
        colorClass = 'bg-gray-100 border-gray-300 text-gray-400 italic font-medium'; // Borrador / Incompleto (Gris)
    }

    // Meal Styling
    if (order.type === 'MEAL') {
        colorClass = 'bg-pink-100 border-pink-300 text-pink-800 shadow-sm border-dashed select-none';
    }

    // Priority Override
    const priorityClasses = order.priority ? "ring-2 ring-red-500 ring-offset-1 z-10" : "";

    // Displaced Warning
    const displacedClasses = order.was_displaced ? "ring-2 ring-yellow-400 ring-offset-1" : "";

    // Selection Highlight
    const selectedClasses = isSelected ? "ring-4 ring-blue-500 z-50 transform scale-105 shadow-xl" : "";

    // Find driver name
    const driver = (drivers || []).find(d => d && d.id === order.driver_id);
    const driverName = driver ? (driver.name || 'Conductor').split(' ')[0] : (order.driver_id || '');

    // Locking Logic: 
    // Approved (PLANNED), In Progress, and Completed are LOCKED for dragging on timeline.
    // They can still be clicked/double-clicked.
    // MEALs are always draggable/movable.
    const isDraggable = variant === 'list' || variant === 'inbox' || ['DRAFT', 'ANALYZING'].includes(order.status) || order.type === 'MEAL';


    // --- RENDER LOGIC FOR LIST VIEW (DRIVER PLANNING) ---
    if (variant === 'list') {
        const startTime = new Date(order.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(new Date(order.scheduled_start).getTime() + order.estimated_duration * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Find Truck Alias
        const truck = (trucks || []).find(t => t.id === order.truck_id);
        const truckName = truck ? (truck.alias || truck.plate) : 'Sin asignar';

        // --- MEAL CARD (LIST VIEW) ---
        if (order.type === 'MEAL') {
            return (
                <div
                    className="mb-2 rounded-lg border border-pink-300 bg-pink-50 shadow-sm p-2 hover:shadow-md transition-all cursor-pointer select-none"
                    onClick={onClick}
                    draggable={isDraggable}
                    onDragStart={(e) => {
                        if (isDraggable) {
                            const dragData = { type: 'ORDER', orderId: order.id, offsetMinutes: 0 };
                            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                            setDraggedOrder(order);
                        }
                    }}
                >
                    <div className="flex justify-between items-center text-pink-800">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🍴</span>
                            <span className="font-bold text-sm">COMIDA / DESCANSO</span>
                        </div>
                        <span className="text-xs font-mono bg-pink-100 px-1.5 py-0.5 rounded border border-pink-200">
                            {startTime} - {endTime}
                        </span>
                    </div>
                </div>
            );
        }

        // --- STANDARD ORDER CARD (LIST VIEW) ---
        return (
            <div
                className={`mb-2 rounded-lg border shadow-sm p-3 bg-white hover:shadow-md transition-all ${colorClass} ${priorityClasses} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                onClick={onClick}
                draggable={isDraggable}
                onDragStart={(e) => {
                    // Simplified drag for list view
                    if (isDraggable) {
                        const dragData = { type: 'ORDER', orderId: order.id, offsetMinutes: 0 };
                        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                        setDraggedOrder(order);
                    }
                }}
            >
                {/* ... existing list view content ... */}
                {/* Header: Time, Truck & ID */}
                <div className="flex justify-between items-center border-b border-black/5 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-700 bg-gray-100 px-1.5 rounded">
                            {startTime} - {endTime}
                        </span>
                        {/* Truck Badge */}
                        <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold uppercase">
                            🚛 {truckName}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-blue-500 font-bold">
                        {order.odoo_name || (order.odoo_id ? `#${order.odoo_id}` : `#${order.display_id}`)}
                    </span>
                </div>

                {/* Client & Description */}
                <div className="mb-2">
                    <div className="font-bold text-base text-gray-800 leading-tight">{order.client_name}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{order.description}</div>
                </div>

                {/* Route & Distances - RESTRUCTURED */}
                <div className="bg-gray-50 rounded p-2.5 text-xs space-y-3 mb-2 border border-gray-100">
                    {/* Segment 1: Aproximación (Start -> Origin) */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded leading-none uppercase">Segmento 1</span>
                            <span className="text-indigo-900 font-black text-[10px] uppercase tracking-wider">Aproximación / Inicio</span>
                        </div>
                        <div className="flex items-start gap-3 ml-1">
                            <div className="flex flex-col items-center pt-1 shrink-0">
                                <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-400 bg-white"></div>
                                <div className="w-0.5 h-4 bg-indigo-200 dashed"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="text-gray-400 text-[9px] font-bold uppercase truncate">Desde: {order.previous_location || 'Base / Inicio'}</div>
                                    {order.prep_duration_minutes !== undefined && (
                                        <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1 rounded shrink-0">⏱️ {Math.round(order.prep_duration_minutes)} min</div>
                                    )}
                                </div>
                                <div className="text-gray-900 font-black text-[11px] truncate mt-0.5">➡️ {order.origin_address}</div>
                                {order.prep_distance_km !== undefined && (
                                    <div className="text-[9px] font-bold text-gray-500 flex items-center gap-1 mt-0.5 italic">
                                        🛣️ {order.prep_distance_km} km de aproximación
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Segment 2: Servicio (Origin -> Destination) */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded leading-none uppercase">Segmento 2</span>
                            <span className="text-emerald-900 font-black text-[10px] uppercase tracking-wider">Transporte / Servicio</span>
                        </div>
                        <div className="flex items-start gap-3 ml-1">
                            <div className="flex flex-col items-center pt-1 shrink-0">
                                <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 bg-white"></div>
                                <div className="w-0.5 h-4 bg-emerald-200"></div>
                                <div className="w-2.5 h-2.5 rounded bg-emerald-600"></div>
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="text-gray-400 text-[9px] font-bold uppercase truncate">Origen: {order.origin_address}</div>
                                    {order.driving_duration_minutes !== undefined && (
                                        <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 rounded shrink-0">⏱️ {Math.round(order.driving_duration_minutes)} min</div>
                                    )}
                                </div>
                                <div className="text-gray-900 font-black text-[11px] truncate mt-0.5">🏁 {order.destination_address}</div>
                                <div className="text-[9px] font-bold text-gray-500 flex items-center gap-1 mt-0.5 italic">
                                    🛣️ {order.driving_distance_km || order.km || 0} km de trayecto
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Details / Requirements */}
                    {(order.load_length || order.requires_crane || order.accessories?.length) && (
                        <div className="pt-2 border-t border-gray-200">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Especificaciones de Carga</div>
                            <div className="flex flex-wrap gap-2">
                                {order.load_length && (
                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold flex items-center gap-1">
                                        📏 Longitud: {order.load_length}m
                                    </span>
                                )}
                                {order.requires_crane && (
                                    <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 font-bold flex items-center gap-1">
                                        🏗️ Grúa: {order.crane_height ? `${order.crane_height}m` : 'Necesaria'}
                                    </span>
                                )}
                                {order.requires_jib && (
                                    <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-bold flex items-center gap-1">
                                        🏗️ JIB (Pluma)
                                    </span>
                                )}
                                {order.requires_box_body && (
                                    <span className="text-[10px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-bold flex items-center gap-1">
                                        📦 CAJA CERRADA
                                    </span>
                                )}
                                {order.accessories?.map((acc, idx) => (
                                    <span key={idx} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-bold flex items-center gap-1 uppercase">
                                        ⚙️ {acc}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer: Details Badge */}
                <div className="flex flex-wrap gap-2 pt-1">
                    {order.load_weight && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                            ⚖️ {order.load_weight}kg
                        </span>
                    )}
                    {order.priority && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                            🔥 URGENTE
                        </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        order.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {order.status}
                    </span>
                    {/* Explicit Duration */}
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold border border-gray-200">
                        ⏱️ Total: {Math.round(order.estimated_duration / 60 * 10) / 10}h
                    </span>
                </div>
            </div>
        );
    }

    // --- INBOX VIEW (Drag Cutout Style) ---
    if (variant === 'inbox') {
        return (
            <>
                <div
                    className={`mb-2 rounded border shadow-sm p-2 bg-white hover:shadow hover:scale-[1.02] transition-all cursor-grab active:cursor-grabbing z-10 ${colorClass} ${priorityClasses} ${isSelected ? 'ring-2 ring-blue-500' : ''} ${order.truck_id ? 'border-dashed border-green-200' : ''}`}
                    onClick={() => {
                        console.log('OrderCard: Clicked', order.id);
                        if (onClick) onClick();
                    }}
                    draggable={true}
                    onDragStart={handleDragStart}
                    onDragEnd={() => setDraggedOrder(null)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onDoubleClick?.(order);
                    }}
                >
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono font-bold bg-black/5 px-1 rounded text-gray-600">
                                {order.odoo_name || (order.odoo_id ? `#${order.odoo_id}` : `#${order.display_id}`)}
                            </span>
                            {order.truck_id && order.status !== 'DRAFT' && (
                                <span className="text-[8px] font-black bg-green-500 text-white px-1 rounded animate-pulse">
                                    ✅ PLANIFICADO
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1 py-0.5 rounded border border-gray-200">
                            {Math.round(order.estimated_duration)} min
                        </span>
                    </div>

                    <div className="font-bold text-xs text-gray-800 leading-tight truncate mb-0.5">
                        {order.client_name || 'Cliente'}
                    </div>

                    <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-500 truncate leading-tight flex items-center gap-1">
                            <span className="opacity-70 text-[8px]">⭕</span>
                            <span className="truncate">{order.origin_address || 'Sin origen'}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate leading-tight flex items-center gap-1">
                            <span className="opacity-70 text-[8px]">🏁</span>
                            <span className="truncate">{order.destination_address || 'Sin destino'}</span>
                        </div>
                        {(order.driving_distance_km || order.km) && (
                            <div className="text-[9px] text-blue-500 font-bold flex items-center gap-1 ml-3">
                                <span>🛣️ {order.driving_distance_km || order.km} km</span>
                            </div>
                        )}
                    </div>

                    {/* Tags Row */}
                    <div className="flex flex-wrap gap-1 mt-1.5 opacity-80">
                        {order.load_weight && (
                            <span className="text-[9px] bg-gray-50 text-gray-500 px-1 rounded border border-gray-100">
                                {order.load_weight}kg
                            </span>
                        )}
                        {order.priority && (
                            <span className="text-[9px] bg-red-50 text-red-600 px-1 rounded border border-red-100 font-bold">
                                URGENTE
                            </span>
                        )}
                    </div>
                </div>
                {/* HIDDEN DRAG PREVIEW (Simplified "Inbox" Style) - Duplicated for Inbox Variant */}
                <div
                    ref={dragPreviewRef}
                    className="fixed top-[-9999px] left-[-9999px] w-[200px] bg-white border border-gray-300 shadow-lg rounded p-2 z-50 flex flex-col gap-1 pointer-events-none"
                >
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>{order.odoo_name || `#${order.display_id}`}</span>
                        <span className="text-[10px] bg-gray-100 px-1 rounded">{Math.round(order.estimated_duration)} min</span>
                    </div>
                    <div className="text-[11px] truncate text-gray-600 font-medium">
                        {order.client_name || 'Cliente'}
                    </div>
                    <div className="text-[10px] truncate text-gray-400">
                        ⭕ {order.origin_address}
                    </div>
                    <div className="text-[10px] truncate text-gray-400">
                        🏁 {order.destination_address}
                    </div>
                    {(order.driving_distance_km || order.km) && (
                        <div className="text-[9px] text-blue-500 font-bold">
                            🛣️ {order.driving_distance_km || order.km} km
                        </div>
                    )}
                </div>
            </>
        );
    }

    return (
        <>
            <div
                className={`${baseClasses} ${positionClasses} ${colorClass} ${priorityClasses} ${displacedClasses} ${selectedClasses} ${isBeingDragged ? 'opacity-50' : ''}`}
                style={{ width: !width ? '100%' : `${width}px` }}
                onClick={onClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                draggable={isDraggable}
                onDragStart={handleDragStart}
                // ... (rest of props)
                onDragEnd={() => setDraggedOrder(null)}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onDoubleClick?.(order);
                }}
                title={`${order.client_name} - ${order.description}${!isDraggable ? ' (Bloqueado)' : ''}`}
            >
                {/* --- INTERNAL TIME SEGMENTS (Visual Only) --- */}
                {variant === 'timeline' && order.estimated_duration > 0 && order.type !== 'MEAL' && (
                    <div className="absolute inset-0 flex pointer-events-none opacity-40">
                        {/* Increased opacity for separators from 30 to 40 */}
                        {(() => {
                            const prep = order.prep_duration_minutes || travelMinutes || 0;
                            const driving = order.driving_duration_minutes || 0;

                            // Width Percentages
                            const prepPct = (prep / order.estimated_duration) * 100;
                            const drivingPct = (driving / order.estimated_duration) * 100;

                            return (
                                <>
                                    {/* Prep/Arrival Segment - Black Double Border */}
                                    {prep > 0 && (
                                        <div
                                            style={{ width: `${prepPct}%` }}
                                            className="h-full border-r-4 border-black box-border bg-black/10"
                                            title={`Llegada: ${Math.round(prep)} min`}
                                        ></div>
                                    )}

                                    {/* Driving Segment - Black Double Border */}
                                    {driving > 0 && (
                                        <div
                                            style={{ width: `${drivingPct}%` }}
                                            className="h-full border-r-4 border-black box-border bg-yellow-900/10"
                                            title={`Conducción: ${Math.round(driving)} min`}
                                        ></div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Travel Time Tail (Visual Only - DISABLED as now internal) */}
                {/* {travelMinutes > 0 && variant === 'timeline' && ( ... )} */}

                <div className="flex flex-col min-w-0 py-0.5 z-10">
                    <div className="flex justify-between items-center min-w-0">
                        {order.type === 'MEAL' ? (
                            <span className="text-[11px] font-black truncate">🍴 {order.description}</span>
                        ) : (
                            <span className="truncate text-[10px] font-black uppercase tracking-tight leading-none">
                                {order.client_name || 'CLIENTE'}
                            </span>
                        )}
                        {!isDraggable && variant === 'timeline' && <span className="opacity-80 flex-shrink-0 text-[10px] ml-1">🔒</span>}
                    </div>

                    {/* Driver Tag - More compact */}
                    {order.driver_id && order.type !== 'MEAL' && (
                        <div className="flex items-center gap-1 mt-0.5 opacity-90">
                            <span className="text-[8px]">👷</span>
                            <span className="text-[9px] font-bold uppercase tracking-tighter truncate leading-none">
                                {driverName}
                            </span>
                        </div>
                    )}
                </div>

                {/* Displaced Warning Badge */}
                {order.was_displaced && (
                    <div className="absolute top-0 right-0 p-0.5 bg-yellow-300 text-yellow-900 rounded-bl text-[8px] font-bold z-20" title="Este pedido ha sido desplazado por mantenimiento">
                        ⚠️ DESPLAZADO
                    </div>
                )}
            </div>

            {/* HIDDEN DRAG PREVIEW (Simplified "Inbox" Style) */}
            <div
                ref={dragPreviewRef}
                className="fixed top-[-9999px] left-[-9999px] w-[200px] bg-white border border-gray-300 shadow-lg rounded p-2 z-50 flex flex-col gap-1 pointer-events-none"
            >
                <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span>{order.odoo_name || `#${order.display_id}`}</span>
                    <span className="text-[10px] bg-gray-100 px-1 rounded">{Math.round(order.estimated_duration)} min</span>
                </div>
                <div className="text-[11px] truncate text-gray-600 font-medium">
                    {order.client_name || 'Cliente'}
                </div>
                <div className="text-[10px] truncate text-gray-400">
                    ⭕ {order.origin_address}
                </div>
                <div className="text-[10px] truncate text-gray-400">
                    🏁 {order.destination_address}
                </div>
                {(order.driving_distance_km || order.km) && (
                    <div className="text-[9px] text-blue-500 font-bold">
                        🛣️ {order.driving_distance_km || order.km} km
                    </div>
                )}
            </div>
        </>
    );
};
