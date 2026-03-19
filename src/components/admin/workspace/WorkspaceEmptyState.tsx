import { Button } from '@/components/ui/Button';

interface WorkspaceEmptyStateProps {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function WorkspaceEmptyState({ title, actionLabel, onAction }: WorkspaceEmptyStateProps) {
    return (
        <div className="text-center py-16 bg-surface-soft rounded-3xl border-2 border-dashed border-black/5">
            <p className="text-black/40 font-serif italic text-lg">{title}</p>
            {actionLabel && onAction && (
                <div className="mt-4">
                    <Button size="sm" variant="secondary" onClick={onAction}>{actionLabel}</Button>
                </div>
            )}
        </div>
    );
}
