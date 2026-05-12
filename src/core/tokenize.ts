export function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | undefined;
  let escaped = false;
  for (const ch of command) {
    if (escaped) { current += ch; escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (quote === 'single') { if (ch === "'") quote = undefined; else current += ch; continue; }
    if (quote === 'double') { if (ch === '"') quote = undefined; else current += ch; continue; }
    if (ch === "'") { quote = 'single'; continue; }
    if (ch === '"') { quote = 'double'; continue; }
    if (/\s/.test(ch) || ['|', '&', ';', '(', ')'].includes(ch)) {
      if (current) { tokens.push(current); current = ''; }
      if (!/\s/.test(ch)) tokens.push(ch);
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}
