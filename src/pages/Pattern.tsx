import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Info } from 'lucide-react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { apiGetPattern } from '@/lib/api';
import { Card } from '@/components/ui/Card';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function Pattern() {
    const { id } = useParams<{ id: string }>();
    const { term } = useLinguisticMode();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        apiGetPattern(id)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        if (data?.pattern) {
            document.title = `${data.pattern.cv_notation} — ${term('pattern')} | Il-Miġma'`;
        }
    }, [data, term]);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    if (!id) return <Navigate to="/404" replace />;

    if (loading) {
        return (
            <div style={bgStyle} className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1034A6]"></div>
            </div>
        );
    }

    if (error || !data?.pattern) {
        return (
            <div style={bgStyle} className="flex flex-col items-center justify-center h-screen px-4 text-center">
                <h2 className="font-serif text-2xl font-bold text-black mb-2">{term('error')}</h2>
                <p className="text-text-muted mb-6">{error || term('pattern-not-found')}</p>
                <Link to="/browse" className="text-link hover:underline flex items-center gap-2">
                    <ArrowLeft size={16} /> {term('back-to-browse')}
                </Link>
            </div>
        );
    }

    const { pattern, roles, entries } = data;

    return (
        <div style={bgStyle} className="w-full">
            <div className="max-w-5xl mx-auto px-7 sm:px-8 py-10 pb-20">
                
                {/* Back Link */}
                <div className="mb-10">
                    <Link to="/browse" className="group text-sm text-black/40 hover:text-black flex items-center gap-1 transition-all">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                        {term('back-to-browse')}
                    </Link>
                </div>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-10 items-start mb-16">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                            <span className="px-3 py-1 bg-link/10 text-link rounded-full text-[10px] font-bold uppercase tracking-widest border border-link/10">
                                {term('morphological-pattern')}
                            </span>
                        </div>
                        <h1 className="font-serif font-bold text-[3.5rem] leading-none text-black tracking-tight mb-4">
                            {pattern.cv_notation}
                        </h1>
                        <p className="text-xl font-serif text-black/50 italic mb-6">
                            "{pattern.wizen_notation}"
                        </p>
                        
                        {pattern.description && (
                            <div className="bg-white/40 backdrop-blur-sm border border-black/5 rounded-2xl p-6 relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-link/20" />
                                <div className="flex gap-3">
                                    <Info size={18} className="text-link mt-0.5 shrink-0" />
                                    <p className="text-sm text-black/80 leading-relaxed italic">
                                        {pattern.description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metadata Card */}
                    <Card className="w-full md:w-80 border-black/5 bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-xl shadow-black/5">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-3">{term('linguistic-roles')}</h2>
                                <div className="flex flex-wrap gap-2">
                                    {roles.length > 0 ? roles.map((r: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-0.5">
                                            <span className="px-2.5 py-1 bg-black/5 text-black/70 rounded-lg text-[11px] font-medium border border-black/5">
                                                {term(r.linguistic_role || r.category)}
                                            </span>
                                            <span className="text-[9px] text-black/30 uppercase tracking-tighter px-1">
                                                {r.pos} {r.gender ? `• ${r.gender}` : ''}
                                            </span>
                                        </div>
                                    )) : (
                                        <span className="text-xs text-black/40 italic">{term('uncategorized')}</span>
                                    )}
                                </div>
                            </div>

                            {pattern.example_word && (
                                <div>
                                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-2">{term('example-word')}</h2>
                                    <p className="font-serif text-lg text-black">{pattern.example_word}</p>
                                </div>
                            )}

                            <div className="pt-6 border-t border-black/5">
                                <div className="flex items-center justify-between text-xs text-black/40">
                                    <span>{term('internal-id')}</span>
                                    <code className="font-mono text-[10px] opacity-60">{pattern.id}</code>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Entries List Section */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <h2 className="font-serif text-2xl font-bold text-black border-l-4 border-link pl-4">
                            {term('entries-using-this-pattern')}
                        </h2>
                        <div className="h-px flex-1 bg-black/5" />
                        <span className="text-xs font-bold text-black/30 uppercase tracking-widest bg-black/5 px-3 py-1 rounded-full">
                            {entries.length} {term('entries')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {entries.length > 0 ? entries.map((entry: any) => (
                            <Link 
                                key={entry.id} 
                                to={`/entry/${entry.id}`}
                                className="group block bg-white/40 hover:bg-white/80 backdrop-blur-sm border border-black/5 hover:border-link/30 p-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-link/10 hover:-translate-y-1"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-serif text-xl font-bold text-black group-hover:text-link transition-colors">
                                        {entry.headword}
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 bg-black/5 px-2 py-0.5 rounded">
                                        {entry.pos}
                                    </span>
                                </div>
                                {entry.definition && (
                                    <p className="text-sm text-text-muted line-clamp-2 italic mb-4 opacity-70">
                                        {entry.definition}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 text-[10px] font-bold text-link opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                                    {term('view-entry')} <ArrowLeft size={12} className="rotate-180" />
                                </div>
                            </Link>
                        )) : (
                            <div className="col-span-full py-16 text-center bg-black/5 rounded-3xl border border-dashed border-black/10">
                                <BookOpen size={40} className="mx-auto text-black/10 mb-4" />
                                <p className="text-black/30 font-medium">{term('no-entries-found')}</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
