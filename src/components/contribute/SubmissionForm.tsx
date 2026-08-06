import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle, Send } from 'lucide-react';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';
import { Button } from '@/components/ui/Button';
import type { SubmissionKind, SubmissionPayload, SubmissionTypeOption } from '@/lib/submissions';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

interface SubmissionFormProps {
    kind: SubmissionKind;
    titleKey: string;
    descriptionKey: string;
    typeLabelKey: string;
    typeOptions: SubmissionTypeOption[];
    defaultType: string;
    primaryLabel: (type: string, term: (key: string) => string) => string;
    primaryPlaceholder: (type: string, term: (key: string) => string) => string;
    emailLabelKey: string;
    emailPlaceholderKey: string;
    noteLabelKey: string;
    notePlaceholderKey: string;
    submitLabelKey: string;
    successMessageKey: string;
    backToHomeKey: string;
    initialTypeQueryKey?: string;
    initialValueQueryKey?: string;
    onSubmit: (payload: SubmissionPayload) => Promise<void> | void;
}

function resolveInitialType(
    searchParams: URLSearchParams,
    queryKey: string,
    typeOptions: SubmissionTypeOption[],
    defaultType: string,
) {
    const candidate = searchParams.get(queryKey) || defaultType;
    return typeOptions.some(option => option.value === candidate) ? candidate : defaultType;
}

export function SubmissionForm({
    kind,
    titleKey,
    descriptionKey,
    typeLabelKey,
    typeOptions,
    defaultType,
    primaryLabel,
    primaryPlaceholder,
    emailLabelKey,
    emailPlaceholderKey,
    noteLabelKey,
    notePlaceholderKey,
    submitLabelKey,
    successMessageKey,
    backToHomeKey,
    initialTypeQueryKey = 'type',
    initialValueQueryKey = 'q',
    onSubmit,
}: SubmissionFormProps) {
    const { term } = useLinguisticMode();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();

    const [type, setType] = useState(() =>
        resolveInitialType(searchParams, initialTypeQueryKey, typeOptions, defaultType)
    );
    const [value, setValue] = useState(() => searchParams.get(initialValueQueryKey) || '');
    const [email, setEmail] = useState('');
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = `${term(titleKey)} | Il-Miġma'`;
    }, [term, titleKey]);

    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.webp") center/cover no-repeat`,
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await onSubmit({
                kind,
                category: type,
                subject: value.trim(),
                email: email.trim(),
                message: note.trim(),
                pagePath: pathname,
                pageUrl: typeof window !== 'undefined' ? window.location.href : '',
            });
            setSubmitted(true);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : term('feedback-submit-failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ ...bgStyle, height: '100%' }} className="flex flex-col items-center justify-center px-4 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Send size={32} />
                </div>
                <h1 className="font-serif text-3xl font-bold text-black mb-3">
                    {term('thank-you')}
                </h1>
                <p className="text-text-muted text-base mb-8 max-w-sm mx-auto leading-relaxed">
                    {term(successMessageKey)}
                </p>
                <Link
                    to="/"
                    className="bg-link text-white text-sm font-sans font-semibold px-8 py-3 rounded-xl hover:bg-link-hover transition-all shadow-xl shadow-link/30 hover:-translate-y-0.5"
                >
                    {term(backToHomeKey)}
                </Link>
            </div>
        );
    }

    return (
        <div style={bgStyle} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 max-w-6xl mx-auto w-full px-7 sm:px-8 pt-8 pb-10 flex flex-col min-h-0">
                <div className="mb-6 shrink-0">
                    <h1 className="font-serif text-4xl leading-tight text-black font-medium">
                        {term(titleKey)}
                    </h1>
                    <p className="text-sm text-black/40 font-sans mt-0.5 max-w-2xl leading-relaxed">
                        {term(descriptionKey)}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col bg-white rounded-3xl border border-black/10 shadow-xl p-6 md:p-10 lg:p-11 min-h-0 overflow-hidden">
                    <div className="flex-1 grid lg:grid-cols-2 gap-4 lg:gap-16 min-h-0">
                        <div className="space-y-6 flex flex-col py-1">
                            <div>
                                <label className="block text-xs font-medium text-black mb-2">
                                    {term(typeLabelKey)}
                                </label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-black/5 rounded-xl">
                                    {typeOptions.map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setType(option.value)}
                                            className={`py-1.5 text-sm font-bold rounded-lg transition-all ${
                                                type === option.value
                                                    ? 'bg-white text-link shadow-sm'
                                                    : 'text-black/40 hover:text-black/60'
                                            }`}
                                        >
                                            {term(option.labelKey)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-black mb-2">
                                    {primaryLabel(type, term)}
                                </label>
                                <input
                                    required
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                    placeholder={primaryPlaceholder(type, term)}
                                    className="w-full px-4 py-2.5 bg-black/2 border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-link focus:border-link transition-all font-serif text-lg placeholder:text-black/10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-black mb-2">
                                    {term(emailLabelKey)}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder={term(emailPlaceholderKey)}
                                    className="w-full px-4 py-2.5 bg-black/2 border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-link focus:border-link transition-all text-sm placeholder:text-black/10"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col min-h-0 py-1">
                            <label className="block text-xs font-medium text-black mb-2">
                                {term(noteLabelKey)}
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder={term(notePlaceholderKey)}
                                className="flex-1 w-full px-4 py-3 bg-black/2 border border-black/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-link focus:border-link transition-all text-sm resize-none placeholder:text-black/10 leading-relaxed min-h-0"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-6 border-t border-black/5 pt-6 shrink-0">
                        <p className="hidden md:block text-xs text-black/30 max-w-sm font-sans">
                            {term(successMessageKey)}
                        </p>
                        <Button
                            type="submit"
                            loading={isSubmitting}
                            className="w-full md:w-auto md:px-10 py-2.5 text-sm rounded-xl shadow-lg shadow-link/5 font-sans"
                            leftIcon={<Send size={16} />}
                        >
                            {term(submitLabelKey)}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
