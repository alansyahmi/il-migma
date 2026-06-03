const fs = require('fs');
const path = 'src/components/admin/EntryFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\n\s*>\s*\n\s*<\/div>/, '\n                </div>');
fs.writeFileSync(path, content);
