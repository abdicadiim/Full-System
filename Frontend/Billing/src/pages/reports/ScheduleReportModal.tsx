import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Info, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { customersAPI } from "../../services/api";

interface ScheduleReportModalProps {
  open: boolean;
  reportName: string;
  onClose: () => void;
}

type RecipientOption = {
  value: string;
  label: string;
  email: string;
};

type MinimalCustomer = {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  isActive?: boolean;
};

const FREQUENCY_OPTIONS = ["Weekly", "Monthly", "Quarterly", "Yearly"];
const ATTACHMENT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV (Comma Separated Value)" },
  { value: "xls", label: "XLS (Microsoft Excel 1997-2004 Compatible)" },
];

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];
const isBrowser = typeof document !== "undefined";

const getCustomerLabel = (customer: MinimalCustomer | any) =>
  customer?.displayName ||
  customer?.companyName ||
  [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim() ||
  customer?.name ||
  customer?.email ||
  "Unknown Customer";

const isActiveCustomer = (customer: MinimalCustomer | any) => {
  const status = String(customer?.status || "").toLowerCase();
  if (status) return status === "active";
  if (typeof customer?.isActive === "boolean") return customer.isActive;
  return true;
};

export default function ScheduleReportModal({ open, reportName, onClose }: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState("Weekly");
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [startDate, setStartDate] = useState("2026-03-31");
  const [hour, setHour] = useState("11");
  const [minute, setMinute] = useState("00");
  const [recipientOptions, setRecipientOptions] = useState<RecipientOption[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientOption[]>([]);
  const [additionalRecipients, setAdditionalRecipients] = useState("");
  const [attachmentFormat, setAttachmentFormat] = useState("pdf");
  const modalRef = useRef<HTMLDivElement>(null);
  const frequencyRef = useRef<HTMLDivElement>(null);
  const recipientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !isBrowser) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFrequencyOpen(false);
        setRecipientOpen(false);
        onClose();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (frequencyRef.current && !frequencyRef.current.contains(target)) {
        setFrequencyOpen(false);
      }
      if (recipientRef.current && !recipientRef.current.contains(target)) {
        setRecipientOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(target)) {
        setFrequencyOpen(false);
        setRecipientOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    const loadRecipients = async () => {
      setRecipientLoading(true);
      try {
        const response: any = await customersAPI.getAll({ limit: 1000 });
        const rows: any[] = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        const options = rows
          .filter((customer) => isActiveCustomer(customer) && String(customer?.email || "").trim())
          .map((customer) => {
            const email = String(customer?.email || "").trim();
            return {
              value: String(customer?._id || customer?.id || email),
              label: getCustomerLabel(customer),
              email,
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label));

        if (!active) return;
        setRecipientOptions(options);
        setSelectedRecipients((prev) => {
          if (prev.length > 0) {
            return prev.filter((item) => options.some((option) => option.email === item.email));
          }
          return options.length > 0 ? [options[0]] : [];
        });
      } catch (error) {
        if (active) {
          setRecipientOptions([]);
        }
      } finally {
        if (active) {
          setRecipientLoading(false);
        }
      }
    };

    loadRecipients();
    return () => {
      active = false;
    };
  }, [open]);

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return recipientOptions;
    return recipientOptions.filter((option) => {
      return option.label.toLowerCase().includes(q) || option.email.toLowerCase().includes(q);
    });
  }, [recipientOptions, recipientSearch]);

  if (!open || !isBrowser) {
    return null;
  }

  const toggleRecipient = (option: RecipientOption) => {
    setSelectedRecipients((prev) => {
      const exists = prev.some((item) => item.email === option.email);
      if (exists) {
        return prev.filter((item) => item.email !== option.email);
      }
      return [...prev, option];
    });
  };

  const handleSave = () => {
    toast.success(`Scheduled report: ${reportName}`);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="relative my-auto w-full max-w-[620px] overflow-hidden rounded-[14px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Schedule Report"
      >
        <div className="flex items-start justify-between border-b border-[#e6e9f0] px-5 py-4">
          <div>
            <h2 className="text-[20px] font-semibold text-[#0f172a]">Schedule Report</h2>
            <p className="mt-2 text-sm text-[#64748b]">
              Report Name : <span className="font-medium text-[#334155]">{reportName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close schedule report modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-170px)] overflow-y-auto px-5 py-5">
          <div className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
              <label className="pt-2 text-[14px] font-medium text-[#ef4444]">
                Frequency<span>*</span>
              </label>
              <div className="grid gap-3 md:grid-cols-[132px_minmax(0,1fr)] md:items-center">
                <div className="relative w-full" ref={frequencyRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientOpen(false);
                      setFrequencyOpen((prev) => !prev);
                    }}
                    className={`flex h-9 w-full items-center justify-between rounded-[8px] border px-3 text-left text-[14px] transition-colors ${
                      frequencyOpen
                        ? "border-[#156372] bg-white text-[#334155] shadow-sm"
                        : "border-[#d4d9e4] bg-white text-[#334155] hover:border-[#156372]"
                    }`}
                  >
                    <span>{frequency}</span>
                    <ChevronDown size={15} className={`text-[#7c8aa5] transition-transform ${frequencyOpen ? "rotate-180" : ""}`} />
                  </button>

                  {frequencyOpen ? (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full rounded-[10px] border border-[#d7dce7] bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.15)]">
                      {FREQUENCY_OPTIONS.map((option) => {
                        const isSelected = option === frequency;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setFrequency(option);
                              setFrequencyOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[14px] transition-colors ${
                              isSelected ? "bg-[#156372] text-white" : "text-[#334155] hover:bg-[#f3f7f9]"
                            }`}
                          >
                            <span>{option}</span>
                            {isSelected ? <Check size={14} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <p className="text-[14px] text-[#64748b]">Report will be generated and sent on a {frequency.toLowerCase()} basis.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
              <label className="pt-2 text-[14px] font-medium text-[#ef4444]">
                Start Date & Time<span>*</span>
                <Info size={13} className="ml-1 inline text-[#94a3b8]" />
              </label>
              <div className="grid gap-3 md:grid-cols-[1fr_92px_92px] md:items-start">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-9 rounded-[8px] border border-[#d4d9e4] bg-white px-3 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                />
                <div>
                  <select
                    value={hour}
                    onChange={(event) => setHour(event.target.value)}
                    className="h-9 w-full rounded-[8px] border border-[#d4d9e4] bg-white px-2 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                  >
                    {HOURS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[12px] text-[#64748b]">Hours</p>
                </div>
                <div>
                  <select
                    value={minute}
                    onChange={(event) => setMinute(event.target.value)}
                    className="h-9 w-full rounded-[8px] border border-[#d4d9e4] bg-white px-2 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                  >
                    {MINUTES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[12px] text-[#64748b]">Minutes</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#edf1f7]" />

            <div className="grid gap-4">
              <h3 className="text-[17px] font-medium text-[#334155]">Recipient Details</h3>

              <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                <label className="pt-2 text-[14px] font-medium text-[#ef4444]">
                  Email Recipients<span>*</span>
                </label>

                <div className="relative" ref={recipientRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setFrequencyOpen(false);
                      setRecipientOpen((prev) => !prev);
                    }}
                    className={`flex min-h-10 w-full flex-wrap items-center gap-2 rounded-[8px] border px-2 py-1.5 text-left transition-colors ${
                      recipientOpen
                        ? "border-[#156372] bg-white shadow-sm"
                        : "border-[#d4d9e4] bg-white hover:border-[#156372]"
                    }`}
                  >
                    {selectedRecipients.length > 0 ? (
                      selectedRecipients.map((recipient) => (
                        <span
                          key={recipient.email}
                          className="inline-flex items-center gap-1 rounded bg-[#eef2f7] px-2 py-1 text-[13px] text-[#334155]"
                        >
                          {recipient.label}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedRecipients((prev) => prev.filter((item) => item.email !== recipient.email));
                            }}
                            className="text-[#94a3b8] hover:text-[#ef4444]"
                            aria-label={`Remove ${recipient.label}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="px-1 text-[14px] text-[#94a3b8]">Add email recipients</span>
                    )}

                    <span className="ml-auto flex items-center gap-2">
                      <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${recipientOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>

                  {recipientOpen ? (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full rounded-[10px] border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.15)]">
                      <div className="flex items-center gap-2 rounded-[8px] border border-[#cfd6e4] bg-white px-3 py-2 focus-within:border-[#156372]">
                        <Search size={14} className="text-[#94a3b8]" />
                        <input
                          value={recipientSearch}
                          onChange={(event) => setRecipientSearch(event.target.value)}
                          placeholder="Search"
                          className="w-full border-none bg-transparent text-[13px] text-[#334155] outline-none placeholder:text-[#94a3b8]"
                        />
                      </div>

                      <div className="mt-2 max-h-[180px] overflow-y-auto pr-1">
                        <div className="px-2 pb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Users</div>
                        {recipientLoading ? (
                          <div className="px-3 py-2 text-[13px] text-[#64748b]">Loading customers...</div>
                        ) : filteredRecipients.length === 0 ? (
                          <div className="px-3 py-2 text-[13px] text-[#64748b]">No recipients found</div>
                        ) : (
                          filteredRecipients.map((option) => {
                            const isSelected = selectedRecipients.some((item) => item.email === option.email);
                            return (
                              <button
                                key={option.email}
                                type="button"
                                onClick={() => toggleRecipient(option)}
                                className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[13px] transition-colors ${
                                  isSelected ? "bg-[#eef2f7] text-[#334155]" : "text-[#334155] hover:bg-[#f3f7f9]"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{option.label}</div>
                                  <div className="truncate text-[12px] text-[#64748b]">{option.email}</div>
                                </div>
                                {isSelected ? <Check size={14} className="ml-3 shrink-0 text-[#94a3b8]" /> : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                <label className="pt-2 text-[14px] font-medium text-[#334155]">Additional Recipients</label>
                <div>
                  <textarea
                    value={additionalRecipients}
                    onChange={(event) => setAdditionalRecipients(event.target.value)}
                    rows={3}
                    className="w-full rounded-[8px] border border-[#d4d9e4] bg-white px-3 py-2 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                  />
                  <p className="mt-1 text-[12px] text-[#64748b]">Use comma(,) to separate more than one email address.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                <label className="pt-1 text-[14px] font-medium text-[#ef4444]">
                  Attach Report As<span>*</span>
                </label>
                <div className="space-y-2">
                  {ATTACHMENT_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 text-[14px] text-[#334155]">
                      <input
                        type="radio"
                        name="attachment-format"
                        value={option.value}
                        checked={attachmentFormat === option.value}
                        onChange={() => setAttachmentFormat(option.value)}
                        className="h-4 w-4 accent-[#156372]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[10px] border border-[#d7e8e2] bg-[#eef8f5] px-4 py-4 text-sm text-[#334155]">
              <div className="mb-2 flex items-center gap-2 font-medium text-[#156372]">
                <Info size={15} />
                Note:
              </div>
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#475569]">
                <li>The scheduled report will include data based on the access permissions of the user who schedules it.</li>
                <li>
                  The generated report will contain only a maximum of <span className="font-semibold">25,000</span> records.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[#e6e9f0] px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-9 items-center rounded bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0f4f5b]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-[14px] text-[#334155] hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
