const fs = require('fs');
const path = 'src/components/admin/EntryFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<\/div>\s*<\/div>\s*<\/div>\s*;\s*\}\)\(\)\s*\);/;
// Wait, that's not right.
// Let's use the actual content I saw.

const block = '                    </div>\n                </div>\n        );';
if (content.indexOf(block) !== -1) {
    content = content.replace(block, '                    </div>\n                </div>\n            </div>\n        );');
    console.log('Fixed NounFields ending.');
} else {
    console.log('Block not found, trying regex...');
    content = content.replace(/<\/div>\s*<\/div>\s*;\s*\}\)\(\)\s*\);/, (match) => {
        return '</div>\n                </div>\n            </div>\n        );\n    })() );';
    });
}

fs.writeFileSync(path, content);
