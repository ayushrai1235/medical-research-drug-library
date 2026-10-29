import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@medicalresearch.org';
  const password = process.env.ADMIN_PASSWORD || 'MedicalAdmin2026!';
  const displayName = 'Lead Research Administrator';

  console.log(`Provisioning admin user: ${email}...`);

  // Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  let user = usersData.users.find(u => u.email === email);
  if (!user) {
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: 'admin',
        preferred_language: 'en',
      },
    });

    if (createError) {
      console.error('Failed to create admin user:', createError.message);
      process.exit(1);
    }
    user = createData.user;
    console.log(`Created admin user with id: ${user.id}`);
  } else {
    console.log(`Admin user already exists with id: ${user.id}, updating password and metadata...`);
    await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: 'admin',
        preferred_language: 'en',
      },
    });
  }

  // Ensure profile has role = 'admin'
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email,
      display_name: displayName,
      role: 'admin',
      preferred_language: 'en',
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error('Failed to upsert admin profile:', profileError.message);
    process.exit(1);
  }

  console.log('Admin user provisioned successfully!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('Role: admin (verified in profiles table)');
}

main().catch(console.error);

