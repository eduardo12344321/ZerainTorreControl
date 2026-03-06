import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config';
import { useGlobalContext } from '../../context/GlobalContext';
import type { Order, DeliveryNote } from '../../types';
import { DeliveryNotePreview } from '../workers/DeliveryNotePreview';
import { CreateDeliveryNoteModal } from '../workers/CreateDeliveryNoteModal';

// Local types removed in favor of shared types/index.ts

export const DeliveryNotesPage: React.FC = () => {
    const { orders } = useGlobalContext();
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [previewNote, setPreviewNote] = useState<DeliveryNote | null>(null);

    // Filter completed orders
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');

    useEffect(() => {
        fetch(`${API_BASE}/delivery-notes`)
            .then(res => res.json())
            .then(data => setDeliveryNotes(data))
            .catch(err => console.error("Error fetching notes:", err));
    }, []);

    const getStatusBadge = (status: DeliveryNote['status']) => {
        const styles: Record<DeliveryNote['status'], string> = {
            draft: 'bg-gray-100 text-gray-700 border-gray-200',

            completed: 'bg-green-100 text-green-700 border-green-200',
            sent_to_dimoni: 'bg-purple-100 text-purple-700 border-purple-200'
        };

        const icons: Record<DeliveryNote['status'], string> = {
            draft: '📝',

            completed: '✅',
            sent_to_dimoni: '📤'
        };

        const labels: Record<DeliveryNote['status'], string> = {
            draft: 'BORRADOR',

            completed: 'COMPLETADO',
            sent_to_dimoni: 'ENVIADO A DIMONI'
        };

        return (
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${styles[status]}`}>
                {icons[status]} {labels[status]}
            </span>
        );
    };

    const handleCreateFromOrder = (order: Order) => {
        setSelectedOrder(order);
        setShowCreateModal(true);
    };

    const handleCreateManual = () => {
        setSelectedOrder(null);
        setShowCreateModal(true);
    };

    const handleSaveDeliveryNote = async (note: DeliveryNote) => {
        try {
            const res = await fetch(`${API_BASE}/delivery-notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(note)
            });
            if (res.ok) {
                const newNote = await res.json();
                setDeliveryNotes(prev => [newNote, ...prev]);
                setShowCreateModal(false);
            } else {
                alert("Error al guardar el albarán");
            }
        } catch (e) {
            console.error("Save error:", e);
            alert("Error de red al guardar");
        }
    };

    return (
        <div className="flex-grow p-6 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <span>📄</span> Albaranes
                    </h1>
                    Generación de albaranes desde órdenes completadas para facturación masiva

                </div>

                {/* Workflow */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🔄</span>
                        <div className="flex-grow">
                            <h3 className="font-bold text-green-900 text-sm mb-2">Flujo de Generación</h3>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-white rounded-lg p-2 border border-green-100">
                                    <div className="font-bold text-green-700 mb-1">1. Orden Completada</div>
                                    <div className="text-gray-600">Datos iniciales del servicio</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-green-100">
                                    <div className="font-bold text-green-700 mb-1">2. Validación Admin</div>
                                    <div className="text-gray-600">Revisión de tiempos y servicios</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-green-100">
                                    <div className="font-bold text-green-700 mb-1">3. Albarán → Dimoni</div>
                                    <div className="text-gray-600">Documento completo</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Total Albaranes</div>
                        <div className="text-2xl font-black text-gray-800">{deliveryNotes.length}</div>
                    </div>

                    <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-green-600 uppercase mb-1">Completados</div>
                        <div className="text-2xl font-black text-green-700">
                            {deliveryNotes.filter(d => d.status === 'completed').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-purple-600 uppercase mb-1">En Dimoni</div>
                        <div className="text-2xl font-black text-purple-700">
                            {deliveryNotes.filter(d => d.status === 'sent_to_dimoni').length}
                        </div>
                    </div>
                </div>

                {/* Create from Orders */}
                {completedOrders.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                        <h3 className="font-bold text-green-900 text-sm mb-3 flex items-center gap-2">
                            <span>✨</span> Órdenes Completadas Listas para Albarán ({completedOrders.length})
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {completedOrders.slice(0, 6).map(order => (
                                <button
                                    key={order.id}
                                    onClick={() => handleCreateFromOrder(order)}
                                    className="bg-white rounded-lg p-3 border border-green-200 hover:border-green-400 hover:shadow-md transition-all text-left"
                                >
                                    <div className="font-bold text-gray-800 text-xs mb-1">#{order.display_id}</div>
                                    <div className="text-xs text-gray-600 truncate">{order.client_name}</div>
                                    <div className="text-[10px] text-green-600 font-bold mt-2">+ Crear Albarán</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Delivery Notes List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <span>📋</span> Albaranes ({deliveryNotes.length})
                        </h2>
                        <button
                            onClick={handleCreateManual}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 transition-all"
                        >
                            + Nuevo Albarán Manual
                        </button>
                    </div>

                    {deliveryNotes.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <span className="text-5xl mb-4 block">📄</span>
                            <p className="font-bold text-gray-600">No hay albaranes creados</p>
                            <p className="text-xs mt-2">Crea albaranes desde órdenes completadas</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {deliveryNotes.map(note => (
                                <div key={note.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-black text-gray-800">Albarán #{note.albaran_number}</span>
                                                <span className="text-xs text-gray-600">Orden #{note.order_id}</span>
                                                {getStatusBadge(note.status)}
                                            </div>
                                            <div className="text-sm text-gray-700 font-bold mb-1">{note.client_name}</div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>📅 {new Date(note.date).toLocaleDateString('es-ES')}</span>
                                                <span>🚛 {note.vehicle_plate}</span>
                                                <span>👤 {note.driver_name}</span>
                                                <span>⏱️ {note.total_hours}h</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPreviewNote(note)}
                                                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
                                            >
                                                👁️ Vista Previa
                                            </button>
                                            <button className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-bold transition-all">
                                                Editar
                                            </button>
                                            {note.status === 'completed' && (
                                                <button className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all">
                                                    → Dimoni
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Albarán Structure Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <span className="text-2xl">📋</span>
                        <div>
                            <h3 className="font-bold text-blue-900 text-sm mb-1">Estructura Completa del Albarán ZERAIN</h3>
                            <p className="text-xs text-blue-700">Todos los campos y opciones disponibles en el formulario oficial</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Vehicle Types */}
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                                <span>🚛</span> TIPO DE SERVICIO (12 opciones)
                            </h4>
                            <div className="grid grid-cols-4 gap-2 text-[11px] text-blue-800">
                                <div className="bg-blue-50 px-2 py-1 rounded">• Furgoneta</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Camión 2 Ejes</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Basculante</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Plataforma</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Camión 3 Ejes</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Camión 4 x 4</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Tráiler</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Camión 2 Ejes-Grúa</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Camión 3 Ejes-Grúa</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Camión 4 x 4-Grúa</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• Tráiler-Grúa</div>
                                <div className="bg-blue-50 px-2 py-1 rounded">• (Otro)</div>
                            </div>
                        </div>

                        {/* Complements */}
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                                <span>🔧</span> COMPLEMENTOS (12 opciones - selección múltiple)
                            </h4>
                            <div className="grid grid-cols-4 gap-2 text-[11px] text-blue-800">
                                <div className="bg-green-50 px-2 py-1 rounded">• Transpaleta</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Cubo de Hormigón</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Jib</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Cesta</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Pinza</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Caballete</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Desplazamiento</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Transporte Especial</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Coche Piloto</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Peaje-Autopistas</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• Pago Tasas</div>
                                <div className="bg-green-50 px-2 py-1 rounded">• (Otro)</div>
                            </div>
                        </div>

                        {/* Crane Specs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                                    <span>📏</span> TRABAJOS EN ALTURA CON GRÚA (6 rangos)
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-blue-800">
                                    <div className="bg-orange-50 px-2 py-1 rounded">• Hasta 12 Mts.</div>
                                    <div className="bg-orange-50 px-2 py-1 rounded">• Hasta 18 Mts.</div>
                                    <div className="bg-orange-50 px-2 py-1 rounded">• Hasta 21 Mts.</div>
                                    <div className="bg-orange-50 px-2 py-1 rounded">• Hasta 26 Mts.</div>
                                    <div className="bg-orange-50 px-2 py-1 rounded">• Hasta 29 Mts.</div>
                                    <div className="bg-orange-50 px-2 py-1 rounded">• Hasta 32 Mts.</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                                    <span>⚖️</span> MANIPULACIÓN DE CARGAS CON GRÚA (5 rangos)
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-blue-800">
                                    <div className="bg-purple-50 px-2 py-1 rounded">• Hasta 2 Tn.</div>
                                    <div className="bg-purple-50 px-2 py-1 rounded">• Hasta 3,5 Tn.</div>
                                    <div className="bg-purple-50 px-2 py-1 rounded">• Hasta 4 Tn.</div>
                                    <div className="bg-purple-50 px-2 py-1 rounded">• Hasta 5,5 Tn.</div>
                                    <div className="bg-purple-50 px-2 py-1 rounded">• Hasta 8 Tn.</div>
                                </div>
                            </div>
                        </div>

                        {/* Other Fields */}
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-2">
                                <span>📝</span> OTROS CAMPOS OBLIGATORIOS
                            </h4>
                            <div className="grid grid-cols-3 gap-3 text-[11px] text-blue-800">
                                <div>
                                    <div className="font-bold mb-1">Datos Generales</div>
                                    <ul className="space-y-0.5">
                                        <li>• Nº Albarán, Fecha</li>
                                        <li>• Conductor, Matrícula</li>
                                        <li>• Cliente (Nombre, Código, Domicilio)</li>
                                        <li>• Cargador (Nombre, Domicilio, Fecha Carga)</li>
                                        <li>• Consignatario (Nombre, Domicilio, Fecha Descarga)</li>
                                    </ul>
                                </div>
                                <div>
                                    <div className="font-bold mb-1">Servicio Realizado</div>
                                    <ul className="space-y-0.5">
                                        <li>• Concepto del servicio</li>
                                        <li>• Mercancía transportada</li>
                                        <li>• Peso (Kg)</li>
                                        <li>• Longitud (Mts)</li>
                                    </ul>
                                </div>
                                <div>
                                    <div className="font-bold mb-1">Tiempos y Facturación</div>
                                    <ul className="space-y-0.5">
                                        <li>• Hora Inicio (Salida Garaje)</li>
                                        <li>• Hora Llegada a Obra</li>
                                        <li>• Hora Salida de Obra</li>
                                        <li>• Hora Fin (Llegada Garaje)</li>
                                        <li>• Total Horas</li>
                                        <li>• Items de facturación (Código, Cantidad, Precio, Importe)</li>
                                        <li>• Observaciones</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Modal */}
                {previewNote && (
                    <DeliveryNotePreview
                        data={previewNote}
                        onClose={() => setPreviewNote(null)}
                    />
                )}

                {showCreateModal && (
                    <CreateDeliveryNoteModal
                        order={selectedOrder}
                        onClose={() => setShowCreateModal(false)}
                        onSave={handleSaveDeliveryNote}
                    />
                )}
            </div>
        </div>
    );
};
