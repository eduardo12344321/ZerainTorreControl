import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Order, Truck, Driver, Customer, DriverExpense, DailyRecord, DriverStatus } from '../types';
import { API_BASE } from '../config';

interface GlobalContextType {
    orders: Order[];
    trucks: Truck[];
    drivers: Driver[];
    customers: Customer[];
    addOrder: (order: Order) => Promise<Order>;
    updateOrder: (updatedOrder: Order) => Promise<void>;
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    addTruck: (truck: Truck) => Promise<void>;
    updateTruck: (updatedTruck: Truck) => Promise<void>;
    deleteTruck: (truckId: string) => Promise<void>;
    addDriver: (driver: Driver) => void;
    updateDriver: (updatedDriver: Driver) => void;
    deleteDriver: (driverId: string) => void;
    approveExpense: (driverId: string, expenseId: string) => void;
    rejectExpense: (driverId: string, expenseId: string) => void;
    updateExpenseStatus: (driverId: string, expenseId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => void;
    updateOvertimeStatus: (driverId: string, date: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED') => void;
    saveAttendanceOverride: (override: {
        driver_id: number;
        date: string;
        regular_hours?: number;
        overtime_hours?: number;
        diet_count?: number;
        status?: string;
        admin_comment?: string;
    }) => Promise<void>;
    addExpense: (driverId: string, expense: DriverExpense) => void;
    updateDailyRecord: (driverId: string, record: DailyRecord) => void;
    updateDriverStatus: (driverId: string, status: DriverStatus) => void;
    addCustomer: (customer: Customer) => Promise<void>;
    updateCustomer: (updatedCustomer: Customer) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;
    createMaintenanceOrder: (truckId: string, start: Date, end: Date, reason: string) => void;
    deleteOrder: (orderId: string) => Promise<void>;
    lastCustomerDisplayId: number;
    fetchDrivers: () => Promise<void>;
    fetchTrucks: () => Promise<void>;
    apiFetch: (endpoint: string, options?: any) => Promise<Response>;
    uploadExpenseImage: (file: File) => Promise<any>;
    fetchOrders: () => Promise<void>;
    systemConfig: Record<string, string>;
    updateSystemConfig: (data: Record<string, string>) => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

const STORAGE_KEY = 'zerain_db_workers_v2'; // Bumped version to clear old mocks

const loadInitialData = () => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Error loading localStorage", e);
        }
    }
    return null;
};

// MOCK DATA REMOVED - Using Real Backend

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const initialData = loadInitialData();

    const [trucks, setTrucks] = useState<Truck[]>(initialData?.trucks || []);
    const [drivers, setDrivers] = useState<Driver[]>(initialData?.drivers || []);
    const [customers, setCustomers] = useState<Customer[]>(initialData?.customers || []);
    const [orders, setOrders] = useState<Order[]>(initialData?.orders || []);
    const [systemConfig, setSystemConfig] = useState<Record<string, string>>({});


    const apiFetch = async (endpoint: string, options: any = {}) => {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('driver_token');

        const headers: any = {
            ...options.headers,
            'Authorization': token ? `Bearer ${token}` : ''
        };

        // ONLY add application/json if body is NOT FormData
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        // If it IS FormData, do NOT set Content-Type (browser sets boundary)
        if (options.body instanceof FormData && headers['Content-Type']) {
            delete headers['Content-Type'];
        }

        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

        if (res.status === 401) {
            // Optional: Handle token expiration (e.g., redirect to login)
            console.warn("Unauthorized access - 401");
        }

        return res;
    };

    const fetchDrivers = async () => {
        try {
            const response = await apiFetch('/drivers');
            const data = await response.json();
            // Ensure data is an array before mapping
            const sanitized = Array.isArray(data)
                ? data.map((d: any) => ({ ...d, id: String(d.id) }))
                : [];
            setDrivers(sanitized);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const fetchTrucks = async () => {
        try {
            const response = await apiFetch('/trucks');
            const data = await response.json();
            if (Array.isArray(data)) {
                const sanitized = data.map((t: any) => ({
                    ...t,
                    last_location: t.last_location_lat ? { lat: t.last_location_lat, lng: t.last_location_lng } : undefined
                }));
                setTrucks(sanitized);
            }
        } catch (error) { console.error('Error fetching trucks:', error); }
    };

    const fetchCustomers = async () => {
        try {
            const response = await apiFetch('/customers');
            const data = await response.json();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) { console.error('Error fetching customers:', error); }
    };

    const fetchSystemConfig = async () => {
        try {
            const response = await apiFetch('/admin/config');
            const data = await response.json();
            if (data && typeof data === 'object') {
                setSystemConfig(data);
            }
        } catch (error) { console.error('Error fetching config:', error); }
    };

    const updateSystemConfig = async (data: Record<string, string>) => {
        try {
            const response = await apiFetch('/admin/config', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (response.ok) {
                setSystemConfig(prev => ({ ...prev, ...data }));
            }
        } catch (error) { console.error('Error updating config:', error); }
    };

    const fetchOrders = async () => {
        try {
            console.log('[GlobalContext] Fetching orders from /orders...');
            const response = await apiFetch('/orders');
            console.log('[GlobalContext] Orders response status:', response.status);
            const data = await response.json();
            console.log('[GlobalContext] Orders data received:', data?.length || 0, 'orders');

            // Fetch maintenance orders separately
            console.log('[GlobalContext] Fetching maintenance orders from /maintenance...');
            const maintResponse = await apiFetch('/maintenance');
            const maintData = await maintResponse.json();
            console.log('[GlobalContext] Maintenance data received:', maintData?.length || 0, 'maintenance orders');

            // Merge both arrays
            const allOrders = [
                ...(Array.isArray(data) ? data : []),
                ...(Array.isArray(maintData) ? maintData : [])
            ];

            console.log('[GlobalContext] Total orders (including maintenance):', allOrders.length);
            setOrders(allOrders);
        } catch (error) {
            console.error('[GlobalContext] Error fetching orders:', error);
        }
    };

    // Fetch all data from API on mount
    React.useEffect(() => {
        fetchDrivers();
        fetchTrucks();
        fetchCustomers();
        fetchOrders();
        fetchSystemConfig();
    }, []);


    // HELPERS
    const addOrder = async (order: Order) => {
        try {
            const response = await apiFetch('/orders', {
                method: 'POST',
                body: JSON.stringify(order)
            });
            if (response.ok) {
                const createdOrder = await response.json();
                console.log("Order created successfully:", createdOrder);
                // Instead of a full refetch, just add the new order with its real Odoo ID
                setOrders(prev => [...prev, createdOrder]);
                return createdOrder;
            }
            return order;
        } catch (e) {
            console.error("Error adding order", e);
            throw e;
        }
    };

    const updateOrder = async (updatedOrder: Order) => {
        // 1. Optimistic Update: Update UI immediately
        const previousOrder = orders.find(o => o.id === updatedOrder.id);
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

        try {
            const response = await apiFetch(`/orders/${updatedOrder.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedOrder)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("PUT /orders error details:", errorData);
                throw new Error(errorData.detail || 'Failed to update order');
            }

            // Sync with backend's processed object (includes ID/Notes parity)
            const confirmed = await response.json();
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? confirmed : o));

        } catch (e) {
            console.error("Error updating order (optimistic revert)", e);
            // Revert to previous state
            if (previousOrder) {
                setOrders(prev => prev.map(o => o.id === previousOrder.id ? previousOrder : o));
            } else {
                fetchOrders(); // Fallback
            }
            alert("❌ Error al guardar el movimiento. Se ha revertido el cambio.");
        }
    };

    const deleteOrder = async (orderId: string) => {
        try {
            const response = await apiFetch(`/orders/${orderId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setOrders(prev => prev.filter(o => o.id !== orderId));

                // Maintenance order deletion logic removed (no longer syncing to truck next_maintenance)
            }
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    };

    const addTruck = async (truck: Truck) => {
        try {
            const response = await apiFetch('/trucks', {
                method: 'POST',
                body: JSON.stringify(truck)
            });
            if (response.ok) {
                setTrucks(prev => [...prev, truck]);
            } else {
                alert("❌ Error al añadir vehículo.");
            }
        } catch (e) {
            console.error("Error adding truck", e);
            alert("❌ Error de conexión al añadir vehículo.");
        }
    };
    const updateTruck = async (updatedTruck: Truck) => {
        try {
            const response = await apiFetch(`/trucks/${updatedTruck.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedTruck)
            });
            if (response.ok) {
                setTrucks(prev => prev.map(t => t.id === updatedTruck.id ? updatedTruck : t));
                // Force a fresh fetch to ensure all computed fields (if any) and Odoo sync are visible
                await fetchTrucks();
            } else {
                const err = await response.json().catch(() => ({}));
                alert(`❌ Error al actualizar vehículo: ${err.detail || 'Error desconocido'}`);
            }
        } catch (e) {
            console.error("Error updating truck", e);
            alert("❌ Error de servidor al guardar los datos del vehículo.");
        }
    };
    const deleteTruck = async (truckId: string) => {
        try {
            const response = await apiFetch(`/trucks/${truckId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setTrucks(prev => prev.filter(t => t.id !== truckId));
            } else {
                alert("❌ Error al eliminar vehículo.");
            }
        } catch (e) {
            console.error("Error deleting truck", e);
            alert("❌ Error de servidor al eliminar vehículo.");
        }
    };

    const addDriver = async (driver: Driver) => {
        try {
            const response = await apiFetch('/drivers', {
                method: 'POST',
                body: JSON.stringify(driver)
            });
            if (response.ok) {
                // We rely on fetchDrivers to get the final list including the new one
                await fetchDrivers();
            }
        } catch (e) {
            console.error("Error adding driver", e);
        } finally {
            // Always fetch fresh list to ensure UI sync
            await fetchDrivers();
        }
    };

    const updateDriver = async (updatedDriver: Driver) => {
        try {
            // Remove local fields before sending if necessary, or backend ignores them
            const response = await apiFetch(`/drivers/${updatedDriver.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedDriver)
            });
            if (response.ok) {
                setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
                fetchDrivers(); // Refresh to ensure backend state sync
            }
        } catch (e) {
            console.error("Error updating driver", e);
        }
    };
    const deleteDriver = async (driverId: string) => {
        try {
            const response = await apiFetch(`/drivers/${driverId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await fetchDrivers();
            } else {
                console.error('Failed to delete driver from backend');
            }
        } catch (error) {
            console.error('Error deleting driver:', error);
        }
    };

    const addCustomer = async (customer: Customer) => {
        try {
            const response = await apiFetch('/customers', {
                method: 'POST',
                body: JSON.stringify(customer)
            });
            if (response.ok) {
                // Refresh from Odoo to ensure sync and get correct ID
                await fetchCustomers();
            } else {
                alert("❌ Error al añadir cliente.");
            }
        } catch (e) {
            console.error("Error adding customer", e);
            alert("❌ Error de conexión al añadir cliente.");
        }
    };
    const updateCustomer = async (updatedCustomer: Customer) => {
        try {
            const response = await apiFetch(`/customers/${updatedCustomer.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedCustomer)
            });
            if (response.ok) {
                await fetchCustomers();
            } else {
                alert("❌ Error al actualizar cliente.");
            }
        } catch (e) {
            console.error("Error updating customer", e);
            alert("❌ Error de servidor al guardar cliente.");
        }
    };
    const deleteCustomer = async (customerId: string) => {
        try {
            const response = await apiFetch(`/customers/${customerId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await fetchCustomers();
            } else {
                alert("❌ Error al eliminar cliente.");
            }
        } catch (e) {
            console.error("Error deleting customer", e);
            alert("❌ Error de servidor al eliminar cliente.");
        }
    };

    const updateExpenseStatus = (driverId: string, expenseId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
        setDrivers(prev => prev.map(d => {
            if (d.id === driverId) {
                return {
                    ...d,
                    expenses: d.expenses?.map(e => e.id === expenseId ? { ...e, status } : e)
                };
            }
            return d;
        }));
    };

    const updateOvertimeStatus = async (driverId: string, date: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED') => {
        try {
            // Optimistic update
            setDrivers(prev => prev.map(d => {
                if (d.id === driverId) {
                    return {
                        ...d,
                        daily_records: d.daily_records?.map(r => r.date === date ? { ...r, status } : r)
                    };
                }
                return d;
            }));

            const response = await fetch(`${API_BASE}/drivers/${driverId}/overtime/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, status })
            });

            if (response.ok) {
                await fetchDrivers(); // Sync everything
            }
        } catch (e) {
            console.error("Error updating overtime status", e);
        }
    };

    const saveAttendanceOverride = async (override: {
        driver_id: number;
        date: string;
        regular_hours?: number;
        overtime_hours?: number;
        diet_count?: number;
        status?: string;
        admin_comment?: string;
    }) => {
        try {
            const response = await fetch(`${API_BASE}/attendance/override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(override)
            });
            if (response.ok) {
                await fetchDrivers();
            }
        } catch (e) {
            console.error("Error saving attendance override", e);
        }
    };

    const addExpense = (driverId: string, expense: DriverExpense) => {
        setDrivers(prev => prev.map(d => {
            if (d.id === driverId) {
                return {
                    ...d,
                    expenses: [expense, ...(d.expenses || [])]
                };
            }
            return d;
        }));
    };

    const updateDailyRecord = (driverId: string, record: DailyRecord) => {
        setDrivers(prev => prev.map(d => {
            if (d.id === driverId) {
                const existingRecords = d.daily_records || [];
                const index = existingRecords.findIndex(r => r.date === record.date);
                let newRecords;
                if (index >= 0) {
                    newRecords = [...existingRecords];
                    newRecords[index] = record;
                } else {
                    newRecords = [...existingRecords, record];
                }
                return { ...d, daily_records: newRecords };
            }
            return d;
        }));
    };

    const updateDriverStatus = (driverId: string, status: DriverStatus) => {
        setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status, is_active: status === 'WORKING' } : d));
    };

    const approveExpense = (driverId: string, expenseId: string) => updateExpenseStatus(driverId, expenseId, 'APPROVED');
    const rejectExpense = (driverId: string, expenseId: string) => updateExpenseStatus(driverId, expenseId, 'REJECTED');

    const createMaintenanceOrder = (truck_id: string, start: Date, end: Date, reason: string) => {
        const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));

        const newOrder: Order = {
            id: `maint-${Date.now()}`,
            display_id: Math.max(0, ...orders.map(o => o.display_id || 0)) + 1,
            client_id: 'internal',
            client_name: 'MANTENIMIENTO',
            type: 'MAINTENANCE',
            status: 'MAINTENANCE',
            scheduled_start: start.toISOString(),
            estimated_duration: durationMinutes,
            description: reason,
            truck_id: truck_id,
            origin_address: 'Taller Zerain',
            destination_address: 'Taller Zerain',
            items: []
        };
        addOrder(newOrder);

        // --- Sync with Odoo Truck Fields ---
        const truck = trucks.find(t => t.id === truck_id || t.plate === truck_id);
        if (truck) {
            updateTruck({
                ...truck,
                maint_start: start.toISOString(),
                maint_end: end.toISOString()
            });
        }

        console.log("Maintenance Order Created and synced to Odoo:", newOrder);
    };

    const uploadExpenseImage = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiFetch('/ocr/receipt', {
                method: 'POST',
                body: formData,
                headers: {
                    // browser will set boundary automatically, don't set Content-Type
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error uploading expense image:', error);
            throw error;
        }
    };

    const lastCustomerDisplayId = Math.max(0, ...(customers || []).map(c => c?.display_id || 0));

    return (
        <GlobalContext.Provider value={{
            orders,
            trucks,
            drivers,
            customers,
            addOrder,
            updateOrder,
            setOrders,
            addTruck,
            updateTruck,
            deleteTruck,
            addDriver,
            updateDriver,
            deleteDriver,
            approveExpense,
            rejectExpense,
            updateExpenseStatus,
            updateOvertimeStatus,
            saveAttendanceOverride,
            addExpense,
            updateDailyRecord,
            updateDriverStatus,
            addCustomer,
            updateCustomer,
            deleteCustomer,
            createMaintenanceOrder,
            deleteOrder,
            lastCustomerDisplayId,
            fetchDrivers,
            fetchTrucks,
            apiFetch,
            uploadExpenseImage,
            fetchOrders,
            systemConfig,
            updateSystemConfig
        }}>

            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = () => {
    const context = useContext(GlobalContext);
    if (!context) throw new Error('useGlobalContext must be used within GlobalProvider');
    return context;
};
