import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { InlineCalendar } from '../ui/InlineCalendar';

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (truckId: string, start: Date, end: Date, reason: string) => void;
    defaultTruckId?: string;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onConfirm, defaultTruckId }) => {
    const { trucks, orders, deleteOrder } = useGlobalContext();
    // Find the truck based on defaultTruckId, checking both id and plate
    const initialTruck = trucks.find(t => t.id === defaultTruckId || t.plate === defaultTruckId);

    const [truckId, setTruckId] = useState<string>(initialTruck?.id || '');
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState<string>('08:00');
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endTime, setEndTime] = useState<string>('18:00');
    const [reason, setReason] = useState<string>('Mantenimiento Programado');
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset form when opening
            setStartDate(new Date().toISOString().split('T')[0]);
            setEndDate(new Date().toISOString().split('T')[0]);
            setReason('Mantenimiento Programado');
            setStartTime('08:00');
            setEndTime('18:00');

            if (defaultTruckId) {
                setTruckId(defaultTruckId);
            } else if (!truckId) {
                setTruckId(trucks[0]?.id || '');
            }
        }
    }, [isOpen, defaultTruckId, trucks]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!truckId || !startDate || !endDate) return;

        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);

        if (end <= start) {
            alert("La fecha fin debe ser posterior a la inicio");
            return;
        }

        onConfirm(truckId, start, end, reason);
        onClose();
    };

    const truck = trucks.find(t => t.id === truckId || t.plate === truckId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">

                {/* Header */}
                <div className="bg-red-600 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">🔧</span>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Bloquear Camión para Mantenimiento</h2>
                            <p className="text-xs text-red-100 font-bold uppercase tracking-widest mt-0.5">Gestión de Taller y Revisiones</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2 transition-colors text-xl">✕</button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Truck Badge - Read Only */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl shadow-inner">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Vehículo:</div>
                        <div className="flex items-center gap-4 flex-grow">
                            <div className="w-[180px] bg-white border-2 border-gray-900 rounded-lg py-2 flex items-center justify-center relative overflow-hidden shadow-sm">
                                <div className="absolute left-0 top-0 bottom-0 w-3 bg-blue-800 flex items-center justify-center">
                                    <span className="text-[6px] text-white font-bold leading-none">E</span>
                                </div>
                                <span className="text-2xl font-black text-gray-900 tracking-widest font-mono">
                                    {truck?.plate || '---'}
                                </span>
                            </div>
                            <div className="text-xl font-black text-gray-800 uppercase italic underline underline-offset-4 decoration-red-500">
                                {truck?.alias}
                            </div>
                        </div>
                        <span className="text-[10px] bg-red-100 text-red-700 px-3 py-1 rounded-full font-black uppercase shadow-sm">Bloqueado Contextual</span>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
                        {/* LEFT: CALENDARS */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <InlineCalendar
                                    label="Día de Inicio"
                                    selectedDate={startDate}
                                    onChange={setStartDate}
                                />
                                <InlineCalendar
                                    label="Día de Fin"
                                    selectedDate={endDate}
                                    onChange={setEndDate}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Hora de Entrada</span>
                                    <input type="time" className="bg-transparent text-lg font-black text-gray-800 outline-none" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Hora de Salida</span>
                                    <input type="time" className="bg-transparent text-lg font-black text-gray-800 outline-none" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: REASONS & ACTIONS */}
                        <div className="space-y-8 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Motivo del Bloqueo</label>
                                    <div className="flex gap-2">
                                        {['Taller', 'Averiado'].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setReason(r)}
                                                className={`
                                                    flex-1 py-3 px-2 rounded-xl text-sm font-black border-2 transition-all transform active:scale-95
                                                    ${reason.includes(r)
                                                        ? 'bg-red-600 border-red-700 text-white shadow-lg'
                                                        : 'bg-white border-gray-100 text-gray-600 hover:border-red-200 hover:bg-red-50'
                                                    }
                                                `}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-red-50 outline-none transition-all resize-none h-32"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="Describe el motivo o notas adicionales..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xl font-black shadow-xl shadow-red-200 transition-all active:scale-95 transform hover:-translate-y-1 mt-auto"
                            >
                                Bloquear Camión Ahora
                            </button>
                        </div>
                    </form>

                    {/* EXISTING MAINTENANCE LIST */}
                    <div className="pt-8 border-t border-gray-100">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Mantenimientos Programados</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {orders
                                .filter(o =>
                                    (
                                        (String(o.truck_id).trim() === String(truck?.id).trim()) ||
                                        (String(o.truck_id).trim().toUpperCase() === String(truck?.plate).trim().toUpperCase())
                                    ) &&
                                    (o.status === 'MAINTENANCE' || o.type === 'MAINTENANCE' || o.client_name === 'MANTENIMIENTO')
                                )
                                .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
                                .map(maint => {
                                    const isConfirming = confirmingDeleteId === maint.id;
                                    return (
                                        <div key={maint.id} className={`p-4 rounded-xl flex items-center gap-4 transition-all ${isConfirming ? 'bg-orange-50 border-2 border-orange-200' : 'bg-red-50 border border-red-100 group hover:border-red-200'}`}>
                                            <div className="flex-grow min-w-0">
                                                {!isConfirming ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">🔧</span>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Desde:</span>
                                                                    <span className="text-xs font-black text-red-800">
                                                                        {new Date(maint.scheduled_start).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Hasta:</span>
                                                                    <span className="text-xs font-black text-red-800">
                                                                        {new Date(new Date(maint.scheduled_start).getTime() + maint.estimated_duration * 60000).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="pl-7">
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Motivo / Notas:</div>
                                                            <p className="text-xs text-red-600 font-bold leading-tight bg-white/50 p-2 rounded-lg border border-red-100/50">
                                                                {maint.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest">¿Borrar este mantenimiento?</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isConfirming ? (
                                                    <>
                                                        <span className="text-[10px] font-black text-orange-600 uppercase">¿Confirmar?</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmingDeleteId(null)}
                                                            className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase"
                                                        >
                                                            No
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                deleteOrder(maint.id);
                                                                setConfirmingDeleteId(null);
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all bg-red-600 text-white shadow-md hover:bg-red-700"
                                                        >
                                                            SÍ, ANULAR
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmingDeleteId(maint.id)}
                                                        className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-50 transition-all shadow-sm"
                                                        title="Cancelar este mantenimiento"
                                                    >
                                                        CANCELAR TALLER
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            {orders.filter(o => (o.truck_id === truck?.id || o.truck_id === truck?.plate) && (o.status === 'MAINTENANCE' || o.type === 'MAINTENANCE')).length === 0 && (
                                <div className="text-gray-400 text-xs italic p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 col-span-2 text-center">
                                    No hay mantenimientos activos para este vehículo.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
