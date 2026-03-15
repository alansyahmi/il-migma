async function check() {
    console.log(`Checking table info...`);
    try {
        const res = await fetch('http://localhost:8788/api/admin/db-tools', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer dummy'
            },
            body: JSON.stringify({ action: 'table-info' })
        });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(text.slice(0, 1000));
    } catch (e) {
        console.error(`Fetch error: ${e.message}`);
    }
}

check();
