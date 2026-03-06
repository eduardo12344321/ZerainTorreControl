import React from 'react';
import { useGlobalContext } from '../../context/GlobalContext';

export const AlertBadge: React.FC = () => {
    const { trucks } = useGlobalContext();

    const criticalITVs = trucks.filter(truck => {
        if (!truck.itv_expiration) return false;
        const expirationDate = new Date(truck.itv_expiration);
        const today = new Date();
        const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 24;
    });

    const criticalMaints = trucks.filter(truck => {
        if (!truck.next_maintenance) return false;
        const expirationDate = new Date(truck.next_maintenance);
        const today = new Date();
        const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 15; // Warning threshold for maintenance
    });

    if (criticalITVs.length === 0 && criticalMaints.length === 0) return null;

    return (
        <div className="flex gap-4">
            {criticalITVs.length > 0 && (
                <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-xl border border-red-200 shadow-sm animate-pulse-slow">
                    <span className="text-xl">🚨</span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-red-700 uppercase tracking-widest leading-none mb-1">
                            ITV Pendientes ({criticalITVs.length})
                        </span>
                        <div className="text-xs font-bold text-red-900 leading-tight max-w-[200px] truncate">
                            {criticalITVs.map(t => t.plate).join(', ')}
                        </div>
                    </div>
                </div>
            )}

            {criticalMaints.length > 0 && (
                <div className="flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-xl border border-orange-200 shadow-sm animate-pulse-slow">
                    <span className="text-xl">🔧</span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest leading-none mb-1">
                            Revisiones ({criticalMaints.length})
                        </span>
                        <div className="text-xs font-bold text-orange-900 leading-tight max-w-[200px] truncate">
                            {criticalMaints.map(t => t.plate).join(', ')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
