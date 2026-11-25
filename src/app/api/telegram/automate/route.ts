import { NextResponse } from 'next/server';
import { checkAndRunTelegramAutomations } from '@/lib/telegramService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await checkAndRunTelegramAutomations();
  return NextResponse.json(
    {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    },
    {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  );
}

export async function POST() {
  const result = await checkAndRunTelegramAutomations();
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
