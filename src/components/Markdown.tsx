// Tiny markdown renderer — just enough for our instruction blocks.
// Supports: **bold**, `code`, paragraphs, blank-line breaks, `- ` lists.

export function Markdown({ children }: { children: string }) {
  const blocks = children.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-4 text-white/75 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.trim().startsWith('- ')) {
          const items = block.split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.replace(/^\s*-\s*/, ''));
          return (
            <ul key={i} className="space-y-1.5 list-disc list-outside pl-5">
              {items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) parts.push(<strong key={i++} className="text-white font-semibold">{t.slice(2, -2)}</strong>);
    else parts.push(<code key={i++} className="px-1.5 py-0.5 rounded bg-bg-tertiary text-orange text-[0.9em]">{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
