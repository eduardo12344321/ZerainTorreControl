import React, { useState, useEffect } from 'react';

interface TimePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (time: string) => void;
    title: string;
    initialTime?: string;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ isOpen, onClose, onConfirm, title, initialTime }) => {
    const [selectedHour, setSelectedHour] = useState(8);
    const [selectedMinute, setSelectedMinute] = useState(0);

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            let h = now.getHours();
            let m = now.getMinutes();

            // If initialTime provided, parse it
            if (initialTime) {
                const [hh, mm] = initialTime.split(':').map(Number);
                if (!isNaN(hh)) h = hh;
                if (!isNaN(mm)) m = mm;
            } else {
                // Round to nearest 5
                m = Math.round(m / 5) * 5;
                if (m === 60) {
                    m = 0;
                    h = (h + 1) % 24;
                }
            }
            setSelectedHour(h);
            setSelectedMinute(m);
        }
    }, [isOpen, initialTime]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const hStr = selectedHour.toString().padStart(2, '0');
        const mStr = selectedMinute.toString().padStart(2, '0');
        onConfirm(`${hStr}:${mStr}`);
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10... 55

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal Content */}
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8 animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="w-16 h-2 bg-slate-200 rounded-full mx-auto mb-8"></div>

                <h3 className="text-2xl font-black text-slate-800 text-center mb-8 uppercase tracking-tight">
                    {title}
                </h3>

                {/* Digital Display */}
                <div className="flex justify-center items-center gap-4 mb-10">
                    <div className="bg-indigo-50 text-indigo-700 text-7xl font-black p-6 rounded-3xl min-w-[6.5rem] text-center border-4 border-indigo-100 shadow-inner">
                        {selectedHour.toString().padStart(2, '0')}
                    </div>
                    <div className="text-indigo-300 text-5xl font-black mb-2 animate-pulse">:</div>
                    <div className="bg-indigo-50 text-indigo-700 text-7xl font-black p-6 rounded-3xl min-w-[6.5rem] text-center border-4 border-indigo-100 shadow-inner">
                        {selectedMinute.toString().padStart(2, '0')}
                    </div>
                </div>

                {/* Selection Grids */}
                <div className="space-y-8 mb-10">
                    {/* Hours */}
                    <div>
                        <p className="text-[12px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">HORA</p>
                        <div className="grid grid-cols-6 gap-3">
                            {hours.map(h => (
                                <button
                                    key={h}
                                    onClick={() => setSelectedHour(h)}
                                    className={`h-12 rounded-2xl font-black text-lg transition-all ${selectedHour === h
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Minutes */}
                    <div>
                        <p className="text-[12px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">MINUTOS</p>
                        <div className="grid grid-cols-6 gap-3">
                            {minutes.map(m => (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMinute(m)}
                                    className={`h-12 rounded-2xl font-black text-lg transition-all ${selectedMinute === m
                                        ? 'bg-orange-500 text-white shadow-xl shadow-orange-200 scale-110'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {m.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-6">
                    <button
                        onClick={onClose}
                        className="py-5 font-black text-slate-400 uppercase text-sm hover:bg-slate-50 rounded-2xl transition-colors tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-sm shadow-2xl shadow-indigo-100 active:scale-95 transition-transform tracking-widest"
                    >
                        Confirmar Hora
                    </button>
                </div>
            </div>
        </div>
    );
};
