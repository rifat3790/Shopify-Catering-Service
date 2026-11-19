import { NextResponse } from 'next/server';
import { getAllOrders, getStatsSummary } from '@/lib/dataStore';
import { filterOrdersByDate, calculateStatsFromOrders, DateFilterType } from '@/lib/dateFilterUtils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('dateFilter') as DateFilterType;

    if (dateFilter) {
      const allOrders = await getAllOrders();
      const filtered = filterOrdersByDate(allOrders, dateFilter);
      const stats = calculateStatsFromOrders(filtered);
      return NextResponse.json({ success: true, data: stats });
    }

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

