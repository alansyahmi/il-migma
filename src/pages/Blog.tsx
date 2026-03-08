import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { MOCK_BLOG_POSTS } from '@/data/mockData';

export function Blog() {
    const { t } = useLanguage();
    useEffect(() => {
        document.title = `${t('Blog Lingwistiku', 'Blog Lingwistiku')} | Il-Miġma'`;
    }, [t]);
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <h1 className="font-serif text-3xl font-bold text-[#1034A6]">Blog Lingwistiku</h1>
            <p className="text-[#4a4a4a]">Artikli dwar il-lingwa Maltija, l-etimoloġija, u r-riċerka lingwistika.</p>
            <div className="space-y-4">
                {MOCK_BLOG_POSTS.map(post => (
                    <Link key={post.id} to={`/blog/${post.slug}`} className="block no-underline group">
                        <div className="bg-white border border-[#d8cfc0] rounded-xl p-5
              hover:border-[#1034A6] hover:shadow-md transition-all">
                            <div className="flex gap-2 mb-2">
                                {post.tags?.map(t => <Badge key={t} variant="tag">{t}</Badge>)}
                            </div>
                            <h2 className="font-serif text-xl font-semibold text-[#1034A6] group-hover:text-[#1034A6] transition-colors">
                                {post.title}
                            </h2>
                            <p className="text-sm text-[#4a4a4a] mt-2 line-clamp-2">{post.excerpt}</p>
                            <div className="flex items-center gap-3 mt-3 text-xs text-[#A07030]">
                                <span>{post.author}</span>
                                <span>·</span>
                                <span>{new Date(post.published_at).toLocaleDateString('mt', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function BlogPost() {
    const { t } = useLanguage();
    useEffect(() => {
        document.title = `${t('Artiklu tal-Blog', 'Blog Post')} | Il-Miġma'`;
    }, [t]);
    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
            <Link to="/blog" className="text-sm text-[#1034A6] hover:underline mb-6 block">← Lura għall-Blog</Link>
            <div className="bg-white border border-[#d8cfc0] rounded-xl p-6 sm:p-8">
                <div className="flex gap-2 mb-3">
                    <Badge variant="tag">etimoloġija</Badge>
                </div>
                <h1 className="font-serif text-3xl font-bold text-[#1034A6] leading-snug">
                    L-Oriġini tal-Lingwa Maltija
                </h1>
                <div className="flex items-center gap-3 mt-3 mb-6 text-sm text-[#A07030]">
                    <span>Il-Miġma'</span>
                    <span>·</span>
                    <span>15 ta' Jannar 2025</span>
                </div>
                <div className="prose prose-sm max-w-none text-[#000] leading-relaxed">
                    <p>
                        Il-Malti huwa lingwa unika fid-dinja — l-unika lingwa Semitika miktuba bl-alfabet Latin.
                        Inħoloq mis-Siculo-Għarbi matul is-sekli 9 sa 11, meta l-Għarab governaw lil Malta.
                    </p>
                    <p className="mt-4">
                        Minn dik il-bażi Semitika ġiet miżjuda influwenza kbira Rumanza — Sqalli, Taljan, u Franċiż —
                        iżda l-qalba morfologika tal-Malti tibqa' Semitika sad-lum.
                    </p>
                    <p className="mt-4 font-arabic text-right text-lg text-[#1034A6]">
                        لغة المالطية — جسر بين العرب وأوروبا
                    </p>
                </div>
            </div>
        </div>
    );
}
