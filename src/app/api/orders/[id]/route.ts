import { NextResponse } from 'next/server';
import { updateOrder, deleteOrder } from '@/lib/dataStore';
import { authorizeOrderModify, stripPrivilegedOrderFields } from '@/lib/orderAccess';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const doc: any = Order ? await Order.findOne(isObjectId ? { _id: id } : { orderNumber: id }).lean() : null;
    const order = doc ? { ...doc, _id: doc._id.toString() } : null;
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const who = await authorizeOrderModify(request, id);
    if (who instanceof NextResponse) return who;
    const body = await request.json();
    const updated = await updateOrder(id, stripPrivilegedOrderFields(who, body));
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const who = await authorizeOrderModify(request, id);
    if (who instanceof NextResponse) return who;
    const ok = await deleteOrder(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Order not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
