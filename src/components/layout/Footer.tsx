
import { Link } from 'react-router-dom';
import { Instagram, Linkedin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const getInfoCol1 = (t: (en: string, mt: string) => string) => [
    { label: t('Maltese Alphabets', 'Alfabetti Maltin'), href: '/blog/alphabets' },
    { label: t('Morphology', 'Morfoloġija'), href: '/blog/morphology' },
];
const getInfoCol2 = (t: (en: string, mt: string) => string) => [
    { label: t('Terminologies', 'Terminoloġiji'), href: '/blog/terminologies' },
    { label: t('Dialects', 'Djaletti'), href: '/blog/dialects' },
];
const getContributeCol1 = (t: (en: string, mt: string) => string) => [
    { label: t('Suggest Entry', 'Issuġġerixxi Entrata'), href: '/suggest' },
    { label: t('Suggest Dialect Entry', 'Issuġġerixxi Entrata Djalettali'), href: '/suggest-dialect' },
];
const getContributeCol2 = (t: (en: string, mt: string) => string) => [
    { label: t('Report Error', 'Irrapporta Żball'), href: '/report' },
    { label: t('Submit Feedback', 'Ibgħat Feedback'), href: '/feedback' },
];

function FooterLink({ label, href }: { label: string; href: string }) {
    return (
        <li>
            <Link
                to={href}
                className="text-sm text-[#888] hover:text-[#ccc] transition-colors flex items-start gap-1.5"
            >
                <span className="text-[#555] mt-0.5 text-xs leading-none shrink-0">└</span>
                <span>{label}</span>
            </Link>
        </li>
    );
}

export function Footer() {
    const { t } = useLanguage();
    const INFO_COL1 = getInfoCol1(t);
    const INFO_COL2 = getInfoCol2(t);
    const CONTRIBUTE_COL1 = getContributeCol1(t);
    const CONTRIBUTE_COL2 = getContributeCol2(t);

    return (
        <footer style={{ backgroundColor: '#161613' }} className="text-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="font-serif font-medium text-xl text-white block mb-3">
                            Il-Migma'
                        </Link>
                        <p className="text-[11px] italic leading-relaxed text-[#777] max-w-[220px]">
                            {t(
                                'Il-Miġma\' is a comprehensive digital dictionary and linguistic resource dedicated to the preservation and analysis of the Maltese language. By bridging traditional Semitic morphological patterns with modern computational linguistics, we provide researchers and learners with an unprecedented depth of data, from phonetic transcriptions to historical etymologies.',
                                'Il-Miġma\' huwa dizzjunarju diġitali komprensiv u riżorsa lingwistika ddedikata għall-preservazzjoni u l-analiżi tal-lingwa Maltija. Billi ngħaqqdu x-xejriet morfoloġiċi Semitiċi tradizzjonali mal-lingwistika komputazzjonali moderna, nipprovdu lir-riċerkaturi u lil dawk li jitgħallmu fond ta\' dejta bla preċedent, minn traskrizzjonijiet fonetiċi sa etimoloġiji storiċi.'
                            )}
                        </p>
                    </div>

                    {/* Information */}
                    <div>
                        <h3 className="font-sans font-semibold text-sm text-white mb-3">{t('Information', 'Informazzjoni')}</h3>
                        <ul className="space-y-2">
                            {INFO_COL1.map(l => <FooterLink key={l.href} {...l} />)}
                        </ul>
                        <ul className="space-y-2 mt-2">
                            {INFO_COL2.map(l => <FooterLink key={l.href} {...l} />)}
                        </ul>
                    </div>

                    {/* Contribute — 2 sub-columns */}
                    <div className="lg:col-span-2">
                        <h3 className="font-sans font-semibold text-sm text-white mb-3">{t('Contribute', 'Ikkontribwixxi')}</h3>
                        <div className="grid grid-cols-2 gap-x-4">
                            <ul className="space-y-2">
                                {CONTRIBUTE_COL1.map(l => <FooterLink key={l.href} {...l} />)}
                            </ul>
                            <ul className="space-y-2">
                                {CONTRIBUTE_COL2.map(l => <FooterLink key={l.href} {...l} />)}
                            </ul>
                        </div>
                    </div>

                </div>

                {/* Bottom: email + socials — right-aligned */}
                <div className="mt-8 pt-5 border-t border-[#2a2a26] flex justify-end">
                    <div className="flex flex-col items-end gap-3">
                        <a
                            href="mailto:merhba@il-migma.com"
                            className="text-sm text-[#888] hover:text-[#ccc] transition-colors flex items-center gap-1.5"
                        >
                            <span className="text-[#555] text-base">@</span>
                            merhba@il-migma.com
                        </a>
                        <div className="flex items-center gap-4">
                            <a href="https://instagram.com" target="_blank" rel="noreferrer"
                                className="text-[#666] hover:text-[#ccc] transition-colors">
                                <Instagram size={15} />
                            </a>
                            <a href="https://linkedin.com" target="_blank" rel="noreferrer"
                                className="text-[#666] hover:text-[#ccc] transition-colors">
                                <Linkedin size={15} />
                            </a>
                            <a href="https://x.com" target="_blank" rel="noreferrer"
                                className="text-[#666] hover:text-[#ccc] transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.256 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
}
