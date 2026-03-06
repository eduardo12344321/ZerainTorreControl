import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import type { Truck } from '../../types';
import { MaintenanceModal } from '../modals/MaintenanceModal';
import { TruckModal } from '../modals/TruckModal';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';
import { ITVModal } from '../modals/ITVModal';
import { QuickMaintenanceModal } from '../modals/QuickMaintenanceModal';

export const VehiclesPage: React.FC = () => {
    const {
        trucks, orders, drivers, updateTruck, addTruck, deleteTruck,
        createMaintenanceOrder, systemConfig, updateSystemConfig
    } = useGlobalContext();
    const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
    const [modalMode, setModalMode] = useState<'none' | 'edit' | 'create' | 'maintenance' | 'delete' | 'itv' | 'oil' | 'tires'>('none');

    // Local state for config inputs during editing
    const [configEditing, setConfigEditing] = useState({
        oil_km: systemConfig.maintenance_oil_km || '30000',
        tire_km: systemConfig.maintenance_tire_km || '80000',
        warning_pct: systemConfig.maintenance_warning_pct || '90'
    });

    // Accurate Strada Maintenance KM
    const [maintenanceKms, setMaintenanceKms] = useState<Record<string, { oil_km: number, tire_km: number }>>({});

    // Update local config when global config loads
    useEffect(() => {
        setConfigEditing({
            oil_km: systemConfig.maintenance_oil_km || '30000',
            tire_km: systemConfig.maintenance_tire_km || '80000',
            warning_pct: systemConfig.maintenance_warning_pct || '90'
        });
    }, [systemConfig]);

    // Fetch accurate KM from Strada for each truck with maintenance dates
    useEffect(() => {
        if (trucks.length === 0) return;

        const STRADA_API = `${import.meta.env.VITE_API_BASE_URL.replace('/v1', '')}/api/strada`;
        const payload = trucks.map(t => ({
            plate: t.plate,
            oil_date: t.last_oil_change,
            tire_date: t.last_tire_change
        })).filter(p => p.oil_date || p.tire_date);

        if (payload.length === 0) return;

        fetch(`${STRADA_API}/fleet/maintenance-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(r => r.json())
            .then(data => setMaintenanceKms(data))
            .catch(console.error);
    }, [trucks]);

    const handleConfigSave = () => {
        updateSystemConfig({
            maintenance_oil_km: configEditing.oil_km,
            maintenance_tire_km: configEditing.tire_km,
            maintenance_warning_pct: configEditing.warning_pct
        });
    };

    // Helper to check if maintenance is critical
    const checkMaintenanceCritical = (truck: Truck, type: 'OIL' | 'TIRES') => {
        const stats = maintenanceKms[truck.plate] || { oil_km: 0, tire_km: 0 };
        const diff = type === 'OIL' ? stats.oil_km : stats.tire_km;

        const threshold = type === 'OIL'
            ? parseInt(systemConfig.maintenance_oil_km || '30000')
            : parseInt(systemConfig.maintenance_tire_km || '80000');

        const warningPct = parseInt(systemConfig.maintenance_warning_pct || '90') / 100;

        return {
            kmSince: Math.round(diff),
            isWarning: diff >= threshold * warningPct,
            isCritical: diff >= threshold,
            pct: Math.min(100, Math.round((diff / threshold) * 100))
        };
    };

    // Helper to calculate truck status based on Live Orders & Maintenance
    const getTruckStatus = (truckId: string): { status: string; color: string; label: string; subLabel?: string } => {
        const now = Date.now();
        const truck = trucks.find(t => t.id === truckId || t.plate === truckId);

        // Check if any maintenance is critical
        if (truck) {
            const oil = checkMaintenanceCritical(truck, 'OIL');
            const tires = checkMaintenanceCritical(truck, 'TIRES');
            if (oil.isCritical || tires.isCritical) {
                // We could show a specific banner, but let's keep status logical
            }
        }

        const isMatch = (orderTruckId: string | null | undefined) => {
            if (!orderTruckId) return false;
            const oTId = String(orderTruckId).trim().toUpperCase();
            const tId = String(truckId).trim().toUpperCase();
            const tPlate = String(truck?.plate || '').trim().toUpperCase();
            return oTId === tId || (truck && oTId === tPlate);
        };

        const maintenanceOrder = orders.find(o =>
            isMatch(o.truck_id) &&
            (o.status === 'MAINTENANCE' || o.type === 'MAINTENANCE') &&
            // Check if currently active
            new Date(o.scheduled_start).getTime() <= now &&
            (new Date(o.scheduled_start).getTime() + (o.estimated_duration || 60) * 60000) > now
        );

        // Also check if Odoo Studio fields indicate it's in maintenance
        const odooMaintActive = truck?.maint_start && truck?.maint_end &&
            new Date(truck.maint_start).getTime() <= now &&
            new Date(truck.maint_end).getTime() > now;

        if (maintenanceOrder || odooMaintActive) return { status: 'MAINTENANCE', color: 'bg-red-500', label: 'EN TALLER' };

        // 2. Check Active Orders (Currently Busy)
        const activeOrder = orders.find(o =>
            o.truck_id === truckId &&
            ['IN_PROGRESS'].includes(o.status)
        );

        if (activeOrder) {
            const entTime = new Date(activeOrder.scheduled_start).getTime() + (activeOrder.estimated_duration * 60000);
            const minutesLeft = Math.ceil((entTime - now) / 60000);
            const hoursLeft = Math.ceil(minutesLeft / 60);

            return {
                status: 'BUSY',
                color: 'bg-orange-500',
                label: 'EN RUTA',
                subLabel: minutesLeft > 60 ? `Libre en ~${hoursLeft}h` : `Libre en ${minutesLeft}min`
            };
        }

        // 3. Check Upcoming Orders
        const nextOrder = orders
            .filter(o => o.truck_id === truckId && o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && new Date(o.scheduled_start).getTime() > now)
            .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())[0];

        if (nextOrder) {
            const timeUntilStart = new Date(nextOrder.scheduled_start).getTime() - now;
            const hoursUntil = Math.ceil(timeUntilStart / 3600000);

            if (hoursUntil <= 24) {
                const isMaint = nextOrder.status === 'MAINTENANCE';
                return {
                    status: isMaint ? 'MAINTENANCE_SOON' : 'AVAILABLE_SOON_BOOKED',
                    color: isMaint ? 'bg-red-400' : 'bg-yellow-500',
                    label: isMaint ? 'TALLER PRÓX.' : 'DISPONIBLE',
                    subLabel: isMaint ? `Cita en ${hoursUntil}h` : `Próx. servicio en ${hoursUntil}h`
                };
            }
        }

        return { status: 'AVAILABLE', color: 'bg-green-500', label: 'DISPONIBLE' };
    };

    const getITVStatus = (dateString?: string) => {
        if (!dateString) return { label: 'SIN DATOS', dateFormatted: '-', color: 'text-gray-400 bg-gray-100' };

        const settings = { warningDays: 24 };
        const expirationDate = new Date(dateString);
        const today = new Date();
        const diffTime = expirationDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const dateFormatted = expirationDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        if (diffDays < 0) return { label: `CADUCADA (${Math.abs(diffDays)}d)`, dateFormatted, color: 'text-white bg-red-600 font-bold animate-pulse' };
        if (diffDays <= settings.warningDays) return { label: `CADUCA EN ${diffDays} DÍAS`, dateFormatted, color: 'text-red-700 bg-red-100 font-bold border border-red-200' };

        return { label: `VIGENTE (${diffDays} días)`, dateFormatted, color: 'text-green-700 bg-green-50' };
    };

    const getMaintenanceStatus = (truckId: string) => {
        const now = Date.now();
        const truck = trucks.find(t => t.id === truckId || t.plate === truckId);

        const isMatch = (orderTruckId: string | null | undefined) => {
            if (!orderTruckId) return false;
            const oTId = String(orderTruckId).trim().toUpperCase();
            const tId = String(truckId).trim().toUpperCase();
            const tPlate = String(truck?.plate || '').trim().toUpperCase();
            return oTId === tId || (truck && oTId === tPlate);
        };

        const maintenanceOrders = orders.filter(o =>
            isMatch(o.truck_id) &&
            (o.status === 'MAINTENANCE' || o.type === 'MAINTENANCE') &&
            // Show if future OR currently active
            (new Date(o.scheduled_start).getTime() > now || (new Date(o.scheduled_start).getTime() + (o.estimated_duration * 60000) > now))
        ).sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

        let start: Date | null = null;
        let end: Date | null = null;

        if (maintenanceOrders.length > 0) {
            const nextMaint = maintenanceOrders[0];
            start = new Date(nextMaint.scheduled_start);
            end = new Date(start.getTime() + (nextMaint.estimated_duration * 60000));
        } else if (truck?.maint_start) {
            // Use Odoo fields if no local order
            start = new Date(truck.maint_start);
            if (truck.maint_end) end = new Date(truck.maint_end);
        }

        if (!start) return { label: 'PENDIENTE', dateFormatted: '-', color: 'text-gray-400 bg-gray-100' };

        const dateFormatted = start.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        if (start.getTime() <= now && (!end || end.getTime() > now)) {
            return { label: 'EN TALLER AHORA', dateFormatted, color: 'text-white bg-red-600 font-bold animate-pulse' };
        }

        const settings = { warningDays: 15 };
        const diffTime = start.getTime() - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= settings.warningDays) return { label: `REVISIÓN EN ${diffDays} DÍAS`, dateFormatted, color: 'text-orange-700 bg-orange-100 font-bold border border-orange-200' };

        return { label: `OK (${diffDays} días)`, dateFormatted, color: 'text-blue-700 bg-blue-50' };
    };

    // HANDLERS
    const openCreate = () => {
        setSelectedTruck(null);
        setModalMode('create');
    };

    const openEdit = (truck: Truck) => {
        setSelectedTruck(truck);
        setModalMode('edit');
    };

    const openMaintenance = (truck: Truck) => {
        setSelectedTruck(truck);
        setModalMode('maintenance');
    };

    const openITV = (truck: Truck) => {
        setSelectedTruck(truck);
        setModalMode('itv');
    };

    const openOil = (truck: Truck) => {
        setSelectedTruck(truck);
        setModalMode('oil');
    };

    const openTires = (truck: Truck) => {
        setSelectedTruck(truck);
        setModalMode('tires');
    };

    const handleConfirm = (truck: Truck) => {
        if (modalMode === 'create') {
            addTruck(truck);
        } else {
            updateTruck(truck);
        }
        setModalMode('none');
    };

    const openDelete = (truck: Truck) => {
        setSelectedTruck(truck);
        setModalMode('delete');
    };

    const handleDeleteConfirm = () => {
        if (selectedTruck) {
            deleteTruck(selectedTruck.id);
            setModalMode('none');
        }
    };

    const handleMaintenanceConfirm = (truckId: string, start: Date, end: Date, reason: string) => {
        createMaintenanceOrder(truckId, start, end, reason);
        setModalMode('none');
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-gray-100 relative">

            {/* Config & Legend Header */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-6 items-center justify-between text-sm">

                {/* SETTINGS AREA */}
                <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚙️</span>
                        <span className="font-bold text-gray-500 uppercase text-xs">Configuración Mantenimiento:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Aceite (km):</label>
                        <input
                            type="number"
                            className="w-20 px-2 py-1 rounded border border-gray-300 font-bold"
                            value={configEditing.oil_km}
                            onChange={e => setConfigEditing(prev => ({ ...prev, oil_km: e.target.value }))}
                            onBlur={handleConfigSave}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Ruedas (km):</label>
                        <input
                            type="number"
                            className="w-24 px-2 py-1 rounded border border-gray-300 font-bold"
                            value={configEditing.tire_km}
                            onChange={e => setConfigEditing(prev => ({ ...prev, tire_km: e.target.value }))}
                            onBlur={handleConfigSave}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Aviso %:</label>
                        <input
                            type="number"
                            className="w-16 px-2 py-1 rounded border border-gray-300 font-bold"
                            value={configEditing.warning_pct}
                            onChange={e => setConfigEditing(prev => ({ ...prev, warning_pct: e.target.value }))}
                            onBlur={handleConfigSave}
                        />
                    </div>
                </div>

                <div className="flex gap-6 items-center text-xs overflow-x-auto">
                    <span className="font-bold text-gray-500 uppercase text-xs">Leyenda:</span>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-gray-700">Libre</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span className="text-gray-700">Reserva</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                        <span className="text-gray-700">En Ruta</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="text-gray-700">Taller</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Flota de Vehículos ({trucks.length})</h2>
                <div className="flex gap-3">
                    <button
                        onClick={openCreate}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-black shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <span className="text-xl">+</span> Nuevo Vehículo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {trucks.map(truck => {
                    const status = getTruckStatus(truck.id);
                    const itv = getITVStatus(truck.itv_expiration);
                    const maint = getMaintenanceStatus(truck.id);

                    const oilAlert = checkMaintenanceCritical(truck, 'OIL');
                    const tiresAlert = checkMaintenanceCritical(truck, 'TIRES');

                    return (
                        <div key={truck.id} className={`bg-white rounded-xl shadow-md border ${oilAlert.isWarning || tiresAlert.isWarning ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200'} overflow-hidden hover:shadow-lg transition-shadow relative`}>

                            {/* Warning Badge */}
                            {(oilAlert.isCritical || tiresAlert.isCritical) && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg z-10 animate-pulse">
                                    MANTENIMIENTO CRÍTICO
                                </div>
                            )}

                            {/* Header Card */}
                            <div className="p-4 border-b border-gray-100 flex flex-col gap-2">
                                <div className="flex flex-col items-start w-full gap-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="font-mono text-lg font-black text-white px-3 py-1 rounded-md inline-block shadow-sm border border-gray-400/20 transform -rotate-1 shrink-0"
                                            style={{ backgroundColor: truck.color || '#fbbf24', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                                        >
                                            {truck.plate}
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-xs font-black text-white ${status.color} shadow-sm uppercase tracking-wide shrink-0`}>
                                            {status.label}
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-500 leading-tight truncate w-full" title={truck.alias}>
                                        {truck.alias}
                                    </h3>
                                    {truck.default_driver_id && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] grayscale">👷</span>
                                            <span className="text-[10px] font-bold text-blue-600 truncate uppercase">
                                                {drivers.find(d => d.id === truck.default_driver_id)?.name || 'Desconocido'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Body Specs */}
                            <div className="p-4">
                                <div className="grid grid-cols-[auto_1fr] gap-x-1 gap-y-3 items-baseline">
                                    <div className="text-gray-500 text-[10px] font-bold uppercase">Categoría</div>
                                    <div className="font-black text-gray-800 text-sm leading-none capitalize">{(truck.category || 'Sin categoría').replace('_', ' ').toLowerCase()}</div>

                                    <div className="text-gray-500 text-[10px] font-bold uppercase">Atributos</div>
                                    <div className="flex flex-wrap gap-1">
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-black text-gray-700 border border-gray-200">
                                            <span>🛞</span> {truck.axles === 2 ? '2 Ej' : (truck.axles && truck.axles >= 3) ? `${truck.axles} Ej` : '-'}
                                        </div>
                                        {truck.has_crane && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded text-[9px] font-black text-blue-700 border border-blue-100">
                                                <span>🏗️</span> Grúa
                                            </div>
                                        )}
                                        {truck.has_jib && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 rounded text-[9px] font-black text-purple-700 border border-purple-100">
                                                <span>⚓</span> JIB
                                            </div>
                                        )}
                                        {truck.is_box_body && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded text-[9px] font-black text-green-700 border border-green-100">
                                                <span>📦</span> Caja
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-gray-500 text-[10px] font-bold uppercase">Carga</div>
                                    <div className="font-black text-gray-800 text-sm leading-none">{truck.max_weight ? `${(truck.max_weight / 1000).toFixed(1)}T` : '-'} / {truck.max_length ? `${truck.max_length}m` : '-'}</div>
                                </div>

                                {/* UNIFIED 4-GRID TECH SECTION - Compact & Visual */}
                                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-50 pt-4">
                                    {/* 1. ITV CARD */}
                                    <button
                                        onClick={() => openITV(truck)}
                                        className={`flex flex-col items-center p-2 rounded-xl transition-all border group shadow-sm hover:shadow-md ${itv.color.includes('bg-red') ? 'bg-red-50 border-red-200' : 'bg-blue-50/50 border-blue-100'}`}
                                    >
                                        <span className={`text-[10px] font-black uppercase mb-1.5 ${itv.color.includes('bg-red') ? 'text-red-600' : 'text-blue-600'}`}>📅 ITV</span>
                                        <div className="flex flex-col items-center text-center gap-0.5">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${itv.color.includes('bg-red') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                {itv.label.split('(')[0].trim()}
                                            </span>
                                            <span className="text-sm font-black text-gray-900 leading-tight mt-1">
                                                {itv.dateFormatted.split(',')[0]}
                                            </span>
                                        </div>
                                    </button>

                                    {/* 2. TALLER CARD */}
                                    <button
                                        onClick={() => openMaintenance(truck)}
                                        className={`flex flex-col items-center p-2 rounded-xl transition-all border group shadow-sm hover:shadow-md ${maint.color.includes('bg-red') ? 'bg-red-50 border-red-200' : 'bg-purple-50/50 border-purple-100'}`}
                                    >
                                        <span className={`text-[10px] font-black uppercase mb-1.5 ${maint.color.includes('bg-red') ? 'text-red-600' : 'text-purple-600'}`}>🛠️ Taller</span>
                                        <div className="flex flex-col items-center text-center gap-0.5">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${maint.color.includes('bg-red') ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'}`}>
                                                {maint.label}
                                            </span>
                                            <span className="text-sm font-black text-gray-900 leading-tight mt-1">
                                                {maint.dateFormatted.split(',')[0] === 'Sin programar' || maint.dateFormatted === '-' ? '---' : maint.dateFormatted.split(' ')[0]}
                                            </span>
                                        </div>
                                    </button>

                                    {/* 3. ACEITE CARD */}
                                    <button
                                        onClick={() => openOil(truck)}
                                        className={`flex flex-col items-center p-2 rounded-xl transition-all border group shadow-sm hover:shadow-md ${oilAlert.isCritical ? 'bg-red-50 border-red-200 animate-pulse' : oilAlert.isWarning ? 'bg-amber-100 border-amber-300' : 'bg-amber-50/50 border-amber-100'}`}
                                    >
                                        <span className="text-[10px] font-black text-amber-600 uppercase mb-1.5">🛢️ Aceite</span>
                                        <div className="flex flex-col items-center text-center gap-0.5">
                                            <div className="flex items-center gap-1">
                                                <span className={`text-xs font-black leading-tight ${oilAlert.isCritical ? 'text-red-700' : 'text-amber-900'}`}>
                                                    {oilAlert.kmSince.toLocaleString()} km
                                                </span>
                                                <span className={`text-[8px] font-bold px-1 rounded ${oilAlert.isCritical ? 'bg-red-600 text-white' : oilAlert.isWarning ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                    {oilAlert.pct}%
                                                </span>
                                            </div>
                                            <span className="text-sm font-black text-amber-700 mt-1">
                                                {truck.last_oil_change ? new Date(truck.last_oil_change).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '---'}
                                            </span>
                                        </div>
                                    </button>

                                    {/* 4. RUEDAS CARD */}
                                    <button
                                        onClick={() => openTires(truck)}
                                        className={`flex flex-col items-center p-2 rounded-xl transition-all border group shadow-sm hover:shadow-md ${tiresAlert.isCritical ? 'bg-red-50 border-red-200 animate-pulse' : tiresAlert.isWarning ? 'bg-red-100 border-red-300' : 'bg-slate-50/50 border-slate-200'}`}
                                    >
                                        <span className="text-[10px] font-black text-slate-500 uppercase mb-1.5">🔘 Ruedas</span>
                                        <div className="flex flex-col items-center text-center gap-0.5">
                                            <div className="flex items-center gap-1">
                                                <span className={`text-xs font-black leading-tight ${tiresAlert.isCritical ? 'text-red-700' : 'text-slate-900'}`}>
                                                    {tiresAlert.kmSince.toLocaleString()} km
                                                </span>
                                                <span className={`text-[8px] font-bold px-1 rounded ${tiresAlert.isCritical ? 'bg-red-600 text-white' : tiresAlert.isWarning ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                    {tiresAlert.pct}%
                                                </span>
                                            </div>
                                            <span className="text-sm font-black text-slate-600 mt-1">
                                                {truck.last_tire_change ? new Date(truck.last_tire_change).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '---'}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="bg-gray-50 p-2 items-center gap-2 border-t border-gray-100 grid grid-cols-2">
                                <button
                                    onClick={() => openEdit(truck)}
                                    className="py-1.5 text-[11px] font-black text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors uppercase"
                                >
                                    Editar Ficha
                                </button>
                                <button
                                    onClick={() => openDelete(truck)}
                                    className="py-1.5 bg-white border border-gray-200 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1 text-[11px] font-black uppercase"
                                >
                                    <span>🗑️</span> Borrar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODALS */}
            <TruckModal
                isOpen={modalMode === 'edit' || modalMode === 'create'}
                truck={selectedTruck}
                onClose={() => setModalMode('none')}
                onConfirm={handleConfirm}
            />

            <MaintenanceModal
                isOpen={modalMode === 'maintenance'}
                onClose={() => setModalMode('none')}
                onConfirm={handleMaintenanceConfirm}
                defaultTruckId={selectedTruck?.id}
            />

            <ITVModal
                isOpen={modalMode === 'itv'}
                truck={selectedTruck}
                onClose={() => setModalMode('none')}
            />

            <QuickMaintenanceModal
                isOpen={modalMode === 'oil' || modalMode === 'tires'}
                truck={selectedTruck}
                type={modalMode === 'oil' ? 'OIL' : 'TIRES'}
                onClose={() => setModalMode('none')}
            />

            <DeleteConfirmationModal
                isOpen={modalMode === 'delete'}
                onClose={() => setModalMode('none')}
                onConfirm={handleDeleteConfirm}
                resourceName={selectedTruck ? `${selectedTruck.alias} (${selectedTruck.plate})` : 'Vehículo'}
                confirmText={selectedTruck?.plate || 'ELIMINAR'}
            />
        </div >
    );
};
