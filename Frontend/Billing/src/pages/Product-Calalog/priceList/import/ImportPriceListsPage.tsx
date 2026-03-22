import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ThreePhaseImportWizard, { ImportFieldDef, ImportMappedRecord } from '../../shared/ThreePhaseImportWizard';

const PRICE_LISTS_STORAGE_KEY = 'inv_price_lists_v1';
import { priceListsAPI } from '../../../../services/api';

const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: 'name', label: 'Name', required: true, aliases: ['name', 'price list name', 'price list'] },
  { key: 'description', label: 'Description', aliases: ['description', 'desc'] },
  { key: 'status', label: 'Status', aliases: ['status'] },
  { key: 'currency', label: 'Currency', aliases: ['currency', 'currency code'] },
  { key: 'priceListType', label: 'Price List Type', aliases: ['price list type', 'type'] },
  { key: 'pricingScheme', label: 'Pricing Scheme', aliases: ['pricing scheme', 'scheme'] },
  { key: 'roundOffTo', label: 'Round Off Preference', aliases: ['round off preference', 'round off', 'roundoffto'] },
  { key: 'markup', label: 'Markup', aliases: ['markup', 'markup value'] },
  { key: 'markupType', label: 'Markup Type', aliases: ['markup type'] },
];

const SAMPLE_HEADERS = ['Name', 'Description', 'Status', 'Currency', 'Price List Type', 'Pricing Scheme', 'Round Off Preference', 'Markup', 'Markup Type'];
const SAMPLE_ROWS = [
  ['Retail USD', 'Default retail pricing', 'Active', 'USD', 'Sales', 'Unit', 'Never mind', '1%', 'Markup'],
  ['Wholesale AED', 'Bulk customer rates', 'Inactive', 'AED', 'Sales', 'Volume', '2 Decimal Places', '3%', 'Markdown'],
];

const toBooleanStatus = (statusRaw: string) => {
  const normalized = String(statusRaw || '').trim().toLowerCase();
  return normalized === 'inactive' ? 'Inactive' : 'Active';
};

const normalizeMarkup = (markupRaw: string) => {
  const value = String(markupRaw || '').trim();
  if (!value) return '1%';
  if (value.endsWith('%')) return value;
  const n = Number(value.replace(/[^\d.-]/g, ''));
  if (Number.isFinite(n)) return `${n}%`;
  return value;
};

export default function ImportPriceListsPage() {
  const navigate = useNavigate();

  const handleImport = async (rows: ImportMappedRecord[]) => {
    try {
      const prepared = rows.map((row) => ({
        name: String(row.name || '').trim(),
        description: String(row.description || '').trim(),
        status: toBooleanStatus(row.status),
        currency: String(row.currency || '-').trim() || '-',
        priceListType: String(row.priceListType || 'Sales').trim() || 'Sales',
        pricingScheme: String(row.pricingScheme || 'Unit').trim() || 'Unit',
        discountEnabled: false,
        roundOffTo: String(row.roundOffTo || 'Never mind').trim() || 'Never mind',
        markup: normalizeMarkup(row.markup),
        markupType: String(row.markupType || 'Markup').trim() || 'Markup',
      }));

      let successCount = 0;
      for (const payload of prepared) {
        const res: any = await priceListsAPI.create(payload);
        if (res.success) successCount++;
      }

      // Sync back to localStorage for other pages that haven't migrated yet
      try {
        const listRes: any = await priceListsAPI.list({ limit: 1000 });
        if (listRes.success) {
          localStorage.setItem(PRICE_LISTS_STORAGE_KEY, JSON.stringify(listRes.data));
        }
      } catch (e) {
        console.error("Failed to sync price lists to local storage", e);
      }

      toast.success(`${successCount} price list(s) imported successfully.`);
      navigate('/products/price-lists');
    } catch (error) {
      console.error(error);
      toast.error('Failed to import price lists.');
    }
  };

  return (
    <ThreePhaseImportWizard
      entityLabel="Price List"
      entityPluralLabel="Price Lists"
      fields={IMPORT_FIELDS}
      sampleHeaders={SAMPLE_HEADERS}
      sampleRows={SAMPLE_ROWS}
      sampleFileName="price-lists-import-sample.xls"
      onCancel={() => navigate('/products/price-lists')}
      onImport={handleImport}
    />
  );
}
