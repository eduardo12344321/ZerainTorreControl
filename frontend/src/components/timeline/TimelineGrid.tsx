import React, { useState } from 'react';
import { TruckRow } from './TruckRow';
import { DriverRow } from './DriverRow';
import { OrderCard } from './OrderCard';
import type { Order, Driver } from '../../types';
import { OptimizationSummaryModal } from '../modals/OptimizationSummaryModal';

// --- CONSTANTS ---
import { useGlobalContext } from '../../context/GlobalContext';
import { useDragContext } from '../../context/DragContext';
import { calculateTravelTime, calculateRoute, BASE_LOCATION } from '../../utils/routing';

const START_HOUR = 7;
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

interface TimelineGridProps {
    orders: Order[];
    onOrderClick?: (order: Order) => void;
    onOrderDoubleClick?: (order: Order) => void;
    selectedOrderId?: string;
    selectedDate: string; // YYYY-MM-DD
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
    orders,
    onOrderClick,
    onOrderDoubleClick,
    selectedOrderId,
    selectedDate
}) => {
    const hourIntervals = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
    const { trucks, drivers, updateOrder, addOrder, updateDriver, apiFetch, fetchOrders } = useGlobalContext();
    const { draggedOrder, setDraggedOrder } = useDragContext();
    const [optimizationResult, setOptimizationResult] = useState<any>(null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);

    // Calculate position and width percentage based on time
    const getPositionStyles = (scheduledStart: string, durationMinutes: number) => {
        if (!scheduledStart) return { left: '0%', width: '0%', display: 'none' };

        const date = new Date(scheduledStart);
        if (isNaN(date.getTime())) {
            console.error("Invalid date for order:", scheduledStart);
            return { left: '0%', width: '0%', display: 'none' };
        }

        const hour = date.getHours();
        const minute = date.getMinutes();

        // Calculate offset in hours from start (e.g., 8:30 - 6:00 = 2.5 hours)
        const offsetHours = (hour + minute / 60) - START_HOUR;
        const durationHours = durationMinutes / 60;

        // Convert to percentage of total width
        const leftPercent = (offsetHours / TOTAL_HOURS) * 100;
        const widthPercent = (durationHours / TOTAL_HOURS) * 100;

        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`
        };
    };

    const handleAssignDriver = (orderId: string, driverId: string) => {
        console.log(`Assigning Driver ${driverId} based on Order ${orderId}`); // DEBUG LOG

        // --- DRIVER AVAILABILITY CHECK ---
        const targetOrder = orders.find(o => o.id === orderId);
        if (!targetOrder) return;

        // Base date for normalization (robustness)
        const baseDate = new Date(selectedDate);
        baseDate.setHours(0, 0, 0, 0);

        const targetDate = new Date(targetOrder.scheduled_start);
        const targetStartMs = baseDate.getTime() + (targetDate.getHours() * 3600000) + (targetDate.getMinutes() * 60000);
        const targetEndMs = targetStartMs + (targetOrder.estimated_duration * 60 * 1000);

        const hasDriverConflict = orders.some(o => {
            // Check only orders assigned to this driver
            if (o.driver_id !== driverId) return false;
            // Skip the order we are modifying (though it shouldn't have the driver yet)
            if (o.id === orderId) return false;
            // Skip cancelled
            if (o.status === 'CANCELLED' || o.status === 'DRAFT') return false;

            const oDate = new Date(o.scheduled_start);
            const oStartMs = baseDate.getTime() + (oDate.getHours() * 3600000) + (oDate.getMinutes() * 60000);
            const oEndMs = oStartMs + (o.estimated_duration * 60 * 1000);

            // Overlap check
            return (targetStartMs < oEndMs && targetEndMs > oStartMs);
        });

        if (hasDriverConflict) {
            alert(`\u26D4 IMPOSIBLE: Este conductor ya tiene un servicio asignado en ese horario.`);
            return;
        }

        // --- PERSISTENCE FIX ---
        // Instead of only updating local state, we call the backend API
        const updatedOrder: Order = {
            ...targetOrder,
            driver_id: driverId,
            status: targetOrder.status === 'DRAFT' ? 'ANALYZING' : targetOrder.status
        };

        updateOrder(updatedOrder);
    };

    // Ensure Daily Meals
    React.useEffect(() => {
        if (!trucks.length || !selectedDate) return;

        const mealStartHour = 13;
        const mealDurationVideo = 120; // 2 hours

        trucks.forEach(truck => {
            // NEW: Check by ID (deterministic) instead of date string
            const mealId = `meal-${truck.id}-${selectedDate}`;
            const hasMeal = orders.some(o =>
                String(o.id) === mealId && o.status !== 'CANCELLED'
            );

            if (!hasMeal) {
                console.log(`Creating MEAL for truck ${truck.id} on ${selectedDate}`);

                // --- ROBUST LOCAL DATE CREATION ---
                // We want 13:00 LOCAL time. 
                // Using "YYYY-MM-DDT13:00:00" ensures the browser parses it as Local.
                const localISO = `${selectedDate}T${String(mealStartHour).padStart(2, '0')}:00:00`;
                const scheduledTime = new Date(localISO).toISOString();

                const newMeal: Order = {
                    id: mealId, // Deterministic ID per day/truck
                    display_id: 0, // System order
                    type: 'MEAL',
                    status: 'PLANNED', // Locked/Approved effectively
                    client_id: 'internal',
                    client_name: 'COMIDA',
                    description: 'Descanso Comida',
                    origin_address: 'Base', // Logical placeholder
                    destination_address: 'Base',
                    scheduled_start: scheduledTime,
                    estimated_duration: mealDurationVideo,
                    truck_id: truck.id,
                    driver_id: truck.default_driver_id || undefined // Assign to default driver if exists
                };

                // Add to Global State (Persistence)
                // We use addOrder (which calls backend) to ensure it saves.
                // However, to avoid infinite loops in useEffect dep array, we trust the check above.
                // But since 'orders' is in dep array (implicit or explicit), we need to be careful.
                // The check `!hasMeal` protects us: once added, hasMeal becomes true.
                addOrder(newMeal);
            }
        });
    }, [selectedDate, trucks.length, orders.length]); // Re-run when day, trucks or order count changes


    const handleOrderDrop = async (e: React.DragEvent, truckId: string) => {
        e.preventDefault();
        console.log('TimelineGrid: handleOrderDrop called', { truckId });

        // --- MEAL VALIDATION ---
        if (draggedOrder && draggedOrder.type === 'MEAL' && String(draggedOrder.truck_id) !== String(truckId)) {
            alert("⛔ No puedes mover la comida a otro camión. Los descansos son asignados al recurso.");
            setDraggedOrder(null);
            return;
        }

        // --- ROBUST DATA RETRIEVAL ---
        let data: any = {};
        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (rawData) {
                data = JSON.parse(rawData);
            }
        } catch (err) {
            console.warn('TimelineGrid: JSON parse failed', err);
        }

        // Fallback: If dataTransfer failed, use Context
        if (!data.orderId && draggedOrder) {
            console.log('TimelineGrid: Falling back to DragContext', draggedOrder.id);
            data = { type: 'ORDER', orderId: draggedOrder.id, offsetMinutes: 0 };
        }

        console.log('TimelineGrid: Final Data', data);

        if (data.type === 'ORDER') {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;

            // Calculate percentage and hours
            const percent = x / width;
            const hoursOffset = percent * TOTAL_HOURS;
            const grabOffsetMinutes = data.offsetMinutes ?? 0;
            const droppedHour = START_HOUR + hoursOffset;
            const adjustedHour = droppedHour - (grabOffsetMinutes / 60);

            // Snap logic
            let snappedHour = Math.round(adjustedHour * 4) / 4;
            if (snappedHour >= 6.5 && snappedHour <= 7.5) snappedHour = 7.0;

            // --- ROBUST LOCAL DATE CREATION ---
            // Constructing a "YYYY-MM-DDT08:30:00" string ensures the browser parses it as LOCAL.
            const hourPart = String(Math.floor(snappedHour)).padStart(2, '0');
            const minPart = String(Math.round((snappedHour % 1) * 60)).padStart(2, '0');
            const localISOString = `${selectedDate}T${hourPart}:${minPart}:00`;
            const proposedDate = new Date(localISOString);

            const finalScheduledStart = proposedDate.toISOString();
            const finalStartMs = proposedDate.getTime();
            const finalStartHour = snappedHour;

            console.log('TimelineGrid: Snap result', { snappedHour, localISOString, iso: finalScheduledStart });

            // --- 1. PRE-CALCULATE NEW TIMINGS ---
            const targetOrder = orders.find(o => o.id === data.orderId);
            if (!targetOrder) return;

            // Safety Copy for Type Inference
            const draggedOrder = targetOrder;

            // --- MAGNETIC SNAP TO PREVIOUS ORDERS ---
            const getLocalDay = (iso: string) => {
                const d = new Date(iso);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };

            const dayOrders = orders.filter(o =>
                String(o.truck_id) === String(truckId) &&
                String(o.id) !== String(draggedOrder.id) &&
                !['CANCELLED', 'DRAFT'].includes(o.status) &&
                getLocalDay(o.scheduled_start) === selectedDate
            );

            // --- ROUTE LOGIC (PREVIOUS LOCATION) ---
            let startLocation = BASE_LOCATION;
            if (Math.abs(finalStartHour - 7.0) < 0.1) {
                startLocation = BASE_LOCATION;
            } else {
                const precedingOrder = dayOrders
                    .filter(o => (new Date(o.scheduled_start).getTime() + (o.estimated_duration * 60000)) <= finalStartMs + 60000)
                    .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())[0];

                if (precedingOrder) {
                    startLocation = precedingOrder.destination_address;
                }
            }

            // 2. Calculate Segments
            const prepRoute = calculateRoute(startLocation, draggedOrder.origin_address);
            const prepMinutes = prepRoute.duration;
            const prepKm = prepRoute.distance;

            let drivingMinutes = draggedOrder.driving_duration_minutes || 0;
            let drivingKm = draggedOrder.driving_distance_km || 0;

            if ((!drivingMinutes || !drivingKm) && draggedOrder.origin_address && draggedOrder.destination_address) {
                const driveRoute = calculateRoute(draggedOrder.origin_address, draggedOrder.destination_address);
                drivingMinutes = driveRoute.duration;
                drivingKm = driveRoute.distance;
            } else if (drivingMinutes === 0) {
                const driveRoute = calculateRoute(draggedOrder.origin_address, draggedOrder.destination_address);
                drivingMinutes = driveRoute.duration;
            }

            const workMinutes = draggedOrder.work_duration_minutes || (draggedOrder.estimated_duration - drivingMinutes - (draggedOrder.prep_duration_minutes || 0));
            const totalDuration = Math.round(prepMinutes + drivingMinutes + Math.max(0, workMinutes));
            const finalEndMs = finalStartMs + (totalDuration * 60 * 1000);

            const targetTruck = trucks.find(t => t.id === truckId);

            const updatedOrder: Order = {
                ...draggedOrder,
                id: draggedOrder.id, // Explicit ID for TS
                truck_id: truckId,
                driver_id: targetTruck?.default_driver_id || draggedOrder.driver_id,
                scheduled_start: finalScheduledStart,
                estimated_duration: totalDuration,
                prep_duration_minutes: prepMinutes,
                prep_distance_km: prepKm,
                driving_duration_minutes: drivingMinutes,
                driving_distance_km: drivingKm,
                work_duration_minutes: Math.max(0, workMinutes),
                previous_location: startLocation,
                status: draggedOrder.status === 'DRAFT' ? 'ANALYZING' : draggedOrder.status
            };

            // --- 2. COLLISION DETECTION ---
            let collisionType: 'order' | 'maintenance' | null = null;
            let collidedWith: Order | undefined = undefined;

            const hasCollision = orders.some(existingOrder => {
                if (String(existingOrder.id) === String(data.orderId)) return false;
                if (String(existingOrder.truck_id) !== String(truckId)) return false;
                if (['CANCELLED', 'DRAFT', 'MEAL'].includes(existingOrder.status) || existingOrder.type === 'MEAL') return false;

                const existingStartMs = new Date(existingOrder.scheduled_start).getTime();
                const duration = existingOrder.estimated_duration || 60;
                const existingEndMs = existingStartMs + (duration * 60 * 1000);

                const existingDay = new Date(existingOrder.scheduled_start).toISOString().split('T')[0];
                if (existingDay !== selectedDate) return false;

                const isOverlapping = (finalStartMs < existingEndMs) && (finalEndMs > existingStartMs);

                if (isOverlapping) {
                    collisionType = existingOrder.status === 'MAINTENANCE' ? 'maintenance' : 'order';
                    collidedWith = existingOrder;
                    return true;
                }
                return false;
            });

            // --- 3. COMPATIBILITY CHECK ---
            if (targetTruck) {
                const orderWeightKg = draggedOrder.load_weight || 0;
                const truckMaxWeightKg = (targetTruck.max_weight || 0);
                const orderLengthM = draggedOrder.load_length || 0;
                const truckMaxLengthM = targetTruck.max_length || 0;

                if (truckMaxWeightKg > 0 && orderWeightKg > truckMaxWeightKg) {
                    const displayMax = truckMaxWeightKg > 500 ? truckMaxWeightKg / 1000 : truckMaxWeightKg;
                    alert(`⚠️ El camión ${targetTruck.plate} no tiene capacidad suficiente (${displayMax}T) para este pedido (${orderWeightKg}kg)`);
                    setDraggedOrder(null);
                    return;
                }
                if (truckMaxLengthM > 0 && orderLengthM > truckMaxLengthM) {
                    alert(`⚠️ El camión ${targetTruck.plate} es demasiado corto (${truckMaxLengthM}m) para este pedido (${orderLengthM}m)`);
                    setDraggedOrder(null);
                    return;
                }
                if (draggedOrder.requires_crane && !targetTruck.has_crane) {
                    alert(`⚠️ Este pedido requiere GRÚA, pero el camión ${targetTruck.plate} no dispone de ella.`);
                    setDraggedOrder(null);
                    return;
                }
            }

            if (hasCollision) {
                if (collisionType === 'maintenance' && collidedWith) {
                    alert(`🔧 CONFLICTO: Este camión está programado para mantenimiento en ese horario.\n\n${(collidedWith as any).description || 'Mantenimiento programado'}`);
                } else {
                    const collidedOrder = collidedWith as Order | undefined;
                    const start = collidedOrder ? new Date(collidedOrder.scheduled_start).toLocaleTimeString() : '??:??';
                    alert(`❌ Conflicto detectado: Solapa con pedido existente.\n\nCliente: ${collidedOrder?.client_name || 'Desconocido'}\nA las: ${start}`);
                }
                setDraggedOrder(null);
                return;
            }

            // Release drag state immediately so UI remains responsive
            setDraggedOrder(null);

            // Update Order Backend (Optimistic update handles UI)
            updateOrder(updatedOrder);
        }
    };
    const handleShiftUpdate = async (driverId: string, start: string, end: string) => {
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
            await updateDriver({ ...driver, shift_start: start, shift_end: end });
        }
    };

    const handleOptimizationSuccess = async () => {
        // Trigger global refresh
        if (fetchOrders) {
            await fetchOrders();
        } else {
            console.warn("fetchOrders not available, reloading page");
            window.location.reload();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="flex border-b border-gray-200 bg-gray-50 h-10 shrink-0">
                <div className="w-56 flex-shrink-0 border-r border-gray-200 p-2 font-bold text-gray-500 text-sm flex items-center justify-center bg-gray-100 z-20 sticky left-0 shadow-sm uppercase tracking-tighter">
                    CAMIÓN / RECURSO
                </div>
                <div className="flex-grow flex relative">
                    {hourIntervals.map((hour) => (
                        <div key={hour} className="flex-1 relative border-r border-gray-200">
                            <span className="absolute left-[-1px] top-0 bottom-0 flex items-center justify-center text-[10px] font-black text-gray-400 bg-gray-50 px-1 transform -translate-x-1/2 z-10">
                                {hour}:00
                            </span>
                            {/* Half hour tick for header */}
                            <div className="absolute left-1/2 top-1/2 w-px h-2 bg-gray-200 -translate-x-1/2 -translate-y-1/2"></div>
                        </div>
                    ))}
                    {/* Final hour label (22:00) */}
                    <span className="absolute right-0 top-0 bottom-0 flex items-center justify-center text-[10px] font-black text-gray-400 bg-gray-50 px-1 transform translate-x-1/2 z-10">
                        {END_HOUR}:00
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto overflow-x-hidden relative custom-scrollbar">
                {trucks.map(truck => {
                    // Smart Drag Compatibility Check
                    const isTooHeavy = draggedOrder && draggedOrder.load_weight && truck.max_weight && draggedOrder.load_weight > truck.max_weight;
                    const isTooLong = draggedOrder && draggedOrder.load_length && truck.max_length && draggedOrder.load_length > truck.max_length;
                    const isIncompatible = isTooHeavy || isTooLong;

                    // Find ALL orders for this truck on the selected date (Robust Local Date Check)
                    const allTruckOrders = orders
                        .filter(o => {
                            if (!o.scheduled_start || String(o.truck_id) !== String(truck.id)) return false;

                            // Compare local date (YYYY-MM-DD) to avoid UTC flipping issues
                            const d = new Date(o.scheduled_start);
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            const orderLocalDay = `${year}-${month}-${day}`;

                            return orderLocalDay === selectedDate;
                        })
                        .sort((a, b) => {
                            const timeA = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
                            const timeB = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
                            return timeA - timeB;
                        });

                    // Separate maintenance from regular orders
                    const maintenanceOrders = allTruckOrders.filter(o => o.status === 'MAINTENANCE');
                    // Filter Regular Orders & Deduplicate by ID
                    const rawRegularOrders = allTruckOrders.filter(o => o.status !== 'MAINTENANCE' && o.status !== 'CANCELLED' && o.status !== 'DRAFT');
                    const regularOrders = Array.from(new Map(rawRegularOrders.map(item => [item.id, item])).values());


                    return (
                        <TruckRow
                            key={truck.id}
                            truck={truck}
                            className={isIncompatible ? 'grayscale opacity-50 cursor-not-allowed' : ''}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => handleOrderDrop(e, truck.id)}
                            onOptimize={async () => {
                                if (window.confirm(`¿Optimizar ruta para ${truck.alias || truck.plate}? Esto reordenará los pedidos para minimizar kilómetros.`)) {
                                    try {
                                        const res = await apiFetch('/logistics/optimize-route', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                                truck_id: truck.id,
                                                date: selectedDate
                                            })
                                        });

                                        if (res.ok) {
                                            const data = await res.json();
                                            if (data.status === 'success') {
                                                setOptimizationResult(data);
                                                if (data.summary) {
                                                    setIsSummaryOpen(true);
                                                }
                                                await handleOptimizationSuccess();
                                            } else {
                                                alert(`No se pudo optimizar: ${data.message}`);
                                            }
                                        } else {
                                            const err = await res.json();
                                            alert(`Error al optimizar: ${err.detail}`);
                                        }
                                    } catch (e) {
                                        console.error("Optimization error", e);
                                        alert("Error de conexión al optimizar.");
                                    }
                                }
                            }}
                        >
                            {/* Grid Lines Visuals (Background) */}
                            <div className="absolute inset-0 flex pointer-events-none z-0">
                                {hourIntervals.map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-gray-100 relative h-full pointer-events-none">
                                        {/* Half hour vertical line */}
                                        <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-gray-50 border-dashed"></div>
                                    </div>
                                ))}

                                {(() => {
                                    const now = new Date();
                                    const isToday = now.toISOString().split('T')[0] === selectedDate;

                                    const lines = [];

                                    // 7 AM Guide
                                    const sevenAMPercent = ((7 - START_HOUR) / TOTAL_HOURS) * 100;
                                    lines.push(
                                        <div key="guide-7" className="absolute top-0 bottom-0 border-l-2 border-indigo-400/20 z-0 pointer-events-none" style={{ left: `${sevenAMPercent}%` }}>
                                            <div className="absolute top-[-15px] left-0 text-[10px] font-black text-indigo-400/80 -translate-x-1/2 uppercase tracking-tighter">7:00</div>
                                        </div>
                                    );

                                    // 6 PM Guide
                                    const sixPMPercent = ((18 - START_HOUR) / TOTAL_HOURS) * 100;
                                    lines.push(
                                        <div key="guide-18" className="absolute top-0 bottom-0 border-l-2 border-indigo-400/20 z-0 pointer-events-none" style={{ left: `${sixPMPercent}%` }}>
                                            <div className="absolute top-[-15px] left-0 text-[10px] font-black text-indigo-400/80 -translate-x-1/2 uppercase tracking-tighter">18:00</div>
                                        </div>
                                    );

                                    if (isToday) {
                                        const currentHour = now.getHours() + now.getMinutes() / 60;
                                        if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
                                            const nowPercent = ((currentHour - START_HOUR) / TOTAL_HOURS) * 100;
                                            lines.push(
                                                <div
                                                    key="current-time"
                                                    className="absolute top-0 bottom-0 border-l-2 border-red-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                                    style={{ left: `${nowPercent}%` }}
                                                >
                                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-[4.5px] -mt-1 shadow-sm border border-white"></div>
                                                </div>
                                            );
                                        }
                                    }
                                    return lines;
                                })()}
                            </div>

                            {/* Render Maintenance Blocks (Background Layer) */}
                            {maintenanceOrders.map((maintenanceOrder) => {
                                const styles = getPositionStyles(maintenanceOrder.scheduled_start, maintenanceOrder.estimated_duration);
                                return (
                                    <div
                                        key={`maint-${maintenanceOrder.id}`}
                                        className="absolute inset-y-2 bg-gradient-to-r from-red-200 via-gray-300 to-red-200 border-2 border-red-400 rounded-lg shadow-inner z-10 flex items-center justify-center"
                                        style={{ left: styles.left, width: styles.width }}
                                        title={`MANTENIMIENTO: ${maintenanceOrder.description || 'Taller programado'}`}
                                    >
                                        <div className="text-xs font-black text-red-700 uppercase tracking-wider px-2">
                                            🔧 TALLER
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Render Regular Orders */}
                            {regularOrders.map((order, index) => {
                                const styles = getPositionStyles(order.scheduled_start, order.estimated_duration);

                                // Calculate Travel Time
                                let previousLocation = BASE_LOCATION;
                                if (index > 0) {
                                    previousLocation = regularOrders[index - 1].destination_address;
                                }

                                const travelMinutes = order.prep_duration_minutes ?? calculateTravelTime(previousLocation, order.origin_address);

                                // --- OVERLAP CHECK (Driver Conflict) ---
                                // Check if this order's driver is busy elsewhere at the same time
                                const startA = new Date(order.scheduled_start).getTime();
                                const endA = startA + order.estimated_duration * 60000;

                                const isOverlapping = order.driver_id ? orders.some(other => {
                                    if (String(other.id) === String(order.id)) return false; // Skip self
                                    if (String(other.driver_id) !== String(order.driver_id)) return false; // Different driver

                                    if (['DRAFT', 'CANCELLED'].includes(other.status)) return false;

                                    const startB = new Date(other.scheduled_start).getTime();
                                    const durationB = other.estimated_duration ||
                                        (other.prep_duration_minutes || 0) +
                                        (other.driving_duration_minutes || 0) +
                                        (other.work_duration_minutes || 60);
                                    const endB = startB + durationB * 60000;

                                    // Same day check
                                    if (!other.scheduled_start?.startsWith(selectedDate)) return false;

                                    return startA < endB && endA > startB;
                                }) : false;


                                return (
                                    <div
                                        key={order.id}
                                        className={`absolute top-2 bottom-2 transition-all duration-300 ease-out ${order.type === 'MEAL' ? 'z-0' : 'z-10'}`}
                                        style={{ left: styles.left, width: styles.width }}
                                    >
                                        <OrderCard
                                            order={order}
                                            pixelsPerHour={100}
                                            travelMinutes={travelMinutes}
                                            isOverlapping={isOverlapping}
                                            isSelected={order.id === selectedOrderId}
                                            onDrop={(driverId) => handleAssignDriver(order.id, driverId)}
                                            onClick={() => onOrderClick && onOrderClick(order)}
                                            onDoubleClick={onOrderDoubleClick}
                                        />
                                    </div>
                                );
                            })}
                        </TruckRow>
                    );
                })}

                {/* --- EQUIPO Y OPERARIOS --- */}
                <div className="bg-gray-100/80 px-4 py-1 border-y border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky top-0 z-10 flex items-center gap-2">
                    <span className="text-sm">👷</span> EQUIPO Y OPERARIOS
                </div>

                {drivers.filter((d: Driver) => d.is_active || orders.some(o => o.driver_id === d.id)).map((driver: Driver) => {
                    const driverOrders = orders.filter(o =>
                        o.driver_id === driver.id &&
                        o.scheduled_start &&
                        o.scheduled_start.startsWith(selectedDate) &&
                        o.status !== 'CANCELLED'
                    );

                    return (
                        <DriverRow
                            key={driver.id}
                            driver={driver}
                            onShiftUpdate={(start, end) => handleShiftUpdate(driver.id, start, end)}
                        >
                            {/* Off-hours shading */}
                            {(() => {
                                const startH = driver.shift_start ? parseInt(driver.shift_start.split(':')[0]) + (parseInt(driver.shift_start.split(':')[1]) / 60) : 8;
                                const endH = driver.shift_end ? parseInt(driver.shift_end.split(':')[0]) + (parseInt(driver.shift_end.split(':')[1]) / 60) : 18;

                                const leftPercent = ((startH - START_HOUR) / TOTAL_HOURS) * 100;
                                const rightPercent = ((END_HOUR - endH) / TOTAL_HOURS) * 100;

                                return (
                                    <>
                                        {leftPercent > 0 && (
                                            <div
                                                className="absolute left-0 top-0 bottom-0 bg-gray-200/40 z-[1] border-r border-gray-300/50 flex items-center justify-center pointer-events-none"
                                                style={{ width: `${leftPercent}%` }}
                                            >
                                                <span className="text-[8px] font-bold text-gray-400/60 uppercase -rotate-90">No Disp.</span>
                                            </div>
                                        )}
                                        {rightPercent > 0 && (
                                            <div
                                                className="absolute right-0 top-0 bottom-0 bg-gray-200/40 z-[1] border-l border-gray-300/50 flex items-center justify-center pointer-events-none"
                                                style={{ width: `${rightPercent}%` }}
                                            >
                                                <span className="text-[8px] font-bold text-gray-400/60 uppercase -rotate-90">No Disp.</span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {hourIntervals.map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-gray-100/50 relative h-full">
                                        <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-gray-50 border-dashed opacity-30"></div>
                                    </div>
                                ))}
                            </div>

                            {/* Render Driver Busy Blocks */}
                            {driverOrders.map(order => {
                                const styles = getPositionStyles(order.scheduled_start, order.estimated_duration);

                                // Color único por conductor (Punto 5 del Plan)
                                const driverIndex = drivers.indexOf(driver);
                                const hues = [210, 260, 290, 320, 20, 45, 120, 160, 180, 200];
                                const driverHue = hues[driverIndex % hues.length];

                                const barColorStyle = {
                                    backgroundColor: `hsla(${driverHue}, 70%, 50%, 0.25)`,
                                    borderColor: `hsla(${driverHue}, 70%, 40%, 0.5)`
                                };

                                return (
                                    <div
                                        key={`driver-busy-${order.id}`}
                                        className={`absolute top-1.5 bottom-1.5 border rounded shadow-sm z-10 flex items-center px-1.5 overflow-hidden transition-all hover:z-20 hover:scale-[1.02]`}
                                        style={{ ...barColorStyle, left: styles.left, width: styles.width }}
                                        title={`${driver.name}: ${order.client_name} (${order.origin_address})`}
                                    >
                                        <span className="text-[8px] font-black text-gray-700/80 truncate uppercase tracking-tighter">
                                            {order.client_name}
                                        </span>
                                    </div>
                                );
                            })}
                        </DriverRow>
                    );
                })}
            </div>
            {/* Footer / Legend */}
            <div className="bg-gray-50 border-t border-gray-200 p-3 flex items-center justify-center gap-6 shrink-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Incompleto</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-50 border border-blue-400"></div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Preparado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-700 border border-blue-800 shadow-sm"></div>
                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-tighter">Aprobado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500 border border-orange-600"></div>
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">En Curso</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-600 border border-green-700"></div>
                    <span className="text-[10px] font-black text-green-700 uppercase tracking-tighter">Finalizado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-red-200 bg-[repeating-linear-gradient(45deg,rgba(255,0,0,0.1),rgba(255,0,0,0.1)_4px,rgba(255,0,0,0.2)_4px,rgba(255,0,0,0.2)_8px)]"></div>
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">Mantenimiento</span>
                </div>
            </div>
            {/* --- MODALS --- */}
            <OptimizationSummaryModal
                isOpen={isSummaryOpen}
                onClose={() => setIsSummaryOpen(false)}
                data={optimizationResult}
            />
        </div>
    );
};
