import React, { useState } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import {
    DndContext,
    useDraggable,
    useDroppable,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DropAnimation } from '@dnd-kit/core';
import type { Driver, DriverExpense, DailyRecord } from '../../types';

interface ApprovalBoardProps {
    driver: Driver;
    updateExpenseStatus: (driverId: string, expenseId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => void;
    updateOvertimeStatus: (driverId: string, date: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED') => void;
}

type ApprovalItem =
    | { type: 'EXPENSE'; data: DriverExpense }
    | { type: 'OVERTIME'; data: DailyRecord };

// HELPER TO EXTRACT DATE FOR SORTING
const getItemDate = (item: ApprovalItem) => {
    return new Date(item.data.date);
};

// HELPER TO FORMAT DATE
const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};

// EDIT MODAL COMPONENT
const EditModal = ({
    item,
    onClose,
    onSave
}: {
    item: DailyRecord;
    onClose: () => void;
    onSave: (values: Partial<DailyRecord>) => void
}) => {
    const [reg, setReg] = useState(item.regular_hours);
    const [extra, setExtra] = useState(item.overtime_hours);
    const [diets, setDiets] = useState(item.diet_count || 0);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                            <span>✏️</span> Corregir Registro
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.date}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Horas Normales</label>
                        <input
                            type="number"
                            value={reg}
                            onChange={e => setReg(parseFloat(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Horas Extras</label>
                        <input
                            type="number"
                            value={extra}
                            onChange={e => setExtra(parseFloat(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Dietas</label>
                        <input
                            type="number"
                            value={diets}
                            onChange={e => setDiets(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-500 hover:bg-slate-100 transition-all">CANCELAR</button>
                    <button
                        onClick={() => onSave({ regular_hours: reg, overtime_hours: extra, diet_count: diets })}
                        className="flex-grow py-2.5 rounded-xl font-black text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
                    >
                        GUARDAR CAMBIOS
                    </button>
                </div>
            </div>
        </div>
    );
};

// DRAGGABLE ITEM CARD
const DraggableItemCard = ({
    item,
    onPreview,
    onEdit
}: {
    item: ApprovalItem;
    onPreview: (url: string) => void;
    onEdit: (data: DailyRecord) => void;
}) => {
    const isExpense = item.type === 'EXPENSE';
    const id = isExpense ? item.data.id : `ovt-${item.data.date}`;
    const dateObj = getItemDate(item);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        data: { item }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.5 : 1
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:border-blue-300 group transition-all ${isDragging ? 'ring-2 ring-blue-500' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-2.5 min-w-0 flex-grow">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black border flex-shrink-0 mt-1 ${isExpense ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                        {isExpense ? (
                            item.data.type === 'DIET' ? '🍴' : item.data.type === 'FUEL' ? '⛽' : '🅿️'
                        ) : '🕒'}
                    </div>
                    <div className="min-w-0 text-left flex-grow">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase">{formatDate(dateObj)}</span>
                            <div className="flex items-center gap-1">
                                {isExpense && item.data.aiExtracted && (
                                    <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1 py-0.5 rounded flex items-center gap-0.5 border border-blue-200">
                                        🧠 IA
                                    </span>
                                )}
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${item.data.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                                    item.data.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                        item.data.status === 'MODIFIED' ? 'bg-blue-50 text-blue-700 border-blue-100 font-mono italic' :
                                            'bg-amber-100 text-amber-700 border-amber-200'
                                    }`}>
                                    {item.data.status}
                                </span>
                            </div>
                        </div>

                        <div className="font-extrabold text-gray-900 text-[13px] leading-none mb-1">
                            {isExpense ? `${item.data.amount}€` : `${item.data.overtime_hours}h Extra`}
                        </div>

                        {!isExpense && item.data.is_modified && item.data.original_overtime_hours !== undefined && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2 space-y-1">
                                <div className="text-[8px] font-black text-blue-700 uppercase tracking-wider mb-1">
                                    ✏️ Corregido por Admin
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[9px]">
                                    <div>
                                        <div className="text-gray-400 font-bold uppercase text-[8px]">Trabajador</div>
                                        <div className="font-mono font-bold text-gray-600">
                                            {item.data.original_regular_hours}h + {item.data.original_overtime_hours}h
                                            {item.data.original_diet_count ? ` + ${item.data.original_diet_count}🍴` : ''}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-blue-600 font-bold uppercase text-[8px]">Aprobado</div>
                                        <div className="font-mono font-bold text-blue-700">
                                            {item.data.regular_hours}h + {item.data.overtime_hours}h
                                            {item.data.diet_count ? ` + ${item.data.diet_count}🍴` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="text-[9px] text-gray-400 font-medium truncate mt-1">
                            {isExpense ? item.data.description : 'Jornada completada'}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                    {isExpense && item.data.ticketUrl && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPreview(item.data.ticketUrl!);
                            }}
                            className="text-[10px] bg-blue-50 text-blue-600 w-7 h-7 flex items-center justify-center rounded-lg border border-blue-100 font-bold hover:bg-blue-100 transition-colors"
                        >
                            👁️
                        </button>
                    )}
                    {!isExpense && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(item.data);
                            }}
                            className="text-[10px] bg-indigo-50 text-indigo-600 w-7 h-7 flex items-center justify-center rounded-lg border border-indigo-100 font-bold hover:bg-indigo-100 transition-colors"
                        >
                            ✏️
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ApprovalZoneProps {
    items: ApprovalItem[];
    title: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
    onPreview: (url: string) => void;
    onEdit: (data: DailyRecord) => void;
}

// DROPPABLE ZONE
const ApprovalZone: React.FC<ApprovalZoneProps> = ({ items, title, status, onPreview, onEdit }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `zone-${status}`,
        data: { status }
    });

    const getBgClass = () => {
        if (status === 'APPROVED') return isOver ? 'bg-green-100 ring-2 ring-green-400 border-green-300' : 'bg-green-50/10 border-green-50';
        if (status === 'REJECTED') return isOver ? 'bg-red-100 ring-2 ring-red-400 border-red-300' : 'bg-red-50/10 border-red-50';
        if (status === 'MODIFIED') return isOver ? 'bg-blue-100 ring-2 ring-blue-400 border-blue-300' : 'bg-blue-50/10 border-blue-50';
        return isOver ? 'bg-amber-100 ring-2 ring-amber-400 border-amber-300' : 'bg-gray-50/50 border-gray-100';
    };

    const getTitleClass = () => {
        if (status === 'APPROVED') return 'text-green-600 border-green-100';
        if (status === 'REJECTED') return 'text-red-600 border-red-100';
        if (status === 'MODIFIED') return 'text-blue-600 border-blue-100';
        return 'text-amber-600 border-amber-200';
    };

    return (
        <div ref={setNodeRef} className={`flex-1 flex flex-col rounded-xl border border-dashed transition-all min-h-[450px] overflow-hidden ${getBgClass()}`}>
            <h4 className={`text-[10px] font-black uppercase p-3 flex justify-between items-center bg-white/50 border-b border-inherit ${getTitleClass()}`}>
                <span>{title}</span>
                <span className="bg-white border px-2 py-0.5 rounded-full shadow-sm">{items.length}</span>
            </h4>

            <div className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="space-y-1">
                    {items.map((item) => {
                        const id = item.type === 'EXPENSE' ? item.data.id : `ovt-${item.data.date}`;
                        return <DraggableItemCard key={id} item={item} onPreview={onPreview} onEdit={onEdit} />;
                    })}
                    {items.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-[9px] italic flex flex-col items-center gap-2">
                            <span className="text-2xl opacity-20">
                                {status === 'APPROVED' ? '✅' : status === 'REJECTED' ? '🛑' : status === 'MODIFIED' ? '✏️' : '🕒'}
                            </span>
                            {status === 'APPROVED' ? 'Arrastra aquí para aprobar' :
                                status === 'REJECTED' ? 'Arrastra aquí para rechazar' : 'Nada pendiente'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ApprovalBoard: React.FC<ApprovalBoardProps> = ({ driver, updateExpenseStatus, updateOvertimeStatus }) => {
    const [activeItem, setActiveItem] = useState<ApprovalItem | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<DailyRecord | null>(null);
    const { saveAttendanceOverride } = useGlobalContext();

    // Map Expenses to ApprovalItems
    const expenseItems: ApprovalItem[] = (driver.expenses || []).map(e => ({ type: 'EXPENSE', data: e }));
    // Map Overtime/Attendance (DailyRecords with hours, diets or pending status) to ApprovalItems
    const overtimeItems: ApprovalItem[] = (driver.daily_records || [])
        .filter(r =>
            (r.overtime_hours || 0) > 0 ||
            (r.diet_count || 0) > 0 ||
            r.status === 'PENDING' ||
            r.status === 'MODIFIED' ||
            r.is_modified ||
            (r.check_in && r.check_out) // Show completed days even if no extras
        )
        .map(r => ({ type: 'OVERTIME', data: r }));

    const allItems = [...expenseItems, ...overtimeItems].sort((a, b) => {
        return getItemDate(b).getTime() - getItemDate(a).getTime();
    });

    const pendingItems = allItems.filter(item => item.data.status === 'PENDING');
    const approvedItems = allItems.filter(item => item.data.status === 'APPROVED');
    const rejectedItems = allItems.filter(item => item.data.status === 'REJECTED');
    const modifiedItems = allItems.filter(item => item.data.status === 'MODIFIED');

    const handleDragStart = (event: DragStartEvent) => {
        const item = event.active.data.current?.item as ApprovalItem;
        setActiveItem(item);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const targetStatus = over.data.current?.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
        const item = active.data.current?.item as ApprovalItem;

        if (item.data.status !== targetStatus) {
            if (item.type === 'EXPENSE') {
                if (targetStatus === 'MODIFIED') return; // Expenses don't support MODIFIED status yet
                updateExpenseStatus(driver.id, item.data.id, targetStatus as any);
            } else {
                updateOvertimeStatus(driver.id, item.data.date, targetStatus);
            }
        }
    };

    const handleSaveOverride = async (values: Partial<DailyRecord>) => {
        if (!editingItem) return;

        await saveAttendanceOverride({
            driver_id: parseInt(driver.id),
            date: editingItem.date,
            regular_hours: values.regular_hours,
            overtime_hours: values.overtime_hours,
            diet_count: values.diet_count,
            status: 'MODIFIED'
        });

        setEditingItem(null);
    };

    const handleManualEntry = () => {
        const today = new Date().toISOString().split('T')[0];
        setEditingItem({
            date: today,
            regular_hours: 8,
            overtime_hours: 0,
            diet_count: 0,
            status: 'MODIFIED'
        } as DailyRecord);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-left">
            <div className="mb-4 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <span>⚖️</span> Validación Jornadas y Dietas
                </h3>
                <button
                    onClick={handleManualEntry}
                    className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 text-[10px] font-black uppercase hover:bg-indigo-100 transition-all"
                >
                    + Meter Jornada Manual
                </button>
            </div>

            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-4 gap-2">
                    <ApprovalZone title="PENDIENTE" status="PENDING" items={pendingItems} onPreview={setSelectedTicket} onEdit={setEditingItem} />
                    <ApprovalZone title="MODIFICADO" status="MODIFIED" items={modifiedItems} onPreview={setSelectedTicket} onEdit={setEditingItem} />
                    <ApprovalZone title="APROBADO" status="APPROVED" items={approvedItems} onPreview={setSelectedTicket} onEdit={setEditingItem} />
                    <ApprovalZone title="RECHAZADO" status="REJECTED" items={rejectedItems} onPreview={setSelectedTicket} onEdit={setEditingItem} />
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeItem ? (
                        <div className="bg-white p-3 rounded-xl border border-blue-500 shadow-xl rotate-3 cursor-grabbing opacity-90 w-[200px]">
                            <div className="font-bold text-blue-800 text-xs text-left">
                                <div className="text-[8px] opacity-60 mb-1">{formatDate(getItemDate(activeItem))}</div>
                                Moviendo {activeItem.type === 'EXPENSE' ? 'gasto' : 'horas'}...
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Ticket Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedTicket(null)}>
                    <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-sm">Ticket Digital</h3>
                            <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold">✕</button>
                        </div>
                        <img src={selectedTicket} alt="Ticket" className="w-full h-auto max-h-[70vh] object-contain bg-black" />
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingItem && (
                <EditModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveOverride}
                />
            )}
        </div>
    );
};
