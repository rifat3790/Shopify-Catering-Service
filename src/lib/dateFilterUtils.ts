export type DateFilterType = 'today' | 'yesterday' | '7days' | '30days' | '1year' | 'lifetime';

/**
 * Returns today's exact calendar date (YYYY-MM-DD) in Bangladesh Time (Asia/Dhaka, GMT+6).
 * Prevents UTC midnight-to-6AM off-by-one-day drift.
 */
export function getBangladeshTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const nowUtc = new Date();
    const bdTime = new Date(nowUtc.getTime() + (6 * 60 + nowUtc.getTimezoneOffset()) * 60 * 1000);
    const y = bdTime.getFullYear();
    const m = String(bdTime.getMonth() + 1).padStart(2, '0');
    const d = String(bdTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function filterOrdersByDate<T extends { orderDate?: string | Date; createdAt?: string | Date }>(
  items: T[],
  filter: DateFilterType
): T[] {
  if (filter === 'lifetime') {
    return items;
  }

  const now = new Date();
  
  // Start of today (00:00:00.000)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  // End of today (23:59:59.999)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Start of yesterday
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const endOfYesterday = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);

  // 7 days ago
  const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

  // 30 days ago
  const thirtyDaysAgo = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000);

  // 1 year ago
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);

  return items.filter((item) => {
    const rawDate = item.orderDate || item.createdAt;
    if (!rawDate) return false;
    const itemDate = new Date(rawDate);
    const itemTime = itemDate.getTime();

    if (isNaN(itemTime)) return false;

    switch (filter) {
      case 'today':
        return itemTime >= startOfToday.getTime() && itemTime <= endOfToday.getTime();
      case 'yesterday':
        return itemTime >= startOfYesterday.getTime() && itemTime <= endOfYesterday.getTime();
      case '7days':
        return itemTime >= sevenDaysAgo.getTime() && itemTime <= endOfToday.getTime();
      case '30days':
        return itemTime >= thirtyDaysAgo.getTime() && itemTime <= endOfToday.getTime();
      case '1year':
        return itemTime >= oneYearAgo.getTime() && itemTime <= endOfToday.getTime();
      default:
        return true;
    }
  });
}

export function calculateStatsFromOrders(orders: any[], totalMemberBalance?: number) {
  const completedOrders = orders.filter(o => o.status === 'Paid');
  const activeOrdersCount = orders.filter(o => Number(o.totalBill) > 0).length;
  
  const totalBill = orders.reduce((acc, curr) => acc + (Number(curr.totalBill) || 0), 0);
  const totalPaid = orders.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  
  const totalRefundChange = orders.reduce((acc, curr) => {
    const diff = (Number(curr.paidAmount) || 0) - (Number(curr.totalBill) || 0);
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const totalDue = orders.reduce((acc, curr) => {
    const diff = (Number(curr.totalBill) || 0) - (Number(curr.paidAmount) || 0);
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const collectionRate = totalBill > 0 ? ((totalPaid / totalBill) * 100).toFixed(1) : "0.0";

  return {
    ordersCount: activeOrdersCount,
    completedOrdersCount: completedOrders.length,
    totalOrders: orders.length,
    totalBill,
    totalPaid,
    totalRefundChange,
    totalDue,
    totalMemberBalance,
    collectionRate: `${collectionRate}%`,
    rawCollectionRate: parseFloat(collectionRate) || 0
  };
}
