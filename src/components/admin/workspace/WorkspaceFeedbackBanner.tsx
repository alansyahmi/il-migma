import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceFeedbackBannerProps {
    message: string;
    tone: 'success' | 'error';
}

export function WorkspaceFeedbackBanner({ message, tone }: WorkspaceFeedbackBannerProps) {
    return (
        <div className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border animate-in fade-in slide-in-from-right-4 duration-300',
            tone === 'success' ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-red-50 text-red-800 border-red-100',
        )}>
            {tone === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {message}
        </div>
    );
}

export function WorkspaceErrorBanner({ message }: { message: string }) {
    return (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2 animate-in slide-in-from-top-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {message}
        </div>
    );
}
