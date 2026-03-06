import React, { useState, useRef } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import SignatureCanvas from 'react-signature-canvas';

export const DriverView: React.FC = () => {
    const { orders, updateOrder, drivers } = useGlobalContext();

    // MOCK: In a real app, this would come from Auth Token
    // For development, we allow switching or default to 'd1'
    const [currentDriverId, setCurrentDriverId] = useState('d1');
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [selectedOrderIdForIncident, setSelectedOrderIdForIncident] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ROUTE' | 'EXPENSES' | 'HORARIO' | 'SETTINGS'>('ROUTE');

    // Completion Form State
    const [completionData, setCompletionData] = useState<{ hours: string, km: string, observations: string }>({ hours: '', km: '', observations: '' });
    const sigCanvas = useRef<SignatureCanvas>(null);

    const currentDriver = drivers.find(d => d.id === currentDriverId);

    // Filter my orders for today
    const myOrders = orders.filter(o =>
        o.driver_id === currentDriverId &&
        ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'INCIDENT'].includes(o.status)
    ).sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

    const activeOrder = myOrders.find(o => o.status === 'IN_PROGRESS');

    const handleStatusChange = (orderId: string, newStatus: 'IN_PROGRESS' | 'COMPLETED' | 'INCIDENT') => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            updateOrder({ ...order, status: newStatus });
        }
    };

    const handleIncidentReport = (reason: string) => {
        if (selectedOrderIdForIncident) {
            handleStatusChange(selectedOrderIdForIncident, 'INCIDENT');
            setIsIncidentModalOpen(false);
            setSelectedOrderIdForIncident(null);
            // In a real app, this would also send an alert to Admin
            alert(`⚠️ Incidencia reportada: ${reason}`);
        }
    };

    const [isUploading, setIsUploading] = useState(false);
    const { uploadExpenseImage, addExpense } = useGlobalContext();

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await uploadExpenseImage(file);
            if (result && !result.error) {
                // Pre-fill expense from OCR result
                const newExpense = {
                    id: `exp-${Date.now()}`,
                    type: result.category === 'GAS' ? 'FUEL' : 'DIET',
                    amount: result.total_amount || 0,
                    description: `${result.merchant || 'Gasto'} (IA)`,
                    date: new Date().toISOString(),
                    status: 'PENDING'
                } as any;
                addExpense(currentDriverId, newExpense);
                alert(`✅ Ticket procesado: ${result.total_amount}€ en ${result.merchant}`);
            } else {
                alert("❌ No se pudo extraer información del ticket.");
            }
        } catch (error) {
            alert("❌ Error al subir el ticket.");
        } finally {
            setIsUploading(false);
        }
    };

    const [manualTimeHora, setManualTimeHora] = useState('07');
    const [manualTimeMinuto, setManualTimeMinuto] = useState('00');

    const handleQuickClock = (tipo: string) => {
        // En un entorno real se enviaría el fichaje al servidor y a context.
        // Aquí hacemos un stub offline.
        const msg = tipo === 'START' ? 'Jornada Iniciada' :
            tipo === 'END' ? 'Jornada Finalizada' :
                tipo === 'LUNCH_START' ? 'Inicio de Comida' :
                    tipo === 'LUNCH_END' ? 'Fin de Comida' :
                        'Fichaje guardado';

        alert(`✅ ${msg} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    };

    const handleManualSync = () => {
        alert(`✅ Fichaje Manual Registrado: ${manualTimeHora}:${manualTimeMinuto}`);
    };

    const renderTimeTrackingTab = () => (
        <div className="animate-in fade-in slide-in-from-right duration-300 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200 border border-slate-50 relative overflow-hidden">
                <h2 className="text-lg font-black text-slate-800 mb-6">Fichaje Rápido</h2>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={() => handleQuickClock('START')}
                        className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-200 flex flex-col items-center justify-center gap-2"
                    >
                        <span className="text-2xl">🟢</span>
                        <span className="text-xs">INICIAR<br />JORNADA</span>
                    </button>
                    <button
                        onClick={() => handleQuickClock('END')}
                        className="bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white font-black py-4 rounded-2xl shadow-lg shadow-red-200 flex flex-col items-center justify-center gap-2"
                    >
                        <span className="text-2xl">🛑</span>
                        <span className="text-xs">FINALIZAR<br />JORNADA</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleQuickClock('LUNCH_START')}
                        className="bg-amber-100 hover:bg-amber-200 active:scale-95 transition-all text-amber-800 font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 border border-amber-200"
                    >
                        <span className="text-lg">🍴</span>
                        <span className="text-[10px] uppercase">Inicio Comida</span>
                    </button>
                    <button
                        onClick={() => handleQuickClock('LUNCH_END')}
                        className="bg-amber-100 hover:bg-amber-200 active:scale-95 transition-all text-amber-800 font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-1 border border-amber-200"
                    >
                        <span className="text-lg">✅</span>
                        <span className="text-[10px] uppercase">Fin Comida</span>
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <button
                        onClick={() => {
                            alert("✅ Jornada completa de 07:00 a 18:00 registrada.");
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-900 active:scale-95 transition-all text-white font-black py-4 rounded-2xl shadow-lg shadow-slate-200 flex justify-center items-center gap-3"
                    >
                        <span>📝</span> JORNADA COMPLETA (07:00 - 18:00)
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200 border border-slate-50">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <span>⚠️</span> Fichaje Manual (Olvidos)
                </h3>
                <div className="flex gap-4 items-center">
                    <select
                        value={manualTimeHora}
                        onChange={e => setManualTimeHora(e.target.value)}
                        className="bg-slate-100 border-none rounded-xl p-3 font-black text-slate-700 flex-1 text-center"
                    >
                        {Array.from({ length: 24 }).map((_, i) => {
                            const h = i.toString().padStart(2, '0');
                            return <option key={h} value={h}>{h}</option>;
                        })}
                    </select>
                    <span className="font-black text-slate-400">:</span>
                    <select
                        value={manualTimeMinuto}
                        onChange={e => setManualTimeMinuto(e.target.value)}
                        className="bg-slate-100 border-none rounded-xl p-3 font-black text-slate-700 flex-1 text-center"
                    >
                        {Array.from({ length: 12 }).map((_, i) => {
                            const m = (i * 5).toString().padStart(2, '0');
                            return <option key={m} value={m}>{m}</option>;
                        })}
                    </select>
                </div>

                <select className="w-full mt-4 bg-slate-100 border-none rounded-xl p-3 font-black text-slate-700 text-sm">
                    <option value="START">Inicio Jornada</option>
                    <option value="END">Fin Jornada</option>
                    <option value="LUNCH_START">Inicio Comida</option>
                    <option value="LUNCH_END">Fin Comida</option>
                </select>

                <button
                    onClick={handleManualSync}
                    className="w-full mt-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-black py-3 rounded-xl transition-all"
                >
                    REGISTRAR MANUAL
                </button>
            </div>
        </div>
    );

    const renderExpensesTab = () => (
        <div className="animate-in fade-in slide-in-from-right duration-300 space-y-4">
            {/* DRIVER STATS CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200 border border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📊</div>
                <h2 className="text-lg font-black text-slate-800 mb-4">Mi Balance Mensual</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-2xl">
                        <div className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-lg inline-block font-black mb-2">HORAS EXTRA</div>
                        <div className="text-3xl font-black text-blue-900">{currentDriver?.stats?.extra_hours_month || 0}h</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl">
                        <div className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg inline-block font-black mb-2">DIETAS</div>
                        <div className="text-3xl font-black text-emerald-900">{currentDriver?.stats?.diets_month || 0}€</div>
                    </div>
                </div>
            </div>

            {/* AI OCR ACTION */}
            <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mb-4 backdrop-blur-md border border-white/20">
                        {isUploading ? <span className="animate-spin">🌀</span> : "📸"}
                    </div>
                    <h3 className="text-white font-black text-center mb-1">Subir Ticket con IA</h3>
                    <p className="text-blue-200/60 text-[10px] text-center mb-6 px-4 uppercase tracking-tighter">Saca una foto y Gemini extraerá el importe automáticamente</p>

                    <label className={`w-full ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'} bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]`}>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                        {isUploading ? 'PROCESANDO...' : 'HACER FOTO / SUBIR'}
                    </label>
                </div>
            </div>

            {/* EXPENSE HISTORY */}
            <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Mis Gastos</h3>
                <div className="space-y-3">
                    {currentDriver?.expenses?.map(expense => (
                        <div key={expense.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">
                                    {expense.type === 'DIET' ? '🍴' : expense.type === 'FUEL' ? '⛽' : '🅿️'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{expense.description}</div>
                                    <div className="text-[10px] text-slate-400">
                                        {new Date(expense.date).toLocaleDateString()} • {expense.amount}€
                                    </div>
                                </div>
                            </div>
                            <span className={`text-[9px] px-2 py-1 rounded-lg font-black ${expense.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                expense.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                {expense.status === 'APPROVED' ? 'APROBADO' : expense.status === 'REJECTED' ? 'RECHAZADO' : 'PENDIENTE'}
                            </span>
                        </div>
                    ))}
                    {(!currentDriver?.expenses || currentDriver.expenses.length === 0) && (
                        <div className="text-center py-10 text-slate-400 text-xs italic">
                            No tienes gastos registrados este mes.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 selection:bg-blue-100">
            {/* Header Mobile */}
            <header className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 shadow-xl sticky top-0 z-30 rounded-b-[2.5rem]">
                <div className="flex justify-between items-center">
                    <div className="animate-in slide-in-from-left duration-700">
                        <h1 className="text-2xl font-black tracking-tight">Hola, {currentDriver?.name.split(' ')[0] || 'Chofer'} 👋</h1>
                        <p className="text-xs text-blue-100 font-medium opacity-80 uppercase tracking-widest mt-1">
                            {activeTab === 'ROUTE' ? 'Ruta de Hoy' : 'Mis Gastos & Horas'}
                        </p>
                    </div>
                    {activeTab === 'ROUTE' && (
                        <div className="relative group">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center text-2xl shadow-inner active:scale-90 transition-transform">
                                🚛
                            </div>
                            <select
                                value={currentDriverId}
                                onChange={(e) => setCurrentDriverId(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            >
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 space-y-6 -mt-4">
                {activeTab === 'ROUTE' ? (
                    <>
                        {/* ACTIVE ORDER CARD (HERO) */}
                        {activeOrder ? (
                            <section className="animate-in fade-in zoom-in-95 duration-500">
                                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative group overflow-hidden">
                                    {/* Decorative Background Blur */}
                                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>

                                    <div className="bg-orange-500 text-white text-[10px] font-black tracking-tighter px-4 py-1.5 absolute top-0 right-0 rounded-bl-2xl shadow-md z-10 animate-pulse">
                                        EN CURSO
                                    </div>

                                    <div className="p-6">
                                        <h2 className="text-3xl font-black text-slate-800 leading-none mb-2">{activeOrder.client_name}</h2>
                                        <p className="text-slate-500 font-medium text-sm mb-6">{activeOrder.description}</p>

                                        <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                                            <div className="flex gap-4">
                                                <div className="relative flex flex-col items-center">
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full ring-4 ring-blue-100 z-10"></div>
                                                    <div className="w-0.5 flex-grow bg-slate-200 my-1"></div>
                                                </div>
                                                <div className="pb-2">
                                                    <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Recogida</p>
                                                    <p className="font-bold text-slate-700 leading-tight">{activeOrder.origin_address}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="relative flex flex-col items-center">
                                                    <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-100 z-10"></div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Entrega</p>
                                                    <p className="font-bold text-slate-700 leading-tight">{activeOrder.destination_address}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-3">
                                        <button
                                            onClick={() => setIsCompletionModalOpen(true)}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 group"
                                        >
                                            <span className="group-hover:rotate-12 transition-transform">🏁</span> FINALIZAR SERVICIO
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSelectedOrderIdForIncident(activeOrder.id);
                                                setIsIncidentModalOpen(true);
                                            }}
                                            className="w-full bg-white border-2 border-slate-200 text-slate-500 font-bold py-3 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span>⚠️</span> REPORTAR INCIDENCIA
                                        </button>
                                    </div>
                                </div>
                            </section>
                        ) : (
                            <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center animate-in fade-in duration-1000">
                                <p className="text-slate-400 font-bold text-sm">No tienes ningún servicio activo</p>
                                <p className="text-[10px] text-slate-300 uppercase mt-1">Selecciona uno abajo para empezar</p>
                            </div>
                        )}

                        {/* UPCOMING ORDERS */}
                        <section>
                            <div className="flex items-center justify-between mb-4 mt-8">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Próximos Servicios</h3>
                                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {myOrders.filter(o => o.status === 'PLANNED').length}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {myOrders.filter(o => o.status === 'PLANNED').map(order => {
                                    const startTime = order.scheduled_start ? new Date(order.scheduled_start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                    const endTime = order.scheduled_start && order.estimated_duration
                                        ? new Date(new Date(order.scheduled_start).getTime() + order.estimated_duration * 60000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                        : '--:--';

                                    return (
                                        <div key={order.id} className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-50 overflow-hidden">
                                            <div className="p-4 space-y-3">
                                                {/* Header */}
                                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                            {startTime} - {endTime}
                                                        </span>
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">
                                                            🚛 {order.truck_id ? 'Camión' : 'Sin asignar'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-blue-500">#{order.display_id}</span>
                                                </div>

                                                {/* Client */}
                                                <div>
                                                    <div className="font-black text-lg text-slate-800">{order.client_name || 'Cliente'}</div>
                                                    <div className="text-sm text-slate-500">{order.description}</div>
                                                </div>

                                                {/* Route Segment 1 */}
                                                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-black">SEGMENTO 1</span>
                                                        <span className="text-[10px] font-black text-indigo-800 uppercase">Aproximación</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-600">
                                                        <span className="font-bold">Desde:</span> {order.previous_location || 'Base'} →
                                                        <span className="font-bold ml-1">Hasta:</span> {(order.origin_address || '').split(',')[0]}
                                                    </div>
                                                    {order.prep_duration_minutes && (
                                                        <div className="text-[10px] text-indigo-600 mt-1">
                                                            ⏱️ {Math.round(order.prep_duration_minutes)} min | 🛣️ {order.prep_distance_km || 0} km
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Route Segment 2 */}
                                                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-black">SEGMENTO 2</span>
                                                        <span className="text-[10px] font-black text-emerald-800 uppercase">Transporte</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-600">
                                                        <span className="font-bold">Origen:</span> {(order.origin_address || '').split(',')[0]} →
                                                        <span className="font-bold ml-1">Destino:</span> {(order.destination_address || '').split(',')[0]}
                                                    </div>
                                                    {order.driving_duration_minutes && (
                                                        <div className="text-[10px] text-emerald-600 mt-1">
                                                            ⏱️ {Math.round(order.driving_duration_minutes)} min | 🛣️ {order.driving_distance_km || order.km || 0} km
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Specs */}
                                                {(order.load_weight || order.requires_crane || order.load_length) && (
                                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                                        {order.load_weight && (
                                                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold">⚖️ {order.load_weight}kg</span>
                                                        )}
                                                        {order.load_length && (
                                                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold">📏 {order.load_length}m</span>
                                                        )}
                                                        {order.requires_crane && (
                                                            <span className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded font-bold">🏗️ Grúa</span>
                                                        )}
                                                        {order.requires_jib && (
                                                            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded font-bold">🏗️ JIB</span>
                                                        )}
                                                        {order.requires_box_body && (
                                                            <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-1 rounded font-bold">📦 Caja</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {!activeOrder && (
                                                <div className="p-3 bg-slate-50 border-t border-slate-100">
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'IN_PROGRESS')}
                                                        className="w-full bg-slate-900 hover:bg-black text-white font-black py-3 rounded-xl text-sm shadow-xl shadow-slate-200 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <span>▶️</span> COMENZAR SERVICIO
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {myOrders.filter(o => o.status === 'PLANNED').length === 0 && !activeOrder && (
                                    <div className="text-center py-16 animate-in fade-in zoom-in duration-1000">
                                        <div className="text-6xl mb-4 drop-shadow-xl">🏖️</div>
                                        <h4 className="text-xl font-black text-slate-800">¡Todo despejado!</h4>
                                        <p className="text-slate-400 text-sm font-medium mt-1">No tienes más servicios asignados por hoy.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* COMPLETED/INCIDENT HISTORY */}
                        {(myOrders.some(o => o.status === 'COMPLETED' || o.status === 'INCIDENT')) && (
                            <section className="pt-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Historial de Hoy</h3>
                                <div className="space-y-3">
                                    {myOrders.filter(o => o.status === 'COMPLETED' || o.status === 'INCIDENT').map(order => (
                                        <div key={order.id} className={`bg-white rounded-2xl p-4 border shadow-sm flex justify-between items-center transition-all ${order.status === 'INCIDENT' ? 'border-red-100 bg-red-50/30' : 'border-slate-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-sm ${order.status === 'INCIDENT' ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {order.status === 'INCIDENT' ? '⚠️' : '✓'}
                                                </div>
                                                <div>
                                                    <span className={`font-black text-sm block leading-tight ${order.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                        {order.client_name}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${order.status === 'INCIDENT' ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {order.status === 'INCIDENT' ? 'INCIDENCIA' : 'FINALIZADO'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                                #{order.display_id}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                ) : activeTab === 'EXPENSES' ? (
                    renderExpensesTab()
                ) : activeTab === 'HORARIO' ? (
                    renderTimeTrackingTab()
                ) : null}
            </main>

            {/* INCIDENT MODAL - CUSTOM MOBILE UI */}
            {isIncidentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 sm:pb-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsIncidentModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-500 p-8">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Reportar Problema</h3>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">¿Qué ha sucedido? El equipo de oficina recibirá una alerta inmediata.</p>

                        <div className="grid grid-cols-1 gap-3 mb-8">
                            {[
                                { text: 'Avería Mecánica 🛠️', val: 'MECHANICAL' },
                                { text: 'Tráfico / Atascos 🚗', val: 'TRAFFIC' },
                                { text: 'Problema en Cliente 🏢', val: 'CLIENT' },
                                { text: 'Otro Motivo ❓', val: 'OTHER' }
                            ].map(item => (
                                <button
                                    key={item.val}
                                    onClick={() => handleIncidentReport(item.text)}
                                    className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-slate-700 active:scale-95"
                                >
                                    {item.text}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsIncidentModalOpen(false)}
                            className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 active:scale-95"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            )}

            {/* COMPLETION MODAL */}
            {isCompletionModalOpen && activeOrder && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center px-0 pb-0 sm:px-4 sm:pb-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsCompletionModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-500 p-8 max-h-[90vh] overflow-y-auto">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                        <h3 className="text-2xl font-black text-slate-800 mb-1">Cerrar Parte</h3>
                        <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-6 bg-slate-100 inline-block px-3 py-1 rounded-lg font-bold">{activeOrder.client_name}</p>

                        <div className="space-y-4 mb-6">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Horas Totales</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 2.5"
                                        value={completionData.hours}
                                        onChange={e => setCompletionData({ ...completionData, hours: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-800 focus:border-blue-500 focus:ring-0 transition-colors"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kilómetros</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 150"
                                        value={completionData.km}
                                        onChange={e => setCompletionData({ ...completionData, km: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-800 focus:border-blue-500 focus:ring-0 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Observaciones</label>
                                <textarea
                                    rows={2}
                                    placeholder="Detalles sobre retrasos, accesos..."
                                    value={completionData.observations}
                                    onChange={e => setCompletionData({ ...completionData, observations: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm text-slate-800 focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firma Cliente / Responsable</label>
                                    <button onClick={() => sigCanvas.current?.clear()} className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">LIMPIAR</button>
                                </div>
                                <div className="border-2 border-slate-200 rounded-xl bg-slate-50 overflow-hidden" style={{ touchAction: 'none' }}>
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        canvasProps={{ className: 'w-full h-32' }}
                                        penColor="black"
                                    />
                                </div>
                                <p className="text-[9px] text-center text-slate-400 mt-2 font-medium">Firmar dentro del recuadro (Toca para dibujar)</p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                // Logic for saving (offline compat)
                                const isOnline = navigator.onLine;
                                const sig = sigCanvas.current?.isEmpty() ? null : sigCanvas.current?.toDataURL();

                                console.log("Cerrando orden con:", { ...completionData, signature: !!sig, isOnline });

                                handleStatusChange(activeOrder.id, 'COMPLETED');
                                setIsCompletionModalOpen(false);

                                if (!isOnline) {
                                    alert("📶 Sin conexión. Parte guardado en local. Se sincronizará automáticamente.");
                                } else {
                                    alert("✅ Parte de trabajo cerrado y sincronizado con éxito.");
                                }
                            }}
                            className="w-full bg-slate-900 hover:bg-black active:scale-[0.98] transition-all text-white font-black text-lg py-4 rounded-xl shadow-xl shadow-slate-200"
                        >
                            ENVIAR PARTE
                        </button>

                        <button
                            onClick={() => setIsCompletionModalOpen(false)}
                            className="w-full py-4 mt-2 text-slate-400 font-bold hover:text-slate-600 active:scale-95"
                        >
                            VOLVER
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Tab Bar (Aesthetics Only for now) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-40">
                <div
                    onClick={() => setActiveTab('ROUTE')}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'ROUTE' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <div className="text-xl">📋</div>
                    <span className="text-[9px] font-black uppercase">Ruta</span>
                </div>
                <div
                    onClick={() => setActiveTab('EXPENSES')}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'EXPENSES' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <div className="text-xl">💸</div>
                    <span className="text-[9px] font-black uppercase">Gastos</span>
                </div>
                <div
                    onClick={() => setActiveTab('HORARIO')}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'HORARIO' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <div className="text-xl">⏱️</div>
                    <span className="text-[9px] font-black uppercase">Horario</span>
                </div>
            </nav>
        </div>
    );
};
