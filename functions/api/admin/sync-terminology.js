function gone() {
    return new Response('ui_terminology has been removed', {
        status: 410,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}

export async function onRequestGet() {
    return gone();
}

export async function onRequestPost() {
    return gone();
}

export async function onRequestOptions() {
    return gone();
}
