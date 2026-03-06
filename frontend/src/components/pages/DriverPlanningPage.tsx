import React, { useState, useMemo } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { OrderCard } from '../timeline/OrderCard';
import { InlineCalendar } from '../ui/InlineCalendar';
import type { Order, Driver } from '../../types';

export const DriverPlanningPage: React.FC = () => {
    const { drivers, orders } = useGlobalContext();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Filter drivers: only active ones
    const activeDrivers = useMemo(() => drivers.filter(d => d.is_active), [drivers]);

    // Group orders by driver for the selected date
    const ordersByDriver = useMemo(() => {
        const grouped: Record<string, Order[]> = {};

        activeDrivers.forEach(d => {
            grouped[d.id] = orders.filter(o =>
                o.driver_id === d.id &&
                o.scheduled_start &&
                o.scheduled_start.startsWith(selectedDate) &&
                o.status !== 'CANCELLED'
            ).sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
        });

        return grouped;
    }, [orders, activeDrivers, selectedDate]);

    const handleCopyWhatsApp = (driver: Driver) => {
        const driverOrders = ordersByDriver[driver.id] || [];
        if (driverOrders.length === 0) {
            alert('No hay pedidos para copiar.');
            return;
        }

        const dateStr = new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

        let text = `🚛 *PLANIFICACIÓN ${dateStr.toUpperCase()}*\n`;
        text += `👤 *${driver.name}*\n\n`;

        driverOrders.forEach((o, index) => {
            const time = new Date(o.scheduled_start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            text += `📍 *SERVICIO #${index + 1} (${time})*\n`;
            text += `🏢 *Cliente:* ${o.client_name || 'Desconocido'}\n`;
            if (o.description) text += `📋 *Ref:* ${o.description}\n`;

            // Segment 1: Aproximación
            text += `\n1️⃣ *Tramo Aproximación:*\n`;
            text += `   • Desde: ${o.previous_location || 'Base / Inicio'}\n`;
            text += `   • Hasta: ${o.origin_address}\n`;
            if (o.prep_distance_km || o.prep_duration_minutes) {
                text += `   • 🏁 ${o.prep_distance_km || 0} km | ⏱️ ${Math.round(o.prep_duration_minutes || 0)} min\n`;
            }

            // Segment 2: Servicio
            text += `\n2️⃣ *Tramo Transporte:*\n`;
            text += `   • Origen: ${o.origin_address}\n`;
            text += `   • Destino: ${o.destination_address}\n`;
            text += `   • 🏁 ${o.driving_distance_km || o.km || 0} km | ⏱️ ${Math.round(o.driving_duration_minutes || 0)} min\n`;

            // Specs
            const specs = [];
            if (o.load_weight) specs.push(`⚖️ ${o.load_weight}kg`);
            if (o.load_length) specs.push(`📏 ${o.load_length}m`);
            if (o.requires_crane) specs.push(`🏗️ Grúa${o.crane_height ? ` (${o.crane_height}m)` : ''}`);
            if (o.requires_jib) specs.push(`🏗️ JIB`);
            if (o.requires_box_body) specs.push(`📦 Caja`);
            if (o.accessories && o.accessories.length > 0) specs.push(`⚙️ ${o.accessories.join(', ')}`);

            if (specs.length > 0) {
                text += `\n🛠️ *Especificaciones:*\n   ${specs.join(' | ')}\n`;
            }

            text += `\n----------------------------------\n\n`;
        });

        navigator.clipboard.writeText(text)
            .then(() => alert(`✅ Planificación de ${driver.name} copiada al portapapeles`))
            .catch(err => console.error('Error al copiar:', err));
    };

    return (
        <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                        <span className="text-3xl">📅</span> Planificación por Conductor
                    </h1>

                    <div className="h-8 w-px bg-gray-300 mx-2"></div>

                    {/* Date Picker Button */}
                    <div className="relative">
                        <button
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="flex items-center gap-2 bg-gray-50 hover:bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-4 py-2 transition-all shadow-sm active:scale-95"
                        >
                            <span className="text-xl">📆</span>
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha Seleccionada</span>
                                <span className="text-sm font-black text-gray-800">
                                    {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </button>

                        {/* Dropdown Calendar */}
                        {isCalendarOpen && (
                            <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <InlineCalendar
                                    label="Seleccionar fecha"
                                    selectedDate={selectedDate}
                                    onChange={(d) => {
                                        setSelectedDate(d);
                                        setIsCalendarOpen(false);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedDate(new Date().toLocaleDateString('sv-SE'))}
                        className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                        HOY
                    </button>
                </div>
            </div>

            {/* Scrollable Columns Area */}
            <div className="flex-grow overflow-x-auto overflow-y-hidden custom-scrollbar bg-gray-100 p-4">
                <div className="inline-flex gap-4 h-full">
                    {activeDrivers.map(driver => (
                        <div key={driver.id} className="w-80 flex-shrink-0 flex flex-col bg-gray-50 rounded-xl border border-gray-200 shadow-sm h-full overflow-hidden">
                            {/* Column Header */}
                            <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-black text-gray-800 truncate text-lg">
                                        {driver.name}
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {ordersByDriver[driver.id]?.length || 0}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleCopyWhatsApp(driver)}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                >
                                    <span>💬</span> Copiar WhatsApp
                                </button>
                            </div>

                            {/* Column Body (Orders List) */}
                            <div className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {ordersByDriver[driver.id]?.length > 0 ? (
                                    ordersByDriver[driver.id].map(order => (
                                        <div key={order.id} className="transform transition-all hover:scale-[1.02]">
                                            <div className="text-[10px] font-bold text-gray-400 mb-1 ml-1 flex justify-between">
                                                <span>{new Date(order.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>{order.estimated_duration} min</span>
                                            </div>
                                            <OrderCard
                                                order={order}
                                                variant="list"
                                                isOverlapping={false}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-lg m-2">
                                        <span className="text-2xl mb-1">💤</span>
                                        <span className="text-xs font-medium">Sin tareas</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
