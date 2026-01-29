/**
 * Base API client for making requests to the Next.js API routes.
 * This abstracts the fetch logic and standardizes error handling.
 */

export class ApiError extends Error {
    status: number
    data: any

    constructor(message: string, status: number, data?: any) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        throw new ApiError(data.error || data.message || 'An error occurred', response.status, data)
    }

    return data
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'DELETE' }),
}
