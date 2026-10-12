// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshTokens, resetRefreshFlights, type RefreshResult } from './refresh';

const context = { requestId: 'req-1' };
const pair = (suffix: string) => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  accessTokenExpiresAt: null,
});

beforeEach(() => resetRefreshFlights());

describe('refreshTokens single-flight', () => {
  it('makes one gateway call for parallel requests with the same token', async () => {
    let release!: (result: RefreshResult) => void;
    const call = vi.fn(() => new Promise<RefreshResult>((resolve) => void (release = resolve)));

    const first = refreshTokens('old', context, call);
    const second = refreshTokens('old', context, call);
    release({ ok: true, tokens: pair('new') });

    expect(await first).toEqual({ ok: true, tokens: pair('new') });
    expect(await second).toEqual(await first);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('gives a late request with the old token the same new pair', async () => {
    const call = vi.fn(async () => ({ ok: true, tokens: pair('new') }) as RefreshResult);

    await refreshTokens('old', context, call);
    const late = await refreshTokens('old', context, call);

    expect(late).toEqual({ ok: true, tokens: pair('new') });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('uses separate flights for different tokens', async () => {
    const call = vi.fn(
      async (token: string) => ({ ok: true, tokens: pair(token) }) as RefreshResult,
    );

    const [a, b] = await Promise.all([
      refreshTokens('a', context, call),
      refreshTokens('b', context, call),
    ]);

    expect(a).toEqual({ ok: true, tokens: pair('a') });
    expect(b).toEqual({ ok: true, tokens: pair('b') });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('remembers a rejected token so it is not sent again', async () => {
    const call = vi.fn(async () => ({ ok: false, reason: 'rejected' }) as RefreshResult);

    await refreshTokens('bad', context, call);
    await refreshTokens('bad', context, call);

    expect(call).toHaveBeenCalledTimes(1);
  });

  it('retries after the gateway was unavailable', async () => {
    const call = vi
      .fn<(token: string) => Promise<RefreshResult>>()
      .mockResolvedValueOnce({ ok: false, reason: 'unavailable' })
      .mockResolvedValueOnce({ ok: true, tokens: pair('new') });

    expect(await refreshTokens('old', context, call)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await refreshTokens('old', context, call)).toEqual({ ok: true, tokens: pair('new') });
    expect(call).toHaveBeenCalledTimes(2);
  });
});
