// Explicitly marked short follow-ups can stand alone. Complete lessons keep their Markdown structure.
export function replyBubbles(text: string): string[] {
  const divider = /^\[Pip follow-up\]\s*$/gim;
  if (text.length > 900 || /^(?:#{1,6}\s|```|~~~|\|)/m.test(text)) {
    return [text.replace(divider, '')];
  }
  const parts = text.split(divider).map(part => part.trim()).filter(Boolean);
  return [...parts.slice(0, 2), ...(parts.length > 2 ? [parts.slice(2).join('\n\n')] : [])];
}
