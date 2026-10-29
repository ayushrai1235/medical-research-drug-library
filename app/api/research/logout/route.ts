import { NextResponse } from 'next/server';
import { endResearchSession } from '@/lib/auth/session';

export async function POST() {
  try {
    await endResearchSession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to end session' },
      { status: 500 }
    );
  }
}

