import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import type { Feature, Tier } from '@/types';
import { cn } from '@/lib/utils';

interface TierGateProps {
    feature: Feature;
    children?: React.ReactNode;
    fallback?: React.ReactNode;
    className?: string;
}

const FEATURE_TIER_CONFIG: Record<Feature, { tier: Tier; key: string }> = {
    semantic_search: { tier: 'pro', key: 'semantic-search' },
    unlimited_audio: { tier: 'pro', key: 'unlimited-audio' },
    dialect_variants: { tier: 'pro', key: 'dialect-variants' },
    chatbot: { tier: 'pro', key: 'dialect-chatbot' },
    inflector: { tier: 'pro', key: 'semitic-inflector' },
    semmej: { tier: 'pro', key: 'semmej' },
    grammar_checker: { tier: 'pro', key: 'grammar-checker' },
    corpus_insights: { tier: 'pro', key: 'corpus-insights' },
    suggest_dialect: { tier: 'pro', key: 'dialect-suggestions' },
    export_flashcards: { tier: 'pro', key: 'flashcard-export' },
    vote_suggestions: { tier: 'pro', key: 'voting' },
    api_access: { tier: 'enterprise', key: 'api-access' },
    api_key_management: { tier: 'enterprise', key: 'api-key-management' },
};

export function TierGate({ feature, children, fallback, className }: TierGateProps) {
    const { hasAccess } = useAuth();
    const { term } = useLinguisticMode();

    if (hasAccess(feature)) return <>{children}</>;

    if (fallback) return <>{fallback}</>;

    const config = FEATURE_TIER_CONFIG[feature];
    const tierLabel = config.tier === 'pro' ? term('pro-label') : term('enterprise-label');

    return (
        <div className={cn(
            'flex flex-col items-center justify-center gap-3 py-12 px-6',
            'bg-surface-soft rounded-xl shadow-sm',
            'border border-border text-center',
            className,
        )}>
            <div className="w-12 h-12 rounded-full bg-[#1034A6]/10 flex items-center justify-center">
                <Lock size={24} className="text-[#1034A6]" />
            </div>
            <div>
                <p className="font-serif text-lg font-semibold text-[#1034A6]">
                    {term('is-a-feature', {
                        label: term(config.key),
                        tier: tierLabel,
                    })}
                </p>
                <p className="text-sm text-text-muted mt-1">
                    {config.tier === 'pro'
                        ? term('feature-pro-desc')
                        : term('feature-enterprise-desc')}
                </p>
            </div>
            <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium
          bg-[#1034A6] text-white hover:bg-[#0D2A8A] transition-colors"
            >
                <Sparkles size={14} />
                {term('upgrade-to', { tier: tierLabel })}
            </Link>
        </div>
    );
}
