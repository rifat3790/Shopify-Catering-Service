import { NextResponse } from 'next/server';
import { getAllOrders, createOrder } from '@/lib/dataStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status') || '';
    
    let orders = await getAllOrders();
    
    if (search) {
      orders = orders.filter(
        o =>
          o.customerName.toLowerCase().includes(search) ||
          o.itemsText.toLowerCase().includes(search) ||
          o.orderNumber.toLowerCase().includes(search)
      );
    }

    if (status && status !== 'All') {
      orders = orders.filter(o => o.status === status);
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
    if (!body.customerName) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }

    const newOrder = await createOrder(body);
    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('API /orders POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

