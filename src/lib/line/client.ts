import crypto from 'crypto';

export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret = process.env.LINE_CHANNEL_SECRET
): boolean {
  if (!signature || !channelSecret) return false;

  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  const sigBuf = Buffer.from(signature);
  const hashBuf = Buffer.from(hash);
  if (sigBuf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, hashBuf);
}

export async function replyLineMessage(replyToken: string, messages: unknown[]): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
  }

  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LINE reply failed (${res.status}): ${errText}`);
  }
}
