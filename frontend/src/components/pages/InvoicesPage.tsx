import React, { useState } from 'react';

interface InvoiceEmail {
    id: string;
    from: string;
    subject: string;
    date: string;
    hasAttachment: boolean;
    isInvoice?: boolean;
    aiConfidence?: number;
    extractedData?: {
        invoiceNumber?: string;
        amount?: number;
        issueDate?: string;
        supplier?: string;
    };
    status: 'unprocessed' | 'processing' | 'validated' | 'sent_to_dimoni' | 'error';
}

export const InvoicesPage: React.FC = () => {
    const [emails, setEmails] = useState<InvoiceEmail[]>([
        {
            id: '1',
            from: 'proveedor@example.com',
            subject: 'Factura #2024-001',
            date: '2024-02-02',
            hasAttachment: true,
            isInvoice: true,
            aiConfidence: 0.95,
            extractedData: {
                invoiceNumber: '2024-001',
                amount: 1250.50,
                issueDate: '2024-02-01',
                supplier: 'Proveedor SA'
            },
            status: 'validated'
        }
    ]);


    const getStatusBadge = (status: InvoiceEmail['status']) => {
        const styles: Record<InvoiceEmail['status'], string> = {
            unprocessed: 'bg-gray-100 text-gray-700 border-gray-200',
            processing: 'bg-blue-100 text-blue-700 border-blue-200',
            validated: 'bg-green-100 text-green-700 border-green-200',
            sent_to_dimoni: 'bg-purple-100 text-purple-700 border-purple-200',
            error: 'bg-red-100 text-red-700 border-red-200'
        };

        const icons: Record<InvoiceEmail['status'], string> = {
            unprocessed: '📧',
            processing: '🔄',
            validated: '✅',
            sent_to_dimoni: '📤',
            error: '❌'
        };

        const labels: Record<InvoiceEmail['status'], string> = {
            unprocessed: 'Sin Procesar',
            processing: 'Procesando',
            validated: 'Validada',
            sent_to_dimoni: 'Enviada a Dimoni',
            error: 'Error'
        };

        return (
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${styles[status]}`}>
                {icons[status]} {labels[status]}
            </span>
        );
    };

    const handleProcessEmail = async (emailId: string) => {
        setEmails(prev => prev.map(e =>
            e.id === emailId ? { ...e, status: 'processing' } : e
        ));

        // TODO: Implement AI processing
        setTimeout(() => {
            setEmails(prev => prev.map(e =>
                e.id === emailId ? { ...e, status: 'validated' } : e
            ));
        }, 2000);
    };

    const handleSendToDimoni = async (emailId: string) => {
        // TODO: Implement Dimoni integration
        setEmails(prev => prev.map(e =>
            e.id === emailId ? { ...e, status: 'sent_to_dimoni' } : e
        ));
    };

    return (
        <div className="flex-grow p-6 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <span>📧</span> Facturas (Inbox)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Detección automática de facturas en emails con IA y envío a Dimoni
                    </p>
                </div>

                {/* Workflow Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🤖</span>
                        <div className="flex-grow">
                            <h3 className="font-bold text-blue-900 text-sm mb-2">Flujo Automatizado</h3>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="bg-white rounded-lg p-2 border border-blue-100">
                                    <div className="font-bold text-blue-700 mb-1">1. Leer Emails</div>
                                    <div className="text-gray-600">Conexión IMAP/Gmail API</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-blue-100">
                                    <div className="font-bold text-blue-700 mb-1">2. Detectar IA</div>
                                    <div className="text-gray-600">¿Es una factura?</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-blue-100">
                                    <div className="font-bold text-blue-700 mb-1">3. Extraer Datos</div>
                                    <div className="text-gray-600">OCR + AI parsing</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-blue-100">
                                    <div className="font-bold text-blue-700 mb-1">4. Enviar Dimoni</div>
                                    <div className="text-gray-600">Integración API</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Total Emails</div>
                        <div className="text-2xl font-black text-gray-800">{emails.length}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-blue-600 uppercase mb-1">Facturas Detectadas</div>
                        <div className="text-2xl font-black text-blue-700">
                            {emails.filter(e => e.isInvoice).length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-green-600 uppercase mb-1">Validadas</div>
                        <div className="text-2xl font-black text-green-700">
                            {emails.filter(e => e.status === 'validated').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-purple-600 uppercase mb-1">En Dimoni</div>
                        <div className="text-2xl font-black text-purple-700">
                            {emails.filter(e => e.status === 'sent_to_dimoni').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
                        <div className="text-xs font-bold text-red-600 uppercase mb-1">Errores</div>
                        <div className="text-2xl font-black text-red-700">
                            {emails.filter(e => e.status === 'error').length}
                        </div>
                    </div>
                </div>

                {/* Email List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <span>📬</span> Bandeja de Entrada
                        </h2>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all">
                            🔄 Sincronizar Emails
                        </button>
                    </div>

                    {emails.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <span className="text-5xl mb-4 block">📭</span>
                            <p className="font-bold text-gray-600">No hay emails</p>
                            <p className="text-xs mt-2">Sincroniza tu cuenta de email para comenzar</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {emails.map(email => (
                                <div
                                    key={email.id}
                                    className="p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                {email.isInvoice && (
                                                    <span className="text-2xl">🧾</span>
                                                )}
                                                <div className="flex-grow min-w-0">
                                                    <div className="font-bold text-gray-800 text-sm truncate">
                                                        {email.subject}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                        <span>{email.from}</span>
                                                        <span>•</span>
                                                        <span>{new Date(email.date).toLocaleDateString('es-ES')}</span>
                                                        {email.hasAttachment && <span>📎</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {email.isInvoice && email.extractedData && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                                                    <div className="grid grid-cols-4 gap-3 text-xs">
                                                        <div>
                                                            <div className="text-gray-400 font-bold uppercase text-[10px]">Nº Factura</div>
                                                            <div className="font-mono font-bold text-gray-800">
                                                                {email.extractedData.invoiceNumber}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 font-bold uppercase text-[10px]">Importe</div>
                                                            <div className="font-bold text-green-700">
                                                                {email.extractedData.amount}€
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 font-bold uppercase text-[10px]">Proveedor</div>
                                                            <div className="font-bold text-gray-700 truncate">
                                                                {email.extractedData.supplier}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-400 font-bold uppercase text-[10px]">Confianza IA</div>
                                                            <div className="font-bold text-blue-700">
                                                                {Math.round((email.aiConfidence || 0) * 100)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(email.status)}
                                            <div className="flex gap-2">
                                                {email.status === 'unprocessed' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleProcessEmail(email.id);
                                                        }}
                                                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                                                    >
                                                        Procesar
                                                    </button>
                                                )}
                                                {email.status === 'validated' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSendToDimoni(email.id);
                                                        }}
                                                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700"
                                                    >
                                                        → Dimoni
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Integration Status */}
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚙️</span>
                        <div>
                            <h3 className="font-bold text-yellow-900 text-sm">Configuración Pendiente</h3>
                            <ul className="text-xs text-yellow-800 mt-2 space-y-1">
                                <li>• Conectar cuenta de email (Gmail API / IMAP)</li>
                                <li>• Configurar modelo de IA para detección de facturas</li>
                                <li>• Integrar API de Dimoni para envío automático</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
