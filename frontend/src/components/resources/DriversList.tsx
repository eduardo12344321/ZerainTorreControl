import { Avatar } from '../ui/Avatar';
import { useGlobalContext } from '../../context/GlobalContext';
import { useDragContext } from '../../context/DragContext';

interface DriversListProps {
    className?: string;
}

export const DriversList: React.FC<DriversListProps> = ({ className = "" }) => {
    const { drivers } = useGlobalContext();
    const { setDraggedDriver } = useDragContext();

    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex items-center p-3 h-14 overflow-x-auto ${className}`}>
            <div className="flex flex-col border-r border-gray-100 pr-6 min-w-max mr-4 shrink-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Recursos</span>
                <span className="text-[11px] text-blue-600 font-bold uppercase tracking-widest">Conductores</span>
            </div>

            <div className="flex gap-4 flex-grow items-center">
                {drivers.map(driver => (
                    <div
                        key={driver.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all shrink-0 ${driver.is_active
                            ? 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing'
                            : 'border-gray-100 bg-gray-50 opacity-50 grayscale'
                            }`}
                        draggable={driver.is_active}
                        onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'DRIVER', driverId: driver.id }));
                            e.dataTransfer.effectAllowed = 'copy';
                            setDraggedDriver(driver.id);
                        }}
                        onDragEnd={() => setDraggedDriver(null)}
                    >
                        <Avatar fallback={driver.name} size="sm" className={driver.is_active ? 'bg-blue-100 text-blue-700 w-6 h-6 text-[10px]' : 'bg-gray-200 w-6 h-6 text-[10px]'} />
                        <span className="text-[11px] font-black text-slate-700 truncate max-w-[80px]">{driver.name.split(' ')[0]}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${driver.is_active ? 'bg-green-500 shadow-sm' : 'bg-red-400'}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};
