import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Bot, User, RefreshCw } from 'lucide-react';
import { TierGate } from '@/components/ui/TierGate';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { createChatSession, sendChatMessage } from '@/lib/gemini';
import { generateId } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import type { ChatSession } from '@google/generative-ai';

const DIALECTS = ['Standard', 'Valletta', 'Żejtun', 'Qormi', 'Għawdex'];

export function Chatbot() {
    const { t } = useLanguage();
    const { hasAccess } = useAuth();

    useEffect(() => {
        document.title = `${t('Chatbot Malti', 'Chatbot Malti')} | Il-Miġma'`;
    }, [t]);

    if (!hasAccess('chatbot')) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <TierGate feature="chatbot" />
            </div>
        );
    }

    return <ChatInterface />;
}

function ChatInterface() {
    const [dialect, setDialect] = useState('Standard');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Bonġu! Jien assistente lingwistiku tal-Malti. Staqsini dwar il-kliem, il-grammatika, jew konversa miegħi bil-Malti!',
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const sessionRef = useRef<ChatSession | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        sessionRef.current = createChatSession({ dialect });
    }, [dialect]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMsg: ChatMessage = {
            id: generateId(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        try {
            if (!sessionRef.current) sessionRef.current = createChatSession({ dialect });
            const reply = await sendChatMessage(sessionRef.current, userMsg.content);
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'assistant',
                content: reply,
                timestamp: new Date().toISOString(),
            }]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'assistant',
                content: 'Skużani, żball tekniku. Erġa\' pprova.',
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        sessionRef.current = createChatSession({ dialect });
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'Konversazzjoni ġdida! Kif nistgħu ngħinuk?',
            timestamp: new Date().toISOString(),
        }]);
    };

    return (
        <div className="max-w-6xl mx-auto px-7 sm:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-xl font-bold text-[#1034A6]">Chatbot Malti</h1>
                    <p className="text-xs text-text-muted">Powered by Gemini Flash</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={dialect}
                        onChange={e => setDialect(e.target.value)}
                        className="text-sm border border-border rounded-md px-2 py-1.5 bg-white text-black
              focus:outline-none focus:ring-2 focus:ring-link"
                    >
                        {DIALECTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <Button variant="ghost" size="sm" onClick={resetChat} leftIcon={<RefreshCw size={14} />}>
                        Irrisettja
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 bg-white rounded-xl border border-border p-4">
                {messages.map(msg => (
                    <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
                        <div className={cn(
                            'w-7 h-7 rounded-full shrink-0 flex items-center justify-center',
                            msg.role === 'user' ? 'bg-[#1034A6]/10' : 'bg-[#1034A6]/10',
                        )}>
                            {msg.role === 'user'
                                ? <User size={14} className="text-[#1034A6]" />
                                : <Bot size={14} className="text-[#1034A6]" />}
                        </div>
                        <div className={cn(
                            'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                            msg.role === 'user'
                                ? 'bg-[#1034A6] text-white rounded-tr-none'
                                : 'bg-surface-soft text-black rounded-tl-none border border-border-light',
                        )}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className={cn('text-[10px] mt-1', msg.role === 'user' ? 'text-white/50' : 'text-text-muted')}>
                                {new Date(msg.timestamp).toLocaleTimeString('mt', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1034A6]/10 flex items-center justify-center shrink-0">
                            <Bot size={14} className="text-[#1034A6]" />
                        </div>
                        <div className="bg-surface-soft border border-border-light rounded-xl rounded-tl-none px-4 py-3">
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 bg-[#1034A6]/40 rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={`Ikteb bil-Malti (${dialect})…`}
                    disabled={loading}
                    className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-link bg-white"
                />
                <Button onClick={handleSend} disabled={loading || !input.trim()} leftIcon={<Send size={15} />}>
                    Ibgħat
                </Button>
            </div>
        </div>
    );
}
