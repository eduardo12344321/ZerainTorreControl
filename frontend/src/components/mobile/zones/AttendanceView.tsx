import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGlobalContext } from '../../../context/GlobalContext';
import { useSync } from '../../../context/SyncContext';

interface AttendanceViewProps {
    driver: any;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    onRefresh?: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ driver, selectedDate, setSelectedDate, onRefresh }) => {
    const { fetchDrivers, apiFetch } = useGlobalContext();
    const { isOnline, addToSyncQueue } = useSync();
    const [picker, setPicker] = useState<{
        isOpen: boolean;
        type: string | null;
        title: string;
        step: 'HOUR' | 'MINUTE';
        selectedHour: string | null;
    }>({
        isOpen: false,
        type: null,
        title: '',
        step: 'HOUR',
        selectedHour: null
    });

    const [leavesHistory, setLeavesHistory] = useState<any[]>([]);

    useEffect(() => {
        if (driver?.id) {
            apiFetch(`/driver/leaves?driver_id=${driver.id}`)
                .then(res => res.json())
                .then(data => setLeavesHistory(data))
                .catch(err => console.error("Error fetching leaves", err));
        }
    }, [driver, apiFetch]);

    // Date Navigation
    const handlePrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // Filter Stats for Selected Date
    const dailyStats = useMemo(() => {
        if (!driver?.daily_records) return null;
        return driver.daily_records.find((r: any) => r.date === selectedDate);
    }, [driver, selectedDate]);

    const handleOpenPicker = (type: string, title: string) => {
        setPicker({
            isOpen: true,
            type,
            title,
            step: 'HOUR',
            selectedHour: null
        });
    };

    const handleClosePicker = () => setPicker({ ...picker, isOpen: false });

    const handleLogAttendance = async (time: string, explicitType?: string) => {
        const typeToSend = explicitType || picker.type;
        if (!driver || !typeToSend) return;

        const timestamp = `${selectedDate} ${time}`;
        const payload = {
            driver_id: driver.id,
            type: typeToSend,
            timestamp
        };

        const executeLog = async () => {
            if (!isOnline) {
                console.log("ZERAIN: Offline. Guardando fichaje en cola local...");
                addToSyncQueue({
                    endpoint: '/attendance/log',
                    method: 'POST',
                    body: payload,
                    type: 'ATTENDANCE'
                });
                alert("⏰ Fichaje guardado localmente (Offline).");
                return true;
            }

            try {
                const res = await apiFetch('/attendance/log', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    return true;
                }
            } catch (e) {
                console.error(e);
                alert("❌ Error al registrar. Guardando en cola local...");
                addToSyncQueue({
                    endpoint: '/attendance/log',
                    method: 'POST',
                    body: payload,
                    type: 'ATTENDANCE'
                });
                return true;
            }
            return false;
        };

        const success = await executeLog();
        if (success) {
            handleClosePicker();
            if (onRefresh) onRefresh(); // Refresh local profile
            fetchDrivers(); // Refresh global context
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-24 font-sans text-slate-800">
            {/* Header / Date Navigation - CLEANER UI */}
            <div className="bg-white p-4 pt-6 shadow-sm border-b border-slate-100 sticky top-0 z-20">
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-1">
                    <button
                        onClick={handlePrevDay}
                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all active:scale-90"
                    >
                        ◀
                    </button>
                    <div className="flex flex-col items-center cursor-pointer" onClick={handleToday}>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                            {new Date(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long' })}</span>
                            {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                        </div>
                    </div>
                    <button
                        onClick={handleNextDay}
                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all active:scale-90"
                    >
                        ▶
                    </button>
                </div>
            </div>

            <div className="px-4 space-y-6">

                {/* QUICK ACTIONS - SUGERENCIAS DE TURNO */}
                <div className="gap-3 flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Turnos Rápidos</p>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={async () => {
                                if (!confirm("¿Registrar Horario Estándar (L-J)?")) return;
                                const times = [
                                    { type: 'IN', time: '08:00' },
                                    { type: 'MEAL_IN', time: '13:00' },
                                    { type: 'MEAL_OUT', time: '15:00' },
                                    { type: 'OUT', time: '18:00' }
                                ];
                                for (const t of times) await handleLogAttendance(t.time, t.type);
                            }}
                            className={`p-4 rounded-2xl flex items-center justify-between shadow-sm active:scale-95 transition-all border-2 ${dailyStats?.check_in?.includes('08:00') && dailyStats?.check_out?.includes('18:00')
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-white border-slate-100 hover:border-blue-300'
                                }`}
                        >
                            <div className="text-left">
                                <div className="font-bold text-slate-900 text-sm">Estándar (L-J)</div>
                                <div className="text-[10px] text-slate-400 font-medium">08:00-13:00 | 15:00-18:00</div>
                                {dailyStats?.check_in && dailyStats?.check_out && (
                                    <div className="mt-1 text-[9px] font-black text-emerald-600 uppercase">✓ Jornada Completa</div>
                                )}
                            </div>
                            <span className="text-xl">{dailyStats?.check_in && dailyStats?.check_out ? '✅' : '🏢'}</span>
                        </button>

                        <button
                            onClick={async () => {
                                if (!confirm("¿Registrar Viernes (08:00-13:00 / 15:00-16:45)?")) return;
                                const times = [
                                    { type: 'IN', time: '08:00' },
                                    { type: 'MEAL_IN', time: '13:00' },
                                    { type: 'MEAL_OUT', time: '15:00' },
                                    { type: 'OUT', time: '16:45' }
                                ];
                                for (const t of times) await handleLogAttendance(t.time, t.type);
                            }}
                            className={`p-4 rounded-2xl flex items-center justify-between shadow-sm active:scale-95 transition-all border-2 ${dailyStats?.check_out?.includes('16:45')
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-white border-slate-100 hover:border-lime-500'
                                }`}
                        >
                            <div className="text-left">
                                <div className="font-bold text-slate-900 text-sm">Viernes</div>
                                <div className="text-[10px] text-slate-400 font-medium">08:00-13:00 | 15:00-16:45</div>
                                {dailyStats?.check_out?.includes('16:45') && (
                                    <div className="mt-1 text-[9px] font-black text-emerald-600 uppercase">✓ Registrado</div>
                                )}
                            </div>
                            <span className="text-xl">{dailyStats?.check_out?.includes('16:45') ? '✅' : '🎉'}</span>
                        </button>

                        <button
                            onClick={async () => {
                                if (!confirm("¿Registrar Comida (13:00 - 15:00)?")) return;
                                await handleLogAttendance('13:00', 'MEAL_IN');
                                await handleLogAttendance('15:00', 'MEAL_OUT');
                            }}
                            className={`p-4 rounded-2xl flex items-center justify-between shadow-sm active:scale-95 transition-all border ${dailyStats?.meal_in && dailyStats?.meal_out
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-blue-50 border-blue-100'
                                }`}
                        >
                            <div className="text-left">
                                <div className="font-bold text-blue-900 text-sm">Comida Normal</div>
                                <div className="text-[10px] text-blue-400 font-medium">13:00 - 15:00</div>
                                {dailyStats?.meal_in && dailyStats?.meal_out && (
                                    <div className="mt-1 text-[9px] font-black text-emerald-600">
                                        {(dailyStats.meal_in.split(' ')[1] || '').substring(0, 5)} - {(dailyStats.meal_out.split(' ')[1] || '').substring(0, 5)}
                                    </div>
                                )}
                            </div>
                            <span className="text-xl">{dailyStats?.meal_in && dailyStats?.meal_out ? '✅' : '🥪'}</span>
                        </button>
                    </div>
                </div>

                {/* MANUAL REGISTRATION - SMALLER ICONS */}
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Manual</p>
                    <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button
                                onClick={() => handleOpenPicker('IN', 'Entrada')}
                                className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-1 border-b-4 border-black active:border-b-0 active:translate-y-0.5"
                            >
                                <span className="text-xl">⚡</span>
                                <span className="font-black text-[11px] uppercase tracking-wide">Entrada</span>
                                {dailyStats?.check_in && (
                                    <span className="text-[11px] bg-lime-400 text-slate-900 px-3 py-0.5 rounded-full font-black mt-1 shadow-sm">
                                        {(dailyStats.check_in.split(' ')[1] || '').substring(0, 5)}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => handleOpenPicker('OUT', 'Salida')}
                                className="bg-white border-2 border-slate-100 text-slate-900 rounded-2xl p-4 shadow-sm active:scale-95 transition-all flex flex-col items-center justify-center gap-1 border-b-4 border-slate-200 active:border-b-0 active:translate-y-0.5"
                            >
                                <span className="text-xl">🏁</span>
                                <span className="font-black text-[11px] uppercase tracking-wide">Salida</span>
                                {dailyStats?.check_out && (
                                    <span className="text-[11px] bg-slate-900 text-white px-3 py-0.5 rounded-full font-black mt-1 shadow-sm">
                                        {(dailyStats.check_out.split(' ')[1] || '').substring(0, 5)}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleOpenPicker('MEAL_IN', 'Inicio Comida')}
                                className="bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl p-3 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-xl">🍽️</span>
                                <span className="font-black text-[10px] uppercase">Ini. Comida</span>
                                {dailyStats?.meal_in && (
                                    <span className="text-[10px] font-black text-slate-900 bg-white px-2 rounded border border-slate-200">
                                        {(dailyStats.meal_in.split(' ')[1] || '').substring(0, 5)}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => handleOpenPicker('MEAL_OUT', 'Fin Comida')}
                                className="bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl p-3 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-xl">🚚</span>
                                <span className="font-black text-[10px] uppercase">Fin Comida</span>
                                {dailyStats?.meal_out && (
                                    <span className="text-[10px] font-black text-slate-900 bg-white px-2 rounded border border-slate-200">
                                        {(dailyStats.meal_out.split(' ')[1] || '').substring(0, 5)}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* STATS SUMMARY - COMPACT */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Horas Totales</p>
                        <div className="text-3xl font-black text-slate-900">{dailyStats?.total_hours || '0.00'}h</div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Extras / Dietas</p>
                        <div className="text-sm font-medium text-slate-600">
                            {dailyStats?.overtime_hours || 0}h <span className="text-slate-300 mx-1">|</span> {dailyStats?.diets || 0} 🥗
                        </div>
                    </div>
                </div>

                {/* LEAVE / PERMISSION SECTION */}
                <div className="pb-4">
                    <button
                        onClick={() => alert("Historial de permisos: " + (leavesHistory.length > 0 ? `${leavesHistory.length} solicitudes` : "Ninguna todavía"))}
                        className="w-full py-4 flex items-center justify-between text-slate-400 border-b border-slate-100"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">Solicitar Permiso / Baja</span>
                        <span className="text-lg">➔</span>
                    </button>
                </div>

            </div>

            {/* 2-STEP TIME PICKER MODAL */}
            {picker.isOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{picker.title}</p>
                                <div className="text-3xl font-black text-slate-900 tabular-nums">
                                    {picker.selectedHour ? picker.selectedHour : '--'}:{picker.step === 'MINUTE' ? '--' : '--'}
                                </div>
                            </div>
                            {picker.step === 'MINUTE' && (
                                <button
                                    onClick={() => setPicker(p => ({ ...p, step: 'HOUR', selectedHour: null }))}
                                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg"
                                >
                                    Volver
                                </button>
                            )}
                        </div>

                        <div className="p-4 h-[320px] overflow-y-auto custom-scrollbar">
                            {/* STEP 1: HOURS */}
                            {picker.step === 'HOUR' && (
                                <div className="grid grid-cols-4 gap-3">
                                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => {
                                        const isCommon = [6, 7, 8, 13, 14, 15, 16, 17, 18].includes(parseInt(h));
                                        return (
                                            <button
                                                key={h}
                                                onClick={() => setPicker(p => ({ ...p, selectedHour: h, step: 'MINUTE' }))}
                                                className={`py-3 rounded-xl font-bold text-lg transition-all ${isCommon ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-white border text-slate-400 hover:bg-slate-50'}`}
                                            >
                                                {h}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* STEP 2: MINUTES */}
                            {picker.step === 'MINUTE' && (
                                <div className="grid grid-cols-3 gap-3">
                                    {/* 5 minute intervals */}
                                    {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => handleLogAttendance(`${picker.selectedHour}:${m}`)}
                                            className="bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-100 py-4 rounded-xl font-bold text-xl transition-all text-slate-700"
                                        >
                                            :{m}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={handleClosePicker}
                                className="w-full py-4 rounded-xl font-bold uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
