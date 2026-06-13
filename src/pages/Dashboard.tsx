import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { SignIn, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TierGate } from '@/components/ui/TierGate';
import { Tabs, TabContent } from '@/components/ui/Tabs';
import { Sparkles, BookMarked, CreditCard } from 'lucide-react';


const DASHBOARD_TABS = [
    { id: 'account', label: 'Kont' },
    { id: 'subscription', label: 'Abbonament' },
    { id: 'api', label: 'API Keys' },
    { id: 'lists', label: 'Listi' },
] as const;

type DashboardTab = typeof DASHBOARD_TABS[number]['id'];

const DEFAULT_DASHBOARD_TAB: DashboardTab = 'account';

function isDashboardTab(value: string | null): value is DashboardTab {
    return Boolean(value && DASHBOARD_TABS.some((tab) => tab.id === value));
}

export function Dashboard() {
    return (
        <div className="w-full max-w-6xl mx-auto px-7 sm:px-8 py-8">
            <SignedOut>
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <h1 className="font-serif text-2xl font-bold text-[#1034A6]">Dashboard</h1>
                    <p className="text-text-muted text-sm">Idħol biex taraw l-account tiegħek.</p>
                    <SignIn routing="hash" />
                </div>
            </SignedOut>

            <SignedIn>
                <DashboardContent />
            </SignedIn>
        </div>
    );
}

function DashboardContent() {
    const { t } = useLanguage();
    const { user } = useUser();
    const { tier, hasAccess } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get('tab');
    const activeTab = isDashboardTab(rawTab)
        ? rawTab
        : DEFAULT_DASHBOARD_TAB;
    useEffect(() => {
        const labels: Record<string, string> = {
            account: t('Account', 'Kont'),
            subscription: t('Subscription', 'Abbonament'),
            api: t('API Keys', 'API Keys'),
            lists: t('Lists', 'Listi'),
        };
        const activeLabel = labels[activeTab] || t('Dashboard', 'Dashboard');
        document.title = `${activeLabel} | Il-Miġma'`;
    }, [activeTab, t]);

    const setActiveTab = (nextTab: string) => {
        if (!isDashboardTab(nextTab)) return;
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', nextTab);
        setSearchParams(nextParams);
    };

    const TIER_LABELS = { basic: 'Basic — Gratis', pro: 'Pro', enterprise: 'Enterprise' };
    const TIER_BADGE: Record<string, 'tag' | 'tier' | 'source'> = { basic: 'tag', pro: 'tier', enterprise: 'source' };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                {user?.imageUrl && (
                    <img src={user.imageUrl} alt="" className="w-14 h-14 rounded-full border-2 border-[#C9A84C]" />
                )}
                <div>
                    <h1 className="font-serif text-2xl font-bold text-[#1034A6]">
                        {user?.fullName ?? user?.firstName ?? 'Utent'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant={TIER_BADGE[tier as keyof typeof TIER_BADGE]}>{TIER_LABELS[tier as keyof typeof TIER_LABELS]}</Badge>
                        <span className="text-xs text-text-muted">{user?.primaryEmailAddress?.emailAddress}</span>
                    </div>
                </div>
            </div>

                {/* Tabs */}
                <Card>
                    <Tabs tabs={DASHBOARD_TABS} activeTab={activeTab} onChange={setActiveTab} className="px-4" />

                {/* Account */}
                <TabContent tabId="account" activeTab={activeTab}>
                    <CardBody className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-[#A07030] uppercase">Isem</label>
                                <p className="text-sm text-black mt-0.5">{user?.fullName ?? '—'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A07030] uppercase">Email</label>
                                <p className="text-sm text-black mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A07030] uppercase">Tier</label>
                                <p className="text-sm text-black mt-0.5">{TIER_LABELS[tier as keyof typeof TIER_LABELS]}</p>
                            </div>
                        </div>
                    </CardBody>
                </TabContent>

                {/* Subscription */}
                <TabContent tabId="subscription" activeTab={activeTab}>
                    <CardBody>
                        {tier === 'basic' ? (
                            <div className="text-center py-8">
                                <Sparkles size={32} className="text-[#C9A84C] mx-auto mb-3" />
                                <h3 className="font-serif text-lg font-semibold text-[#1034A6]">Upgradja għal Pro</h3>
                                <p className="text-sm text-text-muted mt-1 mb-4">
                                    Fittxija semantika, awdjo bla limitu, chatbot, u aktar.
                                </p>
                                <Button leftIcon={<CreditCard size={15} />}>
                                    Agħżel Pro — €9.99/xahar
                                </Button>
                                <p className="text-xs text-[#A07030] mt-2">€4.99 l-ewwel xahar</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm">
                                    <strong>Pjan:</strong> {TIER_LABELS[tier as keyof typeof TIER_LABELS]}
                                </p>
                                <p className="text-sm text-text-muted">Il-ġestjoni tal-abbonament tiġi minn Stripe (aktar tard).</p>
                            </div>
                        )}
                    </CardBody>
                </TabContent>

                {/* API Keys */}
                <TabContent tabId="api" activeTab={activeTab}>
                    <CardBody>
                        {!hasAccess('api_key_management') ? (
                            <TierGate feature="api_key_management" />
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1034A6]">API Keys</h3>
                                    <p className="text-sm text-text-muted mt-1">
                                        API key management will be enabled for approved beta partners once usage limits and billing are finalized.
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border-light bg-surface-soft p-4 text-sm text-text-muted">
                                    No API keys are available for this account yet.
                                </div>
                            </div>
                        )}
                    </CardBody>
                </TabContent>

                {/* Lists */}
                <TabContent tabId="lists" activeTab={activeTab}>
                    <CardBody>
                        <div className="text-center py-8 text-gray-400">
                            <BookMarked size={28} className="mx-auto mb-2 text-[#1034A6]/30" />
                            <p className="text-sm">Il-listi ta' flashcards jidhru hawn.</p>
                            <p className="text-xs mt-1">Agħfas "Save" fuq kwalunkwe entrata biex tibda.</p>
                        </div>
                    </CardBody>
                </TabContent>
            </Card>
        </div>
    );
}
