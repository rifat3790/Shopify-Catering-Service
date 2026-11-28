import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';
import { 
  createPasswordResetRequest, 
  getActivePasswordResetRequests, 
  verifyAndResetPassword, 
  cancelPasswordResetRequest 
} from '@/lib/dataStore';

export async function GET(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const requests = await getActivePasswordResetRequests();
    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reset requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, code, newPassword, requestId } = body;

    if (action === 'request') {
      if (!email?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Email address is required' },
          { status: 400 }
        );
      }
      const resetReq: any = await createPasswordResetRequest(email.trim());
      // Never expose the verification code to the requester — only admins may see it.
      const { code: _hidden, ...safeReq } = resetReq || {};
      return NextResponse.json({
        success: true,
        data: safeReq,
        message: 'Password reset code has been generated and sent to the Admin Dashboard.',
      });
    }

    if (action === 'verify') {
      if (!email?.trim() || !code?.trim() || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Email, verification code, and new password are required' },
          { status: 400 }
        );
      }
      const result = await verifyAndResetPassword(email.trim(), code.trim(), newPassword);
      return NextResponse.json({ success: true, message: result.message });
    }

    if (action === 'cancel') {
      const who = await requireAdmin(request);
      if (who instanceof NextResponse) return who;
      if (!requestId) {
        return NextResponse.json(
          { success: false, error: 'Request ID is required' },
          { status: 400 }
        );
      }
      await cancelPasswordResetRequest(requestId);
      return NextResponse.json({ success: true, message: 'Reset request cancelled' });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Password reset operation failed' },
      { status: 400 }
    );
  }
}
