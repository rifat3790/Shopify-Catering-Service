import { NextResponse } from 'next/server';
import { updateOrder, deleteOrder } from '@/lib/dataStore';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.totalBill !== undefined || body.paidAmount !== undefined) {
      const bill = Number(body.totalBill);
      const paid = Number(body.paidAmount);
      body.changeDue = paid - bill;
      if (bill > 0 && paid >= bill) {
        body.status = 'Paid';
      } else if (bill > 0 && paid > 0 && paid < bill) {
        body.status = 'Partial';
      } else if (bill > 0 && paid === 0) {
        body.status = 'Due';
      }
    }

    const updated = await updateOrder(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteOrder(id);
    return NextResponse.json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete order' },
      { status: 500 }
    );
  }
}

