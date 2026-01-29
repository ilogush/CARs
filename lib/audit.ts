import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'correct'

interface LogEntry {
  entity_type: string
  entity_id: string
  action: AuditAction
  before_state?: any
  after_state?: any
}

export async function logAuditAction(
  entry: LogEntry,
  userId?: string,
  userRole?: string,
  companyId?: number,
  ip?: string,
  userAgent?: string
) {
  try {
    const supabase = createClient()
    
    // Get user if not provided
    let uid = userId
    let role = userRole
    
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        logger.debug('Audit log skipped: No authenticated user')
        return
      }
      uid = user.id
      
      // Get user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', uid)
        .single()
      role = userData?.role || 'client'
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: uid,
        role: role,
        company_id: companyId || null,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        action: entry.action,
        before_state: entry.before_state ? JSON.stringify(entry.before_state) : null,
        after_state: entry.after_state ? JSON.stringify(entry.after_state) : null,
        ip: ip || null,
        user_agent: userAgent || null
      })

    if (error) {
      // Не прерываем выполнение, просто логируем ошибку
      logger.warn('Failed to write audit log', error)
      // Не выбрасываем ошибку, чтобы не прерывать основной процесс
      return
    }
  } catch (err) {
    // Не прерываем выполнение, просто логируем ошибку
    logger.warn('Error in logAuditAction', err instanceof Error ? err : new Error(String(err)))
    // Не выбрасываем ошибку, чтобы не прерывать основной процесс
    return
  }
}

// Legacy function for backward compatibility
export async function logAction(entry: LogEntry) {
  await logAuditAction(entry)
}
