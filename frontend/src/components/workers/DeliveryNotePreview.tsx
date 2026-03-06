import React from 'react';
import type { DeliveryNote } from '../../types';

interface DeliveryNotePreviewProps {
    data: DeliveryNote;
    onClose: () => void;
}

export const DeliveryNotePreview: React.FC<DeliveryNotePreviewProps> = ({ data, onClose }) => {
    const vehicleTypeLabels: Record<string, string> = {
        'furgoneta': 'Furgoneta',
        'camion_2_ejes': 'Camión 2 Ejes',
        'basculante': 'Basculante',
        'plataforma': 'Plataforma',
        'camion_3_ejes': 'Camión 3 Ejes',
        'camion_4x4': 'Camión 4 x 4',
        'trailer': 'Tráiler',
        'camion_2_ejes_grua': 'Camión 2 Ejes-Grúa',
        'camion_3_ejes_grua': 'Camión 3 Ejes-Grúa',
        'camion_4x4_grua': 'Camión 4 x 4-Grúa',
        'trailer_grua': 'Tráiler-Grúa'
    };

    const complementLabels: Record<string, string> = {
        'transpaleta': 'Transpaleta',
        'cubo_hormigon': 'Cubo de Hormigón',
        'jib': 'Jib',
        'cesta': 'Cesta',
        'pinza': 'Pinza',
        'caballete': 'Caballete',
        'desplazamiento': 'Desplazamiento',
        'transporte_especial': 'Transporte Especial',
        'coche_piloto': 'Coche Piloto',
        'peaje_autopistas': 'Peaje-Autopistas',
        'pago_tasas': 'Pago Tasas'
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center">
                    <div className="text-white">
                        <h2 className="text-xl font-black">Vista Previa del Albarán</h2>
                        <p className="text-xs text-blue-100 mt-1">Documento oficial ZERAIN</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* PDF Preview Content */}
                <div className="flex-grow overflow-y-auto p-6 bg-gray-50">
                    <div className="bg-white shadow-lg rounded-lg p-8 max-w-3xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {/* Company Header */}
                        <div className="border-b-4 border-red-600 pb-4 mb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-black text-gray-800">ZERAIN TRANSPORTES Y GRUAS</h1>
                                    <p className="text-xs text-gray-600 mt-1">Arriurdina, 22 - 01015 Vitoria-Gasteiz</p>
                                    <p className="text-xs text-gray-600">Tel: 945 291 811 | Fax: 945 291 038</p>
                                    <p className="text-xs text-gray-600">C.I.F: B-01299981</p>
                                </div>
                                <div className="text-right">
                                    <div className="bg-red-600 text-white px-4 py-2 rounded-lg inline-block">
                                        <div className="text-xs font-bold">ALBARÁN Nº</div>
                                        <div className="text-2xl font-black">{data.albaran_number}</div>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-2">
                                        <div><strong>Fecha:</strong> {new Date(data.date).toLocaleDateString('es-ES')}</div>
                                        <div><strong>Conductor:</strong> {data.driver_name}</div>
                                        <div><strong>Matrícula:</strong> {data.vehicle_plate}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Participants Data */}
                        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                            <div className="border border-gray-300 p-3 rounded">
                                <div className="font-bold text-gray-700 mb-2">CLIENTE</div>
                                <div><strong>Nombre:</strong> {data.client_name}</div>
                                <div><strong>Código:</strong> {data.client_code}</div>
                                <div><strong>Domicilio:</strong> {data.client_address}</div>
                            </div>
                            <div className="border border-gray-300 p-3 rounded">
                                <div className="font-bold text-gray-700 mb-2">CARGADOR</div>
                                <div><strong>Nombre:</strong> {data.shipper_name}</div>
                                <div><strong>Domicilio:</strong> {data.shipper_address}</div>
                                <div><strong>Fecha Carga:</strong> {new Date(data.loading_date).toLocaleDateString('es-ES')}</div>
                            </div>
                        </div>

                        <div className="border border-gray-300 p-3 rounded mb-6 text-xs">
                            <div className="font-bold text-gray-700 mb-2">CONSIGNATARIO</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><strong>Nombre:</strong> {data.consignee_name}</div>
                                <div><strong>Fecha Descarga:</strong> {new Date(data.unloading_date).toLocaleDateString('es-ES')}</div>
                                <div className="col-span-2"><strong>Domicilio:</strong> {data.consignee_address}</div>
                            </div>
                        </div>

                        {/* Service Details */}
                        <div className="border border-gray-300 p-3 rounded mb-6">
                            <div className="font-bold text-gray-700 mb-2 text-sm">SERVICIO REALIZADO</div>
                            <div className="text-xs space-y-2">
                                <div><strong>Concepto:</strong> {data.service_concept}</div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><strong>Mercancía:</strong> {data.merchandise}</div>
                                    <div><strong>Peso:</strong> {data.weight_kg} Kg</div>
                                    <div><strong>Longitud:</strong> {data.length_m} Mts</div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Type and Complements */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="border border-gray-300 p-3 rounded">
                                <div className="font-bold text-gray-700 mb-2 text-xs">TIPO DE SERVICIO</div>
                                <div className="text-xs">
                                    {data.vehicle_type ? (
                                        <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block font-bold">
                                            ✓ {vehicleTypeLabels[data.vehicle_type]}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">No especificado</span>
                                    )}
                                </div>
                            </div>
                            <div className="border border-gray-300 p-3 rounded">
                                <div className="font-bold text-gray-700 mb-2 text-xs">COMPLEMENTOS</div>
                                <div className="text-xs space-y-1">
                                    {data.complements.length > 0 ? (
                                        data.complements.map((comp, idx) => (
                                            <div key={idx} className="bg-green-50 text-green-700 px-2 py-0.5 rounded inline-block mr-1 font-bold">
                                                ✓ {complementLabels[comp] || comp}
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-gray-400">Ninguno</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Crane Specs */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="border border-gray-300 p-3 rounded">
                                <div className="font-bold text-gray-700 mb-2 text-xs">TRABAJOS EN ALTURA CON GRÚA</div>
                                <div className="text-xs">
                                    {data.crane_height ? (
                                        <div className="bg-orange-50 text-orange-700 px-2 py-1 rounded inline-block font-bold">
                                            ✓ {data.crane_height.replace('_', ' ').toUpperCase()}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">No aplica</span>
                                    )}
                                </div>
                            </div>
                            <div className="border border-gray-300 p-3 rounded">
                                <div className="font-bold text-gray-700 mb-2 text-xs">MANIPULACIÓN DE CARGAS</div>
                                <div className="text-xs">
                                    {data.load_capacity ? (
                                        <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded inline-block font-bold">
                                            ✓ {data.load_capacity.replace('_', ' ').toUpperCase()}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">No aplica</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Time Tracking */}
                        <div className="border border-gray-300 p-3 rounded mb-6">
                            <div className="font-bold text-gray-700 mb-2 text-sm">HORARIOS</div>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                    <div className="text-gray-500 font-bold">INICIO (Salida Garaje)</div>
                                    <div className="font-mono font-bold text-lg">{data.start_time}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 font-bold">LLEGADA A OBRA</div>
                                    <div className="font-mono font-bold text-lg">{data.arrival_time}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 font-bold">SALIDA DE OBRA</div>
                                    <div className="font-mono font-bold text-lg">{data.departure_time}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 font-bold">FIN (Llegada Garaje)</div>
                                    <div className="font-mono font-bold text-lg">{data.end_time}</div>
                                </div>
                            </div>
                            <div className="mt-3 bg-blue-50 p-2 rounded">
                                <span className="font-bold text-blue-700">TOTAL HORAS:</span>
                                <span className="font-mono font-black text-2xl text-blue-900 ml-2">{data.total_hours}h</span>
                            </div>
                        </div>

                        {/* Billing Items */}
                        {data.billing_items.length > 0 && (
                            <div className="border border-gray-300 p-3 rounded mb-6">
                                <div className="font-bold text-gray-700 mb-2 text-sm">FACTURACIÓN</div>
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="text-left p-2 border">CÓDIGO</th>
                                            <th className="text-right p-2 border">CANTIDAD</th>
                                            <th className="text-right p-2 border">PRECIO</th>
                                            <th className="text-right p-2 border">IMPORTE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.billing_items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 border">{item.code}</td>
                                                <td className="text-right p-2 border">{item.quantity}</td>
                                                <td className="text-right p-2 border">{item.price.toFixed(2)}€</td>
                                                <td className="text-right p-2 border font-bold">{item.amount.toFixed(2)}€</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Observations */}
                        {data.observations && (
                            <div className="border border-gray-300 p-3 rounded mb-6">
                                <div className="font-bold text-gray-700 mb-2 text-sm">OBSERVACIONES</div>
                                <div className="text-xs whitespace-pre-wrap">{data.observations}</div>
                            </div>
                        )}

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-4 mt-8 text-xs">
                            <div className="border border-gray-300 p-3 rounded text-center">
                                <div className="h-16 border-b border-gray-300 mb-2"></div>
                                <div className="font-bold">D.N.I. y Firma del Cargador</div>
                            </div>
                            <div className="border border-gray-300 p-3 rounded text-center">
                                <div className="h-16 border-b border-gray-300 mb-2"></div>
                                <div className="font-bold">D.N.I. y Firma del Consignatario</div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 text-center text-[10px] text-gray-400 italic">
                            Normas generales de contratación al dorso.
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-50 border-t flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-100 transition-all"
                    >
                        Cerrar
                    </button>
                    <button className="px-4 py-2 rounded-lg font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all">
                        📥 Descargar PDF
                    </button>
                    <button className="px-4 py-2 rounded-lg font-bold text-sm bg-purple-600 text-white hover:bg-purple-700 transition-all">
                        📤 Enviar a Dimoni
                    </button>
                </div>
            </div>
        </div>
    );
};
