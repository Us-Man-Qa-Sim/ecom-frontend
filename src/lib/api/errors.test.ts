import { describe, expect, it } from 'vitest';
import {
  ApiError,
  isConflict,
  isRateLimited,
  isUnauthorized,
  toActionError,
  toApiError,
  toNetworkError,
} from './errors';

describe('toApiError', () => {
  it('maps gateway field errors to { field: firstMessage }', () => {
    const error = toApiError(
      400,
      {
        statusCode: 400,
        message: 'email: email must be a valid email address',
        errors: [
          { field: 'email', errors: ['email must be a valid email address'] },
          { field: 'firstName', errors: ['firstName is required', 'firstName must be a string'] },
        ],
      },
      'req-1',
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.requestId).toBe('req-1');
    expect(error.digest).toBe('req-1');
    expect(error.message).toBe('Please check the highlighted fields.');
    expect(error.fieldErrors).toEqual({
      email: 'email must be a valid email address',
      firstName: 'firstName is required',
    });
  });

  it('keeps the gateway message for 4xx without field errors', () => {
    const error = toApiError(401, { statusCode: 401, message: 'Invalid email or password' });
    expect(error.message).toBe('Invalid email or password');
    expect(isUnauthorized(error)).toBe(true);
  });

  it('never shows a 5xx gateway message to the user', () => {
    const error = toApiError(500, { statusCode: 500, message: 'ECONNREFUSED 10.0.0.4:5001' });
    expect(error.message).toBe('Something went wrong. Please try again.');
  });

  it('survives a body that is not JSON', () => {
    expect(toApiError(429, undefined).message).toMatch(/Too many requests/);
    expect(isRateLimited(toApiError(429, 'nope'))).toBe(true);
    expect(isConflict(toApiError(409, null))).toBe(true);
  });
});

describe('toNetworkError', () => {
  it('reports a timeout as 504', () => {
    const timeout = new DOMException('timed out', 'TimeoutError');
    expect(toNetworkError(timeout).status).toBe(504);
  });

  it('reports any other failure as 503', () => {
    expect(toNetworkError(new TypeError('fetch failed')).status).toBe(503);
  });
});

describe('toActionError', () => {
  it('turns an ApiError into a plain object', () => {
    expect(toActionError(toApiError(409, { message: 'Email already registered' }, 'r'))).toEqual({
      ok: false,
      status: 409,
      message: 'Email already registered',
      fieldErrors: {},
      requestId: 'r',
    });
  });

  it('rethrows anything else (redirects, bugs)', () => {
    const bug = new Error('boom');
    expect(() => toActionError(bug)).toThrow(bug);
  });
});
