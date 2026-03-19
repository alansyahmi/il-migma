import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncResult {
    success?: number;
    errors?: string[];
}

interface AdminSettingsSyncBannerProps {
    result: SyncResult;
    onClose: () => void;
}

export function AdminSettingsSyncBanner({ result, onClose }: AdminSettingsSyncBannerProps) {
    const hasErrors = Boolean(result.errors?.length);

    return (
        <div className={cn(
            'p-4 rounded-xl border flex items-start gap-3',
            hasErrors ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200',
        )}>
            {hasErrors ? <XCircle className="text-amber-600 shrink-0" /> : <CheckCircle2 className="text-green-600 shrink-0" />}
            <div className="text-xs">
                <p className={hasErrors ? 'text-amber-800 font-bold' : 'text-green-800 font-bold'}>
                    {hasErrors ? 'Synchronization failed.' : `${result.success || 0} items synchronized successfully.`}
                </p>
                {result.errors?.map((err, index) => (
                    <p key={`${index}-${err}`} className="text-amber-700 mt-1">- {err}</p>
                ))}
            </div>
            <button type="button" onClick={onClose} className="ml-auto text-black/20 hover:text-black/40">x</button>
        </div>
    );
}
