import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, Check, ChevronUp, PlusCircle, XCircle } from 'lucide-react';

export type DropdownOption = {
    value: string;
    label: string;
    customLabel?: React.ReactNode;
};

export type SearchableDropdownProps = {
    value: string;
    options: Array<DropdownOption>;
    onChange: (value: string) => void;
    placeholder: string;
    accentColor?: string;
    addNewLabel?: string;
    onAddNew?: () => void;
    onClear?: () => void;
    showClear?: boolean;
    openDirection?: 'down' | 'up';
    onOpenChange?: (open: boolean) => void;
    className?: string;
    inputClassName?: string;
};

const SearchableDropdown = ({
    value,
    options,
    onChange,
    placeholder,
    accentColor = '#3b82f6',
    addNewLabel,
    onAddNew,
    onClear,
    showClear = false,
    openDirection = 'down',
    onOpenChange,
    className = "",
    inputClassName = "",
}: SearchableDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const instanceId = useId();

    const selected = options.find((opt) => opt.value === value);
    const filtered = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setOpen(false);
                onOpenChange?.(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [onOpenChange]);

    useEffect(() => {
        const handleOtherDropdownOpened = (event: Event) => {
            const custom = event as CustomEvent<{ id?: string }>;
            const otherId = custom?.detail?.id;
            if (!otherId || otherId === instanceId) return;
            if (open) {
                setOpen(false);
                onOpenChange?.(false);
            }
        };
        window.addEventListener("searchableDropdownOpened", handleOtherDropdownOpened as EventListener);
        return () => window.removeEventListener("searchableDropdownOpened", handleOtherDropdownOpened as EventListener);
    }, [instanceId, onOpenChange, open]);

    return (
        <div ref={wrapperRef} className={`relative ${open ? 'z-[1200]' : ''} ${className}`}>
            <div className="relative group/sd">
                <button
                    type="button"
                    onClick={() => {
                        const nextOpen = !open;
                        setOpen(nextOpen);
                        onOpenChange?.(nextOpen);
                        if (nextOpen) {
                            window.dispatchEvent(new CustomEvent("searchableDropdownOpened", { detail: { id: instanceId } }));
                        }
                    }}
                    className={`flex h-[38px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-[14px] outline-none transition-all hover:border-gray-400 focus:border-blue-400 ${inputClassName}`}
                    style={open ? { borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` } : {}}
                >
                    <span className={`truncate mr-6 ${selected ? "text-gray-900" : "text-gray-500"}`}>
                        {selected?.label || placeholder}
                    </span>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {showClear && selected && onClear && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear();
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <XCircle size={14} fill="currentColor" className="text-white bg-gray-400 rounded-full" />
                            </button>
                        )}
                        {open ? <ChevronUp size={16} className="text-blue-500" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                </button>
            </div>

            {open && (
                <div
                    className={`absolute left-0 z-[1200] w-full rounded-lg border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in duration-200 ${openDirection === 'up' ? 'bottom-full mb-1 slide-in-from-bottom-2' : 'top-full mt-1 slide-in-from-top-2'
                        }`}
                >
                    <div className="mb-2 flex items-center gap-2 rounded-md border border-blue-400 bg-white px-3 py-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search"
                            className="w-full border-none bg-transparent text-[13px] text-gray-700 outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-[13px] text-gray-500 italic">No options found</div>
                        ) : (
                            filtered.map((opt) => {
                                const isSelected = value === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                             setSearchTerm("");
                                             onOpenChange?.(false);
                                         }}
                                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] transition-colors hover:bg-gray-50 ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                                    >
                                        <div className="flex-1 flex items-center justify-between min-w-0">
                                            <span className="truncate">{opt.label}</span>
                                            {opt.customLabel && (
                                                <span className="ml-2 flex-shrink-0 text-gray-400 text-[11px]">
                                                    {opt.customLabel}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check size={14} className="ml-2 flex-shrink-0" style={{ color: accentColor }} />}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {onAddNew && addNewLabel && (
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                setSearchTerm("");
                                onAddNew();
                            }}
                            className="mt-2 flex w-full items-center gap-2 border-t border-gray-100 px-2 pt-2 text-[13px] text-blue-600 font-medium hover:text-blue-700 transition-colors"
                        >
                            <PlusCircle size={14} />
                            {addNewLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
