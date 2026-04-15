import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X,
  MessageSquare, User, Calendar, Plus, Paperclip, Minus, Check,
  Trash2, MoreVertical, Edit2, Edit3, Settings, Info, Tag, HelpCircle, HardDrive,
  Layers, Box, Folder, Cloud, Calculator, Image as ImageIcon, GripVertical,
  FileText, CreditCard, Square, Upload, Loader2, LayoutGrid, PlusCircle, Mail, Building2, AlertTriangle
} from "lucide-react";
import { getCustomers, saveQuote, getQuotes, getQuoteById, updateQuote, getProjects, getSalespersonsFromAPI, updateSalesperson, getItemsFromAPI, getTaxes, Customer, Tax, Salesperson, Quote, ContactPerson, Project } from "../../salesModel";

import { getAllDocuments } from "../../../utils/documentStorage";
import { customersAPI, projectsAPI, salespersonsAPI, quotesAPI, itemsAPI, currenciesAPI, contactPersonsAPI, vendorsAPI, settingsAPI, chartOfAccountsAPI, documentsAPI, reportingTagsAPI, priceListsAPI, transactionNumberSeriesAPI } from "../../../services/api";
import { useAccountSelect } from "../../../hooks/useAccountSelect";
import { useCurrency } from "../../../hooks/useCurrency";
import { API_BASE_URL, getToken } from "../../../services/auth";
import toast from "react-hot-toast";
import { Country, State } from "country-state-city";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import { buildTaxOptionGroups, taxLabel, normalizeCreatedTaxPayload, isTaxActive } from "../../../hooks/Taxdropdownstyle";
import { readTaxesLocal, createTaxLocal, isTaxGroupRecord } from "../../settings/organization-settings/taxes-compliance/TAX/storage";

import NewQuoteFormSection from "./NewQuoteFormSection";
import NewQuoteItemsSummarySection from "./NewQuoteItemsSummarySection";
import NewQuotePriceListSwitchDialog from "./NewQuotePriceListSwitchDialog";
import NewQuoteAddressModal from "./NewQuoteAddressModal";
import NewQuoteStickyFooter from "./NewQuoteStickyFooter";
import NewQuoteItemModal from "./NewQuoteItemModal";
import NewQuoteProjectModal from "./NewQuoteProjectModal";
import NewQuoteQuoteNumberModal from "./NewQuoteQuoteNumberModal";
import NewQuoteContactPersonModal from "./NewQuoteContactPersonModal";
import NewQuoteBulkAddModal from "./NewQuoteBulkAddModal";
import NewQuoteDocumentsModal from "./NewQuoteDocumentsModal";
import NewQuoteCloudPickerModal from "./NewQuoteCloudPickerModal";
import NewQuoteCustomerSearchModal from "./NewQuoteCustomerSearchModal";


type Props = {
  controller: any;
};

export default function NewQuoteView({ controller }: Props) {
  return (
    <>
      <div className="w-full min-h-full bg-white pb-24">
        <NewQuoteFormSection controller={controller} />
        <NewQuoteItemsSummarySection controller={controller} />
      </div>
      <NewQuotePriceListSwitchDialog controller={controller} />
      <NewQuoteAddressModal controller={controller} />
      <NewQuoteStickyFooter controller={controller} />
      <NewQuoteItemModal controller={controller} />
      <NewQuoteProjectModal controller={controller} />
      <NewQuoteQuoteNumberModal controller={controller} />
      <NewQuoteContactPersonModal controller={controller} />
      <NewQuoteBulkAddModal controller={controller} />
      <NewQuoteDocumentsModal controller={controller} />
      <NewQuoteCloudPickerModal controller={controller} />
      <NewQuoteCustomerSearchModal controller={controller} />
    </>
  );
}
