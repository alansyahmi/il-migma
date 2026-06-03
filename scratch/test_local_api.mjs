async function test() {
    try {
        console.log('Sending PUT request to local API...');
        const res = await fetch('http://127.0.0.1:8788/api/admin/entries', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer dummy'
            },
            body: JSON.stringify({ 
                id: 'dummy-test', 
                headword: 'test', 
                pos: 'noun' 
            })
        });
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', data);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
