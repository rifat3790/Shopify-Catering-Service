import { NextResponse } from 'next/server';
import { persistentStore } from '@/lib/persistentStore';
import { SUPER_ADMIN_EMAIL, RoutePermissions, DEFAULT_ROUTE_PERMISSIONS } from '@/lib/types';

export async function GET() {
  try {
    const perms = persistentStore.getRoutePermissions();
    return NextResponse.json({ success: true, data: perms });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, data: DEFAULT_ROUTE_PERMISSIONS, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { permissions, requesterEmail } = body;

    // Security check: Only Super Admin can change permissions
    if (requesterEmail && requesterEmail.toLowerCase().trim() !== SUPER_ADMIN_EMAIL.toLowerCase().trim()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Super Admin can configure route permissions' },
        { status: 403 }
      );
    }

    if (!permissions || !Array.isArray(permissions.admin) || !Array.isArray(permissions.user)) {
      return NextResponse.json(
        { success: false, error: 'Invalid permissions payload' },
        { status: 400 }
      );
    }

    const updated = persistentStore.setRoutePermissions(permissions);
    return NextResponse.json({ success: true, data: updated, message: 'Permissions updated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update route permissions' },
      { status: 500 }
    );
  }
}
