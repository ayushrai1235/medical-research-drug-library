import { cookies } from 'next/headers';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';

export const SESSION_COOKIE_NAME = 'med_research_session';

export interface ResearchSession {
  id: string;
  displayName: string;
  preferredLanguage: string;
  userId?: string | null;
  createdAt: string;
}

export async function getResearchSession(): Promise<ResearchSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('research_sessions')
    .select('id, display_name, preferred_language, user_id, is_active, expires_at, created_at')
    .eq('id', sessionId)
    .single();

  const session = data as any;

  if (error || !session) {
    return null;
  }

  if (!session.is_active || new Date(session.expires_at) < new Date()) {
    return null;
  }

  return {
    id: session.id,
    displayName: session.display_name,
    preferredLanguage: session.preferred_language,
    userId: session.user_id,
    createdAt: session.created_at,
  };
}

export async function createResearchSession(
  displayName: string,
  preferredLanguage: string = 'en',
  userId?: string | null
): Promise<ResearchSession> {
  const supabase = getServiceRoleSupabaseClient();

  const { data, error } = await (supabase.from('research_sessions') as any)
    .insert({
      display_name: displayName,
      preferred_language: preferredLanguage,
      user_id: userId || null,
      is_active: true,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, display_name, preferred_language, user_id, created_at')
    .single();

  const created = data as any;

  if (error || !created) {
    throw new Error(`Failed to create research session: ${error?.message}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, created.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  // Track session_started
  await (supabase.from('activity_events') as any).insert({
    session_id: created.id,
    user_id: created.user_id || null,
    display_name_snapshot: created.display_name,
    action: 'session_started',
    details: { language: preferredLanguage },
  });

  return {
    id: created.id,
    displayName: created.display_name,
    preferredLanguage: created.preferred_language,
    userId: created.user_id,
    createdAt: created.created_at,
  };
}

export async function endResearchSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    const supabase = getServiceRoleSupabaseClient();
    await (supabase.from('research_sessions') as any)
      .update({ is_active: false })
      .eq('id', sessionId);

    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}
