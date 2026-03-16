import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Plus,
    Search,
    MoreHorizontal,
    Download,
    Upload,
    Settings,
    Trash2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import NewPriceForm from './NewPriceList/NewPriceForm';

type PriceListRecord = {
    id: string;
    name: string;
    description: string;
    status: string;
    currency: string;
    priceListType: string;
    pricingScheme: string;
    discountEnabled: string;
    roundOffTo: string;
    markup?: string;
    markupType?: string;
    createdOn: string;
};

type Column = {
    key: string;
    label: string;
    visible: boolean;
    width: number;
    locked?: boolean;
};

type PriceListSortKey = 'name' | 'description' | 'status' | 'currency' | 'createdOn';

const COLUMNS_STORAGE_KEY = 'taban_price_lists_columns_v2';
const PRICE_LISTS_STORAGE_KEY = 'inv_price_lists_v1';

const DEFAULT_COLUMNS: Column[] = [
    { key: 'name', label: 'NAME AND DESCRIPTION', visible: true, width: 350, locked: true },
    { key: 'currency', label: 'CURRENCY', visible: true, width: 140 },
    { key: 'details', label: 'DETAILS', visible: true, width: 180 },
    { key: 'pricingScheme', label: 'PRICING SCHEME', visible: true, width: 180 },
    { key: 'roundOffTo', label: 'ROUND OFF PREFERENCE', visible: true, width: 220 },
    { key: 'status', label: 'STATUS', visible: false, width: 140 },
    { key: 'createdOn', label: 'CREATED ON', visible: false, width: 150 },
];

const cloneDefaultColumns = () => DEFAULT_COLUMNS.map((c) => ({ ...c }));
const toCsv = (headers: string[], rows: string[][]) => {
    const escape = (value: string) => {
        const safe = String(value ?? '');
        if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) return `"${safe.replace(/"/g, '""')}"`;
        return safe;
    };
    return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
};

export default function PriceListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [editingPriceList, setEditingPriceList] = useState<any | null>(null);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [moreOpen, setMoreOpen] = useState(false);
    const sortKey: PriceListSortKey = 'createdOn';
    const sortOrder: 'asc' | 'desc' = 'desc';

    const [columns, setColumns] = useState<Column[]>(() => {
        const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
        if (!saved) return cloneDefaultColumns();
        try {
            const parsed = JSON.parse(saved) as Column[];
            return DEFAULT_COLUMNS.map((def) => {
                const found = parsed.find((p) => p.key === def.key);
                return found ? { ...def, ...found } : { ...def };
            });
        } catch {
            return cloneDefaultColumns();
        }
    });

    const [priceLists, setPriceLists] = useState<PriceListRecord[]>(() => {
        try {
            const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            return parsed.map((row: any) => ({
                id: String(row?.id || row?._id || ''),
                name: String(row?.name || ''),
                description: String(row?.description || ''),
                status: String(row?.status || 'Active'),
                currency: String(row?.currency || '-'),
                priceListType: String(row?.priceListType || row?.type || ''),
                pricingScheme: String(row?.pricingScheme || '-'),
                discountEnabled: row?.discountEnabled ? 'Yes' : 'No',
                roundOffTo: String(row?.roundOffTo || 'Never mind'),
                createdOn: String(row?.createdOn || row?.createdAt || ''),
            }));
        } catch {
            return [];
        }
    });

    const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);
    const sortedPriceLists = useMemo(() => {
        const sorted = [...priceLists].sort((a, b) => {
            const getValue = (row: PriceListRecord): string | number => {
                switch (sortKey) {
                    case 'name':
                        return row.name?.toLowerCase?.() || '';
                    case 'description':
                        return row.description?.toLowerCase?.() || '';
                    case 'status':
                        return row.status?.toLowerCase?.() || '';
                    case 'currency':
                        return row.currency?.toLowerCase?.() || '';
                    case 'createdOn': {
                        const ts = new Date(row.createdOn || '').getTime();
                        return Number.isFinite(ts) ? ts : 0;
                    }
                    default:
                        return '';
                }
            };

            const left = getValue(a);
            const right = getValue(b);
            if (left < right) return sortOrder === 'asc' ? -1 : 1;
            if (left > right) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [priceLists, sortKey, sortOrder]);
    const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);
    const moreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
    }, [columns]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            const { col, startWidth, startX } = resizingRef.current;
            const delta = e.clientX - startX;
            setColumns((prev) => prev.map((c) => (c.key === col ? { ...c, width: Math.max(90, startWidth + delta) } : c)));
        };
        const onMouseUp = () => {
            resizingRef.current = null;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const loadPriceLists = () => {
        try {
            const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            const normalized = parsed.map((row: any) => ({
                id: String(row?.id || row?._id || ''),
                name: String(row?.name || ''),
                description: String(row?.description || ''),
                status: String(row?.status || 'Active'),
                currency: String(row?.currency || '-'),
                priceListType: String(row?.priceListType || row?.type || ''),
                pricingScheme: String(row?.pricingScheme || '-'),
                discountEnabled: row?.discountEnabled ? 'Yes' : 'No',
                roundOffTo: String(row?.roundOffTo || 'Never mind'),
                markup: String(row?.markup || '1%'),
                markupType: String(row?.markupType || 'Markup'),
                createdOn: String(row?.createdOn || row?.createdAt || ''),
            }));
            setPriceLists(normalized);
        } catch {
            setPriceLists([]);
        }
    };

    useEffect(() => {
        if (view === 'list') {
            loadPriceLists();
        }
    }, [view]);

    useEffect(() => {
        if (searchParams.get('new') !== '1') return;
        setEditingPriceList(null);
        setView('form');
    }, [searchParams]);

    const startResizing = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const col = columns.find((c) => c.key === key);
        if (!col) return;
        resizingRef.current = { col: key, startX: e.clientX, startWidth: col.width };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const handleOpenImport = () => {
        setMoreOpen(false);
        navigate('/products/price-lists/import');
    };

    const handleExport = () => {
        const headers = ['Name', 'Description', 'Status', 'Currency', 'Price List Type', 'Pricing Scheme', 'Round Off Preference', 'Markup'];
        const csvRows = sortedPriceLists.map((row) => [
            row.name || '',
            row.description || '',
            row.status || '',
            row.currency || '',
            row.priceListType || '',
            row.pricingScheme || '',
            row.roundOffTo || '',
            `${row.markup || ''} ${row.markupType || ''}`.trim(),
        ]);
        const csv = toCsv(headers, csvRows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales-price-lists-export.csv';
        a.click();
        URL.revokeObjectURL(url);
        setMoreOpen(false);
        toast.success('Price lists exported successfully');
    };

    const handleDisablePriceLists = () => {
        try {
            const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            const currentLists = Array.isArray(parsed) ? parsed : [];
            if (!currentLists.length) {
                toast.info('No price lists available to disable.');
                setMoreOpen(false);
                return;
            }
            let affected = 0;
            const updated = currentLists.map((item: any) => {
                const status = String(item?.status || '').toLowerCase();
                if (status !== 'inactive') {
                    affected += 1;
                    return { ...item, status: 'Inactive', updatedAt: new Date().toISOString() };
                }
                return item;
            });
            localStorage.setItem(PRICE_LISTS_STORAGE_KEY, JSON.stringify(updated));
            loadPriceLists();
            setMoreOpen(false);
            if (affected === 0) {
                toast.info('All price lists are already inactive.');
            } else {
                toast.success(`Disabled ${affected} price list(s).`);
            }
        } catch (error) {
            toast.error('Failed to disable price lists');
        }
    };

    const handleEdit = (row: PriceListRecord) => {
        const targetId = String(row?.id || '');
        const fullRows = (() => {
            try {
                const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        })();
        const full = fullRows.find((r: any) => String(r?.id || r?._id || '') === targetId);
        setEditingPriceList(full ? { ...full, id: String(full.id || full._id || targetId) } : row);
        setView('form');
    };

    const openNewPriceList = () => {
        setEditingPriceList(null);
        setView('form');
    };

    const handleToggleStatus = (row: PriceListRecord) => {
        try {
            const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
            const currentLists = raw ? JSON.parse(raw) : [];
            const updated = currentLists.map((item: any) => {
                const itemId = String(item.id || item._id);
                if (itemId === row.id) {
                    return { ...item, status: row.status.toLowerCase() === 'active' ? 'Inactive' : 'Active' };
                }
                return item;
            });
            localStorage.setItem(PRICE_LISTS_STORAGE_KEY, JSON.stringify(updated));
            loadPriceLists();
            toast.success(`Price list marked as ${row.status.toLowerCase() === 'active' ? 'Inactive' : 'Active'}`);
        } catch (error) {
            toast.error('Failed to update price list status');
        }
    };

    const handleDelete = (id: string) => {
        if (!window.confirm('Are you sure you want to delete this price list?')) return;
        try {
            const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
            const currentLists = raw ? JSON.parse(raw) : [];
            const updated = currentLists.filter((item: any) => String(item.id || item._id) !== id);
            localStorage.setItem(PRICE_LISTS_STORAGE_KEY, JSON.stringify(updated));
            loadPriceLists();
            toast.success('Price list deleted successfully');
        } catch (error) {
            toast.error('Failed to delete price list');
        }
    };

    const getCell = (row: PriceListRecord, key: string) => {
        if (key === 'name') {
            return (
                <div className="flex flex-col py-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-blue-500 hover:text-blue-600 cursor-pointer">{row.name || '-'}</span>
                        {row.status.toLowerCase() === 'inactive' && (
                            <span className="bg-gray-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">INACTIVE</span>
                        )}
                    </div>
                    {row.description && <span className="text-[11px] text-slate-400 mt-0.5">{row.description}</span>}
                </div>
            );
        }
        if (key === 'currency') return <span className="text-[13px] text-slate-600">{row.currency || '-'}</span>;
        if (key === 'details') {
            const markup = row.markup || '1%';
            const type = row.markupType || 'Markup';
            return <span className="text-[13px] text-slate-600">{markup} {type}</span>;
        }
        if (key === 'pricingScheme') return <span className="text-[13px] text-slate-600">{row.pricingScheme || '-'}</span>;
        if (key === 'roundOffTo') return <span className="text-[13px] text-slate-600">{row.roundOffTo || 'Never mind'}</span>;
        if (key === 'status') return <span className={row.status.toLowerCase() === 'active' ? 'text-emerald-600' : 'text-slate-500'}>{row.status || '-'}</span>;
        return <span className="text-[13px] text-slate-600">{(row as any)[key] || '-'}</span>;
    };

	    return (
	        <div className="min-h-screen bg-white font-sans text-[#404040]">
	            <main className="h-full">
	                {view === 'list' ? (
	                    <div className="flex h-full flex-col">
	                        <div className="flex items-center justify-between px-6 border-b border-gray-100 bg-white relative overflow-visible mt-1">
	                            <div className="flex items-center gap-8 pl-4">
	                                <div className="flex items-center gap-1.5 py-3 border-b-2 border-slate-900 -mb-[px]">
	                                    <h1 className="text-[15px] font-bold text-slate-900 transition-colors">Price Lists</h1>
	                                </div>
	                            </div>
	                            <div className="flex items-center gap-3 mr-4 py-3">
	                                <button
	                                    onClick={openNewPriceList}
	                                    className="cursor-pointer transition-all text-white px-3 sm:px-4 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-semibold shadow-sm flex items-center gap-1"
	                                    style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
	                                >
	                                    <Plus size={16} /> <span>New</span>
	                                </button>
	                                <div className="relative" ref={moreRef}>
	                                    <button
	                                        onClick={() =>
	                                            setMoreOpen((prev) => {
                                                return !prev;
                                            })
                                        }
                                        className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors bg-white shadow-sm"
                                    >
                                        <MoreHorizontal size={18} className="text-gray-500" />
                                    </button>
                                    {moreOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[#d8deea] bg-white py-2 shadow-xl z-[110] animate-in fade-in slide-in-from-top-1 duration-150">
                                            <button
                                                type="button"
                                                onClick={handleOpenImport}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-[#2563eb] transition-colors hover:bg-[#2563eb] hover:text-white group"
                                            >
                                                <Download size={15} className="text-[#2563eb] group-hover:text-white" />
                                                Import Sales Price List
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleExport}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-[#2563eb] transition-colors hover:bg-[#2563eb] hover:text-white group"
                                            >
                                                <Upload size={15} className="text-[#2563eb] group-hover:text-white" />
                                                Export Sales Price List
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDisablePriceLists}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-[#2563eb] transition-colors hover:bg-[#2563eb] hover:text-white group"
                                            >
                                                <Settings size={15} className="text-[#2563eb] group-hover:text-white" />
                                                Disable Price List
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
	                        </div>

	                        <div className="flex-1 overflow-x-auto bg-white min-h-0">
	                            <table className="w-full text-left border-collapse min-w-[1200px]">
	                                <thead className="bg-[#f6f7fb] sticky top-0 z-10 border-b border-[#e6e9f2]">
	                                    <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
	                                        {visibleColumns.map((col) => (
	                                            <th key={col.key} className="px-4 py-3 relative group/header bg-[#f6f7fb]" style={{ width: col.width }}>
	                                                <span className="truncate block">{col.label}</span>
	                                                <div
	                                                    className="absolute right-0 top-0 bottom-0 w-[2px] cursor-col-resize hover:bg-teal-400/50 group-hover/header:border-r border-gray-100"
	                                                    onMouseDown={(e) => startResizing(col.key, e)}
	                                                />
	                                            </th>
	                                        ))}

	                                        <th className="px-4 py-3 text-right w-[240px] sticky right-0 bg-[#f6f7fb] z-20">
	                                            <div className="flex items-center justify-end gap-2">
	                                                <Search size={14} className="text-gray-300" />
	                                            </div>
	                                        </th>
	                                    </tr>
	                                </thead>
	                                <tbody className="divide-y divide-gray-100">
	                                    {sortedPriceLists.map((row) => (
	                                        <tr
	                                            key={row.id}
	                                            className="text-[13px] group transition-all hover:bg-[#f8fafc] h-[50px] border-b border-[#eef1f6]"
	                                        >
	                                            {visibleColumns.map((col) => (
	                                                <td key={col.key} className="px-4 py-3 truncate whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: col.width, maxWidth: col.width }}>
	                                                    {getCell(row, col.key)}
	                                                </td>
	                                            ))}
	                                            <td className="px-4 py-3 text-right sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors">
	                                                <div className="invisible group-hover:visible flex items-center justify-end gap-2 text-[12px] whitespace-nowrap">
	                                                    <button onClick={() => handleEdit(row)} className="text-blue-500 hover:text-blue-600 font-medium transition-colors">Edit</button>
	                                                    <span className="text-slate-300">|</span>
	                                                    <button
                                                        onClick={() => handleToggleStatus(row)}
                                                        className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                                                    >
                                                        {row.status.toLowerCase() === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
                                                    </button>
                                                    <span className="text-slate-300">|</span>
                                                    <button
                                                        onClick={() => handleDelete(row.id)}
                                                        className="text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {sortedPriceLists.length === 0 && (
                                <div className="flex flex-col items-center justify-center text-center py-20">
                                    <h2 className="text-[26px] font-medium text-slate-800 mb-2">Customize Your Item Pricing with Flexibility</h2>
                                    <p className="text-slate-500 text-[14px] mb-8">Create and manage multiple pricelists tailored to different customer segments.</p>
                                    <button
                                        onClick={openNewPriceList}
                                        className="text-white px-10 py-2.5 rounded font-bold text-[13px] uppercase tracking-widest mb-20 transition-all hover:brightness-110 active:scale-95 shadow-md border-b-[4px] border-[#0D4A52]"
                                        style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                                    >
                                        Create Price List
                                    </button>

                                    <div className="w-full max-w-5xl px-8 opacity-90">
                                        <h3 className="text-slate-700 text-[15px] font-medium mb-10">Life cycle of Price Lists</h3>
                                        <div className="border border-dashed border-gray-200 rounded-lg p-12 bg-gray-50">
                                            <p className="text-gray-400 italic text-[13px]">[ Diagram Visualization: Create Price List -&gt; Sales/Purchase -&gt; All/Individual -&gt; Invoice/Bill ]</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <NewPriceForm
                        onClose={() => {
                            setView('list');
                            setEditingPriceList(null);
                            if (searchParams.get('new') === '1') {
                                const nextParams = new URLSearchParams(searchParams);
                                nextParams.delete('new');
                                setSearchParams(nextParams, { replace: true });
                            }
                        }}
                        editData={editingPriceList}
                    />
                )}
            </main>
        </div>
    );
}
