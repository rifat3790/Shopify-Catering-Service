import { NextResponse } from 'next/server';
import { getStatsSummary } from '@/lib/dataStore';

export async function GET() {
  try {
    const stats = await getStatsSummary();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('API /stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

