import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Clerk sends event type and data
  if (body.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = body.data;
    try {
      await prisma.user.create({
        data: {
          clerkUserId: id,
          email: email_addresses[0]?.email_address || '',
          name: [first_name, last_name].filter(Boolean).join(' '),
        },
      });
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: 'User already exists or DB error' }, { status: 400 });
    }
  }
  return NextResponse.json({ received: true });
} 