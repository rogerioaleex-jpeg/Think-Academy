import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const ORIGINAL = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL };
    // baseline válido de dev
    delete process.env.NODE_ENV;
    process.env.JWT_SECRET = 'x'.repeat(40);
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.COOKIE_SAMESITE = 'lax';
  });
  afterAll(() => {
    process.env = ORIGINAL;
  });

  it('passa com um ambiente de dev válido', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it('falha sem DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(() => validateEnv()).toThrow();
  });

  it('falha com COOKIE_SAMESITE inválido', () => {
    process.env.COOKIE_SAMESITE = 'banana';
    expect(() => validateEnv()).toThrow();
  });

  it('falha em produção sem WEB_ORIGIN', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEB_ORIGIN;
    expect(() => validateEnv()).toThrow();
  });
});
