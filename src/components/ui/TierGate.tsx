import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Feature, Tier } from '@/types';
import { cn } from '@/lib/utils';

interface TierGateProps {
    feature: Feature;
    children?: React.ReactNode;
    fallback?: React.ReactNode;
    className?: string;
}

const FEATURE_TIER_LABELS: Record<Feature, { tier: Tier; label: string }> = {
    semantic_search: { tier: 'pro', label: 'Semantic Search' },
    unlimited_audio: { tier: 'pro', label: 'Unlimited Audio' },
    dialect_variants: { tier: 'pro', label: 'Dialect Variants' },
    chatbot: { tier: 'pro', label: 'Dialect Chatbot' },
    inflector: { tier: 'pro', label: 'Semitic Inflector' },
    semmej: { tier: 'pro', label: 'Is-Semmej' },
    grammar_checker: { tier: 'pro', label: 'Grammar Checker' },
    corpus_insights: { tier: 'pro', label: 'Corpus Insights' },
    suggest_dialect: { tier: 'pro', label: 'Dialect Suggestions' },
    export_flashcards: { tier: 'pro', label: 'Flashcard Export' },
    vote_suggestions: { tier: 'pro', label: 'Voting' },
    api_access: { tier: 'enterprise', label: 'API Access' },
    api_key_management: { tier: 'enterprise', label: 'API Key Management' },
};

export function TierGate({ feature, children, fallback, className }: TierGateProps) {
    const { hasAccess } = useAuth();

    if (hasAccess(feature)) return <>{children}</>;

    if (fallback) return <>{fallback}</>;

    const info = FEATURE_TIER_LABELS[feature];

    return (
        <div className={cn(
            'flex flex-col items-center justify-center gap-3 py-12 px-6',
            'bg-gradient-to-br from-[#F4F3F0] to-[#e8e6e0] rounded-xl',
            'border border-[#d8cfc0] text-center',
            className,
        )}>
            <div className="w-12 h-12 rounded-full bg-[#1034A6]/10 flex items-center justify-center">
                <Lock size={24} className="text-[#1034A6]" />
            </div>
            <div>
                <p className="font-serif text-lg font-semibold text-[#1034A6]">
                    {info.label} is a {info.tier === 'pro' ? 'Pro' : 'Enterprise'} feature
                </p>
                <p className="text-sm text-[#4a4a4a] mt-1">
                    {info.tier === 'pro'
                        ? 'Upgrade to Pro to unlock this and many more features.'
                        : 'Enterprise plan required. Contact us to get started.'}
                </p>
            </div>
            <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium
          bg-[#1034A6] text-white hover:bg-[#0D2A8A] transition-colors"
            >
                <Sparkles size={14} />
                Upgrade to {info.tier === 'pro' ? 'Pro' : 'Enterprise'}
            </Link>
        </div>
    );
}
