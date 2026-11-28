import { NextResponse } from 'next/server';
import { checkAndRunTelegramAutomations } from '@/lib/telegramService';

export const dynamic = 'force-dynamic';
// PNG rendering + uploads to several groups can take a while
export const maxDuration = 60;

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
