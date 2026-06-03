async function test() {
    try {
        console.log('Sending GET request to local API...');
        const res = await fetch('http://127.0.0.1:8788/api/admin/entries?limit=1', {
            method: 'GET',
            headers: { 
                'Authorization': 'Bearer dummy'
            }
        });
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('REWIRE_TEST present:', !!data._REWIRE_TEST);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
