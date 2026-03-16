import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Info, ChevronDown, Search, Check, PlusCircle, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { useOrganizationBranding } from '../../../hooks/useOrganizationBranding';
import { useCurrency } from '../../../hooks/useCurrency';
import NewProductModal from '../plans/newProduct/NewProductModal';
import SearchableDropdown from '../../../components/ui/SearchableDropdown';
import MultiSelectDropdown from '../../../components/ui/MultiSelectDropdown';
import type { CouponRecord } from './types';
import { createCoupon, updateCoupon } from './storage';

type CouponPayload = {
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
  selectedPlans?: string[];
  selectedAddons?: string[];
};

type NewCouponPageProps = {
  onCancel?: () => void;
  onClose?: () => void;
  onSave?: (coupon: CouponPayload) => void;
  initialCoupon?: CouponRecord | null;
};

const PRODUCTS_STORAGE_KEY = "inv_products_v1";
const PLANS_STORAGE_KEY = "inv_plans_v1";
const ADDONS_STORAGE_KEY = "inv_addons_v1";

type DropdownOption = {
  value: string;
  label: string;
};

const findProductOption = (input: string, options: DropdownOption[]) => {
  const key = String(input || "").trim().toLowerCase();
  if (!key) return null;
  return (
    options.find((option) => String(option.value).trim().toLowerCase() === key) ||
    options.find((option) => String(option.label).trim().toLowerCase() === key) ||
    null
  );
};

// The local definition of SearchableDropdown and its props are removed,
// as the component is now imported from '../../../components/ui/SearchableDropdown'.
// The MultiSelectPlansDropdown component is also removed, assuming it's also a shared component
// or will be moved elsewhere.

// MultiSelectPlansDropdown is replaced by shared MultiSelectDropdown component

const FormRow: React.FC<{
  label: string;
  children: React.ReactNode;
  required?: boolean;
  info?: boolean;
}> = ({ label, children, required, info }) => (
  <div className="grid grid-cols-[160px_1fr_24px] items-center gap-4">
    <label className={`text-[12px] font-medium leading-tight ${required ? 'text-[#e54b4b]' : 'text-gray-500'}`}>
      {label}
    </label>
    <div className="w-full">{children}</div>
    <div className="flex justify-center">{info && <Info size={14} className="cursor-help text-gray-300" />}</div>
  </div>
);

const CustomDatePicker = ({
  value,
  onChange,
  placeholder,
  accentColor,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  accentColor: string;
}) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentYear, currentMonth);
    const firstDay = startDayOfMonth(currentYear, currentMonth);
    const prevMonthDays = daysInMonth(currentYear, currentMonth - 1);

    // Monday start
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = startOffset - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="p-2 text-center text-[13px] text-gray-300">
          {prevMonthDays - i}
        </div>
      );
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isPast = date < today;
      const isSelected = value === date.toLocaleDateString();
      const isToday = date.getTime() === today.getTime();

      days.push(
        <button
          key={day}
          type="button"
          disabled={isPast}
          onClick={() => {
            onChange(date.toLocaleDateString());
            setOpen(false);
          }}
          className={`relative p-2 text-center text-[13px] transition-all
            ${isPast ? 'text-gray-200 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'}
            ${isSelected ? 'border border-[#f59e0b] rounded-sm font-semibold text-[#f59e0b]' : ''}
            ${isToday && !isSelected ? 'text-[#f59e0b] font-bold' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(
        <div key={`next-${i}`} className="p-2 text-center text-[13px] text-gray-300">
          {i}
        </div>
      );
    }
    return days;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          readOnly
          value={value}
          onClick={() => setOpen(!open)}
          placeholder={placeholder}
          className="w-full h-[38px] rounded-md border border-gray-300 px-3 text-[14px] outline-none transition-all cursor-pointer focus:border-blue-400 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.2)] placeholder:italic placeholder:text-gray-400"
        />
        <ChevronDown size={16} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute left-0 bottom-full z-[145] mb-2 w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-4 px-1">
            <h4 className="text-[14px] font-semibold text-gray-700">{monthName} {currentYear}</h4>
            <div className="flex items-center gap-1">
              <button type="button" onClick={handlePrevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <ChevronDown size={14} className="rotate-90" />
              </button>
              <button type="button" onClick={handleNextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-[#e54b4b] uppercase py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">{renderDays()}</div>
        </div>
      )}
    </div>
  );
};

const NewCouponPage: React.FC<NewCouponPageProps> = ({ onCancel, onClose, onSave, initialCoupon }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productPrefill = String(searchParams.get('product') || '').trim();
  const { accentColor } = useOrganizationBranding();
  const { baseCurrency } = useCurrency();

  const [form, setForm] = useState({
    name: '',
    code: '',
    productId: '',
    discountValue: '',
    discountType: 'Flat',
    redemptionType: 'One-Time',
    associatePlans: 'All Plans',
    associateAddons: 'All Addons',
    expirationDate: '',
    maxRedemptions: '',
    cycles: '',
    selectedPlans: [] as string[],
    selectedAddons: [] as string[],
  });

  const [products, setProducts] = useState<DropdownOption[]>([]);
  const [plans, setPlans] = useState<string[]>([]);
  const [addons, setAddons] = useState<string[]>([]);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const isEditMode = Boolean(initialCoupon);

  const fetchProducts = () => {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      if (Array.isArray(rows)) {
        const activeProducts: DropdownOption[] = rows
          .filter(p => (p.status || 'Active').toLowerCase() === 'active')
          .map(p => ({
            value: String(p.id || p._id || p.name || '').trim(),
            label: String(p.name || p.displayName || p.product || '').trim(),
          }))
          .filter((option) => option.value && option.label);

        if (productPrefill) {
          const prefillKey = productPrefill.toLowerCase();
          const hasPrefill = activeProducts.some(
            (option) =>
              String(option.value).toLowerCase() === prefillKey ||
              String(option.label).toLowerCase() === prefillKey
          );
          if (!hasPrefill) {
            activeProducts.unshift({ value: productPrefill, label: productPrefill });
          }
        }
        setProducts(activeProducts);
      }
    } catch (err) {
      console.error("Failed to load products", err);
    }
  };

  const fetchPlans = () => {
    try {
      const raw = localStorage.getItem(PLANS_STORAGE_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      if (Array.isArray(rows)) {
        const names = Array.from(new Set(rows.map((row: any) => String(row?.planName || row?.name || row?.plan || '').trim()).filter(Boolean)));
        setPlans(names);
      }
    } catch (err) {
      console.error("Failed to load plans", err);
    }
  };

  const fetchAddons = () => {
    try {
      const raw = localStorage.getItem(ADDONS_STORAGE_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      if (Array.isArray(rows)) {
        const names = Array.from(
          new Set(
            rows
              .map((row: any) => String(row?.addonName || row?.name || '').trim())
              .filter(Boolean)
          )
        );
        setAddons(names);
      } else {
        setAddons([]);
      }
    } catch (err) {
      console.error("Failed to load addons", err);
      setAddons([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPlans();
    fetchAddons();
  }, [productPrefill]);

  useEffect(() => {
    if (!initialCoupon) return;

    const associatedPlansRaw = String(initialCoupon.associatedPlans || 'All Plans').trim();
    const knownPlanMode =
      associatedPlansRaw === 'All Plans' ||
      associatedPlansRaw === 'None' ||
      associatedPlansRaw === 'Selected Plans';
    const selectedPlans =
      associatedPlansRaw && !knownPlanMode
        ? associatedPlansRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const associatePlans = selectedPlans.length > 0 ? 'Selected Plans' : associatedPlansRaw || 'All Plans';

    const associatedAddonsRaw = String(initialCoupon.associatedAddons || 'All Addons').trim();
    const knownAddonMode =
      associatedAddonsRaw === 'All Addons' ||
      associatedAddonsRaw === 'All Recurring Addons' ||
      associatedAddonsRaw === 'All One-time Addons' ||
      associatedAddonsRaw === 'None' ||
      associatedAddonsRaw === 'Selected Addons';
    const selectedAddons =
      associatedAddonsRaw && !knownAddonMode
        ? associatedAddonsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const associateAddons = selectedAddons.length > 0 ? 'Selected Addons' : associatedAddonsRaw || 'All Addons';

    setForm((prev) => ({
      ...prev,
      name: initialCoupon.couponName || '',
      code: initialCoupon.couponCode || '',
      productId: initialCoupon.product || '',
      discountValue: String(initialCoupon.discountValue ?? ''),
      discountType: initialCoupon.discountType === 'Percentage' ? '%' : 'Flat',
      redemptionType:
        initialCoupon.redemptionType === 'Limited Cycles'
          ? 'Limited Cycles'
          : initialCoupon.redemptionType === 'Unlimited'
            ? 'Unlimited'
            : 'One-Time',
      associatePlans,
      selectedPlans,
      associateAddons,
      selectedAddons,
      expirationDate: initialCoupon.expirationDate || '',
      maxRedemptions: initialCoupon.maxRedemption > 0 ? String(initialCoupon.maxRedemption) : '',
      cycles: initialCoupon.limitedCycles > 0 ? String(initialCoupon.limitedCycles) : '',
    }));
  }, [initialCoupon]);

  useEffect(() => {
    if (!isEditMode || !initialCoupon) return;
    const currentProduct = String(initialCoupon.product || "").trim();
    if (!currentProduct) return;

    const matched = findProductOption(currentProduct, products);
    if (matched?.value) {
      setForm((prev) => {
        if (String(prev.productId || "") === String(matched.value)) return prev;
        return { ...prev, productId: String(matched.value) };
      });
      return;
    }

    const existsAsRaw = products.some(
      (option) =>
        String(option.value).trim().toLowerCase() === currentProduct.toLowerCase() ||
        String(option.label).trim().toLowerCase() === currentProduct.toLowerCase()
    );
    if (!existsAsRaw) {
      setProducts((prev) => [{ value: currentProduct, label: currentProduct }, ...prev]);
    }

    setForm((prev) => {
      if (String(prev.productId || "") === currentProduct) return prev;
      return { ...prev, productId: currentProduct };
    });
  }, [isEditMode, initialCoupon, products]);

  useEffect(() => {
    if (!productPrefill || isEditMode) return;
    const prefillKey = productPrefill.toLowerCase();
    const matched = findProductOption(productPrefill, products);

    setForm((prev) => {
      const currentValue = String(prev.productId || '').trim();
      const currentKey = currentValue.toLowerCase();
      const currentMatchesOption = products.some(
        (option) => String(option.value).toLowerCase() === currentKey
      );

      if (matched?.value) {
        if (!currentValue || currentKey === prefillKey || !currentMatchesOption) {
          const nextValue = String(matched.value);
          if (nextValue === currentValue) return prev;
          return { ...prev, productId: nextValue };
        }
        return prev;
      }

      if (!currentValue) {
        return { ...prev, productId: productPrefill };
      }

      return prev;
    });
  }, [productPrefill, products, isEditMode]);

  const handleClose = () => {
    if (onCancel) return onCancel();
    if (onClose) return onClose();
    navigate('/products/coupons');
  };

  const handleSave = () => {
    if (form.associatePlans === 'Selected Plans' && form.selectedPlans.length === 0) {
      toast.error('Please select at least one plan.');
      return;
    }
    if (form.associateAddons === 'Selected Addons' && form.selectedAddons.length === 0) {
      toast.error('Please select at least one addon.');
      return;
    }
    const normalizedDiscountType = form.discountType === 'Flat' ? 'Flat' : 'Percentage';
    const associatedPlansValue = form.associatePlans === 'Selected Plans' ? form.selectedPlans.join(', ') : form.associatePlans;
    const associatedAddonsValue = form.associateAddons === 'Selected Addons' ? form.selectedAddons.join(', ') : form.associateAddons;
    if (onSave) {
      onSave({
        name: form.name || 'New Coupon',
        code: form.code || 'CODE',
        status: 'Active',
        value: form.discountValue || '0',
        type: normalizedDiscountType,
        redemption: form.redemptionType,
        productId: form.productId,
        cycles: form.redemptionType === 'Limited Cycles' ? form.cycles : undefined,
        associatePlans: associatedPlansValue || 'All Plans',
        associateAddons: associatedAddonsValue || 'All Addons',
        selectedPlans: form.selectedPlans,
        selectedAddons: form.selectedAddons,
      });
      handleClose();
      return;
    }

    const numeric = Number(String(form.discountValue || '').replace(/[^0-9.-]/g, ''));
    const selectedProductLabel = products.find((option) => String(option.value) === String(form.productId))?.label || form.productId || '';
    const normalizedRedemptionType =
      form.redemptionType === 'Limited Cycles' ? 'Limited Cycles' : form.redemptionType === 'Unlimited' ? 'Unlimited' : 'One Time';

    const payload = {
      product: selectedProductLabel,
      couponName: form.name || 'New Coupon',
      couponCode: (form.code || 'CODE').toUpperCase(),
      discountType: normalizedDiscountType as 'Flat' | 'Percentage',
      discountValue: Number.isFinite(numeric) ? numeric : 0,
      redemptionType: normalizedRedemptionType as 'One Time' | 'Unlimited' | 'Limited Cycles',
      limitedCycles: form.redemptionType === 'Limited Cycles' ? Number(form.cycles || 0) || 0 : 0,
      maxRedemption: Number(form.maxRedemptions || 0) || 0,
      associatedPlans: associatedPlansValue || 'All Plans',
      associatedAddons: associatedAddonsValue || 'All Addons',
      expirationDate: form.expirationDate || '',
      status: 'Active' as const,
    };

    if (isEditMode && initialCoupon?.id) {
      updateCoupon(initialCoupon.id, payload);
      toast.success('Coupon updated successfully');
    } else {
      createCoupon(payload);
      toast.success('Coupon created successfully');
    }

    handleClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-gray-50 font-sans overflow-hidden overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h2 className="text-lg font-semibold text-gray-800">{isEditMode ? 'Edit Coupon' : 'New Coupon'}</h2>
        <button onClick={handleClose} className="text-gray-400 transition-colors hover:text-gray-600"><X size={22} /></button>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-[1200px] space-y-12">
          <div className="grid grid-cols-2 gap-x-16 gap-y-6">
            <FormRow label="Product*" required>
              <SearchableDropdown
                value={form.productId}
                options={products}
                onChange={(val) => setForm(prev => ({ ...prev, productId: val }))}
                placeholder="Select Product"
                accentColor={accentColor}
                addNewLabel="New Product"
                onAddNew={() => setIsNewProductModalOpen(true)}
              />
            </FormRow>
            <div />

            <FormRow label="Coupon Name*" required>
              <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full h-[38px] rounded-md border border-blue-400 bg-white px-3 text-[14px] outline-none shadow-[0_0_0_1px_rgba(96,165,250,0.5)]" />
            </FormRow>

            <FormRow label="Coupon Code*" required info>
              <input type="text" name="code" value={form.code} onChange={handleChange} className="w-full h-[38px] rounded-md border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-blue-400" />
            </FormRow>

            <FormRow label={form.discountType === 'Flat' ? `Discount (${baseCurrency.symbol || 'USD'}) *` : 'Discount *'} required>
              <div className="flex">
                <input type="text" name="discountValue" value={form.discountValue} onChange={handleChange} className="h-[38px] flex-1 rounded-l-md border border-gray-300 border-r-0 px-3 text-[14px] outline-none focus:border-blue-400" />
                <div className="relative w-[96px]">
                  <select name="discountType" value={form.discountType} onChange={handleChange} className="h-[38px] w-full cursor-pointer appearance-none rounded-r-md border border-gray-300 bg-gray-50 px-3 pr-7 text-[14px] outline-none">
                    <option value="%">%</option>
                    <option>Flat</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={14} />
                </div>
              </div>
            </FormRow>

            <FormRow label="Redemption Type*" required info>
              <SearchableDropdown
                value={form.redemptionType}
                options={[{ value: 'One-Time', label: 'One-Time' }, { value: 'Unlimited', label: 'Unlimited' }, { value: 'Limited Cycles', label: 'Limited Cycles' }]}
                onChange={(val) => setForm(prev => ({ ...prev, redemptionType: val }))}
                placeholder="Select Redemption Type"
                accentColor={accentColor}
              />
            </FormRow>

            {form.redemptionType === 'Limited Cycles' && (
              <FormRow label="Number of Cycles*" required info>
                <input type="text" name="cycles" value={form.cycles} onChange={handleChange} placeholder="Enter a number" className="w-full h-[38px] rounded-md border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-blue-400" />
              </FormRow>
            )}
          </div>

          <section className="space-y-6 border-t border-gray-100 pt-8">
            <h3 className="text-base font-semibold text-gray-800">Applicability</h3>
            <div className="grid grid-cols-2 gap-x-16 gap-y-6">
              <FormRow label="Associate Plans*" required>
                <SearchableDropdown
                  value={form.associatePlans}
                  options={[{ value: 'All Plans', label: 'All Plans' }, { value: 'None', label: 'None' }, { value: 'Selected Plans', label: 'Selected Plans' }]}
                  onChange={(v) => setForm(prev => ({ ...prev, associatePlans: v, selectedPlans: v === 'Selected Plans' ? prev.selectedPlans : [] }))}
                  placeholder="All Plans"
                  accentColor={accentColor}
                />
              </FormRow>
              <div />
              {form.associatePlans === 'Selected Plans' && (
                <FormRow label="Select Plans*" required>
                  <MultiSelectDropdown values={form.selectedPlans} options={plans} onChange={(vals) => setForm(prev => ({ ...prev, selectedPlans: vals }))} placeholder="Choose Plans" />
                </FormRow>
              )}
              {form.associatePlans === 'Selected Plans' && <div />}
              <FormRow label="Associate Addons*" required>
                <SearchableDropdown
                  value={form.associateAddons}
                  options={[
                    { value: 'All Addons', label: 'All Addons' },
                    { value: 'All Recurring Addons', label: 'All Recurring Addons' },
                    { value: 'All One-time Addons', label: 'All One-time Addons' },
                    { value: 'None', label: 'None' },
                    { value: 'Selected Addons', label: 'Selected Addons' },
                  ]}
                  onChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      associateAddons: v,
                      selectedAddons: v === 'Selected Addons' ? prev.selectedAddons : [],
                    }))
                  }
                  placeholder="All Addons"
                  accentColor={accentColor}
                  openDirection="up"
                />
              </FormRow>
              {form.associateAddons === 'Selected Addons' && (
                <FormRow label="Select Addons*" required>
                  <MultiSelectDropdown
                    values={form.selectedAddons}
                    options={addons}
                    onChange={(vals) => setForm(prev => ({ ...prev, selectedAddons: vals }))}
                    placeholder="Choose Addons"
                  />
                </FormRow>
              )}
              {form.associateAddons === 'Selected Addons' && <div />}
            </div>
          </section>

          <section className="space-y-6 border-t border-gray-100 pt-8">
            <h3 className="text-base font-semibold text-gray-800">Validity</h3>
            <div className="grid grid-cols-2 gap-x-16 gap-y-6 text-gray-500">
              <FormRow label="Expiration Date">
                <CustomDatePicker value={form.expirationDate} onChange={(v) => setForm(prev => ({ ...prev, expirationDate: v }))} placeholder="Click or Type to select" accentColor={accentColor} />
              </FormRow>
              <FormRow label="Maximum Redemptions" info>
                <input type="text" name="maxRedemptions" value={form.maxRedemptions} onChange={handleChange} placeholder="Enter a number" className="w-full h-[38px] rounded-md border border-gray-300 px-3 text-[14px] italic outline-none focus:border-blue-400" />
              </FormRow>
            </div>
          </section>
        </div>
      </main>

      <footer className="flex gap-3 border-t border-gray-200 bg-transparent px-8 py-4">
        <button
          onClick={handleSave}
          className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-6 py-2 text-sm font-medium text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
          style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
        >
          {isEditMode ? 'Update' : 'Save'}
        </button>
        <button onClick={handleClose} className="rounded border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">Cancel</button>
      </footer>

      <NewProductModal isOpen={isNewProductModalOpen} onClose={() => setIsNewProductModalOpen(false)} onSaveSuccess={fetchProducts} />
    </div>
  );
};

export default NewCouponPage;
