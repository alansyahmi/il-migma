export async function onRequestGet() {
    return new Response(JSON.stringify({
        status: 'ok',
        message: 'API functions are working',
        timestamp: new Date().toISOString()
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
