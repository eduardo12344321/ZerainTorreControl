import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import type { Driver, DriverStatus } from '../../types';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';
import { DriverModal } from '../modals/DriverModal';
import { ApprovalBoard } from '../workers/ApprovalBoard';
import { DailyRecordsGrid } from '../workers/DailyRecordsGrid';
import { AttendanceHistory } from '../workers/AttendanceHistory';

export const DriversPage: React.FC = () => {
    const { drivers, orders, addDriver, updateDriver, deleteDriver, updateExpenseStatus, updateOvertimeStatus } = useGlobalContext();
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete' | null>(null);

    const driverList = drivers || [];
    const selectedDriver = driverList.find(d => d.id === selectedDriverId);

    // Auto-select first driver when page loads
    useEffect(() => {
        if (driverList.length > 0 && !selectedDriverId) {
            setSelectedDriverId(driverList[0].id);
        }
    }, [driverList, selectedDriverId]);

    const getStatusColor = (status: DriverStatus) => {
        switch (status) {
            case 'WORKING': return 'bg-green-100 text-green-700 border-green-200';
            case 'RESTING': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'SICK': return 'bg-red-100 text-red-700 border-red-200';
            case 'VACATION': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const handleConfirm = (driver: Driver) => {
        if (modalMode === 'add') {
            addDriver(driver);
        } else {
            updateDriver(driver);
        }
        setModalMode(null);
    };

    const handleDeleteConfirm = () => {
        if (selectedDriver) {
            deleteDriver(selectedDriver.id);
            setSelectedDriverId(null);
        }
        setModalMode(null);
    };



    return (
        <div className="h-full flex flex-col lg:flex-row bg-gray-100 overflow-hidden">
            {/* LEFT PANEL: LIST */}
            <div className={`
                w-full lg:w-1/3 lg:min-w-[300px] lg:max-w-sm bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 transition-all
                ${selectedDriverId && 'hidden lg:flex'}
            `}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                    <div>
                        <h2 className="text-lg font-black text-gray-800 tracking-tight">Trabajadores</h2>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Sincronizados con Odoo</span>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-2 space-y-1.5 bg-gray-50/50">
                    {driverList.map(driver => (
                        <div
                            key={driver.id}
                            onClick={() => setSelectedDriverId(driver.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group ${selectedDriverId === driver.id
                                ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500 transform scale-[1.012]'
                                : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shadow-inner border border-gray-200/50">
                                        👤
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900 leading-tight text-xs">{driver.name}</h3>
                                        <div className="flex gap-2 mt-0.5">
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-wider ${getStatusColor(driver.status)}`}>
                                                {driver.status}
                                            </span>
                                            {driver.dni && <span className="text-[8px] text-gray-400 font-mono self-center">{driver.dni}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL: DETAILS (COMPACT & 3-COLUMN) */}
            <div className={`flex-grow bg-white p-3 overflow-y-auto ${!selectedDriverId && 'hidden lg:block'}`}>
                {/* Mobile Back Button */}
                {selectedDriverId && (
                    <button
                        onClick={() => setSelectedDriverId(null)}
                        className="lg:hidden mb-4 flex items-center gap-2 text-blue-600 font-black text-xs uppercase"
                    >
                        ← Volver a la lista
                    </button>
                )}
                {selectedDriver ? (
                    <div className="max-w-full space-y-3">
                        {/* Header Profile - Very Compact */}
                        <div className="bg-gray-50/50 rounded-xl border border-gray-200 p-3 flex justify-between items-center">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-2xl">
                                    👷
                                </div>
                                <div className="text-left">
                                    <h1 className="text-lg font-black text-gray-900 leading-none mb-1">{selectedDriver.name}</h1>
                                    <div className="flex gap-2 items-center">
                                        <span className={`px-2 py-0.5 rounded-lg font-bold text-[8px] border ${getStatusColor(selectedDriver.status)}`}>
                                            {selectedDriver.status}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-lg bg-white text-gray-500 font-mono text-[8px] border border-gray-200">
                                            ID ODOO: {selectedDriver.id} {selectedDriver.dni ? `| ${selectedDriver.dni}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* MONTHLY STATS IN HEADER */}
                            <div className="flex items-center gap-6 border-x border-gray-100 px-6 mx-4">
                                <div className="text-center">
                                    <div className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Extra Mes</div>
                                    <div className="text-sm font-black text-blue-700">{selectedDriver.stats?.extra_hours_month || 0}h</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[7px] font-black text-green-400 uppercase tracking-widest leading-none mb-1">Dietas Mes</div>
                                    <div className="text-sm font-black text-green-700">{selectedDriver.stats?.diets_month || 0}€</div>
                                </div>
                            </div>

                            <div className="flex gap-2 items-center">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Solo lectura</span>
                            </div>
                        </div>

                        {/* 3-COLUMN LAYOUT */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">

                            {/* COL 1: APPROVAL BOARD (Unified Expenses & Overtime) */}
                            <div className="xl:col-span-6 space-y-3">
                                <ApprovalBoard
                                    driver={selectedDriver}
                                    updateExpenseStatus={updateExpenseStatus}
                                    updateOvertimeStatus={updateOvertimeStatus}
                                />
                            </div>

                            {/* COL 2: DAILY RECORDS (Calendar) */}
                            <div className="xl:col-span-3">
                                <DailyRecordsGrid
                                    driverId={selectedDriver.id}
                                    records={selectedDriver.daily_records}
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                />
                            </div>

                            {/* COL 3: ATTENDANCE HISTORY */}
                            <div className="xl:col-span-3">
                                <AttendanceHistory driverId={selectedDriver.id} />
                            </div>

                            {/* COL 3: ACTIVITY (Today) */}
                            <div className="xl:col-span-3">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-left">
                                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                                        <h3 className="font-bold text-[9px] text-gray-700 uppercase tracking-wider">Historial Actividad</h3>
                                        <span className="text-[8px] text-gray-400 font-mono italic">{new Date(selectedDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                    </div>
                                    <div className="p-2.5 space-y-2 max-h-[600px] overflow-y-auto">
                                        {(() => {
                                            const targetDate = selectedDate;

                                            // 1. Get Orders
                                            const targetOrders = orders
                                                .filter(o => o.driver_id === selectedDriver.id && o.scheduled_start.startsWith(targetDate))
                                                .map(o => ({ ...o, _kind: 'ORDER', _sortTime: new Date(o.scheduled_start).getTime() }));

                                            // 2. Get Attendance
                                            const targetAttendance = [];
                                            const dailyRecord = selectedDriver.daily_records?.find(r => r.date === targetDate);

                                            if (dailyRecord) {
                                                if (dailyRecord.check_in) targetAttendance.push({ _kind: 'ATT', type: 'ENTRADA', time: dailyRecord.check_in, icon: '▶️', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' });
                                                if (dailyRecord.meal_in) targetAttendance.push({ _kind: 'ATT', type: 'INICIO COMIDA', time: dailyRecord.meal_in, icon: '🍱', color: 'bg-orange-50 text-orange-700 border-orange-100' });
                                                if (dailyRecord.meal_out) targetAttendance.push({ _kind: 'ATT', type: 'FIN COMIDA', time: dailyRecord.meal_out, icon: '🍔', color: 'bg-orange-50 text-orange-700 border-orange-100' });
                                                if (dailyRecord.check_out) targetAttendance.push({ _kind: 'ATT', type: 'SALIDA', time: dailyRecord.check_out, icon: '⏹️', color: 'bg-slate-50 text-slate-700 border-slate-100' });
                                            }

                                            const attendanceEvents = targetAttendance.map(a => ({ ...a, _sortTime: new Date(a.time).getTime() }));

                                            // 3. Merge & Sort
                                            const combined = [...targetOrders, ...attendanceEvents].sort((a: any, b: any) => b._sortTime - a._sortTime);

                                            if (combined.length === 0) return <div className="w-full text-center py-6 text-gray-400 text-[9px] italic">Sin actividad registrada para este día.</div>;

                                            return combined.map((item: any, i) => {
                                                if (item._kind === 'ORDER') {
                                                    return (
                                                        <div key={`ord-${item.id}`} className={`p-2 rounded-lg border flex flex-col gap-1 transition-all ${item.status === 'COMPLETED' ? 'bg-green-50 border-green-100 text-green-700' :
                                                            item.status === 'IN_PROGRESS' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                                                                'bg-blue-50 border-blue-100 text-blue-700 shadow-sm'
                                                            }`}>
                                                            <div className="flex justify-between items-center opacity-70">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono text-[7px] font-black">#{item.display_id}</span>
                                                                    <span className="text-[7px] font-black uppercase tracking-widest">{new Date(item.scheduled_start).toLocaleDateString()}</span>
                                                                </div>
                                                                <span className="font-mono text-[8px] font-black bg-white/50 px-1 rounded">{new Date(item.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <h4 className="font-black text-[9px] truncate text-left">{item.client_name}</h4>
                                                            <div className="flex justify-between items-center uppercase text-[7px] font-bold tracking-tighter">
                                                                <span>{item.status}</span>
                                                                {item.status === 'COMPLETED' ? '✅' : '🚛'}
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={`att-${i}`} className={`p-2 rounded-lg border flex justify-between items-center ${item.color}`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg">{item.icon}</span>
                                                                <div>
                                                                    <div className="text-[7px] font-black opacity-60 uppercase">{item.type}</div>
                                                                    <div className="text-xs font-black leading-none">{item.time.split(' ')[1]}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-[7px] font-mono opacity-50">{new Date(item.time).toLocaleDateString()}</div>
                                                        </div>
                                                    );
                                                }
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 grayscale opacity-60">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-3 border-2 border-gray-200">👷</div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Selecciona un Trabajador</h3>
                        <p className="max-w-[200px] text-center mt-1 text-[10px] font-medium leading-tight">Accede a estadísticas, historial de actividad y validación de recursos.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {
                modalMode === 'add' && (
                    <DriverModal
                        isOpen={true}
                        onClose={() => setModalMode(null)}
                        onConfirm={handleConfirm}
                        driver={null}
                    />
                )
            }

            {
                modalMode === 'edit' && (
                    <DriverModal
                        isOpen={true}
                        onClose={() => setModalMode(null)}
                        onConfirm={handleConfirm}
                        driver={selectedDriver}
                    />
                )
            }

            {
                modalMode === 'delete' && (
                    <DeleteConfirmationModal
                        isOpen={true}
                        onClose={() => setModalMode(null)}
                        onConfirm={handleDeleteConfirm}
                        resourceName={selectedDriver ? selectedDriver.name : 'Trabajador'}
                        confirmText="ELIMINAR"
                    />
                )
            }
        </div >
    );
};
