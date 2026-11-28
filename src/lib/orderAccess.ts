import { NextResponse } from 'next/server';
import { connectToDatabase } from './mongodb';
import Order from './models/Order';
import { getRequester, isAdminRole, isSelf, unauthorized, forbidden, Requester } from './serverAuth';
import { evaluateOrderAllowed, getOrderControl } from './orderControl';

/**
 * Validates an order creation request.
 * - Must be signed in.
 * - Non-admins: blocked after the daily cutoff / when orders are disabled, and can only order for themselves.
 * Returns the (possibly adjusted) body, or a NextResponse to return directly.
 */
export async function authorizeOrderCreate(request: Request, body: any): Promise<{ who: Requester; body: any } | NextResponse> {
  const who = await getRequester(request);
  if (!who) return unauthorized();
  if (isAdminRole(who)) return { who, body };

  const evaluation = evaluateOrderAllowed(await getOrderControl());
  if (!evaluation.allowed) {
    return NextResponse.json(
      { success: false, error: evaluation.messageEn, errorBn: evaluation.messageBn, reason: evaluation.reason },
      { status: 403 }
    );
  }

  // Regular members always order on their own account
  return {
    who,
    body: { ...body, customerEmail: who.email, userId: who.dbId || who.uid },
  };
}

/** Only an admin or the order's owner may edit / delete it. */
export async function authorizeOrderModify(request: Request, id: string): Promise<Requester | NextResponse> {
  const who = await getRequester(request);
  if (!who) return unauthorized();
  if (isAdminRole(who)) return who;

  try {
    await connectToDatabase();
    if (Order) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      const doc: any = await Order.findOne(isObjectId ? { _id: id } : { orderNumber: id })
        .select('customerEmail userId')
        .lean();
      if (!doc) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      if (isSelf(who, doc.customerEmail, doc.userId)) return who;
    }
  } catch {
    // fall through to forbidden
  }
  return forbidden('You can only change your own orders.');
}

/** Fields a non-admin owner may never change on their own order. */
export function stripPrivilegedOrderFields(who: Requester, updates: any) {
  if (isAdminRole(who)) return updates;
  // paymentMethod is locked too: switching Wallet -> Cash would refund the wallet while the order stays "Paid"
  const { status, paidAmount, customerEmail, userId, customerName, paymentMethod, depositChangeToWallet, ...rest } = updates || {};
  // Owners may still mark a cancellation of their own order
  if (status === 'Cancelled') (rest as any).status = 'Cancelled';
  return rest;
}
