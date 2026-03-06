import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Zones
// Zones
import { OrdersView } from './zones/OrdersView';
import { SummaryView } from './zones/SummaryView';
import { AttendanceView } from './zones/AttendanceView';


// NEW MASTER IMPORT
import { DriverMasterLayout } from './layout/DriverMasterLayout';
import { DriverMasterDeliveryNote } from './zones/DriverMasterDeliveryNote';
import { DriverMasterExpenses } from './zones/DriverMasterExpenses';

type Zone = 'ATTENDANCE' | 'ORDERS' | 'DELIVERY_NOTES' | 'SUMMARY' | 'EXPENSES';

export const DriverApp: React.FC = () => {
    const navigate = useNavigate();
    const { apiFetch } = useGlobalContext();
    // const { syncNow } = useSync(); // syncNow is handled in Layout header
    const [driver, setDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeZone, setActiveZone] = useState<Zone>('ATTENDANCE');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [orders, setOrders] = useState<any[]>([]);

    // 1. Initial load of profile from backend or localStorage fallback
    const refreshProfile = async () => {
        console.log("ZERAIN: Refrescando perfil...");
        try {
            const res = await apiFetch('/driver/profile');
            if (res.ok) {
                const data = await res.json();
                setDriver(data);
            } else {
                const storedUser = localStorage.getItem('driver_user');
                if (storedUser) setDriver(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error("ZERAIN: Profile fetch error:", e);
            const storedUser = localStorage.getItem('driver_user');
            if (storedUser) setDriver(JSON.parse(storedUser));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, []);

    // 2. Refresh orders when date or driver ID changes
    useEffect(() => {
        const loadOrders = async () => {
            if (!driver?.id) return;
            console.log("ZERAIN: Refrescando órdenes para la fecha:", selectedDate);
            try {
                const ordersRes = await fetch(`${API_BASE}/driver/orders/${driver.id}?date=${selectedDate}`);
                if (ordersRes.ok) {
                    const ordersData = await ordersRes.json();
                    setOrders(ordersData);
                }
            } catch (e) {
                console.error("ZERAIN: Orders fetch error:", e);
            }
        };
        loadOrders();
    }, [selectedDate, driver?.id]);


    const handleLogout = () => {
        if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
            localStorage.removeItem('driver_token');
            localStorage.removeItem('driver_user');
            navigate('/login/driver');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center text-[#004481]">
            <div className="animate-spin text-4xl">⏳</div>
        </div>
    );

    if (!driver) return (
        <div className="min-h-screen bg-[#f2f4f8] p-8 text-center text-[#333] flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-black">Cuenta no vinculada</h1>
            <p className="text-gray-400 mt-2 text-sm">Pide un código de registro en la oficina.</p>
        </div>
    );

    return (
        <DriverMasterLayout
            driver={driver}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            onLogout={handleLogout}
        >
            {activeZone === 'ATTENDANCE' && (
                <AttendanceView
                    driver={driver}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    onRefresh={refreshProfile}
                />
            )}

            {activeZone === 'ORDERS' && (
                <ErrorBoundary fallback={<div className="p-4 text-red-500">Error al cargar las rutas</div>}>
                    <OrdersView
                        orders={orders}
                        setOrders={setOrders}
                    />
                </ErrorBoundary>
            )}

            {activeZone === 'DELIVERY_NOTES' && <DriverMasterDeliveryNote />}

            {activeZone === 'EXPENSES' && <DriverMasterExpenses />}

            {/* KEEP SUMMARY VIEW FOR NOW (?) OR REMOVE IF NOT IN DESIGN */}
            {activeZone === 'SUMMARY' && <SummaryView driver={driver} onLogout={handleLogout} />}

        </DriverMasterLayout>
    );
};
