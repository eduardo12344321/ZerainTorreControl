// src/types/index.ts

export type TruckStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';
export type OrderStatus = 'DRAFT' | 'ANALYZING' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'INCIDENT' | 'CANCELLED' | 'MAINTENANCE' | 'INVOICED' | 'PAID';
export type TruckCategory = 'GRUA_PESADA' | 'GRUA_LIGERA' | 'TRAILER' | 'RIGIDO' | 'FURGONETA';

export interface Truck {
    id: string;
    plate: string;
    alias: string;
    category?: TruckCategory;
    display_order?: number;
    status: TruckStatus;
    last_location?: {
        lat: number;
        lng: number;
    };
    axles?: number; // 2 | 3 | 4
    max_weight?: number; // Tons
    color?: string; // Hex
    itv_expiration?: string; // ISO DateString
    next_maintenance?: string; // ISO DateString
    maint_start?: string; // New: Odoo Studio field
    maint_end?: string; // New: Odoo Studio field
    last_oil_change?: string; // Odoo: x_studio_fec_camb_aceite
    last_oil_change_km?: number; // Odoo: x_studio_km_ult_camb_aceite
    last_tire_change?: string; // Odoo: x_studio_fech_camb_ruedas
    last_tire_change_km?: number; // Odoo: x_studio_km_ult_cam_ruedas
    has_crane?: boolean;
    has_jib?: boolean; // New: Crane extension
    is_box_body?: boolean; // New: Closed vehicle (Caja cerrada)
    max_length?: number; // Meters
    plate_color?: string; // Custom bg for plate (yellow, white, green, blue)
    default_driver_id?: string;
    odometer?: number;
}

export interface Order {
    id: string;
    display_id: number;
    type?: 'TRANSPORT' | 'MAINTENANCE' | 'MEAL';
    status: OrderStatus;
    client_id: string;
    client_name?: string; // Hydrated generic or explicit if no client_id
    description: string;
    origin_address: string;
    destination_address: string;
    scheduled_start: string; // ISO Date
    estimated_duration: number; // Minutes
    truck_id?: string | null;
    driver_id?: string | null;
    required_vehicle_type?: string;
    load_weight?: number; // kg
    load_length?: number; // meters
    requires_crane?: boolean;
    requires_jib?: boolean; // New
    requires_box_body?: boolean; // New
    crane_height?: number; // meters
    priority?: boolean;
    driving_duration_minutes?: number; // Time driving
    work_duration_minutes?: number; // Time working on site
    prep_duration_minutes?: number; // Time until start/preparation
    prep_distance_km?: number; // Distance to arrive at origin
    driving_distance_km?: number; // Distance of the trip
    was_displaced?: boolean; // If true, it was kicked out by maintenance
    items?: string[];
    accessories?: string[];
    km?: number; // Legacy/Imported field (keep for compatibility)
    km_to_origin?: number;
    route_polyline?: string;
    previous_location?: string; // New: Where the truck comes from (e.g. Base or Prev. Dest)
    odoo_id?: string;
    odoo_name?: string; // e.g. S00020
    // Odoo-specific extra fields for expanded view
    amount_untaxed?: number;
    amount_tax?: number;
    amount_total?: number;
    invoice_status?: string;
    odoo_state?: string;
    vendedor?: string;
    terminos_pago?: string;
    fecha_validez?: string;
    referencia_cliente?: string;
    notas?: string;
    lineas?: any[];
    client_tags?: { name: string; color?: string }[];
}

export type DriverStatus = 'WORKING' | 'RESTING' | 'SICK' | 'VACATION';

export interface Driver {
    id: string;
    name: string;
    is_active: boolean; // Computed from status? Or manual override?
    status: DriverStatus;
    dni?: string; // New
    password?: string; // Optional for updates

    phone?: string;
    email?: string;
    created_at?: string;
    stats?: {
        extra_hours_today: number;
        extra_hours_month: number;
        diets_today: number;
        diets_month: number;
    };
    logs?: LogEntry[];
    expenses?: DriverExpense[];
    daily_records?: DailyRecord[];
    shift_start?: string; // New: e.g. "08:00"
    shift_end?: string; // New: e.g. "18:00"
}

export interface DailyRecord {
    date: string; // YYYY-MM-DD
    check_in?: string;
    check_out?: string;
    regular_hours?: number;
    meal_in?: string;
    meal_out?: string;
    meal_duration?: number;
    overtime_hours: number;
    diet_count?: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
    is_modified?: boolean;
    // Original values before admin override (for comparison)
    original_regular_hours?: number;
    original_overtime_hours?: number;
    original_diet_count?: number;
}

export interface DriverExpense {
    id: string;
    date: string;
    type: 'DIET' | 'FUEL' | 'PARKING' | 'OTHER';
    amount: number;
    description: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    ticketUrl?: string; // URL for the receipt image
    aiExtracted?: boolean; // New: Flag to show it was processed by AI
}

export interface CustomerContact {
    name: string;
    role?: string; // e.g. "Jefe de Obra", "Administración"
    phone?: string;
    email?: string;
}

export interface Customer {
    id: string;
    display_id: number;
    name: string;
    nif?: string; // Tax ID (Synergy: vat_code)
    phone?: string;
    email?: string;
    billing_address?: string; // Official address (Synergy: cmp_fadd1)
    postal_code?: string; // (Synergy: cmp_fpc)
    city?: string; // (Synergy: cmp_fcity)
    province?: string;
    country?: string;
    payment_method?: string; // (Synergy: pay_method / crd_code)
    locations: string[]; // Common addresses/sites (Operational)
    notes?: string;
    reliability?: number;
    contacts?: CustomerContact[];
    image_128?: string; // Base64 encoded image from Odoo
    ai_category?: string;
    ai_revenue?: string;
    ai_employees?: string;
    ai_reliability?: string;
    ai_explanation?: string;
    ai_company_status?: string;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    action: 'START' | 'STOP' | 'BREAK' | 'RESUME';
    order_id?: string;
    details?: string;
}

export type DeliveryNoteVehicleType = 'furgoneta' | 'camion_2_ejes' | 'basculante' | 'plataforma' | 'camion_3_ejes' |
    'camion_4x4' | 'trailer' | 'camion_2_ejes_grua' | 'camion_3_ejes_grua' |
    'camion_4x4_grua' | 'trailer_grua';

export type DeliveryNoteCraneHeight = 'hasta_12m' | 'hasta_18m' | 'hasta_21m' | 'hasta_26m' | 'hasta_29m' | 'hasta_32m';

export type DeliveryNoteLoadCapacity = 'hasta_2tn' | 'hasta_3_5tn' | 'hasta_4tn' | 'hasta_5_5tn' | 'hasta_8tn';

export interface DeliveryNoteBillingItem {
    code: string;
    quantity: number;
    price: number;
    amount: number;
}

export interface DeliveryNote {
    id: string;
    albaran_number: string;
    order_id: string;
    date: string;
    driver_name: string;
    vehicle_plate: string;
    client_name: string;
    client_code: string;
    client_address: string;
    shipper_name: string;
    shipper_address: string;
    loading_date: string;
    consignee_name: string;
    consignee_address: string;
    unloading_date: string;
    service_concept: string;
    merchandise: string;
    weight_kg: number;
    length_m: number;
    vehicle_type: DeliveryNoteVehicleType | null;
    complements: string[];
    crane_height: DeliveryNoteCraneHeight | null;
    load_capacity: DeliveryNoteLoadCapacity | null;
    start_time: string;
    arrival_time: string;
    departure_time: string;
    end_time: string;
    total_hours: number;
    observations: string;
    billing_items: DeliveryNoteBillingItem[];
    status: 'draft' | 'completed' | 'sent_to_dimoni';
}
