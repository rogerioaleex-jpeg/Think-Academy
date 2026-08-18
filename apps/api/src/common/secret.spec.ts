import { getJwtSecret, assertJwtSecret } from './secret';

describe('secret (getJwtSecret)', () => {
  const ORIGINAL = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL };
  });
  afterAll(() => {
    process.env = ORIGINAL;
  });

  it('dev: usa o fallback inseguro quando não há JWT_SECRET', () => {
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    expect(getJwtSecret()).toMatch(/dev-only-insecure/);
  });

  it('produção: falha sem JWT_SECRET', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow();
  });

  it('produção: falha com o valor default', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'troque-este-segredo-em-producao';
    expect(() => getJwtSecret()).toThrow();
  });

  it('produção: falha com segredo curto (< 32 chars)', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short-secret';
    expect(() => getJwtSecret()).toThrow();
  });

  it('produção: aceita segredo forte', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(40);
    expect(getJwtSecret()).toHaveLength(40);
    expect(() => assertJwtSecret()).not.toThrow();
  });
});
