import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Plus,
  MoreHorizontal,
  X,
  Circle,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react';

export type CouponDetailRecord = {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Inactive' | 'Expired';
  value: string;
  product?: string;
  productName?: string;
  redemptionType?: string;
  discountType?: string;
  associatePlans?: string;
  maximumRedemptions?: string;
  createdOn?: string;
};

type DetailTab = 'details' | 'transactions' | 'activity';

type ActivityLogEntry = {
  id: string;
  message: string;
  timestamp: string;
};

const activityStorageKey = (couponId: string) => `coupon_activity_logs_${couponId}`;

const formatActivityTimestamp = (iso: string) => {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const loadActivityLogs = (couponId: string, fallbackMessage: string, createdOn?: string): ActivityLogEntry[] => {
  if (typeof window === 'undefined' || !couponId) return [];
  const seedTimestamp =
    createdOn && !Number.isNaN(new Date(createdOn).getTime())
      ? createdOn
      : new Date().toISOString();
  try {
    const raw = window.localStorage.getItem(activityStorageKey(couponId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter(Boolean)
          .map((entry, index) => ({
            id: String(entry?.id || `coupon-log-${couponId}-${index}`),
            message: String(entry?.message || '').trim(),
            timestamp: String(entry?.timestamp || ''),
          }))
          .filter((entry) => entry.message);
        if (normalized.length > 0) return normalized;
      }
    }
  } catch {
    // ignore
  }

  return [
    {
      id: `coupon-log-${couponId}-seed`,
      message: fallbackMessage,
      timestamp: seedTimestamp,
    },
  ];
};

type CouponDetailProps = {
  coupons: CouponDetailRecord[];
  selectedCouponId: string;
  onSelectCoupon: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onToggleActive: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

const statusTextClass = (status: CouponDetailRecord['status']) => {
  if (status === 'Active') return 'text-[#1b5e6a] font-bold';
  if (status === 'Inactive') return 'text-slate-500';
  return 'text-slate-700';
};

const statusBadgeClass = (status: CouponDetailRecord['status']) => {
  if (status === 'Active') return 'bg-[#1b5e6a] text-white font-bold uppercase tracking-wide';
  if (status === 'Inactive') return 'bg-slate-500 text-white';
  return 'bg-slate-700 text-white';
};

export default function CouponDetail({
  coupons,
  selectedCouponId,
  onSelectCoupon,
  onClose,
  onNew,
  onEdit,
  onToggleActive,
  onClone,
  onDelete,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: CouponDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);

  const selectedCoupon = useMemo(
    () => coupons.find((row) => row.id === selectedCouponId) || coupons[0],
    [coupons, selectedCouponId]
  );

  useEffect(() => {
    if (!selectedCoupon) {
      setActivityLogs([]);
      return;
    }

    const reload = () => {
      setActivityLogs(
        loadActivityLogs(
          selectedCoupon.id,
          `Coupon ${selectedCoupon.name} Added.`,
          selectedCoupon.createdOn
        )
      );
    };

    reload();

    const onActivityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ couponId?: string }>;
      if (!customEvent.detail?.couponId || customEvent.detail.couponId === selectedCoupon.id) {
        reload();
      }
    };

    window.addEventListener('coupon:activity-updated', onActivityUpdate as EventListener);
    return () => {
      window.removeEventListener('coupon:activity-updated', onActivityUpdate as EventListener);
    };
  }, [selectedCoupon?.id, selectedCoupon?.name, selectedCoupon?.createdOn]);

  if (!selectedCoupon) return null;

  const toggleLabel =
    selectedCoupon.status === 'Active' ? 'Mark as Inactive' : 'Mark as Active';

  return (
    <div className="w-full min-h-[calc(100vh-98px)] rounded-lg border border-[#d8deea] bg-[#f5f6fb] shadow-sm overflow-hidden flex">
      <aside className="w-[360px] min-w-[360px] bg-white border-r border-[#d8deea] flex flex-col">
        <div className="h-[66px] flex items-center justify-between px-4 border-b border-[#d8deea]">
          <button className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
            <span>All Coupons</span>
            <ChevronDown size={16} className="text-[#1b5e6a]" />
          </button>

          <div className="flex items-center gap-2">
            {canCreate ? (
              <button
                type="button"
                onClick={onNew}
                className="h-8 w-8 rounded-md text-white flex items-center justify-center transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
              >
                <Plus size={18} />
              </button>
            ) : null}
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {coupons.map((coupon) => (
            <button
              key={coupon.id}
              type="button"
              onClick={() => onSelectCoupon(coupon.id)}
              className={`w-full text-left px-4 py-3 border-b border-[#e7e9f2] transition-colors ${coupon.id === selectedCoupon.id ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300" readOnly />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-900">{coupon.name}</p>
                      <p className="truncate text-[12px] text-slate-500">{coupon.code}</p>
                      <p className={`mt-1 text-[11px] font-medium uppercase ${statusTextClass(coupon.status)}`}>
                        {coupon.status}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[14px] font-semibold text-[#1f2937]">{coupon.value}</p>
                  <p className="text-[12px] text-slate-500">{coupon.redemptionType || '-'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <div className="h-[66px] flex items-center justify-between px-5 border-b border-[#d8deea] bg-white">
          <h2 className="text-[31px] font-semibold text-[#0f172a]">{selectedCoupon.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-red-500 hover:text-red-600"
            title="Close Detail"
          >
            <X size={20} />
          </button>
        </div>

        <div className="h-[40px] border-b border-[#d8deea] bg-[#f7f8fc] px-4 flex items-center gap-3 text-[12px]">
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(selectedCoupon.id)}
                className="text-[#1f2937] hover:text-[#0f172a] inline-flex items-center gap-1"
              >
                <Pencil size={13} />
                Edit
              </button>
              <div className="h-4 w-px bg-[#d1d5db]" />
              <button
                type="button"
                onClick={() => onToggleActive(selectedCoupon.id)}
                className="text-[#1f2937] hover:text-[#0f172a] inline-flex items-center gap-1"
              >
                <Circle size={13} />
                {toggleLabel}
              </button>
              <div className="h-4 w-px bg-[#d1d5db]" />
            </>
          ) : null}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="text-[#1f2937] hover:text-[#0f172a] inline-flex items-center gap-1"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-xl z-[90] p-1">
                {canCreate ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClone(selectedCoupon.id);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-md text-left text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                  >
                    <Copy size={14} className="text-[#3b82f6]" />
                    Clone
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(selectedCoupon.id);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-md text-left text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                  >
                    <Trash2 size={14} className="text-red-500" />
                    Delete
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="rounded-xl border border-[#d8deea] bg-white p-6 relative">
            <span
              className={`absolute -top-2 left-7 px-3 py-1 rounded-sm text-[13px] font-semibold ${statusBadgeClass(
                selectedCoupon.status
              )}`}
            >
              {selectedCoupon.status}
            </span>

            <div className="mt-8 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg border border-[#d8deea] bg-[#f6f8ff] px-4 py-3 min-w-[180px] text-center">
                  <p className="text-[36px] font-semibold text-[#0f172a]">{selectedCoupon.value}</p>
                  <p className="text-[11px] uppercase text-slate-600">Discount</p>
                </div>
                <div>
                  <p className="text-[31px] font-medium text-[#0f172a]">{selectedCoupon.name}</p>
                  <p className="text-[13px] text-slate-600">
                    Redemption Type: {selectedCoupon.redemptionType || '-'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-[#1b5e6a]/40 bg-teal-50/30 px-4 py-3">
                <p className="text-[13px] text-[#1b5e6a] font-bold">
                  CODE: <span className="font-bold text-[#111827] ml-1">{selectedCoupon.code}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#d8deea] bg-white p-6 min-h-[480px]">
            <div className="flex items-center gap-8 border-b border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-3 text-[13px] ${activeTab === 'details'
                  ? 'text-[#1f2937] border-b-2 border-[#3b82f6] font-semibold'
                  : 'text-slate-600'
                  }`}
              >
                Coupon Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`pb-3 text-[13px] ${activeTab === 'transactions'
                  ? 'text-[#1f2937] border-b-2 border-[#3b82f6] font-semibold'
                  : 'text-slate-600'
                  }`}
              >
                Transactions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`pb-3 text-[13px] ${activeTab === 'activity'
                  ? 'text-[#1f2937] border-b-2 border-[#3b82f6] font-semibold'
                  : 'text-slate-600'
                  }`}
              >
                Activity Logs
              </button>
            </div>

            {activeTab === 'details' && (
              <div className="pt-6 grid grid-cols-2 gap-x-16 gap-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between gap-6">
                    <span className="text-[13px] text-[#64748b]">Coupon Name</span>
                    <span className="text-[13px] text-[#0f172a]">{selectedCoupon.name}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[13px] text-[#64748b]">Redemption Type</span>
                    <span className="text-[13px] text-[#0f172a]">{selectedCoupon.redemptionType || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[13px] text-[#64748b]">Product Name</span>
                    <span className="text-[13px] text-[#2563eb]">{(selectedCoupon as any).productName || selectedCoupon.product || '-'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between gap-6">
                    <span className="text-[13px] text-[#64748b]">Coupon Code</span>
                    <span className="text-[13px] text-[#0f172a]">{selectedCoupon.code}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[13px] text-[#64748b]">Maximum Redemptions</span>
                    <span className="text-[13px] text-[#0f172a]">{selectedCoupon.maximumRedemptions || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[13px] text-[#64748b]">Created On</span>
                    <span className="text-[13px] text-[#0f172a]">{selectedCoupon.createdOn || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[14px] font-semibold text-slate-800">Transactions</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-100">
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Availed On</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice Number</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Name</th>
                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discount Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Placeholder for future transaction rows */}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative mb-6">
                    <div className="relative w-24 h-24 flex items-center justify-center bg-gray-50 rounded-full">
                      <svg width="48" height="43" viewBox="0 0 48 43" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 8C4 5.79086 5.79086 4 8 4H18.5C19.3284 4 20 4.67157 20 5.5V7H40C42.2091 7 44 8.79086 44 11V35C44 37.2091 42.2091 39 40 39H8C5.79086 39 4 37.2091 4 35V8Z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
                        <path d="M8 12C8 9.79086 9.79086 8 12 8H44V31C44 33.2091 42.2091 35 40 35H12C9.79086 35 8 33.2091 8 31V12Z" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
                        <rect x="14" y="16" width="24" height="4" rx="2" fill="#DBEAFE" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[14px] text-gray-400 font-medium">No Events found</p>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="pt-6">
                {activityLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                      <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M8 10C8 8.34315 9.34315 7 11 7H18.5C19.3284 7 20 7.67157 20 8.5V10H37C39.2091 10 41 11.7909 41 14V36C41 38.2091 39.2091 40 37 40H11C8.79086 40 7 38.2091 7 36V11C7 10.4477 7.44772 10 8 10Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path d="M14 10V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M34 10V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="text-[14px] font-medium">No activity logs yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="grid grid-cols-[220px_1fr] gap-6 px-2 py-4">
                        <div className="text-[13px] text-slate-500 whitespace-nowrap">
                          {formatActivityTimestamp(log.timestamp)}
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-500">
                            i
                          </div>
                          <div className="text-[13px] leading-6 text-slate-800">{log.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
