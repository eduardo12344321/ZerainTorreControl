import React, { useState } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { InlineCalendar } from '../ui/InlineCalendar';
import type { Truck } from '../../types';

interface ITVModalProps {
    isOpen: boolean;
    onClose: () => void;
    truck: Truck | null;
}

export const ITVModal: React.FC<ITVModalProps> = ({ isOpen, onClose, truck }) => {
    const { updateTruck } = useGlobalContext();
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

    if (!isOpen || !truck) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Update Truck Expiration Date
        updateTruck({
            ...truck,
            itv_expiration: new Date(date).toISOString()
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">

                {/* Header */}
                <div className="bg-blue-600 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">📅</span>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Programar Próxima ITV</h2>
                            <p className="text-xs text-blue-100 font-bold uppercase tracking-widest mt-0.5">{truck.plate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2 transition-colors text-xl">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                        Selecciona la fecha de validez de la nueva ITV.
                    </div>

                    <InlineCalendar
                        label="Fecha de Vencimiento"
                        selectedDate={date}
                        onChange={setDate}
                    />

                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                const d = new Date(date || new Date());
                                d.setFullYear(d.getFullYear() + 2);
                                setDate(d.toISOString().split('T')[0]);
                            }}
                            className="py-2 px-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                            +2 AÑOS
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const d = new Date(date || new Date());
                                d.setFullYear(d.getFullYear() + 1);
                                setDate(d.toISOString().split('T')[0]);
                            }}
                            className="py-2 px-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                            +1 AÑO
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const d = new Date(date || new Date());
                                d.setMonth(d.getMonth() + 6);
                                setDate(d.toISOString().split('T')[0]);
                            }}
                            className="py-2 px-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                            +6 MESES
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-black shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                        Guardar Fecha ITV
                    </button>
                </form>
            </div>
        </div>
    );
};
