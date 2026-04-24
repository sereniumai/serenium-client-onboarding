import { Construction } from 'lucide-react';

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <div className="h-14 w-14 rounded-2xl bg-orange/10 border border-orange/30 flex items-center justify-center mx-auto mb-5">
        <Construction className="h-6 w-6 text-orange" strokeWidth={1.8} />
      </div>
      <h1 className="font-display font-black text-2xl md:text-3xl tracking-[-0.02em] mb-3">{title}</h1>
      <p className="text-white/60 leading-relaxed">{body}</p>
    </div>
  );
}
