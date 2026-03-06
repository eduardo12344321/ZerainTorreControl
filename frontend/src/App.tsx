import { useState } from 'react';
import { TimelineGrid } from './components/timeline/TimelineGrid';
import { DriversList } from './components/resources/DriversList';
import { Inbox } from './components/orders/Inbox';
import { TrashZone } from './components/orders/TrashZone';
import { OrderInspector } from './components/orders/OrderInspector';
import { CreateOrderModal } from './components/modals/CreateOrderModal';
import { useGlobalContext } from './context/GlobalContext';
import type { Order } from './types';
import { InlineCalendar } from './components/ui/InlineCalendar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { QuickCalendar } from './components/ui/QuickCalendar';

function App() {
  const { orders, addOrder, updateOrder, deleteOrder } = useGlobalContext();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Modal & Edit States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [initialClientForNew, setInitialClientForNew] = useState<string>('');

  const handleOrderDoubleClick = (order: Order) => {
    setEditOrder(order);
    setIsCreateOpen(true);
  };

  const handleOrderDelete = async (orderId: string) => {
    await deleteOrder(orderId);
  };

  const handleConfirmCreateOrder = async (data: any) => {
    if (data.id) {
      await updateOrder(data);
      if (selectedOrder?.id === data.id) setSelectedOrder(data);
    } else {
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        display_id: 0,
        client_id: data.client_id || 'unknown',
        truck_id: data.truck_id,
        driver_id: data.driver_id,
        client_name: data.client_name,
        origin_address: data.origin_address,
        destination_address: data.destination_address,
        scheduled_start: new Date().toISOString(),
        estimated_duration: (data.prep_duration_minutes || 0) + (data.driving_duration_minutes || 0) + (data.work_duration_minutes || 60),
        description: data.description,
        status: data.status,
        driving_duration_minutes: data.driving_duration_minutes || 0,
        work_duration_minutes: data.work_duration_minutes || 60,
        prep_duration_minutes: data.prep_duration_minutes || 0,
        load_weight: data.load_weight,
        load_length: data.load_length,
        requires_crane: data.requires_crane || false,
        priority: false,
        km: data.km,
        km_to_origin: data.km_to_origin
      };
      const createdOrder = await addOrder(newOrder);
      setSelectedOrder(createdOrder);
    }
    setIsCreateOpen(false);
    setEditOrder(null);
  };

  const handleUnplanOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      updateOrder({
        ...order,
        status: 'DRAFT',
        truck_id: null,
        driver_id: null,
        scheduled_start: new Date().toISOString()
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex-grow overflow-hidden relative">
        <ErrorBoundary>
          <main className="flex p-4 gap-4 overflow-hidden h-full">
            {/* Left Side: Inbox & Trash */}
            <div className="w-80 flex flex-col gap-4 flex-shrink-0">
              <div className="flex-grow overflow-hidden flex flex-col">
                <Inbox
                  orders={orders}
                  onOrderClick={setSelectedOrder}
                  onOrderDoubleClick={handleOrderDoubleClick}
                  onOrderUnplan={handleUnplanOrder}
                  onCreateOrder={(clientName) => {
                    setInitialClientForNew(clientName || '');
                    setEditOrder(null);
                    setIsCreateOpen(true);
                  }}
                />
              </div>
              <div className="h-1/3 flex-shrink-0">
                <TrashZone
                  orders={orders}
                  onOrderUpdate={updateOrder}
                  onOrderDelete={handleOrderDelete}
                />
              </div>
            </div>

            {/* Center: The Tetris */}
            <section className="flex-grow flex flex-col min-w-0 relative">
              <QuickCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
              <DriversList className="mb-2" />
              <div className="flex-grow overflow-hidden relative">
                <TimelineGrid
                  orders={orders}
                  selectedOrderId={selectedOrder?.id}
                  selectedDate={selectedDate}
                  onOrderClick={setSelectedOrder}
                  onOrderDoubleClick={handleOrderDoubleClick}
                />
              </div>

              {/* Floating Calendar */}
              <div className="absolute bottom-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none">
                {isCalendarOpen && (
                  <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <InlineCalendar
                      label="Ir a Fecha"
                      selectedDate={selectedDate}
                      onChange={(d: string) => {
                        setSelectedDate(d);
                        setIsCalendarOpen(false);
                      }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 pointer-events-auto">
                  {selectedDate !== new Date().toLocaleDateString('sv-SE') && (
                    <button
                      onClick={() => setSelectedDate(new Date().toLocaleDateString('sv-SE'))}
                      className="bg-white px-4 py-2 rounded-full border border-blue-200 shadow-md text-[10px] font-black text-blue-600 hover:bg-blue-50 transition-all animate-in fade-in slide-in-from-right-2"
                    >
                      VOLVER A HOY
                    </button>
                  )}
                  <div className="bg-white px-4 py-2 rounded-full border border-gray-200 shadow-lg text-xs font-black text-gray-700 flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                    <span className="text-blue-600">📅</span>
                    {new Date(selectedDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                  <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={`
                      w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all active:scale-95 transform hover:scale-110
                      ${isCalendarOpen ? 'bg-gray-800 text-white border-2 border-white' : 'bg-blue-600 text-white'}
                    `}
                    title="Abrir Calendario"
                  >
                    {isCalendarOpen ? '✕' : '📅'}
                  </button>
                </div>
              </div>
            </section>

            {/* Right Side: Inspector */}
            <aside className="w-96 flex flex-col gap-4 hidden xl:flex flex-shrink-0 h-full">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden relative flex-grow scrollbar-hide">
                {selectedOrder ? (
                  <OrderInspector
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <span className="text-4xl mb-4">👆</span>
                    <h3 className="font-bold text-gray-600">Ningún pedido seleccionado</h3>
                    <p className="text-xs mt-2">Haz clic en un pedido del calendario o buzón para ver sus detalles.</p>
                  </div>
                )}
              </div>
            </aside>
          </main>
        </ErrorBoundary>
      </div>

      <CreateOrderModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditOrder(null);
          setInitialClientForNew('');
        }}
        onConfirm={handleConfirmCreateOrder}
        initialOrder={editOrder}
        initialClientName={initialClientForNew}
      />
    </div>
  )
}

export default App

