import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Send } from 'lucide-react';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function Suggest() {
    const { term } = useLinguisticMode();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get('type') || 'entry';
    const initialValue = searchParams.get('q') || '';

    const [type, setType] = useState(initialType);
    const [value, setValue] = useState(initialValue);
    const [email, setEmail] = useState('');
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we don't have a backend for suggestions yet, we just show a success message
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div style={bgStyle} className="flex flex-col items-center justify-center px-4 text-center min-h-screen">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <Send size={32} />
                </div>
                <h1 className="font-serif text-3xl font-bold text-[#000] mb-4">
                    {term('thank-you')}
                </h1>
                <p className="text-[#4a4a4a] text-base mb-10 max-w-md mx-auto leading-relaxed">
                    {term('suggestion-received')}
                </p>
                <Link
                    to="/"
                    className="bg-[#1034A6] text-white text-sm font-sans font-medium px-6 py-3 rounded-lg hover:bg-[#0c268c] transition-colors shadow-lg shadow-[#1034A6]/20"
                >
                    {term('back-to-home')}
                </Link>
            </div>
        );
    }

    return (
        <div style={bgStyle}>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                <div className="mb-8">
                    <Link to={-1 as any} className="group text-sm text-black/40 hover:text-black flex items-center gap-1 mb-4 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {term('back')}
                    </Link>
                    <h1 className="font-serif text-4xl font-medium text-[#000] tracking-tight">
                        {term('suggest-addition')}
                    </h1>
                    <p className="text-black/55 mt-2">
                        {term('suggest-desc')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/10 shadow-sm p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4 p-1 bg-black/5 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('entry')}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${type === 'entry' ? 'bg-white text-[#1034A6] shadow-sm' : 'text-black/40 hover:text-black/60'}`}
                        >
                            {term('entry')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('root')}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${type === 'root' ? 'bg-white text-[#1034A6] shadow-sm' : 'text-black/40 hover:text-black/60'}`}
                        >
                            {term('root')}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-black/40 uppercase tracking-widest mb-1.5">
                                {type === 'entry' ? term('headword') : term('consonants')}
                            </label>
                            <input
                                required
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder={type === 'entry' ? term('eg-headword') : term('eg-consonants')}
                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1034A6]/20 focus:border-[#1034A6] transition-all font-serif text-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/40 uppercase tracking-widest mb-1.5">
                                {term('additional-notes')}
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={4}
                                placeholder={term('provide-meanings')}
                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1034A6]/20 focus:border-[#1034A6] transition-all text-sm resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/40 uppercase tracking-widest mb-1.5">
                                {term('your-email')}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder={term('email-placeholder')}
                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1034A6]/20 focus:border-[#1034A6] transition-all text-sm"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full py-4 text-base" leftIcon={<Send size={18} />}>
                        {term('submit-suggestion')}
                    </Button>
                </form>
            </div>
        </div>
    );
}
