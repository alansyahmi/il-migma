import { useState, useRef, useEffect } from 'react';
import { useAdminConfig, type ConfigItem } from '@/lib/adminConfig';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Plus, Trash2, Edit2, RotateCcw, Save, Tag, Users, Globe, Zap, ClipboardList, Package, Library, Settings, Puzzle, Palette, PlusSquare, Languages, Braces, HelpCircle, Keyboard, GripVertical } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { MalteseCharPicker } from '@/components/ui/MalteseCharPicker';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLinguisticMode } from '@/contexts/LinguisticModeContext';

const CATEGORIES = [
    { id: 'pos', label: 'Parts of Speech', icon: Tag },
    { id: 'gender', label: 'Genders', icon: Users },
    { id: 'dialect', label: 'Dialects', icon: Globe },
    { id: 'verb_class', label: 'Verb Classes', icon: Zap },
    { id: 'register', label: 'Registers', icon: ClipboardList },
    { id: 'noun_type', label: 'Noun Types', icon: Package },
    { id: 'source_language', label: 'Sources', icon: Library },
    { id: 'verb_preset', label: 'Verb Presets', icon: Settings },
    { id: 'broken_pattern', label: 'Broken Patterns', icon: Puzzle },
    { id: 'cv_wizen_pattern', label: 'Patterns', icon: Palette },
    { id: 'sound_suffix', label: 'S. Plural Suffixes', icon: PlusSquare },
    { id: 'verb_form', label: 'Verb Forms', icon: Settings },
    { id: 'participle_nuance', label: 'Ptcp. Nuances', icon: Tag },
    { id: 'root_relationship', label: 'Root Relationships', icon: Globe },
    { id: 'root_strength', label: 'Root Strengths', icon: Zap },
    { id: 'weak_class', label: 'Weak Classes', icon: HelpCircle },
];

export function AdminSettings() {
    const { config, loading, getCategoryItems, deleteItem, createItem, updateItem } = useAdminConfig();
    const [activeTab, setActiveTab] = useState('pos');
    const [editItem, setEditItem] = useState<ConfigItem | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [posFilter, setPosFilter] = useState<string>('all');
    const { language, setLanguage } = useLanguage();
    const { mode, setMode } = useLinguisticMode();
    const { user } = useUser();

    // Reordering state
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
    const [draggedCatId, setDraggedCatId] = useState<string | null>(null);

    // Load initial order from Clerk metadata
    useEffect(() => {
        if (user?.unsafeMetadata?.adminCategoryOrder) {
            setCategoryOrder(user.unsafeMetadata.adminCategoryOrder as string[]);
        } else {
            setCategoryOrder(CATEGORIES.map(c => c.id));
        }
    }, [user?.id]);

    const sortedCategories = [...CATEGORIES].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.id);
        const indexB = categoryOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const handleDragStart = (id: string, e: React.DragEvent) => {
        setDraggedCatId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a class to the dragged element itself for visual feedback if desired
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (targetId: string, e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedCatId || draggedCatId === targetId) return;

        const newOrder = [...categoryOrder];
        const oldIndex = newOrder.indexOf(draggedCatId);
        const newIndex = newOrder.indexOf(targetId);

        // Remove from old pos
        newOrder.splice(oldIndex, 1);
        // Insert at new pos
        newOrder.splice(newIndex, 0, draggedCatId);

        setCategoryOrder(newOrder);

        // Save to Clerk asynchronously
        if (user) {
            try {
                await user.update({
                    unsafeMetadata: {
                        ...user.unsafeMetadata,
                        adminCategoryOrder: newOrder
                    }
                });
            } catch (err) {
                console.error('Failed to save category order:', err);
            }
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedCatId(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const currentItems = getCategoryItems(activeTab);

    if (loading && config.length === 0) {
        return <div className="flex justify-center py-20"><Spinner /></div>;
    }

    const handleDelete = async (id: string, key: string) => {
        if (!confirm(`Are you sure you want to delete "${key}"?`)) return;
        try {
            await deleteItem(id);
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar Tabs */}
            <div className="md:col-span-1 space-y-1">
                <div className="mb-4 pb-4 border-b border-black/5">
                    <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest px-4 mb-2">Categories</h3>
                    {sortedCategories.map(cat => (
                        <div
                            key={cat.id}
                            draggable
                            onDragStart={(e) => handleDragStart(cat.id, e)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(cat.id, e)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "flex items-center gap-1 w-full text-left px-2 py-1.5 rounded-xl text-sm font-semibold transition-all group mb-1 cursor-pointer",
                                activeTab === cat.id
                                    ? "bg-white text-[#1034A6] shadow-md shadow-[#1034A6]/5 border border-[#1034A6]/10"
                                    : "text-black/40 hover:text-black/60 hover:bg-black/5",
                                draggedCatId === cat.id ? "opacity-50 border-dashed border-2 bg-transparent" : "",
                                draggedCatId && draggedCatId !== cat.id ? "border-t-2 border-t-transparent hover:border-t-[#1034A6]/30" : ""
                            )}
                            onClick={() => setActiveTab(cat.id)}
                        >
                            <GripVertical size={14} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-black" />
                            <span className="flex items-center gap-2 flex-1">
                                <cat.icon size={16} className={cn("transition-colors", activeTab === cat.id ? "text-[#1034A6]" : "text-black/20 group-hover:text-black/40")} />
                                {cat.label}
                            </span>
                            <span className="text-[10px] bg-black/5 px-1.5 rounded opacity-50 group-hover:opacity-100 mr-2">
                                {getCategoryItems(cat.id).length}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-3 bg-white/50 rounded-2xl border border-black/5 space-y-4">
                    <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Interface View</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-black/60 flex items-center gap-2">
                                <Languages size={14} /> Language
                            </span>
                            <div className="flex bg-black/5 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", language === 'en' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setLanguage('mt')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", language === 'mt' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                                >
                                    MT
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-black/60 flex items-center gap-2">
                                <Braces size={14} /> Mode
                            </span>
                            <div className="flex bg-black/5 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setMode('standard')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", mode === 'standard' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                                >
                                    CV
                                </button>
                                <button
                                    onClick={() => setMode('arabised')}
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-md transition-all", mode === 'arabised' ? "bg-white text-[#1034A6] shadow-sm" : "text-black/40")}
                                >
                                    وزن
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-black flex items-center gap-2">
                        {CATEGORIES.find(c => c.id === activeTab)?.label}
                    </h2>
                    <div className="flex items-center gap-3">
                        {(activeTab === 'cv_wizen_pattern' || activeTab === 'broken_pattern') && (
                            <select
                                className="bg-white border border-black/10 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                                value={posFilter}
                                onChange={e => setPosFilter(e.target.value)}
                            >
                                <option value="all">All POS</option>
                                {getCategoryItems('pos').map(p => (
                                    <option key={p.key} value={p.key}>{p.key.toUpperCase()}</option>
                                ))}
                            </select>
                        )}
                        <Button size="sm" onClick={() => setShowAdd(true)} leftIcon={<Plus size={14} />}>Add New</Button>
                    </div>
                </div>

                <div className="grid gap-3">
                    {(() => {
                        let items = currentItems;
                        if (posFilter !== 'all' && (activeTab === 'cv_wizen_pattern' || activeTab === 'broken_pattern')) {
                            items = items.filter(item => {
                                const val = item.value as any;
                                return val.pos_types?.includes(posFilter);
                            });
                        }

                        if (items.length === 0) {
                            return (
                                <div className="text-center py-12 bg-white/50 rounded-2xl border-2 border-dashed border-black/5">
                                    <p className="text-black/20 italic">No items found.</p>
                                </div>
                            );
                        }

                        return items.map(item => (
                            <Card key={item.id} className="p-4 border-[#ede9e1] hover:border-[#1034A6]/30 transition-colors group">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg text-black">
                                            {typeof item.value === 'object' && ('cv' in item.value || 'wizen' in item.value)
                                                ? (mode === 'standard' ? (item.value.cv || item.key) : (item.value.wizen || item.key))
                                                : item.key}
                                        </h3>
                                        <div className="text-xs font-mono text-black/40 bg-black/5 inline-block px-1.5 py-0.5 rounded">
                                            {typeof item.value === 'object' ? (
                                                <div className="flex gap-2">
                                                    {Object.entries(item.value).map(([vk, vv]) => (
                                                        <span key={vk} className="border-r border-black/10 last:border-0 pr-2">{vk}: {Array.isArray(vv) ? vv.join(', ') : String(vv)}</span>
                                                    ))}
                                                </div>
                                            ) : item.value}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(item.id, item.key)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </Card>
                        ));
                    })()}
                </div>
            </div>

            {/* Modals */}
            {
                (showAdd || editItem) && (
                    <ConfigFormModal
                        item={editItem}
                        category={activeTab}
                        onClose={() => { setShowAdd(false); setEditItem(null); }}
                        onSave={async (val) => {
                            if (editItem) await updateItem({ ...editItem, ...val });
                            else await createItem({ category: activeTab, ...val });
                            setShowAdd(false);
                            setEditItem(null);
                        }}
                    />
                )
            }
        </div >
    );
}

function ConfigFormModal({ item, category, onClose, onSave }: {
    item: ConfigItem | null;
    category: string;
    onClose: () => void;
    onSave: (val: any) => Promise<void>;
}) {
    const [key, setKey] = useState(item?.key ?? '');
    const [value, setValue] = useState(item?.value ?? (
        category === 'verb_preset' ? { perfect: { cv: '', wizen: '' }, passive: { cv: '', wizen: '' }, active: { cv: '', wizen: '' }, verbal: { cv: '', wizen: '' } } :
            (category === 'broken_pattern' || category === 'cv_wizen_pattern') ? { cv: '', wizen: '', pos_types: [], stress: 2 } : ''
    ));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [kbOpen, setKbOpen] = useState(false);
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const kbTriggerRef = useRef<HTMLButtonElement>(null);
    const activeInputRef = useRef<HTMLInputElement>(null);

    const insertChar = (char: string) => {
        if (!activeInput || !activeInputRef.current) return;
        const el = activeInputRef.current;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;

        const updater = (prevVal: string) => {
            return prevVal.substring(0, start) + char + prevVal.substring(end);
        };

        if (activeInput === 'key') setKey((prev: string) => updater(prev));
        else if (activeInput === 'value') setValue((prev: any) => typeof prev === 'string' ? updater(prev) : prev);
        else if (activeInput.startsWith('verb_')) {
            const [_, f, k] = activeInput.split('_');
            setValue((prev: any) => ({ ...prev, [f]: { ...prev[f], [k]: updater(prev[f][k] || '') } }));
        } else {
            setValue((prev: any) => ({ ...prev, [activeInput]: updater(prev[activeInput] || '') }));
        }

        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + char.length, start + char.length);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return setError('Key is required');
        setSaving(true);
        try {
            await onSave({ key, value });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const isComplex = category === 'verb_preset' || category === 'broken_pattern' || category === 'cv_wizen_pattern';
    const { getValues } = useAdminConfig();
    const POS_OPTIONS = getValues('pos').filter(p => p !== 'verb');

    const inp = "w-full border border-[#d8cfc0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1034A6] bg-white text-black";
    const labelStyle = "block text-xs font-bold text-black/40 uppercase tracking-widest mb-1.5";

    return (
        <Modal open onClose={onClose} title={item ? `Edit Item` : `Add New ${category}`} size={isComplex ? 'lg' : 'md'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="bg-red-50 text-red-800 p-3 rounded-xl text-sm border border-red-100">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className={labelStyle}>Identifier (Key)</label>
                        <div className="relative">
                            <input className={inp} value={key} onChange={e => setKey(e.target.value)} onFocus={(e) => { setActiveInput('key'); activeInputRef.current = e.target; }} placeholder="e.g. noun, masculine, I..." />
                        </div>
                    </div>
                </div>

                {!isComplex ? (
                    <div>
                        <label className={labelStyle}>Value</label>
                        <input className={inp} value={value} onChange={e => setValue(e.target.value)} placeholder="Display value..." />
                    </div>
                ) : category === 'verb_preset' ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        {['perfect', 'passive', 'active', 'verbal'].map(form => (
                            <div key={form} className="space-y-2 border-l-2 border-slate-100 pl-3">
                                <h4 className="text-[10px] font-bold text-[#1034A6] uppercase tracking-tighter">{form}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <input className={inp} value={value[form]?.cv} onChange={e => setValue({ ...value, [form]: { ...value[form], cv: e.target.value } })} placeholder="CV notation" />
                                    <input className={inp} value={value[form]?.wizen} onChange={e => setValue({ ...value, [form]: { ...value[form], wizen: e.target.value } })} placeholder="Wizen name" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="relative">
                                <label className={labelStyle}>CV Notation <span className="text-black/30 normal-case font-normal">(v = short, V = long vowel)</span></label>
                                <input className={inp} value={value.cv} onChange={e => setValue({ ...value, cv: e.target.value })} onFocus={(e) => { setActiveInput('cv'); activeInputRef.current = e.target; }} placeholder="e.g. CvCVC  (V = long vowel)" />
                            </div>
                            <div className="relative">
                                <label className={labelStyle}>Wiżen Name</label>
                                <input className={inp} value={value.wizen} onChange={e => setValue({ ...value, wizen: e.target.value })} onFocus={(e) => { setActiveInput('wizen'); activeInputRef.current = e.target; }} placeholder="e.g. fagħal" />
                            </div>
                            <div>
                                <label className={labelStyle}>Stress (syllable from end)</label>
                                <input className={inp} type="number" min={1} max={5} value={value.stress ?? 2} onChange={e => setValue({ ...value, stress: parseInt(e.target.value) || 2 })} placeholder="2 = penultimate" />
                            </div>
                        </div>

                        <div className="flex justify-start">
                            <button
                                ref={kbTriggerRef}
                                type="button"
                                onClick={() => setKbOpen(!kbOpen)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                                    kbOpen ? "bg-[#1034A6] text-white border-[#1034A6]" : "bg-white text-black/40 border-black/10 hover:border-black/20"
                                )}
                            >
                                <Keyboard size={12} /> {kbOpen ? 'Close Keyboard' : 'Open Keyboard'}
                            </button>
                            <div className="relative">
                                <MalteseCharPicker open={kbOpen} onOpenChange={setKbOpen} onInsert={insertChar} triggerRef={kbTriggerRef} />
                            </div>
                        </div>

                        {category === 'cv_wizen_pattern' && (
                            <div>
                                <label className={labelStyle}>Apply to POS (exclude verb)</label>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {POS_OPTIONS.map(p => {
                                        const isSelected = (value.pos_types || []).includes(p);
                                        return (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => {
                                                    const current = value.pos_types || [];
                                                    const next = isSelected ? current.filter((x: string) => x !== p) : [...current, p];
                                                    setValue({ ...value, pos_types: next });
                                                }}
                                                className={cn(
                                                    "px-3 py-1 text-[10px] font-bold rounded-lg border transition-all",
                                                    isSelected ? "bg-[#1034A6] text-white border-[#1034A6]" : "bg-white text-black/40 border-black/10 hover:border-black/20"
                                                )}
                                            >
                                                {p.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving} leftIcon={saving ? <RotateCcw className="animate-spin" size={14} /> : <Save size={14} />}>
                        {saving ? 'Saving...' : 'Save Config'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
