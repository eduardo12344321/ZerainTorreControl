import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalContext } from '../../context/GlobalContext';
import { Avatar } from '../ui/Avatar';
import { EditCustomerModal } from '../modals/EditCustomerModal';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';
import { DeleteOrderModal } from '../modals/DeleteOrderModal';
import { CreateOrderModal } from '../modals/CreateOrderModal';
import { OrderDetailsModal } from '../modals/OrderDetailsModal';
import type { Customer, Order } from '../../types';

import { searchCustomer } from '../../utils/search';

export const CustomersPage: React.FC = () => {
    const { customers, orders, addOrder, updateCustomer, addCustomer, deleteCustomer, deleteOrder, apiFetch } = useGlobalContext();
    const navigate = useNavigate();


    // Load last selected customer from localStorage or default to first customer
    const getInitialCustomerId = () => {
        const savedId = localStorage.getItem('lastSelectedCustomerId');
        if (savedId && customers.some(c => c.id === savedId)) {
            return savedId;
        }
        return customers[0]?.id || null;
    };

    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(getInitialCustomerId);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulkLimit, setBulkLimit] = useState(50);
    const [isBulkEnriching, setIsBulkEnriching] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isDeleteOrderModalOpen, setIsDeleteOrderModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [enrichStats, setEnrichStats] = useState<{ total: number, enriched: number, pending: number, completion_percentage: number } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    // Save selected customer to localStorage whenever it changes
    useEffect(() => {
        if (selectedCustomerId) {
            localStorage.setItem('lastSelectedCustomerId', selectedCustomerId);
        }
    }, [selectedCustomerId]);

    const fetchStats = React.useCallback(async () => {
        try {
            const res = await apiFetch('/odoo/customers/enrich-stats');
            if (res.ok) {
                const data = await res.json();
                setEnrichStats(data);
            }
        } catch (e) {
            console.error('Error fetching enrich stats:', e);
        }
    }, [apiFetch]);

    // Fetch enrichment stats on mount
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleBulkEnrich = async () => {
        if (!window.confirm(`¿Iniciar investigación inteligente de hasta ${bulkLimit} clientes? Esto se ejecutará en segundo plano.`)) return;

        setIsBulkEnriching(true);
        try {
            const res = await apiFetch(`/odoo/customers/enrich-bulk?limit=${bulkLimit}`, {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok) {
                alert(data.message);
            } else {
                alert(`❌ Error: ${data.detail || 'Fallo desconocido'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error al conectar con el servidor');
        } finally {
            setIsBulkEnriching(false);
        }
    };



    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('enrich', 'true'); // Automatically enrich new ones?

        try {
            const res = await apiFetch('/odoo/import/customers-excel', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                alert(`✅ ${data.message}`);
                // Clear input
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                alert('❌ Error al importar el archivo.');
            }
        } catch (err) {
            console.error(err);
            alert('Error crítico de conexión.');
        } finally {
            setIsImporting(false);
        }
    };

    const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => searchCustomer(c, searchTerm));
    }, [customers, searchTerm]);

    const selectedCustomer = useMemo(() =>
        customers.find(c => c.id === selectedCustomerId),
        [customers, selectedCustomerId]);

    useEffect(() => {
        if (!selectedCustomerId && customers.length > 0) {
            setSelectedCustomerId(customers[0].id);
        }
    }, [customers, selectedCustomerId]);


    const handleCreateOrderForCustomer = () => {
        if (!selectedCustomer) return;
        setIsCreateOrderModalOpen(true);
    };

    const handleOrderClick = (order: Order) => {
        setSelectedOrder(order);
        setIsOrderDetailsModalOpen(true);
    };

    const handleGoToOdoo = () => {
        setIsOrderDetailsModalOpen(false);
        navigate('/presupuestos');
    };

    const handleOrderCreated = (orderData: Partial<Order>) => {
        if (!selectedCustomer) return;

        const now = new Date();
        const newOrder: Order = {
            id: `ord-${Date.now()}`,
            display_id: Math.floor(Math.random() * 10000),
            client_id: selectedCustomer.id,
            truck_id: orderData.truck_id || 'pending',
            driver_id: orderData.driver_id || 'pending',
            status: 'DRAFT',
            scheduled_start: now.toISOString(),
            estimated_duration: 120,
            was_displaced: false,
            description: orderData.description || 'Nuevo pedido',
            origin_address: orderData.origin_address || selectedCustomer.locations[0] || '',
            destination_address: orderData.destination_address || '',
            client_name: orderData.client_name,
            load_weight: orderData.load_weight,
            load_length: orderData.load_length,
            requires_crane: orderData.requires_crane
        } as Order;

        addOrder(newOrder);
        setIsCreateOrderModalOpen(false);
        alert(`Pedido Borrador creado para ${selectedCustomer.name}. Ve al Inbox.`);
    };



    const confirmDeleteOrder = () => {
        if (orderToDelete) {
            deleteOrder(orderToDelete.id);
            setIsDeleteOrderModalOpen(false);
            setOrderToDelete(null);
        }
    };

    const handleDeleteClick = (customer: Customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (customerToDelete) {
            deleteCustomer(customerToDelete.id);
            setCustomerToDelete(null);
            setSelectedCustomerId(null);
        }
    };

    const geocodingRef = React.useRef<string | null>(null);

    useEffect(() => {
        const triggerGeocode = async () => {
            if (!selectedCustomer) return;
            if (geocodingRef.current === selectedCustomer.id) return;

            const needsGeocode = !selectedCustomer.billing_address ||
                (!selectedCustomer.billing_address.includes('España') && selectedCustomer.billing_address.length > 5);

            if (needsGeocode) {
                geocodingRef.current = selectedCustomer.id;
                try {
                    const res = await apiFetch(`/customers/${selectedCustomer.id}/geocode`, { method: 'POST' });
                    if (res.ok) {
                        const updated = await res.json();
                        // Only update geocoding-related fields to prevent overwriting other complete data (notes, phone, etc.) with stale local DB values
                        updateCustomer({
                            ...selectedCustomer,
                            billing_address: updated.billing_address,
                            locations: updated.locations
                        });
                    }
                } catch (e) {
                    console.error("Error in on-demand geocoding:", e);
                }
            }
        };

        if (selectedCustomerId) {
            triggerGeocode();
        }
    }, [selectedCustomerId, selectedCustomer?.billing_address, selectedCustomer, updateCustomer, apiFetch]);

    const syncRef = React.useRef<string | null>(null);

    useEffect(() => {
        const syncCustomerFromOdoo = async () => {
            if (!selectedCustomerId) return;
            // Prevent spamming the sync API endlessly
            if (syncRef.current === selectedCustomerId) return;

            syncRef.current = selectedCustomerId;
            try {
                const res = await apiFetch(`/customers/${selectedCustomerId}/sync`, { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.customer) {
                        updateCustomer(data.customer);
                    }
                }
            } catch (e) {
                console.error("Error auto-syncing customer from Odoo:", e);
            }
        };

        if (selectedCustomerId) {
            syncCustomerFromOdoo();
        }
    }, [selectedCustomerId, updateCustomer, apiFetch]);

    const reliabilityScore = selectedCustomer?.ai_reliability ? parseInt(selectedCustomer.ai_reliability) : null;


    const getReliabilityColor = (score: number) => {
        if (score >= 8) return 'bg-green-100 text-green-700 border-green-200';
        if (score >= 5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    return (
        <div className="h-full flex bg-gray-100/20">
            {/* Left Sidebar: Customers List */}
            <div className="w-[380px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-gray-800 tracking-tight lowercase first-letter:uppercase">Clientes</h2>
                            <span className="bg-blue-600 text-white px-2.5 py-1 rounded-lg text-xs font-black">{customers.length}</span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleExcelImport}
                                className="hidden"
                                accept=".xlsx,.xls"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isImporting}
                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all border border-gray-200 shadow-sm flex items-center gap-1"
                                title="Importar desde Excel"
                            >
                                <span className="text-xs font-black">{isImporting ? '⏳' : '📥'}</span>
                            </button>
                            <button
                                onClick={async () => {
                                    if (!window.confirm("¿Sincronizar toda la base de datos de Odoo localmente? Esto puede tardar unos segundos.")) return;
                                    const btn = document.getElementById('sync-odoo-btn');
                                    if (btn) btn.innerText = '⏳...';
                                    try {
                                        const res = await apiFetch('/customers/sync', { method: 'POST' });
                                        if (res.ok) {
                                            const data = await res.json();
                                            alert(`✅ Sincronizados ${data.count} clientes correctamente.`);
                                            window.location.reload(); // Quickest way to refresh GlobalContext data
                                        } else {
                                            alert("❌ Error en la sincronización.");
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert("❌ Error de conexión.");
                                    } finally {
                                        if (btn) btn.innerText = '🔄';
                                    }
                                }}
                                id="sync-odoo-btn"
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all border border-green-200 shadow-sm flex items-center gap-1"
                                title="Sincronizar con Odoo"
                            >
                                <span className="text-xs font-black">🔄</span>
                            </button>
                            <button onClick={() => { setCustomerToEdit(null); setIsEditModalOpen(true); }} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"><span className="text-lg font-bold">+</span></button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Intel AI Automático</span>
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                <span className="text-[8px] font-bold text-gray-500">Lote:</span>
                                <input
                                    type="number"
                                    value={bulkLimit}
                                    onChange={(e) => setBulkLimit(parseInt(e.target.value) || 0)}
                                    className="w-10 bg-transparent text-[10px] font-black text-blue-600 focus:outline-none"
                                />
                            </div>
                        </div>
                        {enrichStats && (
                            <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[8px] font-black text-gray-500 uppercase">Progreso IA</span>
                                    <span className="text-[10px] font-black text-blue-600">{enrichStats.completion_percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${enrichStats.completion_percentage}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[8px] font-bold text-gray-400">
                                    <span>✅ {enrichStats.enriched} completados</span>
                                    <span>⏳ {enrichStats.pending} pendientes</span>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={async () => {
                                    if (!window.confirm("¿Seguro que quieres borrar la memoria de la IA de TODA la base de datos y volver a investigar los 800 clientes desde cero?")) return;
                                    const btn = document.getElementById('reset-enrich-btn');
                                    if (btn) btn.innerText = '⏳';
                                    try {
                                        const res = await apiFetch('/odoo/customers/enrich-reset', { method: 'POST' });
                                        if (res.ok) {
                                            const data = await res.json();
                                            alert(`✅ ${data.message}`);
                                            fetchStats(); // Force progress bar update
                                        } else {
                                            alert("❌ Error al reiniciar.");
                                        }
                                    } catch (e) {
                                        console.error(e);
                                    } finally {
                                        if (btn) btn.innerText = '🔄';
                                    }
                                }}
                                id="reset-enrich-btn"
                                className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-all font-black"
                                title="Reiniciar memoria IA"
                            >
                                🔄
                            </button>
                            <button
                                onClick={handleBulkEnrich}
                                disabled={isBulkEnriching}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${isBulkEnriching ? 'bg-gray-100 text-gray-400' : 'bg-slate-900 text-white hover:bg-black active:scale-[0.98]'}`}
                            >
                                <span>🧠</span> {isBulkEnriching ? 'Iniciando...' : 'Investigar Clientes'}
                            </button>
                        </div>

                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, CIF o email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {filteredCustomers.map(customer => (
                        <div
                            key={customer.id}
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selectedCustomerId === customer.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                {customer.image_128 ? (
                                    <img
                                        src={`data:image/png;base64,${customer.image_128}`}
                                        alt={customer.name}
                                        className="w-10 h-10 rounded-full border border-gray-200 object-cover bg-white"
                                    />
                                ) : (
                                    <Avatar fallback={customer.name} size="md" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">CL-{customer.display_id}</span></div>
                                    <div className={`font-bold truncate ${['EXTINGUIDA', 'EXTINGIDA'].includes(customer.ai_company_status?.toUpperCase() || '') ? 'text-red-500 line-through' : 'text-gray-800'}`}>{customer.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{customer.email || 'Sin email'}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Details View */}
            <div className="flex-grow overflow-hidden flex flex-col">
                {selectedCustomer ? (
                    <div className="flex-1 flex flex-col overflow-hidden p-6">
                        {/* Summary Header with Info Cards */}
                        <div className="flex gap-6 mb-6 flex-shrink-0">
                            {/* Left: Avatar + Name + Reliability */}
                            <div className="flex items-center gap-6">
                                {selectedCustomer.image_128 ? (
                                    <img
                                        src={`data:image/png;base64,${selectedCustomer.image_128}`}
                                        alt={selectedCustomer.name}
                                        className="w-20 h-20 rounded-full border-2 border-white shadow-lg object-cover bg-white"
                                    />
                                ) : (
                                    <Avatar fallback={selectedCustomer.name} size="lg" className="w-20 h-20 text-2xl shadow-sm" />
                                )}
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs font-black text-white bg-blue-600 px-2 py-1 rounded-lg shadow-sm">ID: {selectedCustomer.display_id}</span>
                                        {selectedCustomer.ai_company_status && (
                                            <span className={`text-[10px] font-black px-2 py-1 ml-1 rounded-lg shadow-sm uppercase tracking-widest ${['EXTINGUIDA', 'EXTINGIDA'].includes(selectedCustomer.ai_company_status.toUpperCase())
                                                ? 'bg-red-600 text-white'
                                                : 'bg-emerald-600 text-white'
                                                }`}>
                                                {selectedCustomer.ai_company_status}
                                            </span>
                                        )}
                                        {reliabilityScore !== null && (
                                            <span className={`text-xs font-black px-3 py-1 rounded-lg shadow-sm border ${getReliabilityColor(reliabilityScore)} flex items-center gap-1.5`}>
                                                <span className="text-lg">⭐</span> FIABILIDAD: {reliabilityScore}/10
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{selectedCustomer.name}</h1>
                                    <div className="mt-2 flex items-center gap-2">
                                        {!selectedCustomer.ai_reliability && (
                                            <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-200 uppercase tracking-widest">
                                                Intel IA Incompleta
                                            </span>
                                        )}
                                        <button
                                            onClick={async () => {
                                                const btn = document.getElementById('enrich-btn');
                                                if (btn) btn.innerText = '⏳ Analizando...';
                                                try {
                                                    const res = await apiFetch(`/odoo/customers/${selectedCustomer.id}/enrich-expert`, { method: 'POST' });
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        const newIntel = {
                                                            ai_reliability: data.intel.reliability_score?.toString(),
                                                            ai_explanation: data.intel.reliability_justification,
                                                            ai_category: data.intel.activity,
                                                            ai_revenue: data.intel.revenue,
                                                            ai_employees: data.intel.employees,
                                                            ai_company_status: data.intel.suggested_company_status,
                                                            phone: data.updates_made.includes('phone') ? data.intel.suggested_phone : selectedCustomer.phone,
                                                            email: data.updates_made.includes('email') ? data.intel.suggested_email : selectedCustomer.email,
                                                            nif: data.updates_made.includes('vat') ? data.intel.suggested_nif : selectedCustomer.nif,
                                                            billing_address: typeof selectedCustomer.billing_address === 'string' ? selectedCustomer.billing_address : ''
                                                        };
                                                        updateCustomer({ ...selectedCustomer, ...newIntel });
                                                        alert("Análisis completado. Información actualizada localmente.");
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    if (btn) btn.innerText = selectedCustomer.ai_reliability ? '🧠 Rellenar Vacíos' : '🧠 Investigar Ahora';
                                                }
                                            }}
                                            id="enrich-btn"
                                            className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm hover:bg-purple-700 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-1"
                                            title="Busca y rellena solo los campos vacíos (email, tlf, NIF, provincia, etc)"
                                        >
                                            <span>🧠</span> {selectedCustomer.ai_reliability ? 'Rellenar Vacíos' : 'Investigar Ahora'}
                                        </button>

                                        <button
                                            onClick={async () => {
                                                if (!confirm("⚠️ ¿Seguro? La IA MACHACARÁ los datos actuales (teléfono, email, NIF, dirección) con lo que encuentre en internet.")) return;
                                                const btn = document.getElementById('enrich-overwrite-btn');
                                                if (btn) btn.innerText = '⏳ Redactando...';
                                                try {
                                                    const res = await apiFetch(`/odoo/customers/${selectedCustomer.id}/enrich-expert?overwrite=true`, { method: 'POST' });
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        const newIntel = {
                                                            ai_reliability: data.intel.reliability_score?.toString(),
                                                            ai_explanation: data.intel.reliability_justification,
                                                            ai_category: data.intel.activity,
                                                            ai_revenue: data.intel.revenue,
                                                            ai_employees: data.intel.employees,
                                                            ai_company_status: data.intel.suggested_company_status,
                                                            phone: data.updates_made.includes('phone') ? data.intel.suggested_phone : selectedCustomer.phone,
                                                            email: data.updates_made.includes('email') ? data.intel.suggested_email : selectedCustomer.email,
                                                            nif: data.updates_made.includes('vat') ? data.intel.suggested_nif : selectedCustomer.nif,
                                                            billing_address: typeof selectedCustomer.billing_address === 'string' ? selectedCustomer.billing_address : ''
                                                        };
                                                        updateCustomer({ ...selectedCustomer, ...newIntel });
                                                        alert("Datos de la empresa sobrescritos y actualizados.");
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    if (btn) btn.innerText = '🔥 Forzar Sobrescritura IA';
                                                }
                                            }}
                                            id="enrich-overwrite-btn"
                                            className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm hover:bg-red-700 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-1"
                                            title="Fuerza a la IA a sobrescribir TODOS los datos principales"
                                        >
                                            <span>🔥</span> Forzar Sobrescritura IA
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Billing + Contacts in ultra-compact cards */}
                            <div className="flex gap-3">
                                {/* Billing Data - Double Width */}
                                <div className="w-[400px] bg-blue-50/30 p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Facturación</h3>
                                    <div className="space-y-2">
                                        <div><span className="text-[9px] uppercase text-gray-400 font-black block mb-0.5">NIF/CIF</span><span className="font-mono text-sm font-bold text-gray-800">{selectedCustomer.nif || '-'}</span></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><span className="text-[9px] uppercase text-gray-400 font-black block mb-0.5">Pago</span><span className="text-sm font-bold text-gray-800">{selectedCustomer.payment_method || '-'}</span></div>
                                            <div><span className="text-[9px] uppercase text-gray-400 font-black block mb-0.5">CP</span><span className="text-sm font-bold text-gray-800">{selectedCustomer.postal_code || '-'}</span></div>
                                        </div>
                                        <div><span className="text-[9px] uppercase text-gray-400 font-black block mb-0.5">Dirección</span><div className="text-sm text-gray-800 font-bold leading-tight">{selectedCustomer.billing_address || '-'}</div></div>
                                    </div>
                                </div>

                                {/* Contacts - Ultra Compact */}
                                <div className="w-[200px] bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Contactos</h3>
                                    <div className="space-y-1.5">
                                        {selectedCustomer.phone && (
                                            <div className="p-1.5 bg-gray-50 rounded flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shadow-sm ring-1 ring-gray-100">📞</div>
                                                <span className="text-[10px] font-bold text-gray-800">{selectedCustomer.phone}</span>
                                            </div>
                                        )}
                                        {selectedCustomer.email && (
                                            <div className="p-1.5 bg-gray-50 rounded flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shadow-sm ring-1 ring-gray-100">✉️</div>
                                                <span className="text-[10px] font-bold text-gray-800 truncate">{selectedCustomer.email}</span>
                                            </div>
                                        )}
                                        {!selectedCustomer.phone && !selectedCustomer.email && (
                                            <div className="text-[10px] text-gray-400 italic">Sin contactos</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { setCustomerToEdit(selectedCustomer); setIsEditModalOpen(true); }} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition-all">Editar</button>
                                <button onClick={() => handleDeleteClick(selectedCustomer)} className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-all">🗑️</button>
                            </div>
                        </div>

                        {/* ANALISIS IA SECTION (Soft Blue Theme) */}
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-sm mb-6">
                            <div className="flex items-center gap-2 mb-6 border-b border-blue-100 pb-2">
                                <span className="text-xl">🧠</span>
                                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">Analisis IA</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                {/* Row 1 */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-blue-700/60 uppercase tracking-tighter">Fiabilidad</span>
                                        <span className="text-blue-400 text-[10px] cursor-help" title="Puntuación de confianza basada en datos públicos">?</span>
                                    </div>
                                    <div className="text-lg font-black text-blue-900">
                                        {selectedCustomer.ai_reliability ? `${selectedCustomer.ai_reliability}/10` : 'Pendiente...'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-blue-700/60 uppercase tracking-tighter">Explicacion</span>
                                        <span className="text-blue-400 text-[10px] cursor-help">?</span>
                                    </div>
                                    <div className="text-xs text-gray-600 font-medium leading-relaxed italic">
                                        {selectedCustomer.ai_explanation || 'Sin explicación detallada.'}
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-blue-700/60 uppercase tracking-tighter">Num Empleados</span>
                                        <span className="text-blue-400 text-[10px] cursor-help">?</span>
                                    </div>
                                    <div className="text-lg font-black text-blue-900">
                                        {selectedCustomer.ai_employees || 'Desconocido'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-blue-700/60 uppercase tracking-tighter">Categoria</span>
                                        <span className="text-blue-400 text-[10px] cursor-help">?</span>
                                    </div>
                                    <div className="inline-block px-3 py-1 bg-blue-100/50 border border-blue-200 rounded-full text-[10px] font-black text-blue-700">
                                        {selectedCustomer.ai_category || 'General'}
                                    </div>
                                </div>

                                {/* Row 3 */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-blue-700/60 uppercase tracking-tighter">Estado Empresa</span>
                                        <span className="text-blue-400 text-[10px] cursor-help">?</span>
                                    </div>
                                    <div className="text-lg font-black text-blue-900">
                                        {selectedCustomer.ai_company_status || 'Desconocido'}
                                    </div>
                                </div>

                                {/* Row 3 */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-blue-700/60 uppercase tracking-tighter">Facturacion estimada</span>
                                        <span className="text-blue-400 text-[10px] cursor-help">?</span>
                                    </div>
                                    <div className="text-xl font-black text-green-600">
                                        {selectedCustomer.ai_revenue || '---'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-row gap-6 overflow-hidden">
                            {/* COL 2: Map (left fallback, center, 500px) */}
                            <div className="w-[500px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col min-h-[350px]">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30 rounded-t-2xl">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">MAPA Y SEDES FRECUENTES</h3>
                                    </div>
                                    <div className="flex-1 relative bg-gray-100 overflow-hidden">
                                        {selectedCustomer.billing_address ? (
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedCustomer.billing_address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                                title="Map"
                                                className="absolute inset-0 grayscale-[0.2] contrast-[1.1]"
                                            ></iframe>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                                                <span className="text-4xl">📍</span>
                                                <span className="text-xs font-black uppercase">Sin ubicación fiscal</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white rounded-b-2xl border-t border-gray-100">
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedCustomer.locations.map((loc, i) => (
                                                <a key={i} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-600 truncate hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100 flex items-center gap-2">
                                                    <span>📍</span> {loc}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COL 3: Orders History (right, flex-1) */}
                            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                            📜 HISTORIAL <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[9px]">{orders.filter(o => o.client_id === selectedCustomer.id).length}</span>
                                        </h3>
                                        <button onClick={handleCreateOrderForCustomer} className="bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-gray-800 shadow-md flex items-center gap-1 active:scale-95 transition-all"><span>+</span> NUEVO</button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-[8px] font-black uppercase text-gray-400">
                                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> CURSO</div>
                                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> OK</div>
                                        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> FACT</div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-blue-50/10 custom-scrollbar">
                                    {orders.filter(o => o.client_id === selectedCustomer.id).sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()).map(order => {
                                        const isDone = order.status === 'COMPLETED';
                                        const isPaid = ['INVOICED', 'PAID'].includes(order.status);
                                        const borderClass = isPaid ? 'border-purple-200 bg-purple-50/30' : isDone ? 'border-green-200 bg-green-50/30' : 'border-blue-200 bg-white';
                                        const statusColor = isPaid ? 'bg-purple-500' : isDone ? 'bg-green-500' : 'bg-blue-500';

                                        return (
                                            <div
                                                key={order.id}
                                                className={`p-3 border ${borderClass} rounded-xl shadow-sm hover:shadow-md transition-all group flex gap-3 cursor-pointer`}
                                                onClick={() => handleOrderClick(order)}
                                            >
                                                <div className={`w-1 self-stretch rounded-full ${statusColor} opacity-40 group-hover:opacity-100`}></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-gray-400">#{order.display_id}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(`https://transporteszerain.odoo.com/web#id=${order.id}&model=sale.order&view_type=form`, '_blank');
                                                                }}
                                                                className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-blue-100 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-tighter"
                                                            >
                                                                Odoo ↗
                                                            </button>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-gray-400">{new Date(order.scheduled_start).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                                    </div>
                                                    <p className="text-[11px] font-black text-gray-800 leading-tight mb-2 truncate uppercase">{order.description}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold overflow-hidden">
                                                        <span className="truncate">{order.origin_address?.split(',')[0] || '-'}</span>
                                                        <span className="text-gray-300">→</span>
                                                        <span className="truncate">{order.destination_address?.split(',')[0] || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {orders.filter(o => o.client_id === selectedCustomer.id).length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center text-gray-300 gap-4">
                                            <span className="text-5xl">📦</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Sin historial de carga</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white text-gray-300">
                        <span className="text-8xl mb-6">🏢</span>
                        <h2 className="text-xl font-black uppercase tracking-widest">Selecciona un cliente para gestionar</h2>
                    </div>
                )}
            </div>

            <EditCustomerModal isOpen={isEditModalOpen} customer={customerToEdit} onClose={() => setIsEditModalOpen(false)} onConfirm={(c) => { if (customerToEdit) { updateCustomer(c); } else { addCustomer(c); setSelectedCustomerId(c.id); } }} />
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} resourceName={customerToDelete?.name || 'este cliente'} confirmText={customerToDelete ? customerToDelete.name.toUpperCase() : 'ELIMINAR'} />
            <DeleteOrderModal isOpen={isDeleteOrderModalOpen} order={orderToDelete} onClose={() => setIsDeleteOrderModalOpen(false)} onConfirm={confirmDeleteOrder} />
            <CreateOrderModal isOpen={isCreateOrderModalOpen} onClose={() => setIsCreateOrderModalOpen(false)} onConfirm={handleOrderCreated} initialClientName={selectedCustomer?.name} />
            <OrderDetailsModal
                isOpen={isOrderDetailsModalOpen}
                order={selectedOrder}
                onClose={() => setIsOrderDetailsModalOpen(false)}
                onGoToOdoo={handleGoToOdoo}
            />
        </div >
    );
};
