import fs from 'node:fs';

const input = process.argv[2];
const output = process.argv[3];
const rows = fs.readFileSync(input, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const lines = [`# Wiktionary Maltese - Letter S (Refined)`, '', `Total Entries: ${rows.length}`, ''];

for (const { entry: e } of rows) {
  lines.push(`## ${e.headword} (${e.id})`, `- **POS**: ${e.pos}`);
  if (e.gender) lines.push(`- **Gender**: ${e.gender}`);
  lines.push('- **Definitions**:');
  for (const d of e.definitions ?? []) {
    lines.push(`  - **EN**: ${d.text_en}`, `    **MT**: ${d.text_mt}`);
    if (d.register) lines.push(`    **Register**: ${d.register}`);
    if (d.nuance) lines.push(`    **Nuance**: ${d.nuance}`);
  }
  if (e.alternative_forms?.length) lines.push(`- **Alternative Forms**: ${e.alternative_forms.map(x => x.headword).join(', ')}`);
  if (e.usage_examples?.length) {
    lines.push('- **Usage Examples**:');
    for (const x of e.usage_examples) lines.push(`  - MT: ${x.mt}`, `    EN: ${x.en}`);
  }
  if (e.tags?.length) lines.push(`- **Tags**: ${e.tags.map(x => x.name).join(', ')}`);
  lines.push('', '---', '');
}
fs.writeFileSync(output, lines.join('\n'), 'utf8');
