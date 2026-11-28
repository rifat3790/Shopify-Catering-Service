import { NextResponse } from 'next/server';
import { requireAdmin, requireUser } from '@/lib/serverAuth';
import { recordAuditLog, getAuditLogs, clearAuditLogs } from '@/lib/dataStore';

export async function POST(request: Request) {
  const __auth = await requireUser(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const body = await request.json();
    const { userId, userName, userEmail, userAvatar, userRole, path, pageTitle, action, details, device } = body;

    if (!path) {
      return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
    }

    const log = await recordAuditLog({
      userId: userId || '',
      userName: userName || 'Anonymous Member',
      userEmail: userEmail || '',
      userAvatar: userAvatar || '',
      userRole: userRole || 'user',
      path,
      pageTitle: pageTitle || '',
      action: action || 'page_view',
      details: details || '',
      device: device || 'Desktop Browser',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record audit log' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 150;
    const userEmail = searchParams.get('userEmail') || undefined;
    const path = searchParams.get('path') || undefined;
    const action = searchParams.get('action') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const logs = await getAuditLogs({
      limit,
      userEmail,
      path,
      action,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: logs,
      totalCount: logs.length,
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    await clearAuditLogs();
    return NextResponse.json({ success: true, message: 'Audit logs cleared' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear audit logs' },
      { status: 500 }
    );
  }
}
