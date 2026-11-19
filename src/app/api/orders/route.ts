import { NextResponse } from 'next/server';
import { getAllOrders, createOrder, updateOrder, deleteOrder } from '@/lib/dataStore';
import { filterOrdersByDate, DateFilterType } from '@/lib/dateFilterUtils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status') || '';
    const userEmail = searchParams.get('userEmail')?.toLowerCase().trim() || '';
    const dateFilter = (searchParams.get('dateFilter') || '') as DateFilterType;
    
    let orders = await getAllOrders();

    // 1. Strict Personal User Filter if requested
    if (userEmail) {
      orders = orders.filter(o => 
        (o.customerEmail && o.customerEmail.toLowerCase().trim() === userEmail) ||
        (o.customerName && o.customerName.toLowerCase().trim() === userEmail)
      );
    }
    
    // 2. Search query filter
    if (search) {
      orders = orders.filter(
        o =>
          (o.customerName && o.customerName.toLowerCase().includes(search)) ||
          (o.itemsText && o.itemsText.toLowerCase().includes(search)) ||
          (o.orderNumber && o.orderNumber.toLowerCase().includes(search)) ||
          (o.customerPhone && o.customerPhone.toLowerCase().includes(search))
      );
    }

    // 3. Status filter
    if (status && status !== 'All') {
      orders = orders.filter(o => o.status === status);
    }

    // 4. Date period filter
    if (dateFilter) {
      orders = filterOrdersByDate(orders, dateFilter);
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('API /orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const finalName = body.customerName || body.name || 'Member';

    const newOrder = await createOrder({
      ...body,
      customerName: finalName,
    });
    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('API /orders POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, _id, orderNumber, ...updates } = body;
    const targetId = id || _id || orderNumber;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Order identifier is required' }, { status: 400 });
    }

    const updated = await updateOrder(targetId, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API /orders PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const ok = await deleteOrder(id);
    return NextResponse.json({ success: ok, message: 'Order deleted successfully' });
  } catch (error: any) {
    console.error('API /orders DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete order' },
      { status: 500 }
    );
  }
}

