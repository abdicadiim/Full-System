import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export type MultiSelectDropdownProps = {
    values: string[];
    options: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
};

const MultiSelectDropdown = ({
    values,
    options,
    onChange,
    placeholder,
}: MultiSelectDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const filtered = options.filter(
        (opt) =>
            opt.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !values.includes(opt)
    );

    const addValue = (value: string) => {
        if (values.includes(value)) return;
        onChange([...values, value]);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex min-h-[38px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-2 text-left text-[14px] outline-none transition-all focus:border-blue-400"
                style={open ? { borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' } : {}}
            >
                <div className="flex flex-1 flex-wrap items-center gap-1 py-1">
                    {values.length === 0 ? (
                        <span className="px-1 text-gray-400">{placeholder}</span>
                    ) : (
                        values.map((value) => (
                            <span key={value} className="inline-flex items-center gap-1 rounded bg-[#e9edf6] px-2 py-1 text-[13px] text-[#334155]">
                                {value}
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onChange(values.filter((item) => item !== value));
                                    }}
                                    className="text-[#64748b] hover:text-[#334155]"
                                >
                                    x
                                </button>
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown size={14} className={`text-blue-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-[140] mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
                    <div className="mb-2 flex items-center gap-2 rounded-md border border-blue-400 bg-white px-3 py-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search"
                            className="w-full border-none bg-transparent text-[13px] text-gray-700 outline-none"
                        />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-[13px] text-gray-500 italic">No options found</div>
                        ) : (
                            filtered.map((opt) => {
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => addValue(opt)}
                                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                        <span className="truncate">{opt}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
