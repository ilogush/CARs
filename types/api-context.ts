/**
 * Type definitions for Next.js API route contexts
 */

/**
 * Context passed to dynamic route handlers
 * @example /api/users/[id]/route.ts
 */
export interface ApiRouteContext {
  params: Promise<{
    [key: string]: string
  }>
}

/**
 * Typed wrapper for extracting route params
 */
export async function getRouteParams<T extends Record<string, string>>(
  context: ApiRouteContext
): Promise<T> {
  return (await context.params) as T
}
