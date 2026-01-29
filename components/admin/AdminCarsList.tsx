import React, { useEffect, useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

interface Car {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    status: string;
}

export const AdminCarsList: React.FC = () => {
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCars = async () => {
            try {
                const res = await fetch('/api/cars');
                if (!res.ok) throw new Error('Failed to fetch cars');
                const data = await res.json();
                setCars(data.data || []);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCars();
    }, []);

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'brand', label: 'Brand' },
        { key: 'model', label: 'Model' },
        { key: 'license_plate', label: 'License Plate' },
        {
            key: 'status',
            label: 'Status',
            render: (car: Car) => (
                <StatusBadge variant={car.status === 'available' ? 'success' : 'neutral'}>
                    {car.status}
                </StatusBadge>
            )
        }
    ];

    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="p-4">
            <DataTable
                title="Cars Overview"
                columns={columns}
                data={cars}
                isLoading={loading}
                disablePagination={cars.length < 10}
            />
        </div>
    );
};
