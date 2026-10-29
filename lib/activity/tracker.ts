import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';

export type ActivityAction =
  | 'session_started'
  | 'drug_opened'
  | 'pdf_viewed'
  | 'drug_selected'
  | 'comparison_opened'
  | 'pdf_downloaded'
  | 'zip_downloaded'
  | 'comparison_pdf_downloaded';

export interface LogEventParams {
  action: ActivityAction;
  drugId?: string | null;
  relatedDrugIds?: string[];
  details?: Record<string, any>;
}

export async function logActivityEvent(params: LogEventParams): Promise<{ success: boolean; eventId?: string }> {
  try {
    const researchSession = await getResearchSession();
    const adminAuth = await getAdminUser();

    let sessionId: string | null = null;
    let userId: string | null = null;
    let displayNameSnapshot = 'Anonymous Researcher';

    if (adminAuth) {
      userId = adminAuth.user.id;
      displayNameSnapshot = adminAuth.profile.displayName || adminAuth.user.email || 'Admin User';
      sessionId = `admin-${adminAuth.user.id}`;
    } else if (researchSession) {
      sessionId = researchSession.id;
      userId = researchSession.userId || null;
      displayNameSnapshot = researchSession.displayName;
    } else {
      // In case an unauthenticated request reaches here
      sessionId = 'guest-session';
      displayNameSnapshot = 'Guest Researcher';
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data, error } = await (supabase.from('activity_events') as any)
      .insert({
        session_id: sessionId,
        user_id: userId,
        display_name_snapshot: displayNameSnapshot,
        action: params.action,
        drug_id: params.drugId || null,
        related_drug_ids: params.relatedDrugIds || [],
        details: params.details || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log activity event:', error.message);
      return { success: false };
    }

    return { success: true, eventId: (data as any)?.id };
  } catch (err) {
    console.error('Error logging activity event:', err);
    return { success: false };
  }
}

