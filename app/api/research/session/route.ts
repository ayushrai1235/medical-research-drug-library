import { NextResponse } from 'next/server';
import { researchSessionSchema } from '@/lib/validation/schemas';
import { createResearchSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = researchSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { displayName, language } = parsed.data;
    const session = await createResearchSession(displayName, language);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        displayName: session.displayName,
        preferredLanguage: session.preferredLanguage,
        createdAt: session.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize research session' },
      { status: 500 }
    );
  }
}
