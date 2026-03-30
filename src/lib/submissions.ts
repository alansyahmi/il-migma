export type SubmissionKind = 'suggestion' | 'feedback';
export type SubmissionStatus = 'new' | 'reviewed' | 'closed' | 'spam';

export interface SubmissionTypeOption {
    value: string;
    labelKey: string;
}

export interface SubmissionPayload {
    kind: SubmissionKind;
    category: string;
    subject: string;
    email: string;
    message: string;
    pagePath: string;
    pageUrl: string;
}

export interface SubmissionRecord {
    id: string;
    kind: SubmissionKind;
    category: string;
    subject: string;
    email: string | null;
    message: string | null;
    page_path: string | null;
    page_url: string | null;
    referer: string | null;
    user_agent: string | null;
    status: SubmissionStatus;
    created_at: string;
    updated_at: string;
}

export interface SubmissionListResponse {
    submissions: SubmissionRecord[];
    total: number;
    limit: number;
    offset: number;
}

export interface SubmissionListFilters {
    q?: string;
    kind?: SubmissionKind | 'all';
    status?: SubmissionStatus | 'all';
    limit?: number;
    offset?: number;
}

export type SubmissionBulkAction = 'delete' | 'status';

export interface SubmissionBulkRequest {
    ids: string[];
    action: SubmissionBulkAction;
    status?: SubmissionStatus;
}

export interface SubmissionBulkResponse {
    ok: boolean;
    action: SubmissionBulkAction;
    affected: number;
    status?: SubmissionStatus;
}
