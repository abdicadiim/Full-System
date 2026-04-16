import { useEffect, useRef, useState } from "react";
import { getQuoteById, getQuotes, getCustomers, getSalespersons, getProjects, getInvoices, updateQuote } from "../../salesModel";
import { quoteQueryKeys } from "../quoteQueries";
import { queryClient } from "../../../lib/queryClient";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import { senderEmailsAPI } from "../../../services/api";
import {
  getCurrentUserDisplayName,
  isImageFileAttachment,
  normalizeAttachmentFromQuote,
  normalizeActivityLogFromQuote,
  normalizeCommentFromQuote,
} from "./QuoteDetail.utils";

type QuoteDetailStateArgs = {
  quoteId?: string;
  preloadedQuote?: any;
  preloadedQuotes?: any[];
};

type QuoteDetailDeps = {
  getQuoteById?: typeof getQuoteById;
  getQuotes?: typeof getQuotes;
  getCustomers?: typeof getCustomers;
  getSalespersons?: typeof getSalespersons;
  getProjects?: typeof getProjects;
  getInvoices?: typeof getInvoices;
  updateQuote?: typeof updateQuote;
  senderEmailsAPI?: typeof senderEmailsAPI;
  resolveVerifiedPrimarySender?: typeof resolveVerifiedPrimarySender;
};

const mergeQuoteDetail = (prev: any, next: any) => {
  if (!next) return prev;
  if (!prev) return next;

  const merged = { ...prev, ...next };
  const prevItems = Array.isArray(prev?.items) ? prev.items : [];
  const nextItems = Array.isArray(next?.items) ? next.items : [];
  if (prevItems.length > 0 && nextItems.length === 0) {
    merged.items = prevItems;
  }

  if (!merged.customerName && prev?.customerName) merged.customerName = prev.customerName;
  if (!merged.customer && prev?.customer) merged.customer = prev.customer;
  if (!merged.customerEmail && prev?.customerEmail) merged.customerEmail = prev.customerEmail;

  const prevStatus = String(prev?.status || "").toLowerCase();
  const nextStatus = String(next?.status || "").toLowerCase();
  if (prevStatus && prevStatus !== "draft" && (!nextStatus || nextStatus === "draft")) {
    merged.status = prev.status;
  }

  const prevTotal = Number(prev?.total || 0);
  const nextTotal = Number(next?.total || 0);
  if (prevTotal > 0 && nextTotal === 0) {
    merged.total = prev.total;
  }
  const prevSubTotal = Number(prev?.subTotal || prev?.subtotal || 0);
  const nextSubTotal = Number(next?.subTotal || next?.subtotal || 0);
  if (prevSubTotal > 0 && nextSubTotal === 0) {
    merged.subTotal = prev.subTotal ?? prev.subtotal;
    merged.subtotal = prev.subtotal ?? prev.subTotal;
  }

  return merged;
};

const normalizeQuoteId = (quote: any) => String(quote?.id || quote?._id || "").trim();

const dedupeQuotesById = (quotes: any[]) => {
  if (!Array.isArray(quotes)) return [];
  const seen = new Set<string>();
  const next: any[] = [];
  for (const quote of quotes) {
    const id = normalizeQuoteId(quote);
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    next.push(quote);
  }
  return next;
};

export const useQuoteDetailState = (
  args: QuoteDetailStateArgs,
  deps: QuoteDetailDeps,
) => {
  const quoteId = String(args.quoteId || "");
  const preloadedQuote = args.preloadedQuote || null;
  const preloadedQuotes = Array.isArray(args.preloadedQuotes) ? args.preloadedQuotes : [];
  const QUOTE_DETAIL_STORAGE_KEY = quoteId ? `quote_detail_${quoteId}` : "";
  const readStoredQuoteDetail = (): any | null => {
    if (!QUOTE_DETAIL_STORAGE_KEY || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(QUOTE_DETAIL_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const cachedQuotes = preloadedQuotes.length > 0
    ? preloadedQuotes
    : queryClient
        .getQueriesData<any[]>({ queryKey: quoteQueryKeys.lists() })
        .flatMap(([, rows]) => (Array.isArray(rows) ? rows : []));
  const uniqueCachedQuotes = dedupeQuotesById(cachedQuotes);
  const cachedDetail = preloadedQuote ? null : readStoredQuoteDetail();
  const cachedQuote =
    preloadedQuote ||
    cachedDetail ||
    queryClient.getQueryData<any>(quoteQueryKeys.detail(quoteId)) ||
    uniqueCachedQuotes.find((q: any) => {
      const candidateId = normalizeQuoteId(q);
      return Boolean(candidateId) && candidateId === quoteId;
    }) ||
    null;

  const getQuoteByIdDep = deps.getQuoteById || getQuoteById;
  const getQuotesDep = deps.getQuotes || getQuotes;
  const getCustomersDep = deps.getCustomers || getCustomers;
  const getSalespersonsDep = deps.getSalespersons || getSalespersons;
  const getProjectsDep = deps.getProjects || getProjects;
  const getInvoicesDep = deps.getInvoices || getInvoices;
  const updateQuoteDep = deps.updateQuote || updateQuote;
  const senderEmailsAPIDep = deps.senderEmailsAPI || senderEmailsAPI;
  const resolveVerifiedPrimarySenderDep = deps.resolveVerifiedPrimarySender || resolveVerifiedPrimarySender;

  const [quote, setQuote] = useState<any>(cachedQuote);
  const [allQuotes, setAllQuotes] = useState<any[]>(uniqueCachedQuotes);
  const [loading, setLoading] = useState(!cachedQuote);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [activeTab, setActiveTab] = useState("details");
  const [showPdfView, setShowPdfView] = useState(true);
  const [showMailDropdown, setShowMailDropdown] = useState(false);
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showConvertDropdown, setShowConvertDropdown] = useState(false);
  const [showSidebarMoreDropdown, setShowSidebarMoreDropdown] = useState(false);
  const [isCloningQuote, setIsCloningQuote] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<any[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All Quotes");
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [isMarkAsSentModalOpen, setIsMarkAsSentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState("");
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [linkedInvoices, setLinkedInvoices] = useState<any[]>([]);
  const [linkedInvoicesLoading, setLinkedInvoicesLoading] = useState(false);
  const linkedInvoicesLoadedForQuoteRef = useRef<string>("");

  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isBulkFieldDropdownOpen, setIsBulkFieldDropdownOpen] = useState(false);
  const [bulkFieldSearch, setBulkFieldSearch] = useState("");

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailDetails, setShowEmailDetails] = useState(false);
  const [emailData, setEmailData] = useState({
    from: "",
    sendTo: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachQuotePDF, setAttachQuotePDF] = useState(true);
  const [fontSize, setFontSize] = useState("16");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const emailModalRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isQuoteDocumentHovered, setIsQuoteDocumentHovered] = useState(false);
  const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);
  const [isOrganizationAddressModalOpen, setIsOrganizationAddressModalOpen] = useState(false);
  const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [organizationData, setOrganizationData] = useState({
    street1: "",
    street2: "",
    city: "",
    zipCode: "",
    stateProvince: "",
    phone: "",
    faxNumber: "",
    websiteUrl: "",
    industry: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [termsData, setTermsData] = useState({
    notes: "Looking forward for your business.",
    termsAndConditions: "",
    useNotesForAllQuotes: false,
    useTermsForAllQuotes: false,
  });
  const customizeDropdownRef = useRef<HTMLDivElement | null>(null);
  const organizationAddressFileInputRef = useRef<HTMLInputElement | null>(null);

  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [quoteAttachments, setQuoteAttachments] = useState<any[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const attachmentsFileInputRef = useRef<HTMLInputElement | null>(null);

  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentBold, setCommentBold] = useState(false);
  const [commentItalic, setCommentItalic] = useState(false);
  const [commentUnderline, setCommentUnderline] = useState(false);

  const setUniqueAllQuotes = (nextValue: any) => {
    if (typeof nextValue === "function") {
      setAllQuotes((prev) => dedupeQuotesById(nextValue(prev)));
      return;
    }
    setAllQuotes(dedupeQuotesById(nextValue));
  };

  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);
  const [customFields, setCustomFields] = useState([
    { id: 1, name: "Sales person", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
    { id: 2, name: "Description", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
  ]);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareVisibility, setShareVisibility] = useState("Public");
  const [isVisibilityDropdownOpen, setIsVisibilityDropdownOpen] = useState(false);
  const [linkExpirationDate, setLinkExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);
  const shareModalRef = useRef<HTMLDivElement | null>(null);
  const visibilityDropdownRef = useRef<HTMLDivElement | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const organizationName = String(organizationProfile?.organizationName || organizationProfile?.name || "Organization").trim() || "Organization";
  const organizationNameHtml = organizationName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const [ownerEmail, setOwnerEmail] = useState<any>(null);

  const fetchOrganizationProfile = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        const fallbackProfile = localStorage.getItem("organization_profile");
        if (fallbackProfile) setOrganizationProfile(JSON.parse(fallbackProfile));
        return;
      }

      const response = await fetch("/api/settings/organization/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganizationProfile(data.data);
          localStorage.setItem("organization_profile", JSON.stringify(data.data));
        }
      } else {
        const fallbackProfile = localStorage.getItem("organization_profile");
        if (fallbackProfile) setOrganizationProfile(JSON.parse(fallbackProfile));
      }
    } catch (error) {
      console.error("Error fetching organization profile:", error);
      const fallbackProfile = localStorage.getItem("organization_profile");
      if (fallbackProfile) setOrganizationProfile(JSON.parse(fallbackProfile));
    }
  };

  const fetchOwnerEmail = async () => {
    try {
      const primarySenderRes = await senderEmailsAPIDep.getPrimary();
      const fallbackName = String(organizationProfile?.name || "Taban Enterprise").trim() || "Taban Enterprise";
      const fallbackEmail = String(organizationProfile?.email || "").trim();
      setOwnerEmail(resolveVerifiedPrimarySenderDep(primarySenderRes, fallbackName, fallbackEmail));
    } catch (error) {
      console.error("Error fetching owner email:", error);
    }
  };

  useEffect(() => {
    const senderName = ownerEmail?.name || organizationProfile?.name || "Team";
    const senderEmail = ownerEmail?.email || organizationProfile?.email || "";
    setEmailData((prev) => ({
      ...prev,
      from: senderEmail ? `${senderName} <${senderEmail}>` : senderName,
    }));
  }, [ownerEmail, organizationProfile?.name, organizationProfile?.email]);

  const updateOrganizationProfile = async (profileData: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch("/api/settings/organization/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganizationProfile(data.data);
          localStorage.setItem("organization_profile", JSON.stringify(data.data));
        }
      }
    } catch (error) {
      console.error("Error updating organization profile:", error);
    }
  };

  const appendActivityLog = async (action: string, description: string, level = "info") => {
    const entry = {
      id: `activity-${Date.now()}-${Math.random()}`,
      action,
      description,
      actor: getCurrentUserDisplayName(),
      timestamp: new Date().toISOString(),
      level,
    };

    let nextLogs: any[] = [];
    setActivityLogs((prev) => {
      nextLogs = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 200);
      return nextLogs;
    });

    if (quoteId) {
      localStorage.setItem(`quote_activity_logs_${quoteId}`, JSON.stringify(nextLogs));
      try {
        await updateQuoteDep(quoteId, { activityLogs: nextLogs } as any);
      } catch (error) {
        console.error("Error persisting activity logs:", error);
      }
    }
  };

  const filterOptions = [
    "All Quotes",
    "Draft",
    "Pending Approval",
    "Approved",
    "Sent",
    "Customer Viewed",
    "Accepted",
    "Invoiced",
    "Declined",
    "Expired",
  ];

  const getFilteredQuotes = () => {
    const quotes = Array.isArray(allQuotes) ? allQuotes : [];
    if (selectedFilter === "All Quotes") return quotes;
    return quotes.filter((q) => (q.status || "draft").toLowerCase() === selectedFilter.toLowerCase().replace(/\s+/g, "_"));
  };

  const handleSelectQuote = (id: any) => {
    setSelectedQuotes((prev) => (prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    const filteredQuotes = getFilteredQuotes();
    if (selectedQuotes.length === filteredQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(filteredQuotes.map((q) => q.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedQuotes([]);
    setIsBulkActionsOpen(false);
  };

  useEffect(() => {
    if (preloadedQuote) {
      setQuote(preloadedQuote);
    } else if (cachedDetail) {
      setQuote(cachedDetail);
    } else if (cachedQuote) {
      setQuote(cachedQuote);
    }
    if (preloadedQuotes.length > 0) {
      setUniqueAllQuotes(preloadedQuotes);
    } else if (cachedQuotes.length > 0) {
      setUniqueAllQuotes(cachedQuotes);
    }
  }, [preloadedQuote, preloadedQuotes, cachedQuote, cachedDetail, cachedQuotes, quoteId]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(!cachedQuote && !cachedDetail);
      fetchOrganizationProfile();
      fetchOwnerEmail();

      const [quotesResult, dropdownsResult, quoteResult] = await Promise.allSettled([
        getQuotesDep(),
        Promise.all([getCustomersDep(), getSalespersonsDep(), getProjectsDep()]),
        quoteId ? getQuoteByIdDep(quoteId) : Promise.resolve(null),
      ]);

      if (cancelled) return;

      if (quotesResult.status === "fulfilled") {
        setUniqueAllQuotes(quotesResult.value || []);
      } else {
        console.error("Error loading quotes:", quotesResult.reason);
        setUniqueAllQuotes([]);
      }

      if (dropdownsResult.status === "fulfilled") {
        const [loadedCustomers, loadedSalespersons, loadedProjects] = dropdownsResult.value;
        setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
        setSalespersons(Array.isArray(loadedSalespersons) ? loadedSalespersons : []);
        setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
      } else {
        console.error("Error loading dropdown data:", dropdownsResult.reason);
        setCustomers([]);
        setSalespersons([]);
        setProjects([]);
      }

      if (quoteResult.status === "fulfilled") {
        const quoteData = quoteResult.value;
        if (quoteData) {
          const mergedQuote = mergeQuoteDetail(quote, quoteData);
          setQuote(mergedQuote);
          if (QUOTE_DETAIL_STORAGE_KEY && typeof window !== "undefined") {
            try {
              localStorage.setItem(QUOTE_DETAIL_STORAGE_KEY, JSON.stringify(mergedQuote));
            } catch {
              // best effort only
            }
          }

          const dbAttachments = Array.isArray(quoteData.attachedFiles)
            ? quoteData.attachedFiles.map((attachment: any, index: number) => normalizeAttachmentFromQuote(attachment, index))
            : [];
          const dbComments = Array.isArray(quoteData.comments)
            ? quoteData.comments.map((comment: any, index: number) => normalizeCommentFromQuote(comment, index))
            : [];
          const dbActivityLogs = Array.isArray(quoteData.activityLogs)
            ? quoteData.activityLogs.map((entry: any, index: number) => normalizeActivityLogFromQuote(entry, index))
            : [];

          if (dbAttachments.length > 0) {
            setQuoteAttachments(dbAttachments);
          } else {
            const storedAttachments = localStorage.getItem(`quote_attachments_${quoteId}`);
            if (storedAttachments) {
              try {
                const parsed = JSON.parse(storedAttachments);
                setQuoteAttachments(Array.isArray(parsed) ? parsed : []);
              } catch (e) {
                console.error("Error loading attachments:", e);
                setQuoteAttachments([]);
              }
            } else {
              setQuoteAttachments([]);
            }
          }

          if (dbComments.length > 0) {
            setComments(dbComments);
          } else {
            const storedComments = localStorage.getItem(`quote_comments_${quoteId}`);
            if (storedComments) {
              try {
                const parsed = JSON.parse(storedComments);
                setComments(Array.isArray(parsed) ? parsed : []);
              } catch (e) {
                console.error("Error loading comments:", e);
                setComments([]);
              }
            } else {
              setComments([]);
            }
          }

          let resolvedActivityLogs: any[] = [];
          if (dbActivityLogs.length > 0) {
            resolvedActivityLogs = dbActivityLogs;
          } else {
            const storedActivityLogs = localStorage.getItem(`quote_activity_logs_${quoteId}`);
            if (storedActivityLogs) {
              try {
                const parsed = JSON.parse(storedActivityLogs);
                resolvedActivityLogs = Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.error("Error loading activity logs:", e);
                resolvedActivityLogs = [];
              }
            }
          }

          if (resolvedActivityLogs.length === 0) {
            const seedEntry = {
              id: `activity-seed-${quoteData.id || quoteData._id || quoteId}`,
              action: "Quote Created",
              description: `Quote ${quoteData.quoteNumber || quoteData.id || quoteId} was created.`,
              actor: quoteData.createdBy || "System",
              timestamp: quoteData.createdAt || quoteData.quoteDate || new Date().toISOString(),
              level: "info",
            };
            resolvedActivityLogs = [seedEntry];
            localStorage.setItem(`quote_activity_logs_${quoteId}`, JSON.stringify(resolvedActivityLogs));
            try {
              await updateQuoteDep(quoteId, { activityLogs: resolvedActivityLogs } as any);
            } catch (error) {
              console.error("Error seeding activity logs:", error);
            }
          }

          setActivityLogs(resolvedActivityLogs);
        }
      } else {
        console.error("Error loading quote data:", quoteResult.reason);
      }

      setLoading(false);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  useEffect(() => {
    let cancelled = false;

    const loadLinkedInvoices = async () => {
      const quoteIdValue = String(quoteId || "");
      const shouldLoad =
        Boolean(quoteIdValue) &&
        Boolean(quote) &&
        (linkedInvoicesLoadedForQuoteRef.current !== quoteIdValue ||
          (!linkedInvoicesLoading && Array.isArray(linkedInvoices) && linkedInvoices.length === 0));
      if (!shouldLoad) return;

      linkedInvoicesLoadedForQuoteRef.current = quoteIdValue;
      setLinkedInvoicesLoading(true);
      try {
        const quoteNumber = String((quote as any)?.quoteNumber || (quote as any)?.id || quoteId || "").trim();
        const quoteInvoiceId = String((quote as any)?.convertedToInvoiceId || (quote as any)?.invoiceId || "").trim();
        const quoteInvoiceNumber = String((quote as any)?.convertedToInvoiceNumber || (quote as any)?.invoiceNumber || "").trim();
        const invoices = await getInvoicesDep({ limit: 1000 });
        if (cancelled) return;

        const matches = (Array.isArray(invoices) ? invoices : [])
          .map((inv: any) => ({ ...inv, id: inv?._id || inv?.id }))
          .filter((inv: any) => {
            const invId = String(inv?.id || inv?._id || "").trim();
            if (quoteInvoiceId && invId && invId === quoteInvoiceId) return true;

            const refCandidates = [
              inv?.convertedFromQuote,
              inv?.convertedFromQuoteId,
              inv?.sourceQuoteId,
              inv?.quoteId,
              inv?.createdFromQuote,
              inv?.convertedFrom,
              inv?.quote?._id,
              inv?.quote?.id,
              inv?.quote,
            ]
              .filter(Boolean)
              .map((value: any) => String(value));
            if (quoteIdValue && refCandidates.some((value: string) => value === quoteIdValue)) return true;

            const invoiceQuoteNumber = String(
              inv?.sourceQuoteNumber ||
              inv?.quoteNumber ||
              inv?.convertedQuoteNumber ||
              inv?.referenceNumber ||
              inv?.orderNumber ||
              ""
            ).trim();
            if (quoteInvoiceNumber && invoiceQuoteNumber && invoiceQuoteNumber === quoteInvoiceNumber) return true;
            if (quoteNumber && invoiceQuoteNumber && invoiceQuoteNumber === quoteNumber) return true;

            return false;
          })
          .sort((a: any, b: any) => {
            const aTime = new Date(a?.invoiceDate || a?.date || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.invoiceDate || b?.date || b?.createdAt || 0).getTime();
            return bTime - aTime;
          });

        setLinkedInvoices(matches);
      } catch (error) {
        console.error("Error loading linked invoices:", error);
        setLinkedInvoices([]);
      } finally {
        if (!cancelled) setLinkedInvoicesLoading(false);
      }
    };

    loadLinkedInvoices();
    return () => {
      cancelled = true;
    };
  }, [quoteId, quote]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (isBulkActionsOpen && !target.closest(".quote-detail-bulk-actions-wrapper")) {
        setIsBulkActionsOpen(false);
      }
      if (isBulkFieldDropdownOpen && !target.closest(".bulk-update-field-dropdown-wrapper")) {
        setIsBulkFieldDropdownOpen(false);
      }
      if (showMailDropdown && !target.closest(".quote-detail-dropdown-wrapper")) {
        setShowMailDropdown(false);
      }
      if (showPdfDropdown && !target.closest(".quote-detail-dropdown-wrapper")) {
        setShowPdfDropdown(false);
      }
      if (showMoreDropdown && !target.closest(".quote-detail-dropdown-wrapper")) {
        setShowMoreDropdown(false);
      }
      if (showConvertDropdown && !target.closest(".quote-detail-dropdown-wrapper")) {
        setShowConvertDropdown(false);
      }
      if (showSidebarMoreDropdown && !target.closest(".quote-detail-sidebar-more-wrapper")) {
        setShowSidebarMoreDropdown(false);
      }
      if (isVisibilityDropdownOpen && visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(target)) {
        setIsVisibilityDropdownOpen(false);
      }
      if (isCustomizeDropdownOpen && customizeDropdownRef.current && !customizeDropdownRef.current.contains(target)) {
        setIsCustomizeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside as any);
    return () => document.removeEventListener("mousedown", handleClickOutside as any);
  }, [isBulkActionsOpen, isBulkFieldDropdownOpen, showMailDropdown, showPdfDropdown, showMoreDropdown, showConvertDropdown, showSidebarMoreDropdown, isVisibilityDropdownOpen, isCustomizeDropdownOpen]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!statusSuccessMessage) return;
    const timer = setTimeout(() => setStatusSuccessMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [statusSuccessMessage]);

  return {
    quoteId,
    quote,
    setQuote,
    allQuotes,
    setAllQuotes: setUniqueAllQuotes,
    loading,
    setLoading,
    baseCurrency,
    setBaseCurrency,
    activeTab,
    setActiveTab,
    showPdfView,
    setShowPdfView,
    showMailDropdown,
    setShowMailDropdown,
    showPdfDropdown,
    setShowPdfDropdown,
    showMoreDropdown,
    setShowMoreDropdown,
    showConvertDropdown,
    setShowConvertDropdown,
    showSidebarMoreDropdown,
    setShowSidebarMoreDropdown,
    isCloningQuote,
    setIsCloningQuote,
    selectedQuotes,
    setSelectedQuotes,
    isFilterDropdownOpen,
    setIsFilterDropdownOpen,
    selectedFilter,
    setSelectedFilter,
    isBulkActionsOpen,
    setIsBulkActionsOpen,
    isBulkUpdateModalOpen,
    setIsBulkUpdateModalOpen,
    isMarkAsSentModalOpen,
    setIsMarkAsSentModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    statusSuccessMessage,
    setStatusSuccessMessage,
    activityLogs,
    setActivityLogs,
    linkedInvoices,
    setLinkedInvoices,
    linkedInvoicesLoading,
    setLinkedInvoicesLoading,
    linkedInvoicesLoadedForQuoteRef,
    bulkUpdateField,
    setBulkUpdateField,
    bulkUpdateValue,
    setBulkUpdateValue,
    isBulkFieldDropdownOpen,
    setIsBulkFieldDropdownOpen,
    bulkFieldSearch,
    setBulkFieldSearch,
    showEmailModal,
    setShowEmailModal,
    showEmailDetails,
    setShowEmailDetails,
    emailData,
    setEmailData,
    showCc,
    setShowCc,
    showBcc,
    setShowBcc,
    attachments,
    setAttachments,
    attachQuotePDF,
    setAttachQuotePDF,
    fontSize,
    setFontSize,
    isBold,
    setIsBold,
    isItalic,
    setIsItalic,
    isUnderline,
    setIsUnderline,
    isStrikethrough,
    setIsStrikethrough,
    emailModalRef,
    fileInputRef,
    isQuoteDocumentHovered,
    setIsQuoteDocumentHovered,
    isCustomizeDropdownOpen,
    setIsCustomizeDropdownOpen,
    isOrganizationAddressModalOpen,
    setIsOrganizationAddressModalOpen,
    isTermsAndConditionsModalOpen,
    setIsTermsAndConditionsModalOpen,
    showMobileSidebar,
    setShowMobileSidebar,
    organizationData,
    setOrganizationData,
    logoFile,
    setLogoFile,
    logoPreview,
    setLogoPreview,
    termsData,
    setTermsData,
    customizeDropdownRef,
    organizationAddressFileInputRef,
    showAttachmentsModal,
    setShowAttachmentsModal,
    quoteAttachments,
    setQuoteAttachments,
    isUploadingAttachment,
    setIsUploadingAttachment,
    isDragging,
    setIsDragging,
    selectedImage,
    setSelectedImage,
    showImageViewer,
    setShowImageViewer,
    attachmentsFileInputRef,
    showCommentsSidebar,
    setShowCommentsSidebar,
    comments,
    setComments,
    newComment,
    setNewComment,
    isSavingComment,
    setIsSavingComment,
    commentBold,
    setCommentBold,
    commentItalic,
    setCommentItalic,
    commentUnderline,
    setCommentUnderline,
    showCustomFieldsModal,
    setShowCustomFieldsModal,
    customFields,
    setCustomFields,
    showShareModal,
    setShowShareModal,
    shareVisibility,
    setShareVisibility,
    isVisibilityDropdownOpen,
    setIsVisibilityDropdownOpen,
    linkExpirationDate,
    setLinkExpirationDate,
    generatedLink,
    setGeneratedLink,
    isLinkGenerated,
    setIsLinkGenerated,
    shareModalRef,
    visibilityDropdownRef,
    customers,
    setCustomers,
    salespersons,
    setSalespersons,
    projects,
    setProjects,
    organizationProfile,
    setOrganizationProfile,
    ownerEmail,
    setOwnerEmail,
    organizationName,
    organizationNameHtml,
    filterOptions,
    getFilteredQuotes,
    handleSelectQuote,
    handleSelectAll,
    handleClearSelection,
    fetchOrganizationProfile,
    fetchOwnerEmail,
    updateOrganizationProfile,
    appendActivityLog,
    getCurrentUserDisplayName,
    isImageFileAttachment,
    normalizeAttachmentFromQuote,
    normalizeCommentFromQuote,
    normalizeActivityLogFromQuote,
    getQuoteByIdDep,
    getQuotesDep,
    getCustomersDep,
    getSalespersonsDep,
    getProjectsDep,
    getInvoicesDep,
    updateQuoteDep,
    senderEmailsAPIDep,
    resolveVerifiedPrimarySenderDep,
  };
};
