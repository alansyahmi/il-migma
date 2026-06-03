const fs = require('fs');
const path = 'src/components/admin/EntryFormModal.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Lines 768-771 (1-indexed) are:
// 768:                 </div>
// 769:         );
// 770:     })()
// 771: );

lines[767] = '                </div>';
lines[768] = '            </div>';
lines[769] = '        );';
lines[770] = '    })()';
lines[771] = ');';

fs.writeFileSync(path, lines.join('\n'));
