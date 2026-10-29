import { NextResponse } from 'next/server';
import { activityEventSchema } from '@/lib/validation/schemas';
import { logActivityEvent } from '@/lib/activity/tracker';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = activityEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid activity payload' },
        { status: 400 }
      );
    }

    const { action, drugId, relatedDrugIds, details } = parsed.data;

    const result = await logActivityEvent({
      action,
      drugId,
      relatedDrugIds,
      details,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
    }

    return NextResponse.json({ success: true, eventId: result.eventId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error tracking activity' },
      { status: 500 }
    );
  }
}
