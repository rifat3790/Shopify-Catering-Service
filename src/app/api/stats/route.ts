import { NextResponse } from 'next/server';
import { getAllOrders, getStatsSummary, getAllUsers } from '@/lib/dataStore';
import { filterOrdersByDate, calculateStatsFromOrders, DateFilterType } from '@/lib/dateFilterUtils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('dateFilter') as DateFilterType;

    if (dateFilter) {
      const [allOrders, allUsers] = await Promise.all([
        getAllOrders(),
        getAllUsers()
      ]);
      const filtered = filterOrdersByDate(allOrders, dateFilter);
      const totalMemberBalance = allUsers.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
      const stats = calculateStatsFromOrders(filtered, totalMemberBalance);
      return NextResponse.json(
        { success: true, data: stats },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      );
    }

    const stats = await getStatsSummary();
    return NextResponse.json(
      { success: true, data: stats },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (error: any) {
    console.error('API /stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

