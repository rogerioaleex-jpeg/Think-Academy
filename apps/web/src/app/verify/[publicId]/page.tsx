'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { api } from '@/lib/api';

// Página PÚBLICA de validação de certificado (fora do route group autenticado).
interface Verify {
  valid: boolean; publicId?: string; holder?: string; title?: string; hours?: number; issuedAt?: string;
}

export default function VerifyCertificatePage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<Verify | null>(null);
  const [qr, setQr] = useState('');

  useEffect(() => {
    api<Verify>(`/verify/certificate/${publicId}`).then(setData).catch(() => setData({ valid: false }));
    if (typeof window !== 'undefined') {
      QRCode.toDataURL(window.location.href, { margin: 1, width: 160 }).then(setQr).catch(() => {});
    }
  }, [publicId]);

  if (!data) return <div className="flex min-h-screen items-center justify-center text-muted">Verificando...</div>;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="text-xs text-brand">THINK IT CYBER ACADEMY</div>
        {data.valid ? (
          <>
            <div className="my-4 text-4xl">✅</div>
            <h1 className="text-xl font-bold text-ink">Certificado válido</h1>
            <p className="mt-4 text-sm text-muted">Certificamos que</p>
            <p className="text-lg font-semibold text-ink">{data.holder}</p>
            <p className="mt-2 text-sm text-muted">concluiu a trilha</p>
            <p className="text-base font-medium text-brand">{data.title}</p>
            <p className="mt-4 text-xs text-muted">
              Carga horária: {data.hours}h · Emitido em {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('pt-BR') : '—'}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">{data.publicId}</p>
            {qr && <img src={qr} alt="QR de validação" className="mx-auto mt-6 rounded-lg" />}
          </>
        ) : (
          <>
            <div className="my-4 text-4xl">❌</div>
            <h1 className="text-xl font-bold text-ink">Certificado não encontrado</h1>
            <p className="mt-2 text-sm text-muted">O identificador informado é inválido ou o certificado foi revogado.</p>
          </>
        )}
      </div>
    </div>
  );
}
