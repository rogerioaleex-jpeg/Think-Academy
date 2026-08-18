'use client';
// Renderiza uma "view" do protótipo (markup/estilo idênticos ao HTML aprovado).
import { renderView } from '@/lib/proto';

export default function ProtoView({ id }: { id: string }) {
  return <div dangerouslySetInnerHTML={{ __html: renderView(id) }} />;
}
