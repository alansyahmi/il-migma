import { SubmissionForm } from '@/components/contribute/SubmissionForm';
import { apiSubmitSubmission } from '@/lib/api';

const FEEDBACK_TYPES = [
    { value: 'general', labelKey: 'feedback-type-general' },
    { value: 'bug', labelKey: 'feedback-type-bug' },
    { value: 'content', labelKey: 'feedback-type-content' },
    { value: 'feature', labelKey: 'feedback-type-feature' },
];

export function Feedback() {
    return (
        <SubmissionForm
            kind="feedback"
            titleKey="submit-feedback"
            descriptionKey="feedback-desc"
            typeLabelKey="type"
            typeOptions={FEEDBACK_TYPES}
            defaultType="general"
            primaryLabel={(_, term) => term('subject')}
            primaryPlaceholder={(_, term) => term('feedback-subject-placeholder')}
            emailLabelKey="your-email"
            emailPlaceholderKey="email-placeholder"
            noteLabelKey="additional-notes"
            notePlaceholderKey="feedback-notes-placeholder"
            submitLabelKey="submit-feedback"
            successMessageKey="feedback-received"
            backToHomeKey="back-to-home"
            onSubmit={apiSubmitSubmission}
        />
    );
}
