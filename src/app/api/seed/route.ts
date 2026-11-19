import { NextResponse } from 'next/server';
import { initialOrders, initialMenuItems } from '@/lib/dataStore';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MenuItem from '@/lib/models/MenuItem';

export async function POST() {
  try {
    await connectToDatabase();
    
    // Clear and re-populate
    await Order.deleteMany({});
    await MenuItem.deleteMany({});

    await Order.insertMany(initialOrders.map(o => ({
      ...o,
      _id: undefined,
      orderDate: new Date(o.orderDate)
    })));

    await MenuItem.insertMany(initialMenuItems.map(m => ({
      ...m,
      _id: undefined
    })));

    return NextResponse.json({
      success: true,
      message: 'Database seeded with live Shopify Catering Service data!',
      ordersCount: initialOrders.length,
      menuCount: initialMenuItems.length
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to seed database'
    }, { status: 500 });
  }
}

