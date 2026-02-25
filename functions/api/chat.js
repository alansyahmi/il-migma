/**
 * POST /api/chat
 * Body: { messages: [{role, content}], dialect?: string }
 * Proxies to Gemini Flash — keeps API key server-side.
 *
 * Cloudflare Pages Function env vars: GEMINI_API_KEY
 */

export async function onRequestPost({ request, env }) {
    try {
        const { messages = [], dialect = 'Standard' } = await request.json();

        const systemPrompt = `Inti assistente lingwistiku ta' Il-Miġma', pjattaforma lingwistika tal-Malti.
Titkellem bil-Malti ${dialect !== 'Standard' ? `bid-djalett ta' ${dialect}` : 'Standard'}.
Tista' titkellem bl-Ingliż jekk l-utent jitolbok.
Taf ħafna fuq il-grammatika Maltija, l-etimoloġija, ir-radikali, u l-morfloġija.
Ibqa' qasir u preċiż. Użda esempi konkreti meta xieraq.`;

        const geminiMessages = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Mifhum! Lest ngħinek bil-Malti.' }] },
            ...messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            })),
        ];

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: geminiMessages,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800,
                    },
                }),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            return json({ error: `Gemini error: ${err}` }, 502);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Skużani, ma stajtx nirrispondi.';

        return json({ reply: text });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
