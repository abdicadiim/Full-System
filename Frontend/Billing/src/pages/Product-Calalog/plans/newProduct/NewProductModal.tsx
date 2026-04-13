import React, { useEffect, useState } from "react";
import { HelpCircle, Info } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../../../components/ui/Modal";
import { useSaveProductMutation } from "../productQueries";

interface NewProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess?: (savedProduct?: any) => void;
    mode?: "create" | "edit";
    initialProduct?: any;
}

type FormErrors = Partial<{
    name: string;
    emailRecipients: string;
    redirectionUrl: string;
    prefix: string;
    nextNumber: string;
}>;

const getDefaultForm = () => ({
    name: "",
    description: "",
    emailRecipients: "",
    redirectionUrl: "",
    autoGenerateSubscriptionNumbers: false,
    prefix: "SUB-",
    nextNumber: "00001",
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const normalizeEmailIds = (value: string) =>
    value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

const isValidRedirectUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        return ["http:", "https:"].includes(parsed.protocol);
    } catch {
        return false;
    }
};

export default function NewProductModal({
    isOpen,
    onClose,
    onSaveSuccess,
    mode = "create",
    initialProduct,
}: NewProductModalProps) {
    const saveProductMutation = useSaveProductMutation();
    const [form, setForm] = useState(getDefaultForm);
    const [errors, setErrors] = useState<FormErrors>({});
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const isEditMode = mode === "edit" && Boolean(initialProduct);
    const isSaving = saveProductMutation.isPending;

    const placeholders = [
        "%EmailID%",
        "%SubscriptionID%",
        "%SubscriptionName%",
        "%PlanName%",
        "%RecurringCharges%",
        "%NextBillingDate%",
        "%TransactionID%",
        "%InvoiceNumber%",
        "%PaymentNumber%",
        "%InvoiceAmount%",
    ];

    const insertPlaceholder = (ph: string) => {
        setForm(prev => ({ ...prev, redirectionUrl: prev.redirectionUrl + ph }));
        setDropdownOpen(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            setForm({
                name: String(initialProduct?.name || ""),
                description: String(initialProduct?.description || ""),
                emailRecipients: String(initialProduct?.emailRecipients || initialProduct?.email_ids || ""),
                redirectionUrl: String(initialProduct?.redirectionUrl || initialProduct?.redirect_url || ""),
                autoGenerateSubscriptionNumbers: Boolean(initialProduct?.autoGenerateSubscriptionNumbers),
                prefix: String(initialProduct?.prefix || "SUB-"),
                nextNumber: String(initialProduct?.nextNumber || "00001"),
            });
            setErrors({});
            return;
        }
        setForm(getDefaultForm());
        setErrors({});
    }, [isOpen, isEditMode, initialProduct]);

    const validateForm = () => {
        const emailIds = normalizeEmailIds(form.emailRecipients);
        const nextErrors: FormErrors = {};

        if (!form.name.trim()) {
            nextErrors.name = "Name is required.";
        }

        const invalidEmail = emailIds.find((email) => !EMAIL_REGEX.test(email));
        if (invalidEmail) {
            nextErrors.emailRecipients = "Email IDs must contain valid email addresses.";
        }

        if (form.redirectionUrl.trim() && !isValidRedirectUrl(form.redirectionUrl.trim())) {
            nextErrors.redirectionUrl = "Redirection URL must be a valid http or https URL.";
        }

        if (form.autoGenerateSubscriptionNumbers) {
            if (!form.prefix.trim()) {
                nextErrors.prefix = "Prefix is required when subscription number generation is enabled.";
            }
            if (!form.nextNumber.trim()) {
                nextErrors.nextNumber = "Next number is required when subscription number generation is enabled.";
            }
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const saveProduct = async () => {
        if (!validateForm()) {
            toast.error("Please fix the highlighted fields.");
            return;
        }

        try {
            const emailIds = normalizeEmailIds(form.emailRecipients);
            const editingId = String(initialProduct?.id || initialProduct?._id || "");
            const record: any = {
                name: form.name.trim(),
                description: form.description.trim(),
                email_ids: emailIds.join(", "),
                emailRecipients: emailIds.join(", "),
                redirect_url: form.redirectionUrl.trim(),
                redirectionUrl: form.redirectionUrl.trim(),
                autoGenerateSubscriptionNumbers: form.autoGenerateSubscriptionNumbers,
                prefix: form.autoGenerateSubscriptionNumbers ? form.prefix.trim() : "",
                nextNumber: form.autoGenerateSubscriptionNumbers ? form.nextNumber.trim() : "",
                status: String(initialProduct?.status || "Active"),
            };

            const savedProduct = await saveProductMutation.mutateAsync({
                id: isEditMode && editingId ? editingId : undefined,
                data: record,
            });

            toast.success(isEditMode ? "Product updated" : "Product saved");
            onSaveSuccess?.(savedProduct);
            onClose();
        } catch (error) {
            console.error("Failed to save product", error);
            toast.error((error as Error)?.message || (isEditMode ? "Failed to update product" : "Failed to save product"));
        }
    };

    const labelClass = "block text-[13px] text-gray-700 font-normal mb-1.5";
    const nameLabelClass = "block text-[13px] text-red-600 font-normal mb-1.5";
    const inputClass = "w-full h-[36px] rounded border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-gray-400 transition-all placeholder:text-gray-400";
    const textareaClass = "w-full h-[68px] rounded border border-gray-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-gray-400 resize-y transition-all placeholder:text-gray-400";
    const errorLabelClass = "text-red-600";
    const errorInputClass = "border-red-400 focus:border-red-500";
    const errorTextClass = "mt-1 text-[12px] text-red-600";

    return (
        <Modal
            open={isOpen}
            title={isEditMode ? "Edit Product" : "New Product"}
            onClose={onClose}
            position="top"
            panelClassName="max-w-[min(100%,42rem)]"
            closeMode="icon"
            closeOnBackdrop={false}
        >
            <div className="bg-gray-50 w-full rounded-lg overflow-hidden border-none shadow-none">

                {/* Form Body */}
                <div className="py-4 px-1 space-y-6">

                    {/* Name Field */}
                    <div>
                        <label className={nameLabelClass}>
                            Name<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                            type="text"
                            className={`${inputClass} ${errors.name ? errorInputClass : ""}`}
                            value={form.name}
                            onChange={(e) => {
                                setForm((prev) => ({ ...prev, name: e.target.value }));
                                setErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                        />
                        {errors.name ? <p className={errorTextClass}>{errors.name}</p> : null}
                    </div>

                    {/* Description Field */}
                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea
                            className={textareaClass}
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    {/* Email Notification Recipients */}
                    <div>
                        <label className={`${labelClass} flex items-center gap-1 ${errors.emailRecipients ? errorLabelClass : ""}`}>
                            Email Notification Recipients
                            <HelpCircle size={14} className="text-gray-400 cursor-help" />
                        </label>
                        <input
                            type="text"
                            className={`${inputClass} ${errors.emailRecipients ? errorInputClass : ""}`}
                            value={form.emailRecipients}
                            onChange={(e) => {
                                setForm((prev) => ({ ...prev, emailRecipients: e.target.value }));
                                setErrors((prev) => ({ ...prev, emailRecipients: undefined }));
                            }}
                        />
                        {errors.emailRecipients ? <p className={errorTextClass}>{errors.emailRecipients}</p> : null}
                    </div>

                    {/* Redirection URL */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className={`${labelClass} flex items-center gap-1 mb-0 ${errors.redirectionUrl ? errorLabelClass : ""}`}>
                                Redirection URL <Info size={14} className="text-gray-400 cursor-help" />
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="text-[12px] font-medium text-gray-600 border border-gray-200 bg-white rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                                >
                                    + Insert Placeholders
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[100] py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        {placeholders.map((ph) => (
                                            <button
                                                key={ph}
                                                onClick={() => insertPlaceholder(ph)}
                                                className="w-full text-left px-4 py-2 text-[13px] text-gray-600 hover:bg-slate-50 hover:text-gray-900 transition-colors"
                                            >
                                                {ph}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <input
                            type="text"
                            className={`${inputClass} whitespace-nowrap overflow-hidden ${errors.redirectionUrl ? errorInputClass : ""}`}
                            value={form.redirectionUrl}
                            onChange={(e) => {
                                setForm((prev) => ({ ...prev, redirectionUrl: e.target.value }));
                                setErrors((prev) => ({ ...prev, redirectionUrl: undefined }));
                            }}
                        />
                        {errors.redirectionUrl ? <p className={errorTextClass}>{errors.redirectionUrl}</p> : null}
                        <p className="mt-2 text-[11px] text-gray-500 italic">
                            You can use placeholders to append query params to your URL to fetch subscription details.
                            <br />
                            <span className="text-gray-400 font-normal">https://yourredirecturl.com?planname=%PlanName%</span>
                        </p>
                    </div>

                    {/* Auto-Generate Checkbox */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-2">
                            <input
                                type="checkbox"
                                id="auto-gen"
                                className="mt-1 w-4 h-4 border-gray-300 rounded accent-[#156372] focus:ring-gray-400 cursor-pointer"
                                checked={form.autoGenerateSubscriptionNumbers}
                                onChange={(e) => setForm((prev) => ({ ...prev, autoGenerateSubscriptionNumbers: e.target.checked }))}
                            />
                            <label htmlFor="auto-gen" className="text-[13px] text-gray-700 font-medium flex items-center gap-1 cursor-pointer">
                                Auto-Generate Subscription Numbers for This Product <HelpCircle size={14} className="text-gray-400 cursor-help" />
                            </label>
                        </div>

                        {form.autoGenerateSubscriptionNumbers && (
                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ml-6">
                                <div className="flex gap-4">
                                    <div className="flex-1 max-w-[180px]">
                                        <label className={`flex items-center gap-1 text-[13px] mb-1.5 font-normal ${errors.prefix ? "text-red-600" : "text-gray-700"}`}>
                                            Prefix <Info size={14} className="text-gray-400" />
                                        </label>
                                        <input
                                            type="text"
                                            className={`${inputClass} ${errors.prefix ? errorInputClass : ""}`}
                                            value={form.prefix}
                                            onChange={(e) => {
                                                setForm(prev => ({ ...prev, prefix: e.target.value }));
                                                setErrors((prev) => ({ ...prev, prefix: undefined }));
                                            }}
                                        />
                                        {errors.prefix ? <p className={errorTextClass}>{errors.prefix}</p> : null}
                                    </div>
                                    <div className="flex-1 max-w-[180px]">
                                        <label className={`flex items-center gap-1 text-[13px] mb-1.5 font-normal ${errors.nextNumber ? "text-red-600" : "text-gray-700"}`}>
                                            Next Number <Info size={14} className="text-gray-400" />
                                        </label>
                                        <input
                                            type="text"
                                            className={`${inputClass} ${errors.nextNumber ? errorInputClass : ""}`}
                                            value={form.nextNumber}
                                            onChange={(e) => {
                                                setForm(prev => ({ ...prev, nextNumber: e.target.value }));
                                                setErrors((prev) => ({ ...prev, nextNumber: undefined }));
                                            }}
                                        />
                                        {errors.nextNumber ? <p className={errorTextClass}>{errors.nextNumber}</p> : null}
                                    </div>
                                </div>
                                <p className="text-[12px] text-gray-500 leading-relaxed max-w-[500px]">
                                    <span className="text-gray-600 font-bold">Note:</span> Subscriptions created for this product will follow this number series, regardless of the organization-level preferences configured in Settings.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white px-1 py-4 border-t border-gray-200 flex gap-3 mt-4">
                    <button
                        type="button"
                        onClick={saveProduct}
                        disabled={isSaving}
                        className="cursor-pointer transition-all text-white px-6 py-2 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-2 text-[13px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                    >
                        {isSaving ? (isEditMode ? "Updating..." : "Saving...") : "Save"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-[13px] text-[#111827] hover:bg-slate-50 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
