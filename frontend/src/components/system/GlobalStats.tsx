import React from 'react';
import { useGlobalContext } from '../../context/GlobalContext';

export const GlobalStats: React.FC = () => {
    const { orders } = useGlobalContext();

    // Filter for today
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const todayOrders = orders.filter(o => o.scheduled_start?.startsWith(todayStr));

    const completed = todayOrders.filter(o => o.status === 'COMPLETED').length;
    const inProgress = todayOrders.filter(o => o.status === 'IN_PROGRESS').length;
    const pending = todayOrders.filter(o => o.status === 'PLANNED').length;
    const total = todayOrders.length;

    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-2 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                    <span className="text-2xl">🚛</span>
                </div>
                <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progreso del Día</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-gray-800">{completed}</span>
                        <span className="text-xs text-gray-400 font-bold">/ {total} PEDIDOS</span>
                    </div>
                </div>
            </div>

            <div className="flex-grow max-w-md">
                <div className="flex justify-between items-center mb-1 text-[10px] font-bold">
                    <span className="text-blue-600 uppercase">Eficiencia Operativa</span>
                    <span className="text-gray-700">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase">En Curso</div>
                    <div className="text-sm font-black text-orange-500">{inProgress}</div>
                </div>
                <div className="w-px h-8 bg-gray-100"></div>
                <div className="text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase">Planificados</div>
                    <div className="text-sm font-black text-blue-500">{pending}</div>
                </div>
                <div className="w-px h-8 bg-gray-100"></div>
                <div className="text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase">Finalizados</div>
                    <div className="text-sm font-black text-emerald-500">{completed}</div>
                </div>
            </div>
        </div>
    );
};
