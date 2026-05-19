import { NextRequest, NextResponse } from 'next/server';
import { generateSocialReply } from '@/lib/meta';

export async function POST(req: NextRequest) {
  const { channel, senderName, messageText, isExistingLead } = await req.json() as {
    channel: 'whatsapp' | 'instagram';
    senderName: string;
    messageText: string;
    isExistingLead: boolean;
  };
  const reply = await generateSocialReply({ channel, senderName, messageText, isExistingLead, isAfterHours: false });
  return NextResponse.json({ reply });
}
