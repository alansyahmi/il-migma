import React, { useState } from 'react';
import { SignIn, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TierGate } from '@/components/ui/TierGate';
import { Tabs, TabContent } from '@/components/ui/Tabs';
import { Key, Copy, Plus, Trash2, Check, Sparkles, BookMarked, CreditCard } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { cn } from '@/lib/utils';

const DASHBOARD_TABS = [
    { id: 'account', label: 'Kont' },
    { id: 'subscription', label: 'Abbonament' },
    { id: 'api', label: 'API Keys' },
    { id: 'lists', label: 'Listi' },
];

export function Dashboard() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <SignedOut>
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <h1 className="font-serif text-2xl font-bold text-[#1B4D3E]">Dashboard</h1>
                    <p className="text-[#4a4a4a] text-sm">Idħol biex taraw l-account tiegħek.</p>
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
    const { user } = useUser();
    const { tier, hasAccess } = useAuth();
    const [activeTab, setActiveTab] = useState('account');
    const [mockKeys, setMockKeys] = useState([
        { id: 'k1', name: 'Production', key_prefix: 'im_prod_1', usage_count: 4821, is_active: true, created_at: '2025-01-01' },
    ]);
    const [copied, setCopied] = useState<string | null>(null);

    const copyKey = (id: string) => {
        navigator.clipboard.writeText('im_prod_••••••••••••[masked]');
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
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
                    <h1 className="font-serif text-2xl font-bold text-[#1B4D3E]">
                        {user?.fullName ?? user?.firstName ?? 'Utent'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant={TIER_BADGE[tier]}>{TIER_LABELS[tier]}</Badge>
                        <span className="text-xs text-[#4a4a4a]">{user?.primaryEmailAddress?.emailAddress}</span>
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
                                <p className="text-sm text-[#000] mt-0.5">{user?.fullName ?? '—'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A07030] uppercase">Email</label>
                                <p className="text-sm text-[#000] mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A07030] uppercase">Tier</label>
                                <p className="text-sm text-[#000] mt-0.5">{TIER_LABELS[tier]}</p>
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
                                <h3 className="font-serif text-lg font-semibold text-[#1B4D3E]">Upgradja għal Pro</h3>
                                <p className="text-sm text-[#4a4a4a] mt-1 mb-4">
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
                                    <strong>Pjan:</strong> {TIER_LABELS[tier]}
                                </p>
                                <p className="text-sm text-[#4a4a4a]">Il-ġestjoni tal-abbonament tiġi minn Stripe (aktar tard).</p>
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
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[#1B4D3E]">API Keys</h3>
                                    <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => {
                                        setMockKeys(prev => [...prev, {
                                            id: generateId(), name: 'New Key', key_prefix: 'im_key_' + generateId().slice(0, 6),
                                            usage_count: 0, is_active: true, created_at: new Date().toISOString().slice(0, 10),
                                        }]);
                                    }}>
                                        Oħloq Key
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {mockKeys.map(k => (
                                        <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#ede9e1] bg-[#f9f7f3]">
                                            <Key size={14} className="text-[#A07030] flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#000]">{k.name}</p>
                                                <p className="text-xs text-gray-400 font-mono">{k.key_prefix}••••••</p>
                                            </div>
                                            <span className="text-xs text-[#A07030]">{k.usage_count.toLocaleString()} calls</span>
                                            <button onClick={() => copyKey(k.id)} className="text-gray-400 hover:text-[#1034A6] transition-colors">
                                                {copied === k.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            </button>
                                            <button onClick={() => setMockKeys(prev => prev.filter(kk => kk.id !== k.id))}
                                                className="text-gray-400 hover:text-[#B22222] transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-[#4a4a4a]">Rata: €99/xahar + €0.10 / 1k calls wara l-limitu.</p>
                            </div>
                        )}
                    </CardBody>
                </TabContent>

                {/* Lists */}
                <TabContent tabId="lists" activeTab={activeTab}>
                    <CardBody>
                        <div className="text-center py-8 text-gray-400">
                            <BookMarked size={28} className="mx-auto mb-2 text-[#1B4D3E]/30" />
                            <p className="text-sm">Il-listi ta' flashcards jidhru hawn.</p>
                            <p className="text-xs mt-1">Agħfas "Save" fuq kwalunkwe entrata biex tibda.</p>
                        </div>
                    </CardBody>
                </TabContent>
            </Card>
        </div>
    );
}
