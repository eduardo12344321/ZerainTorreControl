import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AlertBadge } from '../common/AlertBadge';
import { AdminMobileLite } from '../mobile/AdminMobileLite';

export const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `px-4 py-2.5 rounded-lg text-base font-bold transition-all flex items-center gap-3 ${isActive
            ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200 transform scale-105'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
        }`;

    return (
        <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
            {/* Global Header - Always visible but adapted */}
            <header className="bg-white border-b border-gray-200 h-16 md:h-20 flex items-center px-4 md:px-6 justify-between shadow-sm z-30 flex-shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* Brand */}
                    <div
                        className="flex items-center gap-2 shrink-0 cursor-pointer"
                        onClick={() => navigate('/')}
                    >
                        <h1 className="text-sm md:base font-black text-gray-800 tracking-wider">
                            ZERAIN <span className="text-zerain-blue">{isMobile ? 'LITE' : 'TORRE DE CONTROL'}</span>
                        </h1>
                        {!isMobile && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                                ONLINE
                            </span>
                        )}
                    </div>

                    {/* Navigation - Hidden on very small mobile, Scrollable on desktop/tablet */}
                    <div className="relative flex-grow flex items-center overflow-hidden h-14 ml-2 md:ml-4 border-l border-gray-100 pl-4">
                        <nav className="flex items-center gap-2 overflow-x-auto custom-scrollbar scroll-smooth flex-nowrap h-full pr-12">
                            <NavLink to="/" className={navLinkClass} end style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">🏠</span> <span className="hidden xl:inline">Inicio</span>
                            </NavLink>
                            <NavLink to="/orders" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">📋</span> <span className="hidden xl:inline">Órdenes</span>
                            </NavLink>
                            <NavLink to="/presupuestos" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">📉</span> <span className="hidden xl:inline">Presupuestos</span>
                            </NavLink>
                            <NavLink to="/planning-drivers" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">📅</span> <span className="hidden xl:inline">Planificación</span>
                            </NavLink>
                            <NavLink to="/albaranes" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">📄</span> <span className="hidden xl:inline">Albaranes</span>
                            </NavLink>
                            <NavLink to="/routes" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">🛤️</span> <span className="hidden xl:inline">Rutas</span>
                            </NavLink>
                            <NavLink to="/strada" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">🌍</span> <span className="hidden 2xl:inline">Strada</span>
                            </NavLink>
                            <NavLink to="/trabajadores" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">👷</span> <span className="hidden 2xl:inline">Trabajadores</span>
                            </NavLink>
                            <NavLink to="/vehiculos" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">🚛</span> <span className="hidden 2xl:inline">Vehículos</span>
                            </NavLink>
                            <NavLink to="/clientes" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">👥</span> <span className="hidden 2xl:inline">Clientes</span>
                            </NavLink>
                            <NavLink to="/productos" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">🏷️</span> <span className="hidden 2xl:inline">Productos</span>
                            </NavLink>
                            <NavLink to="/invoices" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">💶</span> <span className="hidden 2xl:inline">Facturas</span>
                            </NavLink>
                            <NavLink to="/system" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">⚙️</span> <span className="hidden 2xl:inline">Sistema</span>
                            </NavLink>
                            <NavLink to="/ai-prompts" className={navLinkClass} style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-xl">🤖</span> <span className="hidden 2xl:inline">Prompts IA</span>
                            </NavLink>
                        </nav>

                        {/* Gradient mask for scrolling navigation */}
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6 ml-2 shrink-0">
                    <div className="hidden sm:block">
                        <AlertBadge />
                    </div>
                    <div className="text-[10px] md:text-sm text-gray-500 font-mono hidden sm:block">
                        {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('admin_token');
                            navigate('/login/admin');
                        }}
                        className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold text-xs transition-colors border border-red-100"
                        title="Cerrar Sesión"
                    >
                        <span>🚪</span> <span className="hidden md:inline">Salir</span>
                    </button>
                </div>
            </header>

            {/* Page Content */}
            <div className="flex-grow overflow-hidden relative">
                {isMobile && location.pathname === '/' ? (
                    <AdminMobileLite />
                ) : (
                    <Outlet />
                )}
            </div>
        </div>
    );
};
