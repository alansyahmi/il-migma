import { useEffect } from 'react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Link } from 'react-router-dom';

export function Blog() {
    const { term } = useLinguisticMode();
    useEffect(() => {
        document.title = `${term('blog')} | Il-Miġma'`;
    }, [term]);
    return (
        <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8 space-y-6">
            <h1 className="font-serif text-3xl font-bold text-[#1034A6]">{term('blog')}</h1>
            <p className="text-text-muted">{term('blog-desc')}</p>
            <div className="bg-white border border-border rounded-xl p-6">
                <h2 className="font-serif text-xl font-semibold text-[#1034A6]">Beta notes coming soon</h2>
                <p className="text-sm text-text-muted mt-2 leading-relaxed">
                    The public beta will start with dictionary, morphology, search, browse, and contribution workflows. Editorial posts will be added after the first beta feedback cycle.
                </p>
            </div>
        </div>
    );
}

export function BlogPost() {
    const { term } = useLinguisticMode();
    useEffect(() => {
        document.title = `${term('blog-post')} | Il-Miġma'`;
    }, [term]);
    return (
        <div className="max-w-6xl mx-auto px-7 sm:px-8 py-8">
            <Link to="/blog" className="text-sm text-[#1034A6] hover:underline mb-6 block">← {term('back-to-blog')}</Link>
            <div className="bg-white border border-border rounded-xl p-6 sm:p-8">
                <h1 className="font-serif text-3xl font-bold text-[#1034A6] leading-snug">
                    Beta notes coming soon
                </h1>
                <p className="text-sm text-text-muted mt-3 leading-relaxed">
                    This article is not published yet.
                </p>
            </div>
        </div>
    );
}
