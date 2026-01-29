import Loader from '@/components/ui/Loader'

export default function PaymentsLoading() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader />
        </div>
    )
}
