
export interface Location {
    id: number
    name: string
    created_at?: string
    updated_at?: string
}

export interface District {
    id: number
    name: string
    location_id: number
    created_at?: string
    updated_at?: string
    locations?: Location
}
