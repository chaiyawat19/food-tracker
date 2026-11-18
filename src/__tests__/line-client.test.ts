import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyLineSignature } from '@/lib/line/client';

describe('verifyLineSignature', () => {
  const secret = 'test_channel_secret_123';
  const body = JSON.stringify({ events: [{ type: 'message' }] });

  it('returns true for a valid HMAC-SHA256 signature', () => {
    const validSig = crypto.createHmac('sha256', secret).update(body).digest('base64');
    expect(verifyLineSignature(body, validSig, secret)).toBe(true);
  });

  it('returns false for an invalid or missing signature', () => {
    expect(verifyLineSignature(body, 'invalid_sig', secret)).toBe(false);
    expect(verifyLineSignature(body, null, secret)).toBe(false);
  });
});
