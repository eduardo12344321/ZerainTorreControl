import React from 'react';

export const InstructionsPage: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto bg-gray-50 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
                        BIENVENIDO A <span className="text-blue-600">ZERAIN TOWER</span>
                    </h1>
                    <p className="text-gray-500 text-lg">Guía rápida de uso para la Torre de Control</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Sección 1: Gestión de Pedidos */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">📋</span>
                            <h2 className="text-xl font-bold text-gray-800">Creación de Pedidos</h2>
                        </div>
                        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                            <p>
                                <strong className="text-blue-600">Manual:</strong> Haz clic en el botón <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold text-blue-700">+</span> del Explorador (izquierda). Rellena los datos del cliente, origen, destino y carga.
                            </p>
                            <p>
                                <strong className="text-blue-600">Dictado por Voz:</strong> Usa el icono del micrófono 🎙️. Cuéntale a la IA el pedido (ej: "Lleva 20 toneladas de arena de Vitoria a Bilbao para Construcciones Norte mañana a las 8"). La IA detectará automáticamente el cliente, las direcciones y la fecha.
                            </p>
                        </div>
                    </section>

                    {/* Sección 2: Planificación Logística */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">🚛</span>
                            <h2 className="text-xl font-bold text-gray-800">Organización y Optimización</h2>
                        </div>
                        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                            <p>
                                <strong className="text-blue-600">Arrastrar:</strong> Los pedidos aparecen en el "Explorador". Arrástralos al calendario sobre el camión y la hora deseada.
                            </p>
                            <p>
                                <strong className="text-blue-600">Cálculo de Tiempos:</strong> Al arrastrar, el sistema calcula automáticamente el tiempo de preparación (tramo base-origen) y el tiempo de viaje (origen-destino) usando Google Maps real.
                            </p>
                            <p>
                                <strong className="text-blue-600">Asignar Conductor:</strong> Arrastra a un trabajador desde la derecha directamente sobre un pedido del calendario para asignarle el viaje.
                            </p>
                        </div>
                    </section>

                    {/* Sección 3: Estados y Modificación */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">🔄</span>
                            <h2 className="text-xl font-bold text-gray-800">Estados y Edición</h2>
                        </div>
                        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                            <p>
                                <strong className="text-blue-600">Estados:</strong> Un pedido <span className="text-gray-400 font-bold">Gris</span> es borrador. <span className="text-blue-600 font-bold">Azul</span> está planificado. <span className="text-orange-500 font-bold">Naranja</span> está en viaje. <span className="text-green-600 font-bold">Verde</span> está finalizado.
                            </p>
                            <p>
                                <strong className="text-blue-600">Editar:</strong> Haz doble clic sobre cualquier pedido del calendario o del explorador para abrir el panel de edición detallada.
                            </p>
                        </div>
                    </section>

                    {/* Sección 4: Presupuestos y Odoo */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">📉</span>
                            <h2 className="text-xl font-bold text-gray-800">Presupuestos y Ventas</h2>
                        </div>
                        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                            <p>
                                En la pestaña <strong className="text-blue-600">Presupuestos</strong> verás los pedidos de venta (Sales Orders) creados directamente en Odoo. Puedes visualizarlos, filtrarlos e importarlos a la planificación con un solo clic.
                            </p>
                        </div>
                    </section>

                    {/* Sección 5: App de Conductores y Albarán */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">📱</span>
                            <h2 className="text-xl font-bold text-gray-800">Web APP y Albarán Digital</h2>
                        </div>
                        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                            <p>
                                <strong className="text-blue-600">App Móvil:</strong> Los conductores acceden a su lista de viajes diaria. Pueden iniciar el viaje, marcar su llegada y finalizar el pedido.
                            </p>
                            <p>
                                <strong className="text-blue-600">Albarán Digital:</strong> Al finalizar, el conductor rellena un formulario digital (Kms, horas, pesos) y añade la firma del cliente. Este formulario genera automáticamente los datos para la facturación en Odoo.
                            </p>
                        </div>
                    </section>

                    {/* Sección 6: Recursos (Clientes y Vehículos) */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">🏗️</span>
                            <h2 className="text-xl font-bold text-gray-800">Recursos y Mantenimiento</h2>
                        </div>
                        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                            <p>
                                <strong className="text-blue-600">Clientes:</strong> Gestiona la base de datos sincronizada con Odoo. Puedes ver ubicaciones habituales y notas de riesgo.
                            </p>
                            <p>
                                <strong className="text-blue-600">Vehículos:</strong> Control integral de la flota. El sistema avisa de próximas **ITV**, revisiones y te permite gestionar entradas al **taller** para bloquear la disponibilidad del camión en el calendario.
                            </p>
                        </div>
                    </section>

                </div>

                {/* Footer ilustrativo */}
                <div className="mt-12 p-8 bg-blue-600 rounded-3xl text-white text-center shadow-xl shadow-blue-200">
                    <h3 className="text-2xl font-bold mb-2">¿Necesitas ayuda adicional?</h3>
                    <p className="opacity-90">Recuerda que todos los datos están sincronizados en tiempo real con la base de datos central de Transportes Zerain.</p>
                </div>
            </div>
        </div>
    );
};
