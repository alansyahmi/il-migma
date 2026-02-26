import React, { createContext, useContext } from 'react';
import { useUser } from '@clerk/clerk-react';
import type { Tier, Feature } from '@/types';

// ─── Feature → minimum tier required ──────────────────────────────────────
const FEATURE_TIER_MAP: Record<Feature, Tier> = {
    semantic_search: 'pro',
    unlimited_audio: 'pro',
    dialect_variants: 'pro',
    chatbot: 'pro',
    inflector: 'pro',
    semmej: 'pro',
    grammar_checker: 'pro',
    corpus_insights: 'pro',
    suggest_dialect: 'pro',
    export_flashcards: 'pro',
    vote_suggestions: 'pro',
    api_access: 'enterprise',
    api_key_management: 'enterprise',
};

const TIER_RANK: Record<Tier, number> = {
    basic: 0,
    pro: 1,
    enterprise: 2,
};

interface AuthContextValue {
    tier: Tier;
    isLoading: boolean;
    hasAccess: (feature: Feature) => boolean;
    adsEnabled: boolean;
    audioUnlocked: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser();
    // In production, fetch tier from Turso via a Pages Function using the Clerk JWT.
    // For now, read from Clerk user public metadata.
    const tier = (user?.publicMetadata?.tier as Tier | undefined) ?? 'basic';
    const adsEnabled = user?.publicMetadata?.ads_disabled !== true;
    const audioUnlocked = tier === 'pro' || tier === 'enterprise' || user?.publicMetadata?.audio_unlocked === true;
    const isAdmin = user?.publicMetadata?.role === 'admin';

    const hasAccess = (feature: Feature): boolean => {
        const required = FEATURE_TIER_MAP[feature];
        return TIER_RANK[tier] >= TIER_RANK[required];
    };

    return (
        <AuthContext.Provider value={{
            tier,
            isLoading: !isLoaded,
            hasAccess,
            adsEnabled,
            audioUnlocked,
            isAdmin,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
