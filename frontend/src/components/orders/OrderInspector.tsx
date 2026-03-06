import { useGlobalContext } from '../../context/GlobalContext';
import type { Order } from '../../types';
import { RouteMap } from '../ui/RouteMap';

interface OrderInspectorProps {
    order: Order | null;
    onClose: () => void;
}

export const OrderInspector: React.FC<OrderInspectorProps> = ({ order, onClose }) => {
    const { drivers, trucks, updateOrder } = useGlobalContext();

    const driver = order ? (drivers || []).find(d => d && d.id === order.driver_id) : null;
    const truck = order ? (trucks || []).find(t => t && t.id === order.truck_id) : null;

    if (!order) return null;

    const statuses = [
        { id: 'DRAFT', label: 'BORRADOR', color: 'bg-gray-100 text-gray-500 border-gray-200', active: 'bg-gray-500 text-white border-gray-600', icon: '📝' },
        { id: 'ANALYZING', label: 'ANALIZANDO', color: 'bg-sky-50 text-sky-600 border-sky-100', active: 'bg-sky-600 text-white border-sky-700', icon: '🔍' },
        { id: 'PLANNED', label: 'PLANIFICADO', color: 'bg-blue-50 text-blue-600 border-blue-100', active: 'bg-blue-800 text-white border-blue-900', icon: '📅' },
        { id: 'IN_PROGRESS', label: 'EN EJECUCIÓN', color: 'bg-orange-50 text-orange-600 border-orange-100', active: 'bg-orange-500 text-white border-orange-600', icon: '🚚' },
        { id: 'COMPLETED', label: 'FINALIZADO', color: 'bg-green-50 text-green-600 border-green-100', active: 'bg-green-600 text-white border-green-700', icon: '✅' },
    ];

    const handleStatusUpdate = async (newStatus: string) => {
        if (newStatus === order.status) return;

        // Locking logic: if planning or beyond, ensure resources are assigned? 
        // User just wants clickable statuses for now.
        await updateOrder({ ...order, status: newStatus as any });
    };

    // --- MEAL VIEW ---
    if (order.type === 'MEAL') {
        const handleMealDuration = async (minutes: number) => {
            await updateOrder({ ...order, estimated_duration: minutes });
        };

        return (
            <aside className="w-96 bg-pink-50 border-l border-pink-200 h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-pink-100 flex justify-between items-center bg-pink-50 sticky top-0 z-20">
                    <h2 className="text-lg font-black text-pink-900 tracking-tight flex items-center gap-2">
                        🍴 Descanso / Comida
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-pink-100 rounded-full text-pink-400 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Duration Options */}
                <div className="p-6 flex flex-col gap-4">
                    <div className="text-sm font-bold text-pink-800 uppercase tracking-widest text-center mb-2">
                        Seleccionar Duración
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {[30, 60, 90, 120, 150, 180].map(mins => (
                            <button
                                key={mins}
                                onClick={() => handleMealDuration(mins)}
                                className={`
                                    py-4 px-6 rounded-xl border-2 transition-all flex justify-between items-center group
                                    ${order.estimated_duration === mins
                                        ? 'bg-pink-600 border-pink-600 text-white shadow-lg scale-[1.02]'
                                        : 'bg-white border-pink-200 text-pink-700 hover:border-pink-400 hover:shadow-md'
                                    }
                                `}
                            >
                                <span className="text-xl font-black">{mins} min</span>
                                <span className="text-2xl opacity-50 group-hover:opacity-100">
                                    {order.estimated_duration === mins ? '✅' : '⏱️'}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-white/50 rounded-lg border border-pink-100 text-center">
                        <div className="text-xs text-pink-600 font-bold uppercase mb-1">Horario Actual</div>
                        <div className="text-3xl font-black text-pink-900 font-mono">
                            {new Date(order.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="text-pink-400 mx-2">-</span>
                            {new Date(new Date(order.scheduled_start).getTime() + order.estimated_duration * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-96 bg-white border-l border-gray-200 h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header - Compact */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                        Pedido #{order.odoo_id || order.display_id || order.id}
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Status Selector - Moved to Top */}
            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Estado del Pedido</label>
                <div className="flex flex-wrap gap-1.5">
                    {statuses.map(s => (
                        <button
                            key={s.id}
                            onClick={() => handleStatusUpdate(s.id)}
                            className={`
                                flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all
                                ${order.status === s.id ? s.active : `${s.color} hover:border-gray-300 opacity-60 hover:opacity-100`}
                            `}
                        >
                            <span>{s.icon}</span>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content - High Density */}
            <div className="flex-grow overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">

                {/* Main Client info - Grouped */}
                <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cliente</label>
                        <div className="text-md font-black text-gray-900 leading-tight">
                            {order.client_name}
                        </div>
                    </div>
                    {order.priority && (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] font-black rounded border border-red-100">
                            🔥 URGENTE
                        </div>
                    )}
                </div>

                {/* Notes - Moved Up */}
                {order.description && (
                    <div className="space-y-1 py-2 px-1 border-t border-gray-50">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <span>📝</span> Notas y Observaciones
                        </label>
                        <div className="bg-yellow-50/50 p-2 rounded-lg border border-yellow-100 text-[11px] text-gray-700 leading-tight italic whitespace-pre-wrap">
                            {order.description?.split('ACCESORIOS:')[0].trim()}
                        </div>
                    </div>
                )}

                {/* Route Section - Compacted */}
                <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-50">
                    <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[7px]">A</span>
                            Origen
                        </label>
                        <div className="text-[11px] font-bold text-gray-700 leading-tight">
                            {order.origin_address || 'No especificado'}
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[7px]">B</span>
                            Destino
                        </label>
                        <div className="text-[11px] font-bold text-gray-700 leading-tight">
                            {order.destination_address || 'No especificado'}
                        </div>
                    </div>
                </div>

                {/* Resources Summary - Tight Grid */}
                <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-50">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recursos</label>
                        <div className="flex flex-col gap-2">
                            {truck ? (
                                <div
                                    className="px-2 py-1.5 rounded-lg border border-gray-900/10 text-[10px] font-black text-center shadow-sm flex flex-col leading-none"
                                    style={{ backgroundColor: truck.color || '#fbbf24', color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}
                                >
                                    <span className="opacity-80 uppercase text-[8px]">{truck.alias}</span>
                                    <span className="tracking-widest">{truck.plate}</span>
                                </div>
                            ) : (
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-400 text-center">
                                    Sin Camión
                                </div>
                            )}
                            {driver ? (
                                <div className="px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
                                    <span className="text-sm">👨‍✈️</span>
                                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight truncate">{driver.name}</span>
                                </div>
                            ) : (
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-bold text-gray-400 text-center">
                                    Sin Conductor
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meta Data - Logistics & Route */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Logística</label>
                        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 space-y-2">
                            {/* Previous Location (Start Point) */}
                            <div className="flex flex-col gap-0.5 pb-2 border-b border-gray-100">
                                <span className="text-[9px] uppercase font-bold text-gray-400">Desde (Inicio tramo)</span>
                                <span className="text-[10px] font-black text-gray-700 truncate" title={order.previous_location || 'Base (Jundiz)'}>
                                    {order.previous_location || 'Base (Jundiz)'}
                                </span>
                            </div>

                            {/* Distances Split */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-bold text-gray-500">Llegada (Vacío)</span>
                                    <span className="text-[11px] font-black text-gray-900">{order.prep_distance_km || order.km_to_origin || 0} km</span>
                                    <span className="text-[9px] text-gray-400">({order.prep_duration_minutes || 0} min)</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-bold text-gray-500">Viaje (Cargado)</span>
                                    <span className="text-[11px] font-black text-gray-900">{order.driving_distance_km || order.km || 0} km</span>
                                    <span className="text-[9px] text-gray-400">({order.driving_duration_minutes || 0} min)</span>
                                </div>
                            </div>

                            {/* Total Time */}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                <span className="text-[9px] uppercase font-bold text-gray-500">Total Est.</span>
                                <span className="text-[11px] font-black text-blue-700">{order.estimated_duration} min</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charge & Services - Micro Cards */}
                <div className="bg-orange-50/40 p-3 rounded-xl border border-orange-100 grid grid-cols-2 gap-y-2 gap-x-4">
                    <label className="col-span-2 text-[9px] font-black text-orange-800 uppercase tracking-widest flex items-center gap-2 mb-1">
                        🏗️ CARGA Y SERVICIOS
                    </label>
                    <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-orange-600/60">Peso / Largo</span>
                        <span className="text-xs font-black text-orange-950">{order.load_weight || 0} Kg / {order.load_length || 0} m</span>
                    </div>
                    {order.requires_crane ? (
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-bold text-orange-600/60">Servicio Grúa</span>
                            <span className="text-xs font-black text-orange-950">SI {order.crane_height ? `(${order.crane_height}m)` : ''}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-bold text-orange-600/60/40">Grúa</span>
                            <span className="text-xs font-bold text-orange-950/40">NO</span>
                        </div>
                    )}
                    {/* Accessories - Robust Parsing & Deduplication */}
                    {(() => {
                        let accs: string[] = [];

                        // normalize to array
                        const raw = order.accessories;
                        let list: any[] = [];
                        if (Array.isArray(raw)) list = raw;
                        else if (typeof raw === 'string') {
                            // Try to parse if it looks like JSON/Python list
                            if ((raw as string).trim().startsWith('[')) {
                                try {
                                    // Replace single quotes with double quotes for JSON if needed
                                    // This is risky if content has quotes, but simplistic for now
                                    const jsonStr = (raw as string).replace(/'/g, '"');
                                    list = JSON.parse(jsonStr);
                                } catch {
                                    list = [raw];
                                }
                            } else {
                                list = [raw];
                            }
                        }

                        // Flatten and clean
                        accs = list.flatMap(item => {
                            if (typeof item === 'string') {
                                // Check again if item itself is a stringified list "['a']"
                                if (item.trim().startsWith('[')) {
                                    try {
                                        const jsonStr = item.replace(/'/g, '"');
                                        return JSON.parse(jsonStr);
                                    } catch { return item; }
                                }
                                return item;
                            }
                            return String(item);
                        });

                        // Deduplicate
                        const uniqueAccs = Array.from(new Set(accs)).filter(Boolean);

                        if (uniqueAccs.length === 0) return null;

                        return (
                            <div className="col-span-2 mt-1 pt-2 border-t border-orange-100">
                                <span className="text-[8px] uppercase font-bold text-orange-600/60 block mb-1">Accesorios</span>
                                <div className="flex flex-wrap gap-1">
                                    {uniqueAccs.map((acc: string, idx: number) => (
                                        <span key={`${acc}-${idx}`} className="px-1.5 py-0.5 bg-white border border-orange-200 text-orange-700 text-[9px] font-bold rounded shadow-sm">
                                            {acc}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Times breakdown - Compact Inline */}
                <div className="bg-blue-50/40 p-2.5 rounded-xl border border-blue-100 flex justify-around">
                    <div className="text-center">
                        <div className="text-[8px] uppercase font-bold text-blue-400 leading-none">Prep</div>
                        <div className="text-[11px] font-black text-blue-900">{order.prep_duration_minutes || 0}m</div>
                    </div>
                    <div className="h-4 w-px bg-blue-100 self-center"></div>
                    <div className="text-center">
                        <div className="text-[8px] uppercase font-bold text-blue-400 leading-none">Viaje</div>
                        <div className="text-[11px] font-black text-blue-900">{order.driving_duration_minutes || 0}m</div>
                    </div>
                    <div className="h-4 w-px bg-blue-100 self-center"></div>
                    <div className="text-center">
                        <div className="text-[8px] uppercase font-bold text-blue-400 leading-none">Trab.</div>
                        <div className="text-[11px] font-black text-blue-900">{order.work_duration_minutes || 0}m</div>
                    </div>
                </div>

                {/* Notes - Smaller font */}
                {order.description && (
                    <div className="space-y-1 py-1 px-1 border-gray-50">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Notas</label>
                        <div className="text-[11px] text-gray-600 leading-tight italic whitespace-pre-wrap">
                            {order.description?.split('ACCESORIOS:')[0].trim()}
                        </div>
                    </div>
                )}

                {/* Map Preview - Smarter Height */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-inner overflow-hidden h-36 relative mt-auto">
                    <RouteMap
                        origin={order.origin_address}
                        destination={order.destination_address}
                        previousLocation={order.previous_location}
                        showRoute={true}
                    />
                </div>
            </div>

            {/* Hint Bar - Compact */}
            <div className="py-2 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">
                    💡 Doble clic para editar
                </p>
            </div>
        </aside>
    );
};
