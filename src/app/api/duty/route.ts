import { NextResponse } from 'next/server';
import { 
  getAllDailyDuties, 
  getDailyDutyForDate, 
  assignDailyDuty, 
  updateDailyDutyStatus, 
  deleteDailyDuty 
} from '@/lib/dataStore';
import { sendTelegramDutyNotification } from '@/lib/telegramService';

// GET: fetch duties (all or for a specific date)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      const duty = await getDailyDutyForDate(date);
      return NextResponse.json(
        { success: true, data: duty },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      );
    }

    const allDuties = await getAllDailyDuties();
    return NextResponse.json({ 
      success: true, 
      data: allDuties,
      timestamp: new Date().toISOString()
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch duty assignments' },
      { status: 500 }
    );
  }
}

// POST: Admin / Super Admin assigns or updates daily duty
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      date, 
      assignedUserId, 
      assignedUserName, 
      assignedUserEmail, 
      assignedUserAvatar, 
      assignedUserPhone, 
      assignedByUserId, 
      assignedByName, 
      instructions, 
      tasks 
    } = body;

    if (!date || !assignedUserId || !assignedUserEmail) {
      return NextResponse.json(
        { success: false, error: 'Date, assigned user ID and email are required' },
        { status: 400 }
      );
    }

    const duty = await assignDailyDuty({
      date,
      assignedUserId,
      assignedUserName: assignedUserName || assignedUserEmail.split('@')[0],
      assignedUserEmail,
      assignedUserAvatar: assignedUserAvatar || '',
      assignedUserPhone: assignedUserPhone || '',
      assignedByUserId,
      assignedByName: assignedByName || 'Administrator',
      instructions,
      tasks,
    });

    // Immediately broadcast assigned responsibility to configured Telegram groups
    await sendTelegramDutyNotification(duty, false).catch((e) =>
      console.warn('Telegram duty notify skipped:', e)
    );

    return NextResponse.json({
      success: true,
      data: duty,
      message: `Duty assigned to ${duty.assignedUserName} for ${date}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to assign daily duty' },
      { status: 500 }
    );
  }
}

// PATCH: User acknowledges or updates status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { dutyId, date, status, acknowledged } = body;

    const target = dutyId || date;
    if (!target) {
      return NextResponse.json({ success: false, error: 'Duty ID or date is required' }, { status: 400 });
    }

    const updated = await updateDailyDutyStatus(target, status, acknowledged);
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Duty status updated',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update duty status' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel / remove duty assignment
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const id = searchParams.get('id');

    const target = id || date;
    if (!target) {
      return NextResponse.json({ success: false, error: 'Duty ID or date is required' }, { status: 400 });
    }

    await deleteDailyDuty(target);
    return NextResponse.json({ success: true, message: 'Duty assignment deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete duty' },
      { status: 500 }
    );
  }
}
