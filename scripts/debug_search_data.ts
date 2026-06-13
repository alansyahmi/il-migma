import { createClient } from "@libsql/client/web";

const tursoUrl = process.env.TURSO_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

async function checkData() {
    const db = createClient({ url: tursoUrl, authToken: dbToken });
    const res = await db.execute("SELECT headword, pos, cv_pattern, morph_pattern, plural_pattern, form_plural_pattern FROM entries WHERE headword = 'sofor' OR headword = 'isfar'");
    console.log(JSON.stringify(res.rows, null, 2));
}

checkData().catch(() => {
    console.error("Query failed, likely due to missing column. Trying a simpler query...");
    const db = createClient({ url: tursoUrl, authToken: dbToken });
    db.execute("SELECT headword, pos FROM entries WHERE headword = 'sofor' OR headword = 'isfar'")
        .then(r => console.log(JSON.stringify(r.rows, null, 2)))
        .catch(console.error);
});
