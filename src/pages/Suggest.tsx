import { SubmissionForm } from '@/components/contribute/SubmissionForm';
import { apiSubmitSubmission } from '@/lib/api';

export function Suggest() {
    return (
        <SubmissionForm
            kind="suggestion"
            titleKey="suggest-addition"
            descriptionKey="suggest-desc"
            typeLabelKey="type"
            typeOptions={[
                { value: 'entry', labelKey: 'entry' },
                { value: 'root', labelKey: 'root' },
            ]}
            defaultType="entry"
            primaryLabel={(type, term) => (type === 'entry' ? term('headword') : term('consonants'))}
            primaryPlaceholder={(type, term) => (type === 'entry' ? term('eg-headword') : term('eg-consonants'))}
            emailLabelKey="your-email"
            emailPlaceholderKey="email-placeholder"
            noteLabelKey="additional-notes"
            notePlaceholderKey="provide-meanings"
            submitLabelKey="submit-suggestion"
            successMessageKey="suggestion-received"
            backToHomeKey="back-to-home"
            onSubmit={apiSubmitSubmission}
        />
    );
}
