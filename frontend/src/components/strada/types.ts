export interface Vehicle {
    plate: string;
    model: string;
    has_crane: number | boolean;
    last_pos?: {
        latitude: number;
        longitude: number;
        speed: number;
        timestamp: string;
        course: number;
    };
    status: string; // 'Drive', 'Sleep', 'Work', 'Waiting', 'Unknown'
    alerts_today: number;
    daily_km: number;
}

export interface Activity {
    plate: string;
    type: string;
    begin: string;
    end: string;
    duration?: number;
    odometer?: number;
}

export interface CraneEvent {
    plate: string;
    begin: string;
    end: string;
}

export interface Infraction {
    id: number;
    plate: string;
    type: string;
    timestamp: string;
    value: number;
    description: string;
}

export interface VehicleData {
    plate: string;
    route: any[];
    activities: Activity[];
    crane_events: CraneEvent[];
    infractions: Infraction[];
}

export interface Stats {
    speed: { day: string; avg_speed: number; max_speed: number }[];
    mileage: { day: string; km: number }[];
}

export interface OdometerPoint {
    time: string;
    km: number;
}
