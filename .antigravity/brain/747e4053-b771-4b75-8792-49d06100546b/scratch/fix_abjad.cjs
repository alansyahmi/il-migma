const { createClient } = require('@libsql/client');
const url = 'file:local.db';
const client = createClient({ url });

async function fix() {
    await client.execute({
        sql: "UPDATE noun_morphology SET plural_forms = ?, form_plural_pattern = ? WHERE entry_id = ?",
        args: [
            JSON.stringify([{form: 'bojod', pattern: 'CoCoC'}]),
            'CoCoC',
            '7lo8avug1efbg'
        ]
    });
    console.log('Fixed abjad');
}

fix();
