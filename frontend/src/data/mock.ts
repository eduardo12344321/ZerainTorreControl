import type { Driver, Order, Truck } from '../types';

export const MOCK_DRIVERS: Driver[] = [
    { id: 'd1', name: 'Manolo García', is_active: true, status: 'WORKING' },
    { id: 'd2', name: 'Paco Martínez', is_active: true, status: 'RESTING' },
    { id: 'd3', name: 'Antonia Ruiz', is_active: true, status: 'WORKING' },
    { id: 'd4', name: 'Jose Luis', is_active: false, status: 'SICK' }, // Sick/Off
];

export const MOCK_TRUCKS: Truck[] = [
    { id: 't1', plate: '9216-FTR', alias: 'Volvo Grande', category: 'GRUA_PESADA', status: 'AVAILABLE', max_weight: 12, max_length: 8 },
    { id: 't2', plate: '4582-LMP', alias: 'Nissan Cabstar', category: 'GRUA_LIGERA', status: 'BUSY', max_weight: 3.5, max_length: 5 },
    { id: 't3', plate: '1234-BBC', alias: 'Renault T', category: 'TRAILER', status: 'AVAILABLE', max_weight: 24, max_length: 13 },
];

export const INITIAL_ORDERS: Order[] = [
    {
        id: 'o1',
        display_id: 101,
        status: 'PLANNED',
        client_id: 'c1',
        client_name: 'Talleres Pepe',
        description: 'Traslado A a B',
        origin_address: 'Calle Mayor 1',
        destination_address: 'Polígono Sur',
        scheduled_start: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(), // Today 8:00
        estimated_duration: 120, // 2 hours
        truck_id: 't1',
        driver_id: 'd1'
    },
    {
        id: 'o2',
        display_id: 102,
        status: 'IN_PROGRESS',
        client_id: 'c2',
        client_name: 'Aseguradora X',
        description: 'Rescate en carretera',
        origin_address: 'AP-7 Km 200',
        destination_address: 'Base',
        scheduled_start: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(), // Today 10:30
        estimated_duration: 90, // 1.5 hours
        truck_id: 't2',
        driver_id: 'd2'
    },
    {
        id: 'o3',
        display_id: 103,
        status: 'PLANNED',
        client_id: 'c3',
        client_name: 'Logística Z',
        description: 'Portacoches',
        origin_address: 'Madrid',
        destination_address: 'Bilbao',
        scheduled_start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), // Today 14:00
        estimated_duration: 180, // 3 hours
        truck_id: 't3',
        driver_id: undefined // No driver
    },
    {
        id: 'o4',
        display_id: 104,
        status: 'PLANNED',
        client_id: 'c4',
        client_name: 'Construcciones Norte',
        description: 'Material de obra',
        origin_address: 'Almacén Central',
        destination_address: 'Obra Calle 4',
        scheduled_start: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(), // Today 9:00
        estimated_duration: 60, // 1 hour
        truck_id: 't3',
        driver_id: undefined
    },
    {
        id: 'o5',
        display_id: 105,
        status: 'IN_PROGRESS',
        client_id: 'c5',
        client_name: 'Ayuntamiento',
        description: 'Retirada vehículo',
        origin_address: 'Plaza España',
        destination_address: 'Depósito Municipal',
        scheduled_start: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(), // Today 12:00
        estimated_duration: 45, // 45 min
        truck_id: 't2',
        driver_id: 'd1' // Manolo assigned here too (conflict logic later)
    },
    {
        id: 'o6',
        display_id: 106,
        status: 'DRAFT',
        client_id: 'c6',
        client_name: 'Grúas Manolo',
        description: 'Asistencia en viaje (Requiere Plataforma)',
        origin_address: 'C-32 Salida 4',
        destination_address: 'Taller Central',
        scheduled_start: new Date().toISOString(), // TBD
        estimated_duration: 60,
        truck_id: undefined,
        driver_id: undefined,
        required_vehicle_type: 'GRUA_LIGERA'
    },
    {
        id: 'o7',
        display_id: 107,
        status: 'DRAFT',
        client_id: 'c7',
        client_name: 'RACC',
        description: 'Batería (Requiere Pesada - Test)',
        origin_address: 'Calle Barcelona 123',
        destination_address: 'In Situ',
        scheduled_start: new Date().toISOString(), // TBD
        estimated_duration: 30,
        truck_id: undefined,
        driver_id: undefined,
        required_vehicle_type: 'GRUA_PESADA'
    },
    // New Inbox Orders
    {
        id: 'o8',
        display_id: 108,
        status: 'DRAFT',
        client_id: 'c8',
        client_name: 'Logística Sur',
        description: 'Transporte Maquinaria (Requiere Trailer)',
        origin_address: 'Puerto Barcelona',
        destination_address: 'Polígono Zona Franca',
        scheduled_start: new Date().toISOString(),
        estimated_duration: 120, // 2 hours
        truck_id: undefined,
        driver_id: undefined,
        required_vehicle_type: 'TRAILER'
    },
    {
        id: 'o9',
        display_id: 109,
        status: 'DRAFT',
        client_id: 'c9',
        client_name: 'Talleres Paco',
        description: 'Coche averiado (Cualquiera)',
        origin_address: 'Av. Diagonal 500',
        destination_address: 'Talleres Paco',
        scheduled_start: new Date().toISOString(),
        estimated_duration: 45, // 45 min
        truck_id: undefined,
        driver_id: undefined
        // No specific requirement
    },
    // New Planned Order to fill timeline
    {
        id: 'o10',
        display_id: 110,
        status: 'PLANNED',
        client_id: 'c10',
        client_name: 'Ayto. Hospitalet',
        description: 'Retirada vado',
        origin_address: 'Calle Mayor 1',
        destination_address: 'Depósito',
        scheduled_start: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
        estimated_duration: 30,
        truck_id: 't1', // Nissan Cabstar
        driver_id: 'd1'
    },
    {
        id: 'o11',
        display_id: 111,
        status: 'PLANNED',
        client_id: 'c4',
        client_name: 'Construcciones Norte',
        description: 'Más material',
        origin_address: 'Almacén Central',
        destination_address: 'Obra Calle 4',
        scheduled_start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
        estimated_duration: 90,
        truck_id: 't3', // Renault T
        driver_id: undefined // Needs driver!
    },
    // --- Batch 2: More Chaos ---
    {
        id: 'o12', display_id: 112, status: 'DRAFT', client_id: 'c11', client_name: 'Mapfre',
        description: 'Moto averiada', origin_address: 'Centro Comercial', destination_address: 'Taller Motos',
        scheduled_start: new Date().toISOString(), estimated_duration: 45, truck_id: undefined, driver_id: undefined, required_vehicle_type: 'GRUA_LIGERA'
    },
    {
        id: 'o13', display_id: 113, status: 'DRAFT', client_id: 'c12', client_name: 'Allianz',
        description: 'Salida de vía', origin_address: 'Ctra. Comarcal 5', destination_address: 'Desguace',
        scheduled_start: new Date().toISOString(), estimated_duration: 90, truck_id: undefined, driver_id: undefined, required_vehicle_type: 'GRUA_PESADA'
    },
    {
        id: 'o14', display_id: 114, status: 'DRAFT', client_id: 'c13', client_name: 'Part. Juan',
        description: 'Transporte Clásico', origin_address: 'Garage Privado', destination_address: 'Feria Muestras',
        scheduled_start: new Date().toISOString(), estimated_duration: 120, truck_id: undefined, driver_id: undefined, required_vehicle_type: 'GRUA_LIGERA'
    },
    {
        id: 'o15', display_id: 115, status: 'DRAFT', client_id: 'c14', client_name: 'Mutua Mad.',
        description: 'Pinchazo', origin_address: 'Calle Pez', destination_address: 'In Situ',
        scheduled_start: new Date().toISOString(), estimated_duration: 30, truck_id: undefined, driver_id: undefined
    },
    {
        id: 'o16', display_id: 116, status: 'DRAFT', client_id: 'c15', client_name: 'Uber Fleet',
        description: 'Fallo Motor', origin_address: 'Aeropuerto T1', destination_address: 'Base Uber',
        scheduled_start: new Date().toISOString(), estimated_duration: 60, truck_id: undefined, driver_id: undefined
    },
    // Conflicts overlapping over t1
    {
        id: 'o17', display_id: 117, status: 'PLANNED', client_id: 'c1', client_name: 'Talleres Pepe',
        description: 'URGENTE: Bloquea Vado', origin_address: 'Vado 1', destination_address: 'Depósito',
        scheduled_start: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(), estimated_duration: 45, truck_id: 't1', driver_id: 'd1'
    },
    {
        id: 'o18', display_id: 118, status: 'COMPLETED', client_id: 'c99', client_name: 'Guardia Urbana',
        description: 'Retirada Nocturna', origin_address: 'Zona Ocio', destination_address: 'Depósito',
        scheduled_start: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(), estimated_duration: 60, truck_id: 't2', driver_id: 'd2'
    }
];
