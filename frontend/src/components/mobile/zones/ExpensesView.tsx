import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '../../../config';
import { compressImage } from '../../../utils/imageUtils';
import { useSync } from '../../../context/SyncContext';

interface Expense {
    id: string;
    date: string;
    type: 'DIET' | 'FUEL' | 'PARKING' | 'OTHER';
    amount: number;
    description: string;
    ticketUrl?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const ExpensesView: React.FC = () => {
    const { isOnline, addToSyncQueue } = useSync();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseType, setExpenseType] = useState<Expense['type']>('DIET');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load expenses on mount
    useEffect(() => {
        const loadExpenses = async () => {
            try {
                const userData = localStorage.getItem('driver_user');
                const driverId = userData ? JSON.parse(userData).id : '1';

                const response = await fetch(`${API_BASE}/expenses`);
                if (response.ok) {
                    const data = await response.json();
                    // Filter my expenses (API returns all for now)
                    const myExpenses = data.filter((e: any) => String(e.driver_id) === String(driverId));
                    setExpenses(myExpenses);
                }
            } catch (error) {
                console.error("Error loading expenses:", error);
            }
        };
        loadExpenses();
    }, []);

    const expenseTypes = [
        { value: 'DIET', label: 'Dieta', icon: '🍴' },
        { value: 'FUEL', label: 'Combustible', icon: '⛽' },
        { value: 'PARKING', label: 'Parking', icon: '🅿️' },
        { value: 'OTHER', label: 'Otro', icon: '📝' }
    ];

    const handleCameraCapture = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Compress image before even showing it/storing it in base64
                // 1024px and 0.7 quality is usually < 200KB
                const compressedBlob = await compressImage(file, 1024, 0.7);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setCapturedImage(reader.result as string);
                };
                reader.readAsDataURL(compressedBlob);
            } catch (err) {
                console.error("Compression error:", err);
                // Fallback to original if compression fails
                const reader = new FileReader();
                reader.onloadend = () => {
                    setCapturedImage(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSubmitExpense = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert('Por favor, introduce un importe válido');
            return;
        }

        const userData = localStorage.getItem('driver_user');
        const driverId = userData ? JSON.parse(userData).id : '1';

        const payload = {
            driver_id: driverId,
            date: selectedDate,
            amount: parseFloat(amount),
            type: expenseType,
            description: description || expenseTypes.find(t => t.value === expenseType)?.label || '',
            ticket_url: capturedImage || null
        };

        if (!isOnline) {
            console.log("ZERAIN: Offline. Guardando gasto en cola local...");
            addToSyncQueue({
                endpoint: '/expenses',
                method: 'POST',
                body: payload,
                type: 'EXPENSE'
            });
            alert("💾 Gasto guardado localmente (Offline). Se sincronizará al recuperar la cobertura.");
            setShowAddModal(false);
            // Optimistic update
            const tempExpense: Expense = {
                id: `temp-${Date.now()}`,
                date: selectedDate,
                type: expenseType,
                amount: parseFloat(amount),
                description: payload.description,
                ticketUrl: capturedImage || undefined,
                status: 'PENDING'
            };
            setExpenses([tempExpense, ...expenses]);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Error al enviar el gasto');

            const result = await response.json();
            setExpenses([{
                id: result.expense_id.toString(),
                date: selectedDate,
                type: expenseType,
                amount: parseFloat(amount),
                description: payload.description,
                ticketUrl: capturedImage || undefined,
                status: 'PENDING'
            }, ...expenses]);

            setShowAddModal(false);
            setAmount('');
            setDescription('');
            setCapturedImage(null);
        } catch (error) {
            console.error('Error submitting expense:', error);
            alert('Error de red. El cargo se guardará localmente.');
            addToSyncQueue({
                endpoint: '/expenses',
                method: 'POST',
                body: payload,
                type: 'EXPENSE'
            });
        }
    };

    const getStatusBadge = (status: Expense['status']) => {
        const styles = {
            PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
            APPROVED: 'bg-green-100 text-green-700 border-green-200',
            REJECTED: 'bg-red-100 text-red-700 border-red-200'
        };

        const icons = {
            PENDING: '⏳',
            APPROVED: '✅',
            REJECTED: '❌'
        };

        return (
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${styles[status]}`}>
                {icons[status]} {status}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 pb-12 shadow-2xl flex-shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl -ml-12 -mb-12"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">
                        💰 Gastos
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Gestión de tickets y dietas
                    </p>
                </div>
            </div>

            {/* Stats - Floating Overlap */}
            <div className="grid grid-cols-3 gap-3 px-4 -mt-8 flex-shrink-0 relative z-20">
                <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-100/50 backdrop-blur-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Mes</div>
                    <div className="text-xl font-black text-slate-900 leading-none">
                        {expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0).toFixed(2)}<span className="text-xs ml-0.5">€</span>
                    </div>
                </div>
                <div className="bg-emerald-500 rounded-2xl p-4 shadow-xl shadow-emerald-500/20 text-white">
                    <div className="text-[9px] font-black text-emerald-100 uppercase tracking-wider mb-1">Aprobados</div>
                    <div className="text-xl font-black leading-none">
                        {expenses.filter((e: Expense) => e.status === 'APPROVED').length}
                    </div>
                </div>
                <div className="bg-amber-500 rounded-2xl p-4 shadow-xl shadow-amber-500/20 text-white">
                    <div className="text-[9px] font-black text-amber-100 uppercase tracking-wider mb-1">Pendientes</div>
                    <div className="text-xl font-black leading-none">
                        {expenses.filter((e: Expense) => e.status === 'PENDING').length}
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="flex-grow overflow-y-auto px-4 pt-6 pb-32">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Registros Recientes</h3>

                {expenses.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border-2 border-dashed border-slate-200 flex flex-col items-center gap-6 mt-2">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl shadow-inner">
                            📸
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-slate-800 font-bold">No hay gastos todavía</p>
                            <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                                Pulsa el botón inferior para escanear un ticket o anotar una dieta.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {expenses.map((expense: Expense) => (
                            <div key={expense.id} className="group bg-white rounded-3xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-shrink-0">
                                        {expense.ticketUrl ? (
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm">
                                                <img
                                                    src={expense.ticketUrl}
                                                    alt="Ticket"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-2xl shadow-inner border border-slate-200/50">
                                                {expenseTypes.find(t => t.value === expense.type)?.icon}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] border border-slate-50">
                                            {expenseTypes.find(t => t.value === expense.type)?.icon}
                                        </div>
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-black text-slate-900 text-lg tracking-tight">
                                                {expense.amount.toFixed(2)}€
                                            </span>
                                            {getStatusBadge(expense.status)}
                                        </div>
                                        <div className="text-xs font-bold text-slate-600 truncate mb-1">
                                            {expense.description}
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            <span>📅 {new Date(expense.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                            <span className="text-slate-200">•</span>
                                            <span className="text-slate-500">{expenseTypes.find(t => t.value === expense.type)?.label}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-28 left-0 right-0 px-6 pointer-events-none">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-900/40 active:scale-95 transition-all flex items-center justify-center gap-3 pointer-events-auto border-t border-white/10"
                >
                    <div className="w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center text-slate-900 text-lg">
                        +
                    </div>
                    Registrar Nuevo Gasto
                </button>
            </div>

            {/* Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-end justify-center">
                    <div className="bg-white rounded-t-[3rem] w-full max-h-[85vh] shadow-2xl relative overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                        {/* Modal Header */}
                        <div className="flex-shrink-0 bg-white p-6 border-b border-slate-50 relative">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nuevo Gasto</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completa los detalles del ticket</p>
                                </div>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow min-h-0 overflow-y-auto p-6 space-y-6 pb-32">
                            {/* Amount */}
                            <div className="bg-slate-50 rounded-3xl p-6 text-center border-2 border-slate-100 focus-within:border-slate-900 transition-all">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Importe Total</label>
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        autoFocus
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="bg-transparent border-none text-4xl font-black text-slate-900 w-32 text-center p-0 focus:ring-0 placeholder:text-slate-200"
                                    />
                                    <span className="text-2xl font-black text-slate-300">€</span>
                                </div>
                            </div>

                            {/* Type Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Tipo de Gasto</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {expenseTypes.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => setExpenseType(type.value as Expense['type'])}
                                            className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-3 ${expenseType === type.value
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20'
                                                : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200 shadow-sm'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${expenseType === type.value ? 'bg-white/10' : 'bg-slate-50'}`}>
                                                {type.icon}
                                            </div>
                                            <span className="font-black text-xs uppercase tracking-tight">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Photo / Description row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Foto Ticket</label>
                                    <div className="relative h-32">
                                        {!capturedImage ? (
                                            <>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={handleCameraCapture}
                                                    className="w-full h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-all group"
                                                >
                                                    <div className="text-2xl group-active:scale-110 transition-transform">📸</div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Añadir</span>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="relative h-full">
                                                <img
                                                    src={capturedImage}
                                                    alt="Ticket"
                                                    className="w-full h-full object-cover rounded-3xl border-2 border-slate-900 shadow-lg"
                                                />
                                                <button
                                                    onClick={() => setCapturedImage(null)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center text-xs border-2 border-white"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Detalles</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-slate-300 uppercase">Fecha</span>
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="w-full bg-slate-50 border-none rounded-2xl px-3 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-slate-300 uppercase">Nota</span>
                                            <input
                                                type="text"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="..."
                                                className="w-full bg-slate-50 border-none rounded-2xl px-3 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 placeholder:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 z-10">
                            <button
                                onClick={handleSubmitExpense}
                                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border-t border-white/10"
                            >
                                Guardar Gasto 💾
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
