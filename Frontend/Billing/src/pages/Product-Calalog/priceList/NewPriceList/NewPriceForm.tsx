import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    X,
    ChevronDown,
    CheckCircle2,
    HelpCircle,
    Search,
    Settings,
    Info,
    Download,
    Upload,
    FileText,
    PlusCircle,
    Layout,
    Box,
    ChevronUp
} from 'lucide-react';
import { useCurrency } from '../../../../hooks/useCurrency';
import { useOrganizationBranding } from '../../../../hooks/useOrganizationBranding';
import SearchableDropdown from '../../../../components/ui/SearchableDropdown';
import { toast } from 'react-toastify';

interface NewPriceFormProps {
    onClose: () => void;
    editData?: any;
}

const roundingExamples = [
    { label: 'Nearest whole number', input: '10.40', rounded: '10.00' },
    { label: 'Nearest whole number', input: '10.50', rounded: '11.00' },
    { label: '0.99', input: '10.12', rounded: '10.99' },
    { label: '0.50', input: '10.12', rounded: '10.50' },
    { label: '0.49', input: '10.12', rounded: '10.49' },
    { label: '0.50', input: '10.65', rounded: '11.50' },
];

export default function NewPriceForm({ onClose, editData }: NewPriceFormProps) {
    const { baseCurrency } = useCurrency();
    const { accentColor } = useOrganizationBranding();

    const [priceType, setPriceType] = useState<'all' | 'individual'>('all');
    const [activeTab, setActiveTab] = useState<'products' | 'items'>('items');
    const [markupType, setMarkupType] = useState<'Markup' | 'Markdown'>('Markup');
    const [showMarkupDropdown, setShowMarkupDropdown] = useState(false);
    const [roundOffTo, setRoundOffTo] = useState('Never mind');
    const [decimalPlaces, setDecimalPlaces] = useState('1');
    const [showRoundingExamples, setShowRoundingExamples] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [includeDiscount, setIncludeDiscount] = useState(false);
    const [pricingScheme, setPricingScheme] = useState<'Unit' | 'Volume'>('Unit');
    const [importPriceList, setImportPriceList] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [markupPercentage, setMarkupPercentage] = useState('1');
    const [currency, setCurrency] = useState('');
    const [currencies, setCurrencies] = useState<any[]>([]);

    // Modal state
    const [bulkUpdateRule, setBulkUpdateRule] = useState<'Markup' | 'Markdown'>('Markdown');
    const [bulkUpdateValue, setBulkUpdateValue] = useState('');
    const [bulkUpdateUnit, setBulkUpdateUnit] = useState<'%' | 'currency'>('%');
    const [bulkDiscountValue, setBulkDiscountValue] = useState('');

    const markupRef = useRef<HTMLDivElement>(null);
    const bulkUnitRef = useRef<HTMLDivElement>(null);
    const bulkRuleRef = useRef<HTMLDivElement>(null);
    const addProductRef = useRef<HTMLDivElement>(null);
    const [showBulkRuleDropdown, setShowBulkRuleDropdown] = useState(false);
    const [showBulkUnitDropdown, setShowBulkUnitDropdown] = useState(false);
    const [showAddProductDropdown, setShowAddProductDropdown] = useState(false);
    const [addProductSearch, setAddProductSearch] = useState('');

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (markupRef.current && !markupRef.current.contains(e.target as Node)) {
                setShowMarkupDropdown(false);
            }
            if (bulkRuleRef.current && !bulkRuleRef.current.contains(e.target as Node)) {
                setShowBulkRuleDropdown(false);
            }
            if (bulkUnitRef.current && !bulkUnitRef.current.contains(e.target as Node)) {
                setShowBulkUnitDropdown(false);
            }
            if (addProductRef.current && !addProductRef.current.contains(e.target as Node)) {
                setShowAddProductDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadData = () => {
            // Load Items
            const rawItems = localStorage.getItem('inv_items_v1');
            const loadedItems = rawItems ? JSON.parse(rawItems) : [];
            if (loadedItems.length === 0) {
                setItems([{ id: 'item-sample', name: 'mohamed', sku: 'sdv', salesRate: 11.00, status: 'Active', customRate: '', discount: '' }]);
            } else {
                const normalized = loadedItems
                    .filter((i: any) => i?.status === 'Active')
                    .map((row: any, idx: number) => {
                        const id = String(row?.id || row?._id || `item-${idx}`);
                        const name = String(row?.name || row?.itemName || '').trim();
                        const sku = String(row?.sku || '').trim();
                        const salesRate = Number(row?.sellingPrice ?? row?.rate ?? row?.salesRate ?? 0) || 0;
                        return { ...row, id, name, sku, salesRate, customRate: '', discount: '' };
                    })
                    .filter((row: any) => row?.name);
                setItems(normalized);
            }

            const rawProducts = localStorage.getItem('inv_products_v1');
            const productRows = rawProducts ? JSON.parse(rawProducts) : [];
            const rawPlans = localStorage.getItem('inv_plans_v1');
            const planRows = rawPlans ? JSON.parse(rawPlans) : [];
            const rawAddons = localStorage.getItem('inv_addons_v1');
            const addonRows = rawAddons ? JSON.parse(rawAddons) : [];

            const normalize = (value: any) => String(value || '').trim().toLowerCase();

            const mappedProducts = (productRows || [])
                .map((row: any, idx: number) => ({
                    id: String(row?.id || row?._id || `prod-${idx}`),
                    name: String(row?.name || row?.productName || row?.product || '').trim(),
                    plans: [] as any[],
                    addons: [] as any[]
                }))
                .filter((row: any) => row.name);

            const planByProduct = (planRows || []).reduce((acc: any, row: any) => {
                const productId = String(row?.productId || row?.product_id || row?.product?._id || row?.product?.id || '');
                const productName = String(row?.productName || row?.product?.name || row?.product || '');
                const key = productId || productName;
                if (!key) return acc;
                acc[key] = acc[key] || [];
                acc[key].push({
                    id: String(row?.id || row?._id || ''),
                    name: String(row?.planName || row?.name || '').trim(),
                    setupFee: Number(row?.setupFee || row?.setup_fee || 0) || 0,
                    price: Number(row?.price || row?.rate || 0) || 0,
                    priceListRate: ""
                });
                return acc;
            }, {});

            const addonByProduct = (addonRows || []).reduce((acc: any, row: any) => {
                const productId = String(row?.productId || row?.product_id || row?.product?._id || row?.product?.id || '');
                const productName = String(row?.productName || row?.product?.name || row?.product || '');
                const key = productId || productName;
                if (!key) return acc;
                acc[key] = acc[key] || [];
                acc[key].push({
                    id: String(row?.id || row?._id || ''),
                    name: String(row?.addonName || row?.name || '').trim(),
                    price: Number(row?.price || row?.rate || row?.recurringPrice || 0) || 0,
                    priceListRate: ""
                });
                return acc;
            }, {});

            const mergedProducts = mappedProducts.map((prod: any) => {
                const plans =
                    planByProduct[prod.id] ||
                    planByProduct[prod.name] ||
                    planByProduct[normalize(prod.id)] ||
                    planByProduct[normalize(prod.name)] ||
                    [];
                const addons =
                    addonByProduct[prod.id] ||
                    addonByProduct[prod.name] ||
                    addonByProduct[normalize(prod.id)] ||
                    addonByProduct[normalize(prod.name)] ||
                    [];
                return { ...prod, plans, addons };
            });

            setAllProducts(mergedProducts);
            const initialProducts = mergedProducts.slice(0, 1);
            setProducts(initialProducts);
            setExpandedProducts(initialProducts.map((p: any) => p.id));
        };

        // Load Currencies
        const rawCurrencies = localStorage.getItem('taban_currencies');
        if (rawCurrencies) {
            const parsed = JSON.parse(rawCurrencies);
            setCurrencies(parsed);
            const base = parsed.find((c: any) => c.isBase);
            if (base) {
                setCurrency(base.code);
            }
        } else if (baseCurrency.code) {
            setCurrency(baseCurrency.code);
            setCurrencies([{ code: baseCurrency.code, name: baseCurrency.name, isBase: true }]);
        }

        loadData();
    }, [baseCurrency]);

    const itemRatesHydratedRef = useRef(false);

    useEffect(() => {
        if (editData) {
            setName(editData.name || '');
            setDescription(editData.description || '');
            setPriceType(editData.priceListType?.toLowerCase() === 'sales' || editData.priceListType?.toLowerCase() === 'all' ? 'all' : 'individual');
            setCurrency(editData.currency || '');
            setPricingScheme(editData.pricingScheme === 'Volume Pricing' || editData.pricingScheme === 'Volume' ? 'Volume' : 'Unit');
            setIncludeDiscount(editData.discountEnabled === 'Yes' || editData.discountEnabled === true);
            setMarkupType(editData.markupType || 'Markup');
            setMarkupPercentage(editData.markup?.replace('%', '') || '1');

            if (editData.roundOffTo?.includes('Decimal Places')) {
                setRoundOffTo('Decimal Places');
                setDecimalPlaces(editData.roundOffTo.split(' ')[0]);
            } else {
                setRoundOffTo(editData.roundOffTo || 'Never mind');
            }
            if (Array.isArray(editData.productRates)) {
                setProducts(prev =>
                    prev.map((prod: any) => {
                        const match = editData.productRates.find((row: any) => String(row.productId) === String(prod.id) || String(row.productName || '').trim() === String(prod.name || '').trim());
                        if (!match) return prod;
                        const plans = (prod.plans || []).map((plan: any) => {
                            const planMatch = (match.plans || []).find((p: any) =>
                                String(p.planId || p.id || '') === String(plan.id) ||
                                String(p.name || '').trim() === String(plan.name || '').trim()
                            );
                            return planMatch ? { ...plan, priceListRate: String(planMatch.rate ?? planMatch.price ?? "") } : plan;
                        });
                        const addons = (prod.addons || []).map((addon: any) => {
                            const addonMatch = (match.addons || []).find((a: any) =>
                                String(a.addonId || a.id || '') === String(addon.id) ||
                                String(a.name || '').trim() === String(addon.name || '').trim()
                            );
                            return addonMatch ? { ...addon, priceListRate: String(addonMatch.rate ?? addonMatch.price ?? "") } : addon;
                        });
                        return { ...prod, plans, addons };
                    })
                );
            }
        }
    }, [editData]);

    useEffect(() => {
        if (!editData) return;
        if (itemRatesHydratedRef.current) return;
        if (!items.length) return;
        if (!Array.isArray(editData.itemRates)) return;

        const byId = new Map<string, any>(
            editData.itemRates.map((r: any) => [String(r?.itemId || r?.id || ''), r])
        );

        setItems(prev =>
            prev.map((it: any, idx: number) => {
                const id = String(it?.id || it?._id || `item-${idx}`);
                const match = byId.get(id);
                if (!match) return it;
                const rateValue = match?.rate ?? match?.customRate ?? '';
                const discountValue = match?.discount ?? '';
                return {
                    ...it,
                    id,
                    customRate: rateValue === null || rateValue === undefined ? '' : String(rateValue),
                    discount: discountValue === null || discountValue === undefined ? '' : String(discountValue),
                };
            })
        );

        itemRatesHydratedRef.current = true;
    }, [editData, items.length]);

    const toggleProductExpansion = (id: string) => {
        setExpandedProducts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const removeProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const availableProducts = useMemo(() => {
        const selectedIds = new Set(products.map((p: any) => String(p.id)));
        const term = addProductSearch.trim().toLowerCase();
        return allProducts.filter((p: any) => {
            if (selectedIds.has(String(p.id))) return false;
            if (!term) return true;
            return String(p.name || '').toLowerCase().includes(term);
        });
    }, [allProducts, products, addProductSearch]);

    const handleAddProduct = (product: any) => {
        setProducts(prev => [...prev, product]);
        setExpandedProducts(prev => [...prev, product.id]);
        setShowAddProductDropdown(false);
        setAddProductSearch('');
    };

    const updatePlanRate = (productId: string, planId: string, value: string) => {
        setProducts(prev =>
            prev.map(prod => {
                if (prod.id !== productId) return prod;
                const plans = (prod.plans || []).map((plan: any) =>
                    String(plan.id) === String(planId)
                        ? { ...plan, priceListRate: value }
                        : plan
                );
                return { ...prod, plans };
            })
        );
    };

    const updateAddonRate = (productId: string, addonId: string, value: string) => {
        setProducts(prev =>
            prev.map(prod => {
                if (prod.id !== productId) return prod;
                const addons = (prod.addons || []).map((addon: any) =>
                    String(addon.id) === String(addonId)
                        ? { ...addon, priceListRate: value }
                        : addon
                );
                return { ...prod, addons };
            })
        );
    };

    const toggleSelectAll = () => {
        if (selectedItemIds.length === items.length) {
            setSelectedItemIds([]);
        } else {
            setSelectedItemIds(items.map((_, idx) => String(idx)));
        }
    };

    const toggleSelectItem = (id: string) => {
        setSelectedItemIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        try {
            const raw = localStorage.getItem('inv_price_lists_v1');
            const currentLists = raw ? JSON.parse(raw) : [];

            const itemRates = (items || [])
                .map((it: any, idx: number) => {
                    const id = String(it?.id || it?._id || `item-${idx}`);
                    const itemName = String(it?.name || '').trim();
                    const sku = String(it?.sku || '').trim();
                    const rate = it?.customRate !== "" ? Number(it.customRate) : null;
                    const discount = it?.discount !== "" ? Number(it.discount) : null;
                    return { itemId: id, itemName, sku, rate: Number.isFinite(rate as any) ? rate : null, discount: Number.isFinite(discount as any) ? discount : null };
                })
                .filter((r: any) => r.itemId && r.itemName && (r.rate !== null || r.discount !== null));

            const productRates = products.map((prod: any) => ({
                productId: prod.id,
                productName: prod.name,
                plans: (prod.plans || []).map((plan: any) => ({
                    planId: plan.id,
                    name: plan.name,
                    rate: plan.priceListRate !== "" ? Number(plan.priceListRate) : null
                })),
                addons: (prod.addons || []).map((addon: any) => ({
                    addonId: addon.id,
                    name: addon.name,
                    rate: addon.priceListRate !== "" ? Number(addon.priceListRate) : null
                }))
            }));

            const newList = {
                id: editData ? editData.id : `pl-${Date.now()}`,
                name: name,
                description: description,
                status: editData ? editData.status : 'Active',
                currency: currency || baseCurrency.code,
                priceListType: priceType === 'all' ? 'Sales' : 'Individual',
                pricingScheme: pricingScheme,
                discountEnabled: includeDiscount,
                roundOffTo: roundOffTo === 'Decimal Places' ? `${decimalPlaces} Decimal Places` : roundOffTo,
                markup: `${markupPercentage}%`,
                markupType: markupType,
                itemRates,
                productRates,
                createdOn: editData ? editData.createdOn : new Date().toISOString(),
                createdAt: editData ? (editData.createdAt || editData.createdOn) : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            let updatedLists;
            if (editData) {
                updatedLists = currentLists.map((item: any) =>
                    (String(item.id || item._id) === String(editData.id)) ? newList : item
                );
            } else {
                updatedLists = [newList, ...currentLists];
            }
            localStorage.setItem('inv_price_lists_v1', JSON.stringify(updatedLists));

            toast.success(editData ? 'Price list updated successfully' : 'Price list saved successfully');
            onClose();
        } catch (error) {
            console.error('Error saving price list:', error);
            toast.error('Failed to save price list');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white relative">
            {/* Modal Overlay */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 bg-black/40 animate-in fade-in duration-200">
                    <div className="bg-white w-[640px] rounded-lg shadow-2xl overflow-hidden border border-gray-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-[17px] font-bold text-gray-800">Update Rates in Bulk</h3>
                            <button onClick={() => setIsBulkModalOpen(false)} className="text-red-500 hover:scale-110 transition-transform">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4">
                                <label className="text-[13px] text-gray-800 w-140 shrink-0">Bulk Update Rule</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative" ref={bulkRuleRef}>
                                        <button
                                            onClick={() => setShowBulkRuleDropdown(!showBulkRuleDropdown)}
                                            className="w-[160px] h-9 flex items-center justify-between px-3 border border-gray-300 rounded text-[13px] bg-white hover:border-blue-400 transition-colors"
                                        >
                                            {bulkUpdateRule} <ChevronDown size={14} className={`text-gray-400 transition-transform ${showBulkRuleDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showBulkRuleDropdown && (
                                            <div className="absolute top-full left-0 mt-1 w-[180px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                                                <div className="px-2 py-1.5 border-b border-gray-50">
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input type="text" placeholder="Search" className="w-full h-8 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded text-[12px] outline-none" />
                                                    </div>
                                                </div>
                                                {['Markup', 'Markdown'].map(rule => (
                                                    <button
                                                        key={rule}
                                                        onClick={() => {
                                                            setBulkUpdateRule(rule as any);
                                                            setShowBulkRuleDropdown(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-4 py-2 text-[13px] hover:bg-blue-50 transition-colors ${bulkUpdateRule === rule ? 'text-blue-600 bg-blue-50/50 font-medium' : 'text-gray-700'}`}
                                                    >
                                                        {rule} {bulkUpdateRule === rule && <CheckCircle2 size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-[160px] h-9 flex items-center px-3 border border-gray-300 rounded text-[13px] text-gray-600 bg-white">
                                        Sales Rate
                                    </div>
                                    <span className="text-[13px] text-gray-500 lowercase">by</span>
                                    <div className="flex items-center">
                                        <input
                                            type="text"
                                            value={bulkUpdateValue}
                                            onChange={(e) => setBulkUpdateValue(e.target.value)}
                                            className="w-[100px] h-9 border border-gray-300 border-r-0 rounded-l px-3 text-[13px] outline-none focus:border-blue-400"
                                        />
                                        <div className="relative h-9" ref={bulkUnitRef}>
                                            <button
                                                onClick={() => setShowBulkUnitDropdown(!showBulkUnitDropdown)}
                                                className="h-full flex items-center gap-1.5 px-3 border border-gray-300 rounded-r text-[13px] bg-[#f9fafb] hover:bg-gray-50 border-l-0"
                                            >
                                                {bulkUpdateUnit === '%' ? '%' : currency || baseCurrency.code} <ChevronDown size={12} className="text-gray-400" />
                                            </button>
                                            {showBulkUnitDropdown && (
                                                <div className="absolute top-full right-0 mt-1 w-[80px] bg-white border border-gray-200 rounded-lg shadow-xl z-[60] py-1 overflow-hidden">
                                                    <button onClick={() => { setBulkUpdateUnit('%'); setShowBulkUnitDropdown(false); }} className={`w-full px-4 py-2 text-[13px] text-center transition-colors ${bulkUpdateUnit === '%' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>%</button>
                                                    <button onClick={() => { setBulkUpdateUnit('currency'); setShowBulkUnitDropdown(false); }} className={`w-full px-4 py-2 text-[13px] text-center transition-colors ${bulkUpdateUnit === 'currency' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>{currency || baseCurrency.code}</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="text-[13px] text-gray-800 w-140 shrink-0">Discount (%)</label>
                                <div className="flex items-center shadow-sm">
                                    <input
                                        type="text"
                                        value={bulkDiscountValue}
                                        onChange={(e) => setBulkDiscountValue(e.target.value)}
                                        className="w-[120px] h-9 border border-gray-300 border-r-0 rounded-l px-3 text-[13px] outline-none focus:border-blue-400"
                                    />
                                    <div className="h-9 flex items-center px-4 border border-gray-300 rounded-r bg-white text-[13px] text-gray-400">
                                        %
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-6 flex items-center gap-3">
                            <button
                                className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-5 py-2 text-[13px] font-bold text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
                                style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                            >
                                Update
                            </button>
                            <button onClick={() => setIsBulkModalOpen(false)} className="bg-white text-gray-700 px-5 py-2 rounded-md text-[13px] font-bold border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 shrink-0">
                <h2 className="text-lg font-bold">{editData ? 'Edit Price List' : 'New Price List'}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 font-sans text-[#404040]">
                <div className="max-w-5xl space-y-8">
                    <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                        <label className="text-[13px] text-[#ef4444] font-medium">Name*</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-[420px] h-[36px] px-3 rounded border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[13px] transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-[160px_1fr] gap-4">
                        <label className="text-[13px] text-gray-600 mt-2 font-medium">Price List Type</label>
                        <div className="flex gap-4">
                            <div
                                onClick={() => setPriceType('all')}
                                className={`w-[290px] p-4 border rounded-md cursor-pointer flex gap-3 transition-all ${priceType === 'all' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'}`}
                            >
                                <div className="mt-1">
                                    {priceType === 'all' ? <CheckCircle2 size={18} className="text-blue-600" /> : <div className="w-[18px] h-[18px] border-2 border-gray-200 rounded-full" />}
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold">All Items</p>
                                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Mark up or mark down the rates of all items</p>
                                </div>
                            </div>

                            <div
                                onClick={() => setPriceType('individual')}
                                className={`w-[290px] p-4 border rounded-md cursor-pointer flex gap-3 transition-all ${priceType === 'individual' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'}`}
                            >
                                <div className="mt-1">
                                    {priceType === 'individual' ? <CheckCircle2 size={18} className="text-blue-600" /> : <div className="w-[18px] h-[18px] border-2 border-gray-200 rounded-full" />}
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold">Individual Items</p>
                                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Customize the rate of each item</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[160px_1fr] gap-4">
                        <label className="text-[13px] text-gray-600 mt-1 font-medium">Description</label>
                        <textarea
                            placeholder="Enter the description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-[450px] h-20 border border-gray-300 rounded p-3 text-[13px] outline-none resize-none focus:ring-1 focus:ring-blue-500/20"
                        />
                    </div>

                    {priceType === 'individual' ? (
                        <div className="space-y-7 pt-2 animate-in fade-in duration-300">
                            <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                                <label className="text-[13px] text-gray-600 font-medium">Currency</label>
                                <div className="relative w-[420px]">
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="w-full h-9 appearance-none border border-gray-300 rounded px-3 text-[13px] bg-white outline-none"
                                    >
                                        {currencies.length > 0 ? (
                                            currencies.map(c => (
                                                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                            ))
                                        ) : (
                                            <option value={baseCurrency.code}>{baseCurrency.code} - {baseCurrency.name}</option>
                                        )}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>

                            <div className="flex gap-8 border-b border-gray-200 mt-6 shrink-0">
                                <button onClick={() => setActiveTab('products')} className={`pb-2 text-[13px] px-1 font-medium transition-colors ${activeTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Products</button>
                                <button onClick={() => setActiveTab('items')} className={`pb-2 text-[13px] px-1 font-medium transition-colors ${activeTab === 'items' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Items</button>
                            </div>

                            <div className="bg-white border-x border-b border-gray-100 p-8 space-y-8 animate-in fade-in duration-500">
                                {activeTab === 'items' && (
                                    <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                                        <label className="text-[13px] text-gray-600 font-medium">Pricing Scheme</label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 text-[13px] cursor-pointer group">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${pricingScheme === 'Unit' ? 'border-blue-500 bg-blue-500' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                                    {pricingScheme === 'Unit' && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    className="hidden"
                                                    name="pricingScheme"
                                                    checked={pricingScheme === 'Unit'}
                                                    onChange={() => setPricingScheme('Unit')}
                                                />
                                                Unit Pricing
                                            </label>
                                            <label className="flex items-center gap-2 text-[13px] cursor-pointer group">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${pricingScheme === 'Volume' ? 'border-blue-500 bg-blue-500' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                                    {pricingScheme === 'Volume' && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    className="hidden"
                                                    name="pricingScheme"
                                                    checked={pricingScheme === 'Volume'}
                                                    onChange={() => setPricingScheme('Volume')}
                                                />
                                                Volume Pricing
                                            </label>
                                            <HelpCircle size={14} className="text-gray-400 cursor-help hover:text-blue-500 transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'items' && (
                                    <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                                        <label className="text-[13px] text-gray-600 font-medium">Discount</label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-blue-600 rounded"
                                                    checked={includeDiscount}
                                                    onChange={(e) => setIncludeDiscount(e.target.checked)}
                                                />
                                                I want to include discount percentage for the items
                                            </label>
                                            {includeDiscount && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <Info size={14} className="text-blue-500 shrink-0" />
                                                    <span>When a price list is applied, the discount percentage will be applied only if discount is enabled at the line-item level</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                {activeTab === 'products' ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {products.length === 0 ? (
                                            <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl text-gray-400">
                                                <Layout size={32} className="mb-2 opacity-50" />
                                                <p className="text-[13px]">No products added yet.</p>
                                            </div>
                                        ) : (
                                            products.map(product => {
                                                const isExpanded = expandedProducts.includes(product.id);
                                                return (
                                                    <div key={product.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white shadow-sm transition-all">
                                                        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 cursor-pointer group" onClick={() => toggleProductExpansion(product.id)}>
                                                            <h4 className="text-[14px] font-bold text-gray-800">{product.name}</h4>
                                                            <div className="flex items-center gap-3">
                                                                <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-all">
                                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); removeProduct(product.id); }}
                                                                    className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="p-6 pt-0 space-y-8 animate-in slide-in-from-top-2 duration-300">
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-2 text-[12px] font-bold text-gray-600 pl-1">
                                                                        <Layout size={14} className="text-gray-400" />
                                                                        Plans
                                                                    </div>
                                                                    <div className="border border-blue-50/50 rounded-lg overflow-hidden">
                                                                        <div className="grid grid-cols-[1fr_220px_220px] bg-blue-50/30 border-b border-blue-50 px-5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                            <div>PER UNIT</div>
                                                                            <div className="text-right pr-4 uppercase">SETUP FEE ({currency || baseCurrency.code})</div>
                                                                            <div className="text-right pr-4 uppercase">PRICE ({currency || baseCurrency.code})</div>
                                                                        </div>
                                                                        <div className="divide-y divide-gray-50">
                                                                            {product.plans.map((plan: any, i: number) => (
                                                                                <div key={i} className="grid grid-cols-[1fr_220px_220px] px-5 py-3 text-[13px] text-gray-700 items-center hover:bg-gray-50/30 transition-colors">
                                                                                    <div className="font-medium">{plan.name}</div>
                                                                                    <div className="text-right pr-8 text-gray-400">-</div>
                                                                                    <div className="text-right pr-4">
                                                                                        <input
                                                                                            className="h-8 w-28 rounded-md border border-gray-200 px-2 text-right text-[12px] text-gray-700 focus:border-blue-500 focus:outline-none"
                                                                                            placeholder="0"
                                                                                            value={plan.priceListRate ?? ""}
                                                                                            onChange={(e) => updatePlanRate(product.id, plan.id, e.target.value)}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-2 text-[12px] font-bold text-gray-600 pl-1">
                                                                        <Box size={14} className="text-gray-400" />
                                                                        Addons
                                                                    </div>
                                                                    <div className="border border-blue-50/50 rounded-lg overflow-hidden">
                                                                        <div className="grid grid-cols-[1fr_220px] bg-blue-50/30 border-b border-blue-50 px-5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                            <div>PER UNIT</div>
                                                                            <div className="text-right pr-4 uppercase">PRICE ({currency || baseCurrency.code})</div>
                                                                        </div>
                                                                        <div className="divide-y divide-gray-50">
                                                                            {product.addons.map((addon: any, i: number) => (
                                                                                <div key={i} className="grid grid-cols-[1fr_220px] px-5 py-3 text-[13px] text-gray-700 items-center hover:bg-gray-50/30 transition-colors">
                                                                                    <div className="font-medium">{addon.name}</div>
                                                                                    <div className="text-right pr-4">
                                                                                        <input
                                                                                            className="h-8 w-28 rounded-md border border-gray-200 px-2 text-right text-[12px] text-gray-700 focus:border-blue-500 focus:outline-none"
                                                                                            placeholder="0"
                                                                                            value={addon.priceListRate ?? ""}
                                                                                            onChange={(e) => updateAddonRate(product.id, addon.id, e.target.value)}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div className="pt-2">
                                            <div className="relative inline-block" ref={addProductRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddProductDropdown((prev) => !prev)}
                                                    className="flex items-center gap-1.5 text-blue-600 text-[13px] font-medium hover:underline"
                                                >
                                                    <PlusCircle size={14} />
                                                    Add Product
                                                </button>
                                                {showAddProductDropdown && (
                                                    <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-xl">
                                                        <div className="border-b border-gray-100 p-2">
                                                            <div className="relative">
                                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    value={addProductSearch}
                                                                    onChange={(e) => setAddProductSearch(e.target.value)}
                                                                    placeholder="Search"
                                                                    className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-2 text-[12px] outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-56 overflow-auto py-1">
                                                            {availableProducts.length === 0 ? (
                                                                <div className="px-3 py-2 text-[12px] text-gray-400">No products found</div>
                                                            ) : (
                                                                availableProducts.map((prod: any) => (
                                                                    <button
                                                                        key={prod.id}
                                                                        type="button"
                                                                        onClick={() => handleAddProduct(prod)}
                                                                        className="block w-full px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50"
                                                                    >
                                                                        {prod.name}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex flex-col gap-1">
                                                <h3 className="text-[14px] font-bold text-gray-800">Customise Rates in Bulk</h3>
                                                {!importPriceList && (
                                                    <button
                                                        onClick={() => {
                                                            if (!showBulkActions) {
                                                                setShowBulkActions(true);
                                                            } else if (selectedItemIds.length > 0) {
                                                                setIsBulkModalOpen(true);
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 text-blue-600 text-[13px] hover:underline"
                                                    >
                                                        <Settings size={14} /> Update Rates in Bulk
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                                Import Price List for Items
                                                <button
                                                    onClick={() => setImportPriceList(!importPriceList)}
                                                    className={`w-8 h-4 rounded-full relative transition-colors ${importPriceList ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${importPriceList ? 'right-0.5' : 'left-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {showBulkActions && selectedItemIds.length > 0 && !importPriceList && (
                                            <div className="mb-4 bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300 shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[13px] text-blue-600 font-medium px-3 py-1 bg-white rounded-md border border-blue-200">
                                                        {selectedItemIds.length} items selected
                                                    </span>
                                                    <button
                                                        onClick={() => setIsBulkModalOpen(true)}
                                                        className="px-4 py-1.5 bg-white border border-gray-200 rounded text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                                                    >
                                                        Update Rates in Bulk
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowBulkActions(false);
                                                        setSelectedItemIds([]);
                                                    }}
                                                    className="p-1 hover:bg-blue-100 rounded-full transition-colors text-blue-400"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}

                                        {importPriceList ? (
                                            <div className="bg-white border border-gray-100 rounded-lg p-8 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="space-y-4">
                                                    <h4 className="text-[15px] font-bold text-gray-800">1. Export items as XLS file</h4>
                                                    <p className="text-[13px] text-gray-500 max-w-2xl leading-relaxed">
                                                        Export all your items in an XLS file, customise the rates, and import the file into Taban Billing.
                                                    </p>
                                                    <button className="flex items-center gap-2 px-5 py-2 border border-blue-500/10 bg-blue-50/10 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-all shadow-sm font-semibold border border-gray-300 active:scale-95">
                                                        <Download size={16} className="text-blue-500" /> Export Items
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <h4 className="text-[15px] font-bold text-gray-800">2. Import items as XLS file</h4>
                                                    <p className="text-[13px] text-gray-500 max-w-2xl leading-relaxed">
                                                        Import the CSV or XLS file that you've exported and updated with the customised rates to update the price list.
                                                    </p>

                                                    <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-6 space-y-4">
                                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">NOTE:</p>
                                                        <div className="space-y-4 text-[13px] text-gray-600 leading-relaxed">
                                                            <div>
                                                                <p className="mb-3">1. Before you import, ensure that the following column names are in English as given below:</p>
                                                                <ul className="grid grid-cols-2 gap-x-12 gap-y-2 mt-2 pl-6 text-gray-500 list-disc">
                                                                    <li className="marker:text-blue-400">Item Name</li>
                                                                    <li className="marker:text-blue-400">SKU</li>
                                                                    <li className="marker:text-blue-400">PriceList Rate</li>
                                                                    <li className="marker:text-blue-400">Discount</li>
                                                                </ul>
                                                            </div>
                                                            <p>2. Once you import the file, the existing items and its rates in this price list will be replaced with the data in the import file.</p>
                                                            <p>3. Item ID will be used as the primary field for mapping items with price lists since item name duplication is enabled.</p>
                                                        </div>
                                                    </div>

                                                    <button className="flex items-center gap-2 px-5 py-2 border border-gray-300 rounded-md text-[13px] text-gray-700 hover:bg-gray-50 transition-all shadow-sm font-semibold active:scale-95">
                                                        <Upload size={16} className="text-blue-500" /> Import Items
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 bg-white">
                                                <div className={`grid ${pricingScheme === 'Volume'
                                                    ? (includeDiscount
                                                        ? (showBulkActions ? 'grid-cols-[48px_1fr_130px_100px_100px_130px_130px]' : 'grid-cols-[1fr_130px_100px_100px_130px_130px]')
                                                        : (showBulkActions ? 'grid-cols-[48px_1fr_150px_120px_120px_150px]' : 'grid-cols-[1fr_150px_120px_120px_150px]'))
                                                    : (includeDiscount
                                                        ? (showBulkActions ? 'grid-cols-[48px_1fr_180px_160px_160px]' : 'grid-cols-[1fr_180px_160px_160px]')
                                                        : (showBulkActions ? 'grid-cols-[48px_1fr_200px_180px]' : 'grid-cols-[1fr_200px_180px]'))
                                                    } bg-[#fdfdfd] border-b border-gray-100 px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider items-center`}>
                                                    {showBulkActions && (
                                                        <div className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedItemIds.length === items.length && items.length > 0}
                                                                onChange={toggleSelectAll}
                                                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1">ITEM DETAILS <Search size={13} className="text-blue-500" /></div>
                                                    <div className="text-right pr-4">SALES RATE</div>
                                                    {pricingScheme === 'Volume' && (
                                                        <>
                                                            <div className="text-right pr-4">START QUANTITY</div>
                                                            <div className="text-right pr-4">END QUANTITY</div>
                                                        </>
                                                    )}
                                                    <div className="text-right pr-4">CUSTOM RATE</div>
                                                    {includeDiscount && (
                                                        <div className="text-right pr-4 flex items-center justify-end gap-1">
                                                            DISCOUNT (%) <Info size={13} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-white min-h-[120px]">
                                                    {items.length === 0 ? (
                                                        <div className="h-40 flex items-center justify-center text-gray-400 text-[13px]">
                                                            There are no items.
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-gray-50">
                                                            {items.map((item, idx) => {
                                                                const isSelected = selectedItemIds.includes(String(idx));
                                                                return (
                                                                    <div key={idx} className={`grid ${pricingScheme === 'Volume'
                                                                        ? (includeDiscount
                                                                            ? (showBulkActions ? 'grid-cols-[48px_1fr_130px_100px_100px_130px_130px]' : 'grid-cols-[1fr_130px_100px_100px_130px_130px]')
                                                                            : (showBulkActions ? 'grid-cols-[48px_1fr_150px_120px_120px_150px]' : 'grid-cols-[1fr_150px_120px_120px_150px]'))
                                                                        : (includeDiscount
                                                                            ? (showBulkActions ? 'grid-cols-[48px_1fr_180px_160px_160px]' : 'grid-cols-[1fr_180px_160px_160px]')
                                                                            : (showBulkActions ? 'grid-cols-[48px_1fr_200px_180px]' : 'grid-cols-[1fr_200px_180px]'))
                                                                        } px-5 py-4 items-start group transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                                                                        {showBulkActions && (
                                                                            <div className="flex items-center pt-2">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => toggleSelectItem(String(idx))}
                                                                                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col pt-1">
                                                                            <span className="text-[13px] font-medium text-gray-800">{item.name}</span>
                                                                            <span className="text-[11px] text-gray-400">SKU: {item.sku || '-'}</span>
                                                                        </div>
                                                                        <div className="text-right pr-4 text-[13px] text-gray-600 pt-2">
                                                                            {currency || baseCurrency.code}{item.salesRate?.toFixed(2)}
                                                                        </div>

                                                                        {pricingScheme === 'Volume' ? (
                                                                            <>
                                                                                <div className="flex flex-col gap-3">
                                                                                    <div className="flex justify-end pr-2">
                                                                                        <div className="h-8 w-[80px] border border-gray-100 rounded bg-white shadow-sm overflow-hidden">
                                                                                            <input type="text" className="w-full h-full px-2 text-[13px] outline-none text-right" placeholder="1" />
                                                                                        </div>
                                                                                    </div>
                                                                                    <button className="flex items-center gap-1.5 text-blue-600 text-[12px] font-bold hover:underline ml-auto pr-2">
                                                                                        <PlusCircle size={15} /> Add New Range
                                                                                    </button>
                                                                                </div>
                                                                                <div className="flex justify-end pr-2">
                                                                                    <div className="h-8 w-[80px] border border-gray-100 rounded bg-white shadow-sm overflow-hidden">
                                                                                        <input type="text" className="w-full h-full px-2 text-[13px] outline-none text-right" placeholder="10" />
                                                                                    </div>
                                                                                </div>
                                                            <div className="flex justify-end pr-2">
                                                                <div className="flex items-center h-8 w-full max-w-[120px] border border-gray-200 rounded bg-gray-50 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all shadow-sm">
                                                                    <div className="px-2 text-[10px] text-gray-400 font-bold border-r border-gray-200 h-full flex items-center bg-gray-50/50">{currency || baseCurrency.code}</div>
                                                                    <input
                                                                        type="text"
                                                                        value={item.customRate ?? ""}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            setItems((prev: any[]) => prev.map((row, i) => i === idx ? { ...row, customRate: value } : row));
                                                                        }}
                                                                        className="w-full h-full px-2 text-[13px] bg-white outline-none text-right"
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {includeDiscount && (
                                                                <div className="flex justify-end pr-2">
                                                                    <div className="flex items-center h-8 w-full max-w-[100px] border border-gray-200 rounded bg-gray-50 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all shadow-sm">
                                                                        <input
                                                                            type="text"
                                                                            value={item.discount ?? ""}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                setItems((prev: any[]) => prev.map((row, i) => i === idx ? { ...row, discount: value } : row));
                                                                            }}
                                                                            className="w-full h-full px-2 text-[13px] bg-white outline-none text-right"
                                                                            placeholder="0"
                                                                        />
                                                                        <div className="px-2 text-[10px] text-gray-400 font-bold border-l border-gray-200 h-full flex items-center bg-gray-50/50">%</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                            <div className="flex justify-end pr-4 text-right">
                                                                                <div className="flex items-center h-8 w-32 border border-gray-200 rounded bg-gray-50 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all shadow-sm">
                                                                                    <div className="px-2 text-[11px] text-gray-400 font-bold border-r border-gray-200 h-full flex items-center bg-gray-50/50">{currency || baseCurrency.code}</div>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={item.customRate ?? ""}
                                                                                        onChange={(e) => {
                                                                                            const value = e.target.value;
                                                                                            setItems((prev: any[]) => prev.map((row, i) => i === idx ? { ...row, customRate: value } : row));
                                                                                        }}
                                                                                        className="w-full h-full px-2 text-[13px] bg-white outline-none text-right"
                                                                                        placeholder="0.00"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            {includeDiscount && (
                                                                                <div className="flex justify-end pr-4">
                                                                                    <div className="flex items-center h-8 w-24 border border-gray-200 rounded bg-gray-50 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all shadow-sm">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={item.discount ?? ""}
                                                                                            onChange={(e) => {
                                                                                                const value = e.target.value;
                                                                                                setItems((prev: any[]) => prev.map((row, i) => i === idx ? { ...row, discount: value } : row));
                                                                                            }}
                                                                                            className="w-full h-full px-2 text-[13px] bg-white outline-none text-right"
                                                                                            placeholder="0"
                                                                                        />
                                                                                        <div className="px-2 text-[11px] text-gray-400 font-bold border-l border-gray-200 h-full flex items-center bg-gray-50/50">%</div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-7 pt-2 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded w-fit">
                                <HelpCircle size={15} />
                                <span>This type of price list does not apply to Subscription Items</span>
                            </div>

                            <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                                <label className="text-[13px] text-[#ef4444] font-medium">Percentage*</label>
                                <div className="flex w-[420px] h-9 border border-gray-300 rounded overflow-visible">
                                    <div className="relative group/markup" ref={markupRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowMarkupDropdown(!showMarkupDropdown)}
                                            className="flex h-full items-center gap-2 px-3 bg-gray-50 border-r border-gray-200 text-[12px] text-gray-600 hover:bg-gray-100 transition-colors"
                                        >
                                            {markupType} <ChevronDown size={14} className={`transition-transform ${showMarkupDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showMarkupDropdown && (
                                            <div className="absolute top-full left-0 mt-1 w-[120px] bg-white border border-gray-200 rounded-lg shadow-xl z-[150] py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {['Markup', 'Markdown'].map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => {
                                                            setMarkupType(type as any);
                                                            setShowMarkupDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${markupType === type ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-50 text-gray-400'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={markupPercentage}
                                        onChange={(e) => setMarkupPercentage(e.target.value)}
                                        className="flex-1 px-3 text-[13px] outline-none focus:ring-1 focus:ring-blue-500/20"
                                    />
                                    <div className="px-3 flex items-center bg-gray-50 border-l border-gray-200 text-[12px] text-gray-400 font-bold">%</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-[160px_1fr] items-start gap-4">
                                <label className="text-[13px] text-[#ef4444] font-medium mt-2">Round Off To*</label>
                                <div className="relative w-[420px]">
                                    <SearchableDropdown
                                        value={roundOffTo}
                                        options={[
                                            { value: 'Never mind', label: 'Never mind' },
                                            { value: 'Nearest whole number', label: 'Nearest whole number' },
                                            { value: '0.99', label: '0.99' },
                                            { value: '0.50', label: '0.50' },
                                            { value: '0.49', label: '0.49' },
                                            { value: 'Decimal Places', label: 'Decimal Places' },
                                        ]}
                                        onChange={setRoundOffTo}
                                        placeholder="Never mind"
                                        accentColor={accentColor}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowRoundingExamples(!showRoundingExamples)}
                                        className="mt-1 text-[13px] text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        View Examples
                                    </button>

                                    {showRoundingExamples && (
                                        <div className="absolute top-[calc(100%+8px)] left-0 w-[420px] bg-white border-2 border-blue-500 rounded-lg shadow-2xl z-[160] overflow-visible animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="absolute -top-2 left-10 w-4 h-4 bg-white border-t-2 border-l-2 border-blue-500 rotate-45" />

                                            <div className="relative bg-white rounded-lg overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                                                    <h4 className="text-[14px] font-semibold text-gray-800">Rounding Examples</h4>
                                                    <button
                                                        onClick={() => setShowRoundingExamples(false)}
                                                        className="text-red-500 hover:scale-110 transition-transform"
                                                    >
                                                        <X size={20} strokeWidth={2.5} />
                                                    </button>
                                                </div>

                                                <div className="p-4 bg-white">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                <th className="pb-3 pr-2">ROUND OFF TO</th>
                                                                <th className="pb-3 text-center">INPUT VALUE</th>
                                                                <th className="pb-3 text-right">ROUNDED VALUE</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {roundingExamples.map((ex, idx) => (
                                                                <tr
                                                                    key={idx}
                                                                    className="group cursor-pointer hover:bg-blue-50/50 transition-colors"
                                                                    onClick={() => {
                                                                        setRoundOffTo(ex.label);
                                                                        setShowRoundingExamples(false);
                                                                    }}
                                                                >
                                                                    <td className="py-2.5 pr-2 text-[12px] text-blue-500 font-medium group-hover:text-blue-600 transition-colors">
                                                                        {ex.label}
                                                                    </td>
                                                                    <td className="py-2.5 text-center text-[12px] text-gray-500">
                                                                        {ex.input}
                                                                    </td>
                                                                    <td className="py-2.5 text-right text-[12px] text-gray-600 font-medium">
                                                                        {ex.rounded}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {roundOffTo === 'Decimal Places' && (
                                <div className="grid grid-cols-[160px_1fr] items-center gap-4 mt-6 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="text-[13px] text-[#ef4444] font-medium">Decimal Places*</label>
                                    <div className="relative w-[420px]">
                                        <SearchableDropdown
                                            value={decimalPlaces}
                                            options={[
                                                { value: '1', label: '1' },
                                                { value: '2', label: '2' },
                                                { value: '3', label: '3' },
                                                { value: '4', label: '4' },
                                                { value: '5', label: '5' },
                                            ]}
                                            onChange={setDecimalPlaces}
                                            placeholder="1"
                                            accentColor={accentColor}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 px-8 py-4 bg-white border-t border-gray-100 flex items-center gap-3">
                <button
                    onClick={handleSave}
                    className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-6 py-1.5 text-[14px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
                    style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                >
                    {editData ? 'Update' : 'Save'}
                </button>
                <button
                    onClick={onClose}
                    className="bg-white text-gray-700 px-6 py-1.5 rounded-md text-[14px] font-semibold border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
