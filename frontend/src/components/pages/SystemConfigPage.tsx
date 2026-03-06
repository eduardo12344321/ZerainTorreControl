import React from 'react';
import { GcpUsageStats } from '../system/GcpUsageStats';

export const SystemConfigPage: React.FC = () => {
    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header Area */}
            <div className="p-8 bg-white border-b border-slate-100 shrink-0">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">⚙️</span>
                            <h1 className="text-2xl font-black text-slate-800">Parámetros de Sistema</h1>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Control de consumo, costes de IA y configuración de la Torre de Control.</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="max-w-6xl mx-auto space-y-12">

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Monitor de Consumo Google Cloud</h2>
                        </div>
                        <GcpUsageStats />
                    </section>

                    <section className="bg-orange-50/50 border border-orange-100 p-8 rounded-3xl">
                        <div className="flex items-start gap-4">
                            <span className="text-3xl">💡</span>
                            <div>
                                <h3 className="text-sm font-black text-orange-800 uppercase mb-2">Consejos para Ahorrar</h3>
                                <ul className="text-xs text-orange-700 font-medium space-y-2 list-disc ml-4">
                                    <li>Las búsquedas de direcciones ya conocidas por Zerain son **GRATUITAS** (no consumen API de Google).</li>
                                    <li>Hemos configurado un retardo de 500ms al escribir para que solo se cobre **una sesión** de búsqueda por dirección.</li>
                                    <li>El OCR de facturas usa **Gemini 1.5 Flash**, que es la IA más económica de Google Cloud (aprox. 0,001€ por factura).</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
