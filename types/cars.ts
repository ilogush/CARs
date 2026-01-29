export interface CarBrand {
    id: number
    name: string
    created_at: string
    updated_at: string
}

export interface CarModel {
    id: number
    name: string
    brand_id: number
    created_at: string
    updated_at: string
    car_brands: {
        id: number
        name: string
    }
}

export interface CarTemplate {
    id: number
    brand_id: number
    model_id: number
    body_type_id?: number
    car_class_id?: number
    fuel_type_id?: number
    door_count_id?: number
    seat_count_id?: number
    transmission_type_id?: number
    engine_volume_id?: number
    body_production_start_year: number
    body_type?: string
    car_class?: string
    fuel_type?: string
    created_at?: string
    updated_at?: string
    car_brands?: CarBrand
    car_models?: CarModel
    car_body_types?: { id: number; name: string }
    car_classes?: { id: number; name: string }
    car_fuel_types?: { id: number; name: string }
    car_door_counts?: { id: number; count: number }
    car_seat_counts?: { id: number; count: number }
    car_transmission_types?: { id: number; name: string }
    car_engine_volumes?: { id: number; volume: number }
}

export interface CarReferenceData {
    bodyTypes: { id: number; name: string }[]
    carClasses: { id: number; name: string }[]
    fuelTypes: { id: number; name: string }[]
    doorCounts: { id: number; count: number }[]
    seatCounts: { id: number; count: number }[]
    transmissionTypes: { id: number; name: string }[]
    engineVolumes: { id: number; volume: number }[]
}
