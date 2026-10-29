import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import type { User } from '@supabase/supabase-js';

export interface AdminProfile {
  id: string;
  email: string | null;
  displayName: string;
  role: 'admin';
  preferredLanguage: string;
}

export interface AdminAuthResult {
  user: User;
  profile: AdminProfile;
}

export async function getAdminUser(): Promise<AdminAuthResult | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const serviceClient = getServiceRoleSupabaseClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, email, display_name, role, preferred_language')
      .eq('id', user.id)
      .eq('role', 'admin')
      .single();

    const profileData = profile as any;

    if (profileError || !profileData) {
      return null;
    }

    return {
      user,
      profile: {
        id: profileData.id,
        email: profileData.email,
        displayName: profileData.display_name,
        role: 'admin',
        preferredLanguage: profileData.preferred_language,
      },
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminAuthResult> {
  const result = await getAdminUser();
  if (!result) {
    redirect('/admin-login');
  }
  return result;
}
