import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
  GripVertical,
  Lock,
  RotateCcw,
  Download,
  Upload,
  Star,
  ArrowUpDown,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useOrganizationBranding } from '../../../hooks/useOrganizationBranding';
import { useCurrency } from '../../../hooks/useCurrency';
import NewCouponPage from './NewCouponPage';
import CouponDetail, { type CouponDetailRecord } from './CouponDetail';
import type { CouponRecord } from './types';
import { readCoupons, writeCoupons } from './storage';
import { buildCloneName } from '../utils/cloneName';

type CouponStatusFilter = 'All' | 'Active' | 'Inactive' | 'Expired';
type CouponSortKey = 'couponName' | 'couponCode' | 'status' | 'discountValue' | 'createdAt';

type CouponRow = {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Inactive' | 'Expired';
  value: string;
  product?: string;
  redemptionType?: string;
  discountType?: string;
  associatePlans?: string;
  associateAddons?: string;
  expirationDate?: string;
  maximumRedemptions?: string;
  createdOn?: string;
};

type Column = {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  locked?: boolean;
};

const COLUMNS_STORAGE_KEY = 'taban_coupons_columns_v1';

const DEFAULT_COLUMNS: Column[] = [
  { key: 'name', label: 'NAME', visible: true, width: 220, locked: true },
  { key: 'code', label: 'COUPON CODE', visible: true, width: 170 },
  { key: 'status', label: 'STATUS', visible: true, width: 140 },
  { key: 'value', label: 'DISCOUNT VALUE', visible: true, width: 170 },
  { key: 'product', label: 'PRODUCT', visible: false, width: 180 },
  { key: 'redemptionType', label: 'REDEMPTION TYPE', visible: false, width: 180 },
  { key: 'discountType', label: 'DISCOUNT TYPE', visible: false, width: 160 },
  { key: 'associatePlans', label: 'ASSOCIATE PLANS', visible: false, width: 170 },
  { key: 'associateAddons', label: 'ASSOCIATE ADDONS', visible: false, width: 180 },
  { key: 'expirationDate', label: 'EXPIRATION DATE', visible: false, width: 170 },
  { key: 'maximumRedemptions', label: 'MAX REDEMPTIONS', visible: false, width: 180 },
  { key: 'createdOn', label: 'CREATED ON', visible: false, width: 150 },
];

const cloneDefaultColumns = () => DEFAULT_COLUMNS.map((c) => ({ ...c }));
const createId = () => `coupon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const seedCoupons = (): CouponRecord[] => {
  const now = new Date().toISOString();
  return [
    {
      id: createId(),
      product: 'Cloud Box',
      couponName: 'dsffg',
      couponCode: 'ASF',
      discountType: 'Flat',
      discountValue: 2,
      redemptionType: 'One Time',
      limitedCycles: 0,
      maxRedemption: 0,
      associatedPlans: 'All Plans',
      associatedAddons: 'All Recurring Addons',
      expirationDate: '',
      status: 'Expired',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      product: 'asddc',
      couponName: 'rgtegt5g',
      couponCode: 'RGREG',
      discountType: 'Flat',
      discountValue: 3434,
      redemptionType: 'One Time',
      limitedCycles: 0,
      maxRedemption: 0,
      associatedPlans: 'All Plans',
      associatedAddons: 'All Recurring Addons',
      expirationDate: '',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    },
  ];
};

const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const asCurrency = (currencyCode: string, amount: number) => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${currencyCode}${safe.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const toCouponRow = (record: CouponRecord, currencySymbol: string): CouponRow => ({
  id: record.id,
  name: record.couponName,
  code: record.couponCode,
  status: record.status,
  value:
    record.discountType === 'Percentage'
      ? `${record.discountValue}%`
      : asCurrency(currencySymbol, record.discountValue),
  product: record.product || '-',
  redemptionType: record.redemptionType || '-',
  discountType: record.discountType || '-',
  associatePlans: record.associatedPlans || '-',
  associateAddons: record.associatedAddons || '-',
  expirationDate: record.expirationDate || '-',
  maximumRedemptions: record.maxRedemption > 0 ? String(record.maxRedemption) : 'Unlimited',
  createdOn: formatDate(record.createdAt),
});

const resolveProductLabel = (value: string) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  try {
    const raw = localStorage.getItem("inv_products_v1");
    const parsed = raw ? JSON.parse(raw) : [];
    const rows = Array.isArray(parsed) ? parsed : [];
    const key = rawValue.toLowerCase();
    const matched = rows.find((row: any) => {
      const id = String(row?.id || row?._id || "").trim().toLowerCase();
      const name = String(row?.name || row?.displayName || row?.product || "").trim().toLowerCase();
      return key === id || key === name;
    });
    if (!matched) return rawValue;
    const label = String(matched?.name || matched?.displayName || matched?.product || rawValue).trim();
    return label || rawValue;
  } catch {
    return rawValue;
  }
};

const downloadCsv = (name: string, headers: string[], rows: string[][]) => {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => escape(cell || '')).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
};

const CouponsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accentColor } = useOrganizationBranding();
  const { baseCurrency } = useCurrency();

  const [view, setView] = useState<'list' | 'create'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CouponStatusFilter>('All');
  const [sortKey, setSortKey] = useState<CouponSortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const [records, setRecords] = useState<CouponRecord[]>([]);

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);

  const filteredRecords = useMemo(() => {
    const base = activeFilter === 'All' ? records : records.filter((record) => record.status === activeFilter);
    const sorted = [...base].sort((a, b) => {
      const getValue = (record: CouponRecord): string | number => {
        switch (sortKey) {
          case 'couponName':
            return record.couponName?.toLowerCase?.() || '';
          case 'couponCode':
            return record.couponCode?.toLowerCase?.() || '';
          case 'status':
            return record.status?.toLowerCase?.() || '';
          case 'discountValue':
            return Number(record.discountValue || 0);
          case 'createdAt': {
            const ts = new Date(record.createdAt || '').getTime();
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
  }, [activeFilter, records, sortKey, sortOrder]);

  const filteredCoupons = useMemo(
    () => filteredRecords.map((record) => toCouponRow(record, baseCurrency.symbol || '$')),
    [filteredRecords, baseCurrency.symbol]
  );

  const allCouponRows = useMemo(
    () => records.map((record) => toCouponRow(record, baseCurrency.symbol || '$')),
    [records, baseCurrency.symbol]
  );

  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    const rows = readCoupons();
    if (rows.length > 0) {
      setRecords(rows);
      return;
    }
    const seeded = seedCoupons();
    writeCoupons(seeded);
    setRecords(seeded);
  }, [location.key]);

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
        setSortSubMenuOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const persistRecords = (next: CouponRecord[]) => {
    setRecords(next);
    writeCoupons(next);
  };

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columns.find((c) => c.key === key);
    if (!col) return;
    resizingRef.current = { col: key, startX: e.clientX, startWidth: col.width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCoupons.length && filteredCoupons.length > 0) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredCoupons.map((c) => c.id));
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => {
        if (c.key !== key || c.locked) return c;
        return { ...c, visible: !c.visible };
      })
    );
  };

  const resetColumns = () => {
    setColumns(cloneDefaultColumns());
  };

  const handleToggleCouponActive = (id: string) => {
    const current = records.find(r => r.id === id);
    if (!current) return;
    const nextStatus = current.status === 'Active' ? 'Inactive' : 'Active';
    const now = new Date().toISOString();
    const next = records.map((record) => {
      if (record.id !== id) return record;
      return {
        ...record,
        status: nextStatus as any,
        updatedAt: now,
      };
    });
    persistRecords(next);
    toast.success(`Coupon status updated to ${nextStatus}`);
  };

  const handleCloneCoupon = (id: string) => {
    const target = records.find((record) => record.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    const cloned: CouponRecord = {
      ...target,
      id: createId(),
      couponName: buildCloneName(
        target.couponName,
        records.map((record) => record.couponName),
        'Coupon'
      ),
      couponCode: `${target.couponCode}-CLONE`,
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };

    const next = [cloned, ...records];
    persistRecords(next);
    toast.success('Coupon cloned successfully');
    setSelectedCouponId(cloned.id);
  };

  const handleDeleteCoupon = (id: string) => {
    if (!window.confirm('Delete this coupon?')) return;
    const next = records.filter((record) => record.id !== id);
    persistRecords(next);
    toast.success('Coupon deleted successfully');
    if (selectedCouponId === id) {
      setSelectedCouponId(next.length ? next[0].id : null);
    }
  };

  const clearBulkSelection = () => {
    setSelectedIds([]);
  };


  const handleBulkMarkStatus = (status: 'Active' | 'Inactive') => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const now = new Date().toISOString();
    const next = records.map((record) =>
      selectedSet.has(record.id)
        ? {
          ...record,
          status,
          updatedAt: now,
        }
        : record
    );
    persistRecords(next);
    toast.success(`${selectedIds.length} coupons marked as ${status}`);
    clearBulkSelection();
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected coupon(s)?`)) return;
    const selectedSet = new Set(selectedIds);
    const next = records.filter((record) => !selectedSet.has(record.id));
    persistRecords(next);
    toast.success(`${selectedIds.length} coupons deleted successfully`);
    if (selectedCouponId && selectedSet.has(selectedCouponId)) {
      setSelectedCouponId(next.length ? next[0].id : null);
    }
    clearBulkSelection();
  };

  const handleExportCoupons = () => {
    const rows = filteredRecords.length > 0 ? filteredRecords : records;
    if (rows.length === 0) {
      toast.error('No coupons to export.');
      return;
    }

    const headers = [
      'Product',
      'Coupon Name',
      'Coupon Code',
      'Discount Type',
      'Discount Value',
      'Redemption Type',
      'Limited Cycles',
      'Maximum Redemption',
      'Expiration Date',
      'Status',
      'Associated Plans',
      'Associated Addons',
    ];

    const body = rows.map((record) => [
      record.product || '',
      record.couponName || '',
      record.couponCode || '',
      record.discountType || '',
      String(record.discountValue ?? ''),
      record.redemptionType || '',
      String(record.limitedCycles ?? ''),
      String(record.maxRedemption ?? ''),
      record.expirationDate || '',
      record.status || '',
      record.associatedPlans || '',
      record.associatedAddons || '',
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`coupons-export-${stamp}.csv`, headers, body);
    toast.success('Coupons exported successfully');
    setMoreOpen(false);
    setSortSubMenuOpen(false);
  };

  const handleSaveFromNewCoupon = (payload: {
    name: string;
    code: string;
    status: 'Active' | 'Expired';
    value: string;
    type: string;
    redemption: string;
    productId: string;
    cycles?: string;
    associatePlans?: string;
    associateAddons?: string;
    selectedAddons?: string[];
  }) => {
    const numeric = Number(String(payload.value).replace(/[^0-9.-]/g, ''));
    const now = new Date().toISOString();
    const productLabel = resolveProductLabel(payload.productId);

    if (editingCouponId) {
      const next = records.map((record) => {
        if (record.id !== editingCouponId) return record;
        return {
          ...record,
          product: productLabel || record.product || '',
          couponName: payload.name || record.couponName,
          couponCode: (payload.code || record.couponCode || '').toUpperCase(),
          discountType: String(payload.type || '').toLowerCase().includes('flat') ? 'Flat' : 'Percentage',
          discountValue: Number.isFinite(numeric) ? numeric : 0,
          redemptionType: String(payload.redemption || '').toLowerCase().includes('limited')
            ? 'Limited Cycles'
            : String(payload.redemption || '').toLowerCase().includes('unlimited')
              ? 'Unlimited'
              : 'One Time',
          limitedCycles: Number(payload.cycles) > 0 ? Number(payload.cycles) : 0,
          associatedPlans: payload.associatePlans || record.associatedPlans || 'All Plans',
          associatedAddons: payload.associateAddons || record.associatedAddons || 'All Addons',
          updatedAt: now,
        } as CouponRecord;
      });
      persistRecords(next);
      toast.success('Coupon updated successfully');
      setSelectedCouponId(editingCouponId);
      setEditingCouponId(null);
      setView('list');
      return;
    }

    const created: CouponRecord = {
      id: createId(),
      product: productLabel || '',
      couponName: payload.name || 'New Coupon',
      couponCode: (payload.code || '').toUpperCase(),
      discountType: String(payload.type || '').toLowerCase().includes('flat') ? 'Flat' : 'Percentage',
      discountValue: Number.isFinite(numeric) ? numeric : 0,
      redemptionType: String(payload.redemption || '').toLowerCase().includes('limited')
        ? 'Limited Cycles'
        : String(payload.redemption || '').toLowerCase().includes('unlimited')
          ? 'Unlimited'
          : 'One Time',
      limitedCycles: Number(payload.cycles) > 0 ? Number(payload.cycles) : 0,
      maxRedemption: 0,
      associatedPlans: payload.associatePlans || 'All Plans',
      associatedAddons: payload.associateAddons || 'All Addons',
      expirationDate: '',
      status: payload.status === 'Expired' ? 'Expired' : 'Active',
      createdAt: now,
      updatedAt: now,
    };

    const next = [created, ...records];
    persistRecords(next);
    toast.success('Coupon created successfully');
    setSelectedCouponId(created.id);
    setEditingCouponId(null);
    setView('list');
  };

  const getCell = (coupon: CouponRow, key: string) => {
    if (key === 'name') return <span className="text-[13px] font-medium text-[#1b5e6a]">{coupon.name}</span>;
    if (key === 'status') {
      return <span className={coupon.status === 'Active' ? 'text-emerald-600' : coupon.status === 'Inactive' ? 'text-slate-500' : 'text-slate-700'}>{coupon.status}</span>;
    }
    const value = coupon[key as keyof CouponRow];
    return <span className="text-[13px] text-slate-600">{String(value || '-')}</span>;
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white font-sans text-gray-800 antialiased relative overflow-visible">
      {view === 'list' ? (
        selectedCouponId !== null ? (
          <CouponDetail
            coupons={allCouponRows as CouponDetailRecord[]}
            selectedCouponId={selectedCouponId}
            onSelectCoupon={setSelectedCouponId}
            onClose={() => setSelectedCouponId(null)}
            onNew={() => {
              setEditingCouponId(null);
              setView('create');
            }}
            onEdit={(id) => {
              setEditingCouponId(id);
              setView('create');
            }}
            onToggleActive={handleToggleCouponActive}
            onClone={handleCloneCoupon}
            onDelete={handleDeleteCoupon}
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-gray-100 bg-white relative overflow-visible px-4">
              {selectedIds.length > 0 ? (
                <div className="flex w-full items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkMarkStatus('Active')}
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300"
                    >
                      Mark as Active
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMarkStatus('Inactive')}
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300"
                    >
                      Mark as Inactive
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300"
                    >
                      Delete
                    </button>
                    <div className="mx-2 h-5 w-px bg-gray-200" />
                    <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <span
                        className="flex h-6 min-w-[24px] items-center justify-center rounded px-2 text-[13px] font-semibold text-white"
                        style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                      >
                        {selectedIds.length}
                      </span>
                      <span className="text-sm text-gray-700">Selected</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearBulkSelection}
                    className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                  >
                    <span>Esc</span>
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-8 pl-4">
                    <div className="relative" ref={filterRef}>
                      <button
                        type="button"
                        onClick={() => setFilterOpen((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 border-b-2 border-slate-900 py-4 text-[15px] font-bold text-slate-900 -mb-[1px]"
                      >
                        <span>{activeFilter === 'All' ? 'All Coupons' : activeFilter}</span>
                        <ChevronDown size={14} className={`text-[#1b5e6a] transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {filterOpen && (
                        <div className="absolute left-0 top-full z-[100] mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                          {(['All', 'Active', 'Inactive', 'Expired'] as const).map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => {
                                setActiveFilter(filter);
                                setFilterOpen(false);
                                setSelectedIds([]);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50"
                            >
                              <span className={`text-[14px] ${activeFilter === filter ? 'font-medium text-blue-600' : 'text-gray-700'}`}>{filter}</span>
                              <Star size={14} className="text-gray-300" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center mr-4">
                    <button
                      onClick={() => navigate('/products/coupons/new')}
                      className="cursor-pointer transition-all text-white px-3 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-1 text-sm font-semibold"
                      style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                    >
                      <Plus size={16} strokeWidth={3} /> New
                    </button>

                    <div className="relative" ref={moreRef}>
                      <button
                        onClick={() =>
                          setMoreOpen((prev) => {
                            const next = !prev;
                            if (!next) setSortSubMenuOpen(false);
                            return next;
                          })
                        }
                        className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors bg-white shadow-sm"
                      >
                        <MoreHorizontal size={18} className="text-gray-500" />
                      </button>
                      {moreOpen && (
                        <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setSortSubMenuOpen((prev) => !prev)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? 'text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-[#1b5e6a] hover:text-white'}`}
                              style={sortSubMenuOpen ? { backgroundColor: '#1b5e6a' } : {}}
                            >
                              <span className="flex items-center gap-3">
                                <ArrowUpDown size={16} className={sortSubMenuOpen ? 'text-white' : ''} style={!sortSubMenuOpen ? { color: '#1b5e6a' } : {}} />
                                <span className="font-medium">Sort by</span>
                              </span>
                              <ChevronRight size={14} className={sortSubMenuOpen ? 'text-white' : 'text-slate-400'} />
                            </button>
                            {sortSubMenuOpen && (
                              <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-56 relative w-full bg-white md:border border-gray-100 rounded-lg md:shadow-xl py-2 z-[115] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                                {[
                                  { key: 'couponName', label: 'Coupon Name' },
                                  { key: 'couponCode', label: 'Coupon Code' },
                                  { key: 'status', label: 'Status' },
                                  { key: 'discountValue', label: 'Discount Value' },
                                  { key: 'createdAt', label: 'Created Time' },
                                ].map((option) => {
                                  const isActive = sortKey === option.key;
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => {
                                        if (sortKey === option.key) {
                                          setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                                        } else {
                                          setSortKey(option.key as CouponSortKey);
                                          setSortOrder('asc');
                                        }
                                      }}
                                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${isActive ? 'bg-[#1b5e6a] text-white font-bold' : 'text-slate-600 hover:bg-teal-50/50'}`}
                                    >
                                      <span style={isActive ? { color: 'white', fontWeight: 'bold' } : {}}>
                                        {option.label} {isActive ? (sortOrder === 'asc' ? '(Asc)' : '(Desc)') : ''}
                                      </span>
                                      {isActive && <Plus size={14} className="rotate-45" style={{ color: 'white' }} />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="h-px bg-gray-50 my-1 mx-2" />
                          <button
                            onClick={() => {
                              navigate('/products/coupons/import');
                              setMoreOpen(false);
                              setSortSubMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                          >
                            <Upload size={16} className="text-teal-600 group-hover:text-white" />
                            Import Coupons
                          </button>
                          <button
                            onClick={handleExportCoupons}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                          >
                            <Download size={16} className="text-teal-600 group-hover:text-white" />
                            Export Coupons
                          </button>
                          <div className="h-px bg-gray-50 my-1 mx-2" />
                          <button
                            onClick={() => {
                              resetColumns();
                              setMoreOpen(false);
                              setSortSubMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                          >
                            <RotateCcw size={16} className="text-teal-600 group-hover:text-white" />
                            Reset Column Width
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-auto bg-white min-h-0">
              <table className="w-full min-w-[1040px] text-left border-collapse">
                <thead className="bg-[#f6f7fb] sticky top-0 z-10 border-b border-[#e6e9f2]">
                  <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
                    <th className="px-4 py-3 w-16 min-w-[64px] bg-[#f6f7fb]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                          title="Customize Columns"
                          onClick={() => setIsCustomizeModalOpen(true)}
                        >
                          <SlidersHorizontal size={13} className="text-[#2563eb]" />
                        </button>
                        <div className="h-5 w-px bg-gray-200" />
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredCoupons.length && filteredCoupons.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-[#3b82f6]"
                        />
                      </div>
                    </th>

                    {visibleColumns.map((col) => (
                      <th key={col.key} className="px-4 py-3 relative group/header bg-[#f6f7fb]" style={{ width: col.width }}>
                        <span className="truncate block">{col.label}</span>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-[2px] cursor-col-resize hover:bg-teal-400/50 group-hover/header:border-r border-gray-100"
                          onMouseDown={(e) => startResizing(col.key, e)}
                        />
                      </th>
                    ))}

                    <th className="px-4 py-3 w-12 sticky right-0 bg-[#f6f7fb]">
                      <div className="flex items-center justify-center">
                        <Search size={14} className="text-gray-300 cursor-pointer transition-colors hover:opacity-80" />
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.map((coupon) => (
                    <tr
                      key={coupon.id}
                      className="text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6]"
                      onClick={() => setSelectedCouponId(coupon.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 shrink-0" aria-hidden />
                          <span className="h-5 w-px shrink-0 bg-transparent" aria-hidden />
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(coupon.id)}
                            onChange={() => toggleSelectOne(coupon.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-[#3b82f6]"
                          />
                        </div>
                      </td>

                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-4 py-3 truncate whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: col.width, maxWidth: col.width }}>
                          {getCell(coupon, col.key)}
                        </td>
                      ))}

                      <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isCustomizeModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-start justify-center p-4 pt-8 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal size={18} className="text-slate-600" />
                      <h3 className="text-lg font-semibold text-slate-800">Customize Columns</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500 font-medium">
                        {columns.filter((c) => c.visible).length} of {columns.length} Selected
                      </span>
                      <button onClick={() => setIsCustomizeModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                        <X size={18} className="text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border-b border-gray-50">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Columns"
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {columns
                      .filter((c) => c.label.toLowerCase().includes(columnSearch.toLowerCase()))
                      .map((col) => (
                        <div key={col.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <GripVertical size={16} className="text-slate-300" />
                            <input
                              type="checkbox"
                              checked={col.visible}
                              disabled={col.locked}
                              onChange={() => toggleColumn(col.key)}
                              className="cursor-pointer h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                              style={{ accentColor: accentColor }}
                            />
                            <div className="flex items-center gap-2">
                              {col.locked && <Lock size={12} className="text-slate-400" />}
                              <span className={`text-sm font-medium ${col.visible ? 'text-slate-700' : 'text-slate-400'}`}>{col.label}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-slate-50/50">
                    <button onClick={() => setIsCustomizeModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                      Cancel
                    </button>
                    <button
                      onClick={() => setIsCustomizeModalOpen(false)}
                      className="min-w-[88px] cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-6 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
                      style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <NewCouponPage
          onCancel={() => {
            setEditingCouponId(null);
            setView('list');
          }}
          onSave={handleSaveFromNewCoupon}
          initialCoupon={editingCouponId ? records.find((record) => record.id === editingCouponId) || null : null}
        />
      )}
    </div >
  );
};

export default CouponsPage;
