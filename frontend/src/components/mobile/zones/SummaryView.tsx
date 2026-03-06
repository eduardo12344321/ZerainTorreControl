import React, { useMemo } from 'react';

interface SummaryViewProps {
    driver: any;
    onLogout: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ driver, onLogout }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Generate all days of current month for the list
    const monthDays = useMemo(() => {
        const days = [];
        const date = new Date(currentYear, currentMonth, 1);
        while (date.getMonth() === currentMonth) {
            days.push(new Date(date).toISOString().split('T')[0]);
            date.setDate(date.getDate() + 1);
        }
        return days.reverse(); // Newest first
    }, [currentMonth, currentYear]);

    const stats = useMemo(() => {
        if (!driver?.daily_records) return { totalRegular: 0, totalExtraApproved: 0, totalExtraPending: 0, totalDiets: 0 };

        const records = driver.daily_records.filter((r: any) => r.date.startsWith(`${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`));

        return records.reduce((acc: any, r: any) => ({
            totalRegular: acc.totalRegular + (r.regular_hours || 0),
            totalExtraApproved: acc.totalExtraApproved + (r.status === 'APPROVED' ? (r.overtime_hours || 0) : 0),
            totalExtraPending: acc.totalExtraPending + (r.status === 'PENDING' ? (r.overtime_hours || 0) : 0),
            totalDiets: acc.totalDiets + (r.diet_count || 0)
        }), { totalRegular: 0, totalExtraApproved: 0, totalExtraPending: 0, totalDiets: 0 });
    }, [driver, currentMonth, currentYear]);

    const getDayName = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
    };

    const getDayNumber = (dateStr: string) => dateStr.split('-')[2];

    return (
        <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
            {/* Header Totals Card */}
            <div className="bg-slate-900 rounded-b-[2.5rem] p-8 pt-10 shadow-2xl relative overflow-hidden border-b border-white/5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-lime-400/10 rounded-full blur-3xl -mr-24 -mt-24"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Perfil de Conductor</h2>
                            <p className="text-2xl font-black text-white tracking-tighter capitalize">
                                {driver?.name}
                            </p>
                        </div>
                        {/* Logout integrated in Summary too for clarity */}
                        <button
                            onClick={onLogout}
                            className="bg-red-500/20 text-red-400 px-4 py-2 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-red-500/30"
                        >
                            Log Out
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl mb-3 border border-white/5">⏱️</div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Normal</p>
                            <p className="text-xl font-black text-white tabular-nums">{stats.totalRegular.toFixed(1)}<span className="text-[10px] ml-0.5 text-slate-400">h</span></p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-lime-400/10 flex items-center justify-center text-xl mb-3 border border-lime-400/20">⚡</div>
                            <p className="text-[9px] font-black text-lime-500 uppercase tracking-widest">Extras</p>
                            <p className="text-xl font-black text-lime-400 tabular-nums">+{stats.totalExtraApproved.toFixed(1)}<span className="text-[10px] ml-0.5 opacity-60">h</span></p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-blue-400/10 flex items-center justify-center text-xl mb-3 border border-blue-400/20">🥗</div>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Dietas</p>
                            <p className="text-xl font-black text-blue-400 tabular-nums">{stats.totalDiets}</p>
                        </div>
                    </div>

                    {stats.totalExtraPending > 0 && (
                        <div className="mt-8 flex items-center gap-3 bg-amber-400/10 text-amber-500 p-4 rounded-3xl text-[10px] font-black uppercase tracking-widest border border-amber-400/20">
                            <span className="text-base animate-pulse">⏳</span>
                            <span>{stats.totalExtraPending.toFixed(1)}h pendientes</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Daily Breakdown */}
            <div className="-mt-8 px-4 space-y-4 relative z-20">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                        Historial de Jornadas
                    </h3>
                </div>

                <div className="space-y-3">
                    {monthDays.map(date => {
                        const record = driver.daily_records?.find((r: any) => r.date === date);
                        const isApproved = record?.status === 'APPROVED';
                        const isRejected = record?.status === 'REJECTED';
                        const isModified = record?.is_modified;
                        const hasData = record && (record.regular_hours > 0 || record.overtime_hours > 0 || record.diet_count > 0);

                        if (!hasData) return null;

                        return (
                            <div key={date} className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center shadow-sm gap-4 transition-all active:scale-[0.98]">
                                {/* Day Indicator */}
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center flex-shrink-0 shadow-inner">
                                    <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{getDayName(date)}</span>
                                    <span className="text-lg font-black text-slate-900 tracking-tighter mt-0.5">{getDayNumber(date)}</span>
                                </div>

                                {/* Metrics */}
                                <div className="flex-grow grid grid-cols-3 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Normal</span>
                                        <span className="text-xs font-black text-slate-800">{record.regular_hours.toFixed(1)}h</span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Extra</span>
                                        <span className={`text-xs font-black ${isModified ? 'text-slate-900 italic' :
                                            isApproved ? 'text-lime-600' :
                                                isRejected ? 'text-red-600' :
                                                    'text-blue-500'
                                            }`}>
                                            {record.overtime_hours > 0 ? `+${record.overtime_hours.toFixed(1)}h` : '--'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-end pr-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Status</span>
                                        <div className="flex items-center gap-1">
                                            {isModified && <span className="text-[10px]" title="Editado manually">✏️</span>}
                                            {isApproved ? <span className="w-2 h-2 rounded-full bg-lime-500 shadow-lg shadow-lime-500/50"></span> :
                                                isRejected ? <span className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></span> :
                                                    <span className="w-2 h-2 rounded-full bg-slate-200"></span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BIG FINAL LOGOUT BUTTON */}
            <div className="px-4 mt-4">
                <button
                    onClick={onLogout}
                    className="w-full bg-white border-2 border-red-100 text-red-600 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-lg shadow-red-100/50 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Cerrar Sesión Activa
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-4 font-medium uppercase tracking-widest">
                    Versión 2.0.4 - Zerain Transportes
                </p>
            </div>
        </div>
    );
};
