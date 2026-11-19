import { NextResponse } from 'next/server';
import { persistentStore } from '@/lib/persistentStore';
import { SUPER_ADMIN_EMAIL, RoutePermissions, DEFAULT_ROUTE_PERMISSIONS } from '@/lib/types';
import { connectToDatabase } from '@/lib/mongodb';
import Setting from '@/lib/models/Setting';

export async function GET() {
  try {
    const db = await connectToDatabase();
    if (db && Setting) {
      const doc = await Setting.findOne({ key: 'route_permissions' }).lean();
      if (doc && doc.value) {
        persistentStore.setRoutePermissions(doc.value);
        return NextResponse.json({ success: true, data: doc.value });
      }
    }
  } catch (e) {
    console.warn('MongoDB route_permissions fetch fallback:', e);
  }

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

    try {
      const db = await connectToDatabase();
      if (db && Setting) {
        await Setting.findOneAndUpdate(
          { key: 'route_permissions' },
          { key: 'route_permissions', value: permissions },
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      console.warn('MongoDB route_permissions save error:', e);
    }

    return NextResponse.json({ success: true, data: updated, message: 'Permissions updated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update route permissions' },
      { status: 500 }
    );
  }
}
