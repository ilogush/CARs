export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          company_id: number | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: number
          ip: string | null
          role: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          company_id?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: number
          ip?: string | null
          role?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          company_id?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: number
          ip?: string | null
          role?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      car_brand_models: {
        Row: {
          id: number
          brand: string
          model: string
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          brand: string
          model: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          brand?: string
          model?: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      car_templates: {
        Row: {
          id: number
          brand_id: number
          model_id: number
          year: number
          body_type_id: number
          engine_volume_id: number
          transmission_id: number
          seats_id: number
          doors_id: number
          fuel_type_id: number
          price_per_day: number
          description: string | null
          status: string
          created_at: string
          updated_at: string
          images: string[] | null
          car_brands?: { name: string }
          car_models?: { name: string }
          car_body_types?: { name: string }
          car_classes?: { name: string }
          car_fuel_types?: { name: string }
          body_type?: string
          fuel_type?: string
          car_class?: string
          body_production_start_year?: number
          car_seat_counts?: { count: number }
          car_door_counts?: { count: number }
          car_transmission_types?: { name: string }
          car_engine_volumes?: { volume: number }
        }
        Insert: {
          id?: number
          brand_id: number
          model_id: number
          year: number
          body_type_id: number
          engine_volume_id: number
          transmission_id: number
          seats_id: number
          doors_id: number
          fuel_type_id: number
          price_per_day: number
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          images?: string[] | null
        }
        Update: {
          id?: number
          brand_id?: number
          model_id?: number
          year?: number
          body_type_id?: number
          engine_volume_id?: number
          transmission_id?: number
          seats_id?: number
          doors_id?: number
          fuel_type_id?: number
          price_per_day?: number
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          images?: string[] | null
        }
      }
      car_colors: {
        Row: { id: number; name: string; hex_code: string | null; created_at: string }
        Insert: { id?: number; name: string; hex_code?: string | null; created_at?: string }
        Update: { id?: number; name?: string; hex_code?: string | null; created_at?: string }
      }
      bookings: {
        Row: {
          id: number
          client_id: string
          company_car_id: number
          start_date: string
          end_date: string
          total_amount: number
          status: string
          created_at: string
          updated_at: string
          notes?: string | null
        }
        Insert: {
          id?: number
          client_id: string
          company_car_id: number
          start_date: string
          end_date: string
          total_amount: number
          status: string
          created_at?: string
          updated_at?: string
          notes?: string | null
        }
        Update: {
          id?: number
          client_id?: string
          company_car_id?: number
          start_date?: string
          end_date?: string
          total_amount?: number
          status?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
        }
      }
      clients: {
        Row: {
          citizenship: string | null
          city: string | null
          created_at: string | null
          gender: string | null
          id: string
          name: string
          passport_number: string | null
          phone: string
          second_phone: string | null
          surname: string
          telegram: string | null
          updated_at: string | null
        }
        Insert: {
          citizenship?: string | null
          city?: string | null
          created_at?: string | null
          gender?: string | null
          id: string
          name: string
          passport_number?: string | null
          phone: string
          second_phone?: string | null
          surname: string
          telegram?: string | null
          updated_at?: string | null
        }
        Update: {
          citizenship?: string | null
          city?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string
          passport_number?: string | null
          phone?: string
          second_phone?: string | null
          surname?: string
          telegram?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          currency_id: number | null
          email: string | null
          id: number
          is_active: boolean | null
          location_id: number | null
          logo_url: string | null
          name: string
          owner_id: string | null
          settings: Json | null
          updated_at: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          currency_id?: number | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          location_id?: number | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          settings?: Json | null
          updated_at?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          currency_id?: number | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          location_id?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          settings?: Json | null
          updated_at?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      company_cars: {
        Row: {
          id: number
          company_id: number
          template_id: number
          color_id: number
          mileage: number
          vin: string
          license_plate: string
          price_per_day: number
          photos: string[] | null
          document_photos: string[] | null
          description: string | null
          status: string
          created_at: string
          updated_at: string
          next_oil_change_mileage: number | null
          year: number
          insurance_expiry: string | null
          registration_expiry: string | null
          insurance_type: string | null
          price_per_month: number | null
          marketing_headline: string | null
          featured_image_index: number | null
          seasonal_prices: Json | null
          deleted_at: string | null
          island_trip_price: number | null
          krabi_trip_price: number | null
          full_insurance_price: number | null
          baby_seat_price: number | null
        }
        Insert: {
          id?: number
          company_id: number
          template_id: number
          color_id: number
          mileage?: number
          vin: string
          license_plate: string
          price_per_day: number
          photos?: string[] | null
          document_photos?: string[] | null
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          next_oil_change_mileage?: number | null
          year: number
          insurance_expiry?: string | null
          registration_expiry?: string | null
          insurance_type?: string | null
          price_per_month?: number | null
          marketing_headline?: string | null
          featured_image_index?: number | null
          seasonal_prices?: Json | null
          deleted_at?: string | null
          island_trip_price?: number | null
          krabi_trip_price?: number | null
          full_insurance_price?: number | null
          baby_seat_price?: number | null
        }
        Update: {
          id?: number
          company_id?: number
          template_id?: number
          color_id?: number
          mileage?: number
          vin?: string
          license_plate?: string
          price_per_day?: number
          photos?: string[] | null
          document_photos?: string[] | null
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          next_oil_change_mileage?: number | null
          year?: number
          insurance_expiry?: string | null
          registration_expiry?: string | null
          insurance_type?: string | null
          price_per_month?: number | null
          marketing_headline?: string | null
          featured_image_index?: number | null
          seasonal_prices?: Json | null
          deleted_at?: string | null
          island_trip_price?: number | null
          krabi_trip_price?: number | null
          full_insurance_price?: number | null
          baby_seat_price?: number | null
        }
      }
      contracts: {
        Row: {
          id: number
          client_id: string
          company_car_id: number
          manager_id: string
          start_date: string
          end_date: string
          total_amount: number
          deposit_amount: number
          notes: string | null
          status: string
          created_at: string
          photos: string[] | null
        }
        Insert: {
          id?: number
          client_id: string
          company_car_id: number
          manager_id: string
          start_date: string
          end_date: string
          total_amount: number
          deposit_amount?: number
          notes?: string | null
          status?: string
          created_at?: string
          photos?: string[] | null
        }
        Update: {
          id?: number
          client_id?: string
          company_car_id?: number
          manager_id?: string
          start_date?: string
          end_date?: string
          total_amount?: number
          deposit_amount?: number
          notes?: string | null
          status?: string
          created_at?: string
          photos?: string[] | null
        }
      }
      managers: {
        Row: {
          id: number
          user_id: string
          company_id: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          company_id: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          company_id?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      districts: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          location_id: number
          name: string
          price_per_day: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          location_id: number
          name: string
          price_per_day?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          location_id?: number
          name?: string
          price_per_day?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "districts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      hotels: {
        Row: {
          created_at: string | null
          district_id: number | null
          id: number
          is_active: boolean | null
          location_id: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          district_id?: number | null
          id?: number
          is_active?: boolean | null
          location_id?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          district_id?: number | null
          id?: number
          is_active?: boolean | null
          location_id?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      owner_profiles: {
        Row: {
          id: number
          user_id: string
          name: string
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payment_statuses: {
        Row: { id: number; name: string; value: number }
        Insert: { id?: number; name: string; value: number }
        Update: { id?: number; name?: string; value?: number }
      }
      payment_types: {
        Row: { id: number; name: string; sign: string }
        Insert: { id?: number; name: string; sign: string }
        Update: { id?: number; name?: string; sign?: string }
      }
      payments: {
        Row: {
          id: number
          company_id: number
          contract_id: number
          payment_status_id: number
          payment_type_id: number
          amount: number
          payment_method: string
          notes: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: number
          company_id: number
          contract_id: number
          payment_status_id: number
          payment_type_id: number
          amount: number
          payment_method: string
          notes?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: number
          company_id?: number
          contract_id?: number
          payment_status_id?: number
          payment_type_id?: number
          amount?: number
          payment_method?: string
          notes?: string | null
          created_at?: string
          created_by?: string
        }
      }
      users: {
        Row: {
          avatar_url: string | null
          citizenship: string | null
          city: string | null
          created_at: string | null
          driver_license_photos: string[] | null
          email: string
          gender: string | null
          id: string
          name: string | null
          passport_number: string | null
          passport_photos: string[] | null
          phone: string | null
          role: UserRole
          second_phone: string | null
          surname: string | null
          telegram: string | null
          updated_at: string | null
          id_serial: number | null
        }
        Insert: {
          avatar_url?: string | null
          citizenship?: string | null
          city?: string | null
          created_at?: string | null
          driver_license_photos?: string[] | null
          email: string
          gender?: string | null
          id: string
          name?: string | null
          passport_number?: string | null
          passport_photos?: string[] | null
          phone?: string | null
          role?: string
          second_phone?: string | null
          surname?: string | null
          telegram?: string | null
          updated_at?: string | null
          id_serial?: number | null
        }
        Update: {
          avatar_url?: string | null
          citizenship?: string | null
          city?: string | null
          created_at?: string | null
          driver_license_photos?: string[] | null
          email?: string
          gender?: string | null
          id?: string
          name?: string | null
          passport_number?: string | null
          passport_photos?: string[] | null
          phone?: string | null
          role?: string
          second_phone?: string | null
          surname?: string | null
          telegram?: string | null
          updated_at?: string | null
          id_serial?: number | null
        }
        Relationships: []
      }
      car_brands: {
        Row: { id: number; name: string; created_at: string }
        Insert: { id?: number; name: string; created_at?: string }
        Update: { id?: number; name?: string; created_at?: string }
      }
      car_models: {
        Row: { id: number; brand_id: number; name: string; created_at: string }
        Insert: { id?: number; brand_id: number; name: string; created_at?: string }
        Update: { id?: number; brand_id?: number; name?: string; created_at?: string }
      }
      currencies: {
        Row: { id: number; code: string; symbol: string; name: string; is_active: boolean }
        Insert: { id?: number; code: string; symbol: string; name: string; is_active?: boolean }
        Update: { id?: number; code?: string; symbol?: string; name?: string; is_active?: boolean }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type UserRole = 'admin' | 'owner' | 'manager' | 'client'

export type User = Database['public']['Tables']['users']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type District = Database['public']['Tables']['districts']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type CarBrandModel = Database['public']['Tables']['car_brand_models']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Hotel = Database['public']['Tables']['hotels']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentStatus = Database['public']['Tables']['payment_statuses']['Row']
export type PaymentType = Database['public']['Tables']['payment_types']['Row']
export type Car = Database['public']['Tables']['company_cars']['Row'] & {
  color?: string
  brand?: string
  model?: string
  transmission?: string
  seats?: number | string
}
export type OwnerProfile = Database['public']['Tables']['owner_profiles']['Row']
export type Manager = Database['public']['Tables']['managers']['Row']
export type Currency = Database['public']['Tables']['currencies']['Row']
export type Color = Database['public']['Tables']['car_colors']['Row']
export type CarTemplate = Database['public']['Tables']['car_templates']['Row']
export type CarBrand = Database['public']['Tables']['car_brands']['Row']
export type CarModel = Database['public']['Tables']['car_models']['Row']
export type CompanyCar = Database['public']['Tables']['company_cars']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
