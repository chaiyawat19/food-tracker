import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyLiffRequest } from '@/lib/line/auth';

describe('verifyLiffRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DEV_MOCK_LINE_USER_ID;
  });

  it('verifies a valid LIFF ID token via LINE oauth2/v2.1/verify', async () => {
    process.env.LINE_LOGIN_CHANNEL_ID = '2000000';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sub: 'U1234567890', name: 'Test User' }),
      })
    );

    const req = new Request('http://localhost/api/analytics', {
      headers: { Authorization: 'Bearer valid_id_token' },
    });
    const user = await verifyLiffRequest(req);
    expect(user).toEqual({ lineUserId: 'U1234567890', displayName: 'Test User' });
  });

  it('returns null when token is missing or rejected by LINE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    const req = new Request('http://localhost/api/analytics', {
      headers: { Authorization: 'Bearer bad_token' },
    });
    expect(await verifyLiffRequest(req)).toBeNull();
  });

  it('supports dev mock user in non-production when DEV_MOCK_LINE_USER_ID is set', async () => {
    process.env.DEV_MOCK_LINE_USER_ID = 'U_dev_mock';
    const req = new Request('http://localhost/api/analytics', {
      headers: { Authorization: 'Bearer dev-mock-token' },
    });
    const user = await verifyLiffRequest(req);
    expect(user).toEqual({ lineUserId: 'U_dev_mock', displayName: 'Dev User' });
  });
});
