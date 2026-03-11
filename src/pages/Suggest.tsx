import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Button } from '@/components/ui/Button';
import { Send } from 'lucide-react';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function Suggest() {
    const { term } = useLinguisticMode();
    useEffect(() => {
        document.title = `${term('suggest-addition')} | Il-Miġma'`;
    }, [term]);
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
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we don't have a backend for suggestions yet, we just show a success message
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div style={{ ...bgStyle, height: '100%' }} className="flex flex-col items-center justify-center px-4 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Send size={32} />
                </div>
                <h1 className="font-serif text-3xl font-bold text-black mb-3">
                    {term('thank-you')}
                </h1>
                <p className="text-text-muted text-base mb-8 max-w-sm mx-auto leading-relaxed">
                    {term('suggestion-received')}
                </p>
                <Link
                    to="/"
                    className="bg-link text-white text-sm font-sans font-semibold px-8 py-3 rounded-xl hover:bg-link-hover transition-all shadow-xl shadow-link/30 hover:-translate-y-0.5"
                >
                    {term('back-to-home')}
                </Link>
            </div>
        );
    }

    return (
        <div style={bgStyle} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 max-w-6xl mx-auto w-full px-7 sm:px-8 pt-8 pb-10 flex flex-col min-h-0">
                <div className="mb-6 shrink-0">
                    <h1 className="font-serif text-4xl leading-tight text-black font-medium">
                        {term('suggest-addition')}
                    </h1>
                    <p className="text-sm text-black/40 font-sans mt-0.5 max-w-2xl leading-relaxed">
                        {term('suggest-desc')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col bg-white rounded-3xl border border-black/10 shadow-xl p-6 md:p-10 lg:p-11 min-h-0 overflow-hidden">
                    <div className="flex-1 grid lg:grid-cols-2 gap-4 lg:gap-16 min-h-0">
                        {/* Left Column: Selection and Primary Inputs */}
                        <div className="space-y-6 flex flex-col py-1">
                            <div>
                                <label className="block text-xs font-medium text-black mb-2">
                                    {term('type')}
                                </label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-black/5 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setType('entry')}
                                        className={`py-1.5 text-sm font-bold rounded-lg transition-all ${type === 'entry' ? 'bg-white text-link shadow-sm' : 'text-black/40 hover:text-black/60'}`}
                                    >
                                        {term('entry')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('root')}
                                        className={`py-1.5 text-sm font-bold rounded-lg transition-all ${type === 'root' ? 'bg-white text-link shadow-sm' : 'text-black/40 hover:text-black/60'}`}
                                    >
                                        {term('root')}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-black mb-2">
                                    {type === 'entry' ? term('headword') : term('consonants')}
                                </label>
                                <input
                                    required
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                    placeholder={type === 'entry' ? term('eg-headword') : term('eg-consonants')}
                                    className="w-full px-4 py-2.5 bg-black/2 border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-link focus:border-link transition-all font-serif text-lg placeholder:text-black/10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-black mb-2">
                                    {term('your-email')}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder={term('email-placeholder')}
                                    className="w-full px-4 py-2.5 bg-black/2 border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-link focus:border-link transition-all text-sm placeholder:text-black/10"
                                />
                            </div>
                        </div>

                        {/* Right Column: Additional Notes */}
                        <div className="flex flex-col min-h-0 py-1">
                            <label className="block text-xs font-medium text-black mb-2">
                                {term('additional-notes')}
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder={term('provide-meanings')}
                                className="flex-1 w-full px-4 py-3 bg-black/2 border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-link focus:border-link transition-all text-sm resize-none placeholder:text-black/10 leading-relaxed min-h-0"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-6 border-t border-black/5 pt-6 shrink-0">
                        <p className="hidden md:block text-xs text-black/30 max-w-sm font-sans">
                            {term('suggestion-received')}
                        </p>
                        <Button type="submit" className="w-full md:w-auto md:px-10 py-2.5 text-sm rounded-xl shadow-lg shadow-link/5 font-sans" leftIcon={<Send size={16} />}>
                            {term('submit-suggestion')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
