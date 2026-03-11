import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GraduationCap, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function Course() {
    const { t } = useLanguage();
    useEffect(() => {
        document.title = `${t('Course', 'Kors')} | Il-Miġma'`;
    }, [t]);
    return (
        <div className="max-w-3xl mx-auto px-7 sm:px-8 py-12 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1B4D3E]/10">
                <GraduationCap size={32} className="text-[#1B4D3E]" />
            </div>
            <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                    <h1 className="font-serif text-3xl font-bold text-[#1B4D3E]">Il-Kors Malti</h1>
                    <Badge variant="tag">Dalwaqt</Badge>
                </div>
                <p className="text-text-muted max-w-lg mx-auto">
                    Kors Malti bil-mira akkademika u l-AI — imħejji mill-agħar ir-riċerkaturi lingwistiċi.
                    Jissarraf eżerċizzji abbażi tal-isfond tiegħek.
                </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-left">
                {[
                    { icon: '📖', title: 'Kontenut Akkademiku', desc: 'Ibbażat fuq ir-riċerka lingwistika tal-Malti.' },
                    { icon: '🤖', title: 'AI Personalizat', desc: 'Eżerċizzji adattati għalik skont il-livell u l-isfond.' },
                    { icon: '🎵', title: 'Awdjo Ġenwin', desc: 'Fonetika IPA e pronunzja minn kelliema nattivi.' },
                ].map(f => (
                    <div key={f.title} className="bg-white border border-border rounded-xl p-4">
                        <div className="text-2xl mb-2">{f.icon}</div>
                        <h3 className="font-semibold text-[#1B4D3E] text-sm">{f.title}</h3>
                        <p className="text-xs text-text-muted mt-1">{f.desc}</p>
                    </div>
                ))}
            </div>

            <div className="bg-surface-soft border border-border-light rounded-xl p-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <Clock size={16} className="text-[#A07030]" />
                    <span className="text-sm font-semibold text-[#A07030]">Dalwaqt jiġi!</span>
                </div>
                <p className="text-2xl font-serif font-bold text-[#1B4D3E] mb-1">€29.99 <span className="text-base font-normal text-text-muted">darba biss</span></p>
                <p className="text-xs text-text-muted mb-4">Demo gratis + aċċess għal ħajja</p>
                <Button variant="secondary" disabled>Irreġistra Interessat — Breve!</Button>
            </div>
        </div>
    );
}
