import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import MenuItem from '@/lib/models/MenuItem';
import User from '@/lib/models/User';
import { SUPER_ADMIN_EMAIL } from '@/lib/types';

export async function POST() {
  try {
    await connectToDatabase();
    
    // Clear old mock data
    if (Order) await Order.deleteMany({});
    if (MenuItem) await MenuItem.deleteMany({});

    // Ensure Super Admin exists with 0 balance
    if (User) {
      await User.findOneAndUpdate(
        { email: SUPER_ADMIN_EMAIL.toLowerCase() },
        {
          name: "Md Refayet Hossen",
          email: SUPER_ADMIN_EMAIL.toLowerCase(),
          role: "super_admin",
          balance: 0,
          currentDue: 0,
          totalSpent: 0,
          department: "Super Admin & Management",
          avatar: "https://ui-avatars.com/api/?name=Md+Refayet+Hossen&background=047857&color=fff",
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'System reset to clean dynamic state! Ready for dynamic menu & real orders.',
      superAdmin: SUPER_ADMIN_EMAIL
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to seed database'
    }, { status: 500 });
  }
}
