import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { InlineCalendar } from '../ui/InlineCalendar';
import type { Truck } from '../../types';

interface QuickMaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    truck: Truck | null;
    type: 'OIL' | 'TIRES';
}

import { API_BASE } from '../../config';

const STRADA_API = `${API_BASE.replace('/v1', '')}/strada`;

export const QuickMaintenanceModal: React.FC<QuickMaintenanceModalProps> = ({ isOpen, onClose, truck, type }) => {
    const { updateTruck } = useGlobalContext();
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [km, setKm] = useState<number>(0);
    const [loadingKm, setLoadingKm] = useState(false);

    useEffect(() => {
        if (isOpen && truck) {
            const existingDate = type === 'OIL' ? truck.last_oil_change : truck.last_tire_change;
            if (existingDate) {
                setDate(new Date(existingDate).toISOString().split('T')[0]);
            } else {
                setDate(new Date().toISOString().split('T')[0]);
            }
            // Start with what's currently in the truck object
            setKm(type === 'OIL' ? (truck.last_oil_change_km || 0) : (truck.last_tire_change_km || 0));
        }
    }, [isOpen, truck, type]);

    // Fetch odometer reading from Strada when date changes
    useEffect(() => {
        if (!isOpen || !truck || !date) return;

        const fetchStradaKm = async () => {
            setLoadingKm(true);
            try {
                const response = await fetch(`${STRADA_API}/vehicle/${truck.plate}/odometer-at-date?date=${date}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.odometer > 0) {
                        setKm(Math.round(data.odometer));
                    }
                }
            } catch (err) {
                console.error("Error fetching Strada odometer:", err);
            } finally {
                setLoadingKm(false);
            }
        };

        fetchStradaKm();
    }, [date, truck?.plate, isOpen]);

    if (!isOpen || !truck) return null;

    const isOil = type === 'OIL';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const updatedData: Partial<Truck> = isOil ? {
            last_oil_change: new Date(date).toISOString(),
            last_oil_change_km: km
        } : {
            last_tire_change: new Date(date).toISOString(),
            last_tire_change_km: km
        };

        updateTruck({
            ...truck,
            ...updatedData
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">

                {/* Header */}
                <div className={`${isOil ? 'bg-amber-600' : 'bg-slate-700'} p-6 flex justify-between items-center text-white shrink-0`}>
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">{isOil ? '🛢️' : '🔘'}</span>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">
                                {isOil ? 'Registro Cambio Aceite' : 'Registro Cambio Ruedas'}
                            </h2>
                            <p className="text-xs opacity-80 font-bold uppercase tracking-widest mt-0.5">{truck.plate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2 transition-colors text-xl">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kilometraje Actual</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={km}
                                    onChange={e => setKm(Number(e.target.value))}
                                    className={`w-full bg-white border-2 ${loadingKm ? 'border-amber-300 opacity-50' : 'border-gray-200'} rounded-xl px-4 py-3 text-xl font-black text-gray-800 focus:border-amber-500 outline-none transition-all`}
                                    placeholder="0"
                                />
                                {loadingKm && (
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                                    </div>
                                )}
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400">
                                    {loadingKm ? 'BUSCANDO...' : 'KM'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <InlineCalendar
                        label="Fecha del Cambio"
                        selectedDate={date}
                        onChange={setDate}
                    />

                    <button
                        type="submit"
                        className={`w-full py-4 ${isOil ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-800'} text-white rounded-xl text-lg font-black shadow-lg transition-all active:scale-95`}
                    >
                        Guardar Registro
                    </button>
                </form>
            </div>
        </div>
    );
};
