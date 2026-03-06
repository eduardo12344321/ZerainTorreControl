import React, { useState } from 'react';

// STYLES EXTRACTED FROM HTML (AS COMPONENTS)
const Card = ({ children, title, onClick }: any) => (
    <div onClick={onClick} className="bg-white rounded-xl p-4 shadow-[0_2px_5px_rgba(0,0,0,0.05)] mb-4">
        {title && <h3 className="text-[#004481] text-sm font-extrabold uppercase border-b-2 border-gray-100 pb-2 mb-4 tracking-wide">{title}</h3>}
        {children}
    </div>
);

const SmartButton = ({ type, onClick }: any) => {
    if (type === 'MORNING' || type === 'FRIDAY') {
        const isFriday = type === 'FRIDAY';
        return (
            <button
                onClick={onClick}
                className="w-full bg-gradient-to-br from-green-600 to-green-700 text-white p-4 rounded-xl shadow-sm mb-3 flex items-center justify-between font-bold active:scale-[0.98] transition-transform"
            >
                <div className="text-left">
                    <div className="text-[11px] opacity-90 mb-1">{isFriday ? 'JORNADA VIERNES' : 'JORNADA LUN-JUE'}</div>
                    <div className="text-base">{isFriday ? '07:00 - 14:30' : '07:00 - 18:00 (P)'}</div>
                </div>
                <i className={`${isFriday ? 'fas fa-glass-cheers' : 'fas fa-briefcase'} text-2xl opacity-80`}></i>
            </button>
        );
    }
    if (type === 'LUNCH') {
        return (
            <button
                onClick={onClick}
                className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-sm mb-3 flex items-center justify-between font-bold active:scale-[0.98] transition-transform"
            >
                <div className="text-left">
                    <div className="text-[11px] opacity-90 mb-1">PAUSA COMIDA</div>
                    <div className="text-base">13:00 - 15:00</div>
                </div>
                <i className="fas fa-utensils text-2xl opacity-80"></i>
            </button>
        );
    }
    return null;
};

export const DriverMasterClockIn: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showManual, setShowManual] = useState(false);

    // Helpers
    const isFriday = currentDate.getDay() === 5;
    const changeDate = (days: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        setCurrentDate(newDate);
    };

    const handleClockIn = (type: string) => {
        alert(`Fichaje ${type} guardado para ${currentDate.toLocaleDateString()}`);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* DATE NAV */}
            <div className="bg-[#eef2f5] p-3 rounded-lg mb-4 flex justify-between items-center text-[#004481]">
                <button onClick={() => changeDate(-1)} className="p-2 active:scale-90"><i className="fas fa-chevron-left text-lg"></i></button>
                <div className="text-center">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{currentDate.toLocaleDateString('es-ES', { weekday: 'long' })}</div>
                    <div className="text-lg font-black text-slate-800">{currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                </div>
                <button onClick={() => changeDate(1)} className="p-2 active:scale-90"><i className="fas fa-chevron-right text-lg"></i></button>
            </div>

            {/* ERROR CARD (If date is future/past validation etc, optional for now) */}

            <Card title="Registro Horario">
                <SmartButton
                    type={isFriday ? 'FRIDAY' : 'MORNING'}
                    onClick={() => handleClockIn('JORNADA')}
                />

                <SmartButton
                    type="LUNCH"
                    onClick={() => handleClockIn('COMIDA')}
                />
            </Card>

            <Card onClick={() => setShowManual(!showManual)}>
                <div className="flex justify-between items-center cursor-pointer">
                    <h3 className="text-[#004481] text-sm font-extrabold uppercase m-0 flex items-center gap-2">
                        <span>⏱️ Fichaje Manual</span>
                    </h3>
                    <i className={`fas fa-chevron-down transition-transform ${showManual ? 'rotate-180' : ''} text-gray-400`}></i>
                </div>

                {showManual && (
                    <div className="mt-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Entrada</label><input type="time" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-center" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Sal. Comer</label><input type="time" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-center" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Ent. Tarde</label><input type="time" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-center" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Salida</label><input type="time" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-center" /></div>
                        </div>
                        <button className="w-full bg-slate-600 text-white font-bold py-3 rounded-lg text-sm active:scale-[0.98]">
                            GUARDAR MANUAL
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
};
