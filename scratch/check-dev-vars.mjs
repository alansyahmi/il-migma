import fs from 'fs';

try {
    const devVars = fs.readFileSync('.dev.vars', 'utf8');
    devVars.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && (key.trim() === 'TURSO_URL' || key.trim() === 'VITE_TURSO_URL')) {
            console.log(`${key.trim()}: ${vals.join('=').trim()}`);
        }
    });
} catch (e) {
    console.error("Failed to read .dev.vars:", e);
}
process.exit(0);
