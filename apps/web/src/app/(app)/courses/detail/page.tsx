import { redirect } from 'next/navigation';

// Rota antiga do protótipo (sem id de curso, não faz mais sentido — a tela
// real de curso agora é /courses/[id]).
export default function Page() {
  redirect('/courses');
}
