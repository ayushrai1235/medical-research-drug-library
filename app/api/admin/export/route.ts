import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { generateActivityExcel, ActivityExportRow } from '@/lib/exports/excel';

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const drugId = searchParams.get('drugId') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const downloadType = searchParams.get('downloadType') || undefined;

    const supabase = getServiceRoleSupabaseClient();

    // Fetch all drugs for mapping IDs to names in related_drug_ids
    const { data: allDrugs } = await supabase.from('drugs').select('id, name');
    const drugMap = new Map(((allDrugs || []) as Array<{ id: string; name: string }>).map((d) => [d.id, d.name]));

    let query = supabase
      .from('activity_events')
      .select('id, user_id, display_name_snapshot, session_id, action, drug_id, related_drug_ids, details, created_at, drugs(id, name, slug, categories(name))')
      .order('created_at', { ascending: false })
      .limit(5000); // Bounded export to respect memory & Vercel runtime limits

    if (action) {
      query = query.eq('action', action);
    }
    if (drugId) {
      query = query.or(`drug_id.eq.${drugId},related_drug_ids.cs.{${drugId}}`);
    }
    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
    if (search) {
      query = query.ilike('display_name_snapshot', `%${search}%`);
    }
    if (downloadType) {
      query = query.filter('details->>downloadType', 'eq', downloadType);
    }

    const { data: events, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const exportRows: ActivityExportRow[] = (events || []).map((ev: any) => {
      const primaryDrug = ev.drugs?.name || (ev.drug_id ? drugMap.get(ev.drug_id) || 'Unknown' : '—');
      const category = ev.drugs?.categories?.name || '—';

      const relatedNames = (ev.related_drug_ids || [])
        .map((id: string) => drugMap.get(id) || id)
        .join(', ');

      return {
        id: ev.id,
        createdAt: ev.created_at,
        displayName: ev.display_name_snapshot || 'Anonymous',
        action: ev.action,
        primaryDrug,
        relatedDrugs: relatedNames || '—',
        category,
        downloadType: ev.details?.downloadType || '—',
        details: ev.details ? JSON.stringify(ev.details) : '—',
      };
    });

    // Compute summary metrics
    const eventsList = (events || []) as any[];
    const pdfViews = eventsList.filter((e) => e.action === 'pdf_viewed').length;
    const individualDownloads = eventsList.filter((e) => e.action === 'pdf_downloaded').length;
    const zipDownloads = eventsList.filter((e) => e.action === 'zip_downloaded').length;
    const comparisonDownloads = eventsList.filter((e) => e.action === 'comparison_pdf_downloaded').length;

    const excelBuffer = await generateActivityExcel(exportRows, {
      totalEvents: exportRows.length,
      pdfViews,
      individualDownloads,
      zipDownloads,
      comparisonDownloads,
      generatedBy: admin.profile.displayName || admin.user.email || 'Admin',
    });

    // Log admin audit action
    await (supabase.from('admin_audit_logs') as any).insert({
      admin_user_id: admin.user.id,
      action: 'export_activity_excel',
      entity_type: 'activity_events',
      details: {
        exportedRows: exportRows.length,
        filters: { action, drugId, startDate, endDate, search, downloadType },
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `medical_research_activity_${timestamp}.xlsx`;

    return new Response(excelBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
