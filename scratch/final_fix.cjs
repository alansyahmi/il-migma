const fs = require('fs');
const path = 'src/components/admin/EntryFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the stray div in PluralFormsEditor
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/fieldset>/, (match) => {
    // This is probably too aggressive. 
    // Let's use a more specific regex.
    return match;
});

// Better way: search for the specific corrupted block
const corruptedBlock = '                                        />\n                                    </div>\n            </div>\n                                )}';
if (content.indexOf(corruptedBlock) !== -1) {
    content = content.replace(corruptedBlock, '                                        />\n                                    </div>\n                                )}\n');
    console.log('Fixed corrupted block in PluralFormsEditor.');
}

// Fix NounFields ending
const nounFieldsEnd = '                 </div>\n         );\n     })()';
if (content.indexOf(nounFieldsEnd) !== -1) {
    content = content.replace(nounFieldsEnd, '                    </div>\n                </div>\n            </div>\n        );\n    })()');
    console.log('Fixed NounFields ending.');
}

fs.writeFileSync(path, content);
