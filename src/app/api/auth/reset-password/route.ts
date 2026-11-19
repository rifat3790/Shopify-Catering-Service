import { NextResponse } from 'next/server';
import { 
  createPasswordResetRequest, 
  getActivePasswordResetRequests, 
  verifyAndResetPassword, 
  cancelPasswordResetRequest 
} from '@/lib/dataStore';

export async function GET() {
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
      const resetReq = await createPasswordResetRequest(email.trim());
      return NextResponse.json({
        success: true,
        data: resetReq,
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
