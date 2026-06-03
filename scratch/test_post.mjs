async function test() {
    try {
        console.log('Sending POST request to local API...');
        const id = 'test-post-' + Math.random().toString(36).slice(2, 7);
        const res = await fetch('http://127.0.0.1:8788/api/admin/entries', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer dummy'
            },
            body: JSON.stringify({ 
                id,
                headword: 'testpost', 
                pos: 'noun' 
            })
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
