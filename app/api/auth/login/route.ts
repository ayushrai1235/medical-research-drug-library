import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { adminLoginSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid email or password' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // 1. Authenticate with Supabase Auth
    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 2. Verify admin role in profiles
    const serviceClient = getServiceRoleSupabaseClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role, display_name')
      .eq('id', authData.user.id)
      .single();

    const profileData = profile as any;

    if (profileError || profileData?.role !== 'admin') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Access denied: Your account is not configured with administrator permissions.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      redirect: '/admin/dashboard',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        displayName: profileData.display_name,
      },
    });
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during authentication' },
      { status: 500 }
    );
  }
}
