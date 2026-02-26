import { useState, useRef } from 'react';
import { Play, Pause, RefreshCw, Volume2 } from 'lucide-react';
import { getAudioUrl } from '@/lib/r2';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { AudioFile } from '@/types';

interface AudioPlayerProps {
    audio: AudioFile[];
    entryId: string;
    ipa?: string;
}

export function AudioPlayer({ audio, ipa }: AudioPlayerProps) {
    const { hasAccess } = useAuth();
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedDialect, setSelectedDialect] = useState(audio[0]?.dialect ?? 'standard');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const selectedFile = audio.find((a) => a.dialect === selectedDialect) ?? audio[0];

    const handlePlay = async () => {
        if (!selectedFile) return;

        if (audioRef.current) {
            if (playing) {
                audioRef.current.pause();
                setPlaying(false);
                return;
            }
            audioRef.current.play();
            setPlaying(true);
            return;
        }

        setLoading(true);
        const url = getAudioUrl(selectedFile.r2_object_key);
        const el = new Audio(url);
        audioRef.current = el;

        el.onended = () => setPlaying(false);
        el.onerror = () => { setPlaying(false); setLoading(false); };
        el.oncanplaythrough = () => {
            setLoading(false);
            el.play();
            setPlaying(true);
        };
        el.load();
    };

    if (!audio.length) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <Volume2 size={14} className="text-[#A07030]" />
                <span className="italic">L-awdjo mhux disponibbli</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Dialect tabs */}
            {audio.length > 1 && (
                <div className="flex gap-1">
                    {audio.map((a) => (
                        <button
                            key={a.dialect}
                            onClick={() => {
                                audioRef.current?.pause();
                                audioRef.current = null;
                                setPlaying(false);
                                setSelectedDialect(a.dialect ?? 'standard');
                            }}
                            className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                                selectedDialect === a.dialect
                                    ? 'bg-[#A07030] text-white'
                                    : 'bg-[#A07030]/10 text-[#A07030] hover:bg-[#A07030]/20',
                            )}
                        >
                            {a.dialect}
                        </button>
                    ))}
                </div>
            )}

            {/* Play button */}
            <button
                onClick={handlePlay}
                disabled={loading}
                className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    'bg-[#A07030]/10 text-[#A07030] hover:bg-[#A07030]/20 border border-[#A07030]/20',
                    'disabled:opacity-50',
                )}
                aria-label={playing ? 'Waqqa\' l-awdjo' : 'Isma\' l-awdjo'}
            >
                {loading ? (
                    <span className="w-3.5 h-3.5 border-2 border-[#A07030] border-t-transparent rounded-full animate-spin" />
                ) : playing ? (
                    <Pause size={14} />
                ) : (
                    <Play size={14} />
                )}
                {playing ? 'Waqqa\'' : 'Sema\''}
            </button>

            {/* IPA */}
            {ipa && (
                <span className="ipa text-sm text-[#4a4a4a]">[{ipa}]</span>
            )}

            {/* Regenerate (Pro+) */}
            {hasAccess('unlimited_audio') && (
                <button
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#A07030] transition-colors"
                    title="Iġġenera mill-ġdid bil-Gemini AI"
                >
                    <RefreshCw size={12} />
                    Iġġenera
                </button>
            )}
        </div>
    );
}
