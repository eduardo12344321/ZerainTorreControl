import React, { type ReactNode } from 'react';
import { useSync } from '../../../context/SyncContext';

interface LayoutProps {
    driver: any;
    children: ReactNode;
    activeZone: 'ATTENDANCE' | 'DELIVERY_NOTES' | 'EXPENSES' | 'ORDERS' | 'SUMMARY';
    setActiveZone: (zone: 'ATTENDANCE' | 'DELIVERY_NOTES' | 'EXPENSES' | 'ORDERS' | 'SUMMARY') => void;
    onLogout: () => void;
}

export const DriverMasterLayout: React.FC<LayoutProps> = ({ driver, children, activeZone, setActiveZone, onLogout }) => {
    const { isOnline } = useSync();

    // Clock for header
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="font-sans text-[#333] bg-[#f2f4f8] min-h-screen pb-24">
            {/* --- HEADER (FIXED) --- */}
            <div className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md px-4 py-3 flex justify-between items-center shadow-md border-b border-gray-100/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-slate-900/20">Z</div>
                    <div>
                        <strong className="text-[#004481] text-[13px] block font-black uppercase tracking-tight leading-none mb-1">{(driver?.name || '').split(' ')[0] || 'Conductor'}</strong>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em]">Zerain Transportes</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden xs:block">
                        <span className="font-black text-[15px] block leading-none text-slate-900">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></span>
                    </div>

                    <button
                        onClick={onLogout}
                        className="w-10 h-10 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 active:scale-90 transition-all shadow-sm"
                    >
                        <i className="fas fa-power-off text-sm"></i>
                    </button>
                </div>
            </div>

            {/* --- CONTENT SPACER --- */}
            <div className="h-[64px]"></div>

            {/* --- CONTENT (Scrollable Area) --- */}
            <div className="pb-4">
                {children}
            </div>

            {/* --- BOTTOM NAV --- */}
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around py-3 z-50 pb-safe">
                <NavItem
                    active={activeZone === 'ATTENDANCE'}
                    onClick={() => setActiveZone('ATTENDANCE')}
                    icon={<i className="fas fa-clock text-xl mb-1"></i>}
                    label="Fichar"
                />
                <NavItem
                    active={activeZone === 'ORDERS'}
                    onClick={() => setActiveZone('ORDERS')}
                    icon={<i className="fas fa-truck text-xl mb-1"></i>}
                    label="Ruta"
                />
                <NavItem
                    active={activeZone === 'DELIVERY_NOTES'}
                    onClick={() => setActiveZone('DELIVERY_NOTES')}
                    icon={<i className="fas fa-file-invoice text-xl mb-1"></i>}
                    label="Albarán"
                />
                <NavItem
                    active={activeZone === 'EXPENSES'}
                    onClick={() => setActiveZone('EXPENSES')}
                    icon={<i className="fas fa-receipt text-xl mb-1"></i>}
                    label="Gastos"
                />
                <NavItem
                    active={activeZone === 'SUMMARY'}
                    onClick={() => setActiveZone('SUMMARY')}
                    icon={<i className="fas fa-user-circle text-xl mb-1"></i>}
                    label="Perfil"
                />
            </div>
        </div>
    );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
    <div
        onClick={onClick}
        className={`flex flex-col items-center flex-1 cursor-pointer transition-colors ${active ? 'text-[#004481]' : 'text-gray-400'}`}
    >
        {icon}
        <span className="text-[10px] font-medium mt-1">{label}</span>
    </div>
);
