import { useMemo, useRef, useState } from "react";

type Account = {
  id: string;
  name: string;
  accountCode: string;
  type: string;
};

const DEFAULT_ACCOUNTS: Account[] = [
  { id: "income-1", name: "General Income", accountCode: "4000", type: "Income" },
  { id: "income-2", name: "Sales", accountCode: "4010", type: "Income" },
  { id: "income-3", name: "Service Revenue", accountCode: "4020", type: "Income" },
  { id: "expense-1", name: "Discount Given", accountCode: "5000", type: "Expense" },
];

export const useAccountSelect = (accounts: Account[] = DEFAULT_ACCOUNTS) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredAccounts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) => {
      const haystack = `${account.name} ${account.accountCode} ${account.type}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [accounts, searchTerm]);

  const groupedAccounts = useMemo(() => {
    return filteredAccounts.reduce<Record<string, Account[]>>((grouped, account) => {
      const key = account.type || "Other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(account);
      return grouped;
    }, {});
  }, [filteredAccounts]);

  return {
    isOpen,
    setIsOpen,
    searchTerm,
    setSearchTerm,
    filteredAccounts,
    groupedAccounts,
    dropdownRef,
  };
};
