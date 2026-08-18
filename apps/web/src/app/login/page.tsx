'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { Button, Card } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('analista@thinkit.academy');
  const [password, setPassword] = useState('ChangeMe!123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Autentica; o backend define os cookies httpOnly (nada é guardado no JS).
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm border-t-4 border-t-brand">
        <div className="mb-6 flex flex-col items-center text-center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <g stroke="#277471" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
            </g>
          </svg>
          <div className="mt-2 text-2xl font-extrabold text-ink">Think</div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-brand">Cyber Academy</div>
          <p className="mt-2 text-xs text-muted">Aprenda. Pratique. Evolua.</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-xs text-gray">
            E-mail
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs text-gray">
            Senha
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-[11px] text-muted">
          SSO Microsoft Entra ID disponível em fase futura.
        </p>
      </Card>
    </div>
  );
}
