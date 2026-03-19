import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceViewToggleProps {
    viewMode: 'grid' | 'list';
    onChange: (mode: 'grid' | 'list') => void;
}

export function WorkspaceViewToggle({ viewMode, onChange }: WorkspaceViewToggleProps) {
    return (
        <div className="flex bg-black/5 p-1 rounded-lg">
            <button
                type="button"
                onClick={() => onChange('grid')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-white text-link shadow-sm' : 'text-black/40')}
                aria-label="Grid view"
            >
                <LayoutGrid size={16} />
            </button>
            <button
                type="button"
                onClick={() => onChange('list')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-white text-link shadow-sm' : 'text-black/40')}
                aria-label="List view"
            >
                <List size={16} />
            </button>
        </div>
    );
}
