import React from "react";
import { ChevronDown, ChevronRight, Filter, Plus } from "lucide-react";
import { formatCurrency } from "../CustomerDetail/CustomerDetail.shared";

function Section({
  expanded,
  title,
  onToggle,
  action,
  children,
}: {
  expanded: boolean;
  title: string;
  onToggle: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`flex items-center justify-between py-3 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
          expanded ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
        }`}
      >
        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={onToggle}>
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          <span className="text-sm font-medium text-gray-900">{title}</span>
        </div>
        {action}
      </div>
      {expanded && children}
    </>
  );
}

function StatusButton({
  value,
  label,
  onClick,
}: {
  value: string;
  label: string;
  onClick: (status: string) => void;
}) {
  return (
    <div className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 text-gray-700" onClick={() => onClick(value)}>
      {label}
    </div>
  );
}

export default function CustomerDetailTransactionsPurchases({ detail }: { detail: any }) {
  const {
    creditNoteStatusDropdownRef,
    creditNoteStatusFilter,
    customer,
    expandedTransactions,
    expenseStatusDropdownRef,
    expenseStatusFilter,
    getFilteredCreditNotes,
    getFilteredExpenses,
    getFilteredProjects,
    getFilteredRecurringExpenses,
    getFilteredSalesReceipts,
    isCreditNoteStatusDropdownOpen,
    isExpenseStatusDropdownOpen,
    isProjectStatusDropdownOpen,
    isRecurringExpenseStatusDropdownOpen,
    isSalesReceiptStatusDropdownOpen,
    navigate,
    projectStatusDropdownRef,
    projectStatusFilter,
    recurringExpenseStatusDropdownRef,
    recurringExpenseStatusFilter,
    salesReceiptStatusDropdownRef,
    salesReceiptStatusFilter,
    setCreditNoteStatusFilter,
    setExpenseStatusFilter,
    setIsCreditNoteStatusDropdownOpen,
    setIsExpenseStatusDropdownOpen,
    setIsProjectStatusDropdownOpen,
    setIsRecurringExpenseStatusDropdownOpen,
    setIsSalesReceiptStatusDropdownOpen,
    setProjectStatusFilter,
    setRecurringExpenseStatusFilter,
    setSalesReceiptStatusFilter,
    toggleTransactionSection,
  } = detail as any;

  return (
    <>
      <Section
        expanded={expandedTransactions.expenses}
        title="Expenses"
        onToggle={() => toggleTransactionSection("expenses")}
        action={
          <button
            className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate("/purchases/expenses/new", { state: { customerId: customer?.id, customerName: customer?.name } });
            }}
          >
            <Plus size={14} />
            New
          </button>
        }
      >
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end gap-2 mb-0">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Filter size={16} />
            </button>
            <div className="relative" ref={expenseStatusDropdownRef}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpenseStatusDropdownOpen(!isExpenseStatusDropdownOpen)}
              >
                Status: {expenseStatusFilter === "all" ? "All" : expenseStatusFilter.charAt(0).toUpperCase() + expenseStatusFilter.slice(1)}
                <ChevronDown size={14} />
              </button>
              {isExpenseStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                  {["all", "unbilled", "invoiced", "reimbursable", "non-reimbursable"].map((status) => (
                    <StatusButton
                      key={status}
                      value={status}
                      label={status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      onClick={(next) => {
                        setExpenseStatusFilter(next);
                        setIsExpenseStatusDropdownOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">EXPENSE ACCOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">VENDOR NAME</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PAID THROUGH</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredExpenses().length > 0 ? (
                  getFilteredExpenses().map((expense: any) => (
                    <tr
                      key={expense.id}
                      onClick={() => navigate(`/purchases/expenses/${expense.id}`)}
                      className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(String(expense.date || expense.createdAt || 0)).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-900">{expense.expenseAccount || "-"}</td>
                      <td className="py-3 px-4 text-gray-900">{expense.referenceNumber || "-"}</td>
                      <td className="py-3 px-4 text-gray-900">{expense.vendorName || "-"}</td>
                      <td className="py-3 px-4 text-gray-900">{expense.paidThrough || "-"}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {formatCurrency(expense.amount || 0, expense.currency || customer?.currency || "AMD")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${
                            (expense.status || "").toLowerCase() === "invoiced" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {expense.status || "Unbilled"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-sm text-gray-500">
                      There are no expenses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section
        expanded={expandedTransactions.recurringExpenses}
        title="Recurring Expenses"
        onToggle={() => toggleTransactionSection("recurringExpenses")}
        action={
          <button
            className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate("/purchases/expenses/recurring/new", { state: { customerId: customer?.id, customerName: customer?.name } });
            }}
          >
            <Plus size={14} />
            New
          </button>
        }
      >
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end gap-2 mb-0">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Filter size={16} />
            </button>
            <div className="relative" ref={recurringExpenseStatusDropdownRef}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsRecurringExpenseStatusDropdownOpen(!isRecurringExpenseStatusDropdownOpen)}
              >
                Status: {recurringExpenseStatusFilter === "all" ? "All" : recurringExpenseStatusFilter.charAt(0).toUpperCase() + recurringExpenseStatusFilter.slice(1)}
                <ChevronDown size={14} />
              </button>
              {isRecurringExpenseStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                  {["all", "active", "stopped", "expired"].map((status) => (
                    <StatusButton
                      key={status}
                      value={status}
                      label={status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      onClick={(next) => {
                        setRecurringExpenseStatusFilter(next);
                        setIsRecurringExpenseStatusDropdownOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROFILE NAME</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">FREQUENCY</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LAST EXPENSE DATE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">NEXT EXPENSE DATE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredRecurringExpenses().length > 0 ? (
                  getFilteredRecurringExpenses().map((re: any) => (
                    <tr
                      key={re.id}
                      onClick={() => navigate(`/purchases/expenses/recurring/${re.id}`)}
                      className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">{re.profileName || re.id}</td>
                      <td className="py-3 px-4 text-gray-900">
                        {re.repeatEvery} {re.repeatUnit}
                      </td>
                      <td className="py-3 px-4 text-gray-900">{re.lastExpenseDate ? new Date(re.lastExpenseDate).toLocaleDateString() : "-"}</td>
                      <td className="py-3 px-4 text-gray-900">{re.nextExpenseDate ? new Date(re.nextExpenseDate).toLocaleDateString() : "-"}</td>
                      <td className="py-3 px-4 text-gray-900">{formatCurrency(re.amount || 0, re.currency || customer?.currency || "AMD")}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${
                            (re.status || "").toLowerCase() === "active"
                              ? "bg-green-100 text-green-700"
                              : (re.status || "").toLowerCase() === "stopped"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {re.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-sm text-gray-500">
                      There are no recurring expenses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section
        expanded={expandedTransactions.projects}
        title="Projects"
        onToggle={() => toggleTransactionSection("projects")}
        action={
          <button
            className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate("/time-tracking/projects/new", { state: { customerId: customer?.id, customerName: customer?.name } });
            }}
          >
            <Plus size={14} />
            New
          </button>
        }
      >
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end gap-2 mb-0">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Filter size={16} />
            </button>
            <div className="relative" ref={projectStatusDropdownRef}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsProjectStatusDropdownOpen(!isProjectStatusDropdownOpen)}
              >
                Status: {projectStatusFilter === "all" ? "All" : projectStatusFilter.charAt(0).toUpperCase() + projectStatusFilter.slice(1)}
                <ChevronDown size={14} />
              </button>
              {isProjectStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                  {["all", "active", "on hold", "finished", "cancelled"].map((status) => (
                    <StatusButton
                      key={status}
                      value={status}
                      label={status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      onClick={(next) => {
                        setProjectStatusFilter(next);
                        setIsProjectStatusDropdownOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROJECT NAME</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROJECT CODE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BILLING METHOD</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">TOTAL HOURS</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BILLED AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">UN-BILLED AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredProjects().length > 0 ? (
                  getFilteredProjects().map((project: any) => (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                      className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">{project.projectName || project.name}</td>
                      <td className="py-3 px-4 text-gray-900">{project.projectCode || "-"}</td>
                      <td className="py-3 px-4 text-gray-900">{project.billingMethod || "-"}</td>
                      <td className="py-3 px-4 text-gray-900">{project.totalHours || "0:00"}</td>
                      <td className="py-3 px-4 text-gray-900">{formatCurrency(project.billedAmount || 0, project.currency || customer?.currency || "AMD")}</td>
                      <td className="py-3 px-4 text-gray-900">{formatCurrency(project.unbilledAmount || 0, project.currency || customer?.currency || "AMD")}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${
                            (project.status || "").toLowerCase() === "active"
                              ? "bg-green-100 text-green-700"
                              : (project.status || "").toLowerCase() === "finished"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {project.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-sm text-gray-500">
                      There are no projects.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section
        expanded={expandedTransactions.creditNotes}
        title="Credit Notes"
        onToggle={() => toggleTransactionSection("creditNotes")}
        action={
          <button
            className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate("/sales/credit-notes/new", { state: { customerId: customer?.id, customerName: customer?.name } });
            }}
          >
            <Plus size={14} />
            New
          </button>
        }
      >
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end gap-2 mb-0">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Filter size={16} />
            </button>
            <div className="relative" ref={creditNoteStatusDropdownRef}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsCreditNoteStatusDropdownOpen(!isCreditNoteStatusDropdownOpen)}
              >
                Status: {creditNoteStatusFilter === "all" ? "All" : creditNoteStatusFilter.charAt(0).toUpperCase() + creditNoteStatusFilter.slice(1)}
                <ChevronDown size={14} />
              </button>
              {isCreditNoteStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                  {["all", "draft", "open", "closed", "void"].map((status) => (
                    <StatusButton
                      key={status}
                      value={status}
                      label={status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      onClick={(next) => {
                        setCreditNoteStatusFilter(next);
                        setIsCreditNoteStatusDropdownOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">CREDIT NOTE#</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE#</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BALANCE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredCreditNotes().length > 0 ? (
                  getFilteredCreditNotes().map((cn: any) => (
                    <tr
                      key={cn.id}
                      onClick={() => navigate(`/sales/credit-notes/${cn.id}`)}
                      className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(String(cn.date || cn.creditNoteDate || 0)).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{cn.creditNoteNumber || cn.id}</td>
                      <td className="py-3 px-4 text-gray-900">{cn.referenceNumber || "-"}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{formatCurrency(cn.total || 0, cn.currency || customer?.currency || "AMD")}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{formatCurrency(cn.balance || 0, cn.currency || customer?.currency || "AMD")}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${(cn.status || "").toLowerCase() === "open" ? "bg-blue-100 text-blue-700" : (cn.status || "").toLowerCase() === "closed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                          {cn.status || "Draft"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-sm text-gray-500">
                      There are no credit notes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section
        expanded={expandedTransactions.salesReceipts}
        title="Sales Receipts"
        onToggle={() => toggleTransactionSection("salesReceipts")}
        action={
          <button
            className="hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate("/sales/sales-receipts/new", { state: { customerId: customer?.id, customerName: customer?.name } });
            }}
          >
            <Plus size={14} />
            New
          </button>
        }
      >
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end gap-2 mb-0">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
              <Filter size={16} />
            </button>
            <div className="relative" ref={salesReceiptStatusDropdownRef}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsSalesReceiptStatusDropdownOpen(!isSalesReceiptStatusDropdownOpen)}
              >
                Status: {salesReceiptStatusFilter === "all" ? "All" : salesReceiptStatusFilter.charAt(0).toUpperCase() + salesReceiptStatusFilter.slice(1)}
                <ChevronDown size={14} />
              </button>
              {isSalesReceiptStatusDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                  {["all", "draft", "sent", "paid", "void"].map((status) => (
                    <StatusButton
                      key={status}
                      value={status}
                      label={status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      onClick={(next) => {
                        setSalesReceiptStatusFilter(next);
                        setIsSalesReceiptStatusDropdownOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">SALES RECEIPT#</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredSalesReceipts().length > 0 ? (
                  getFilteredSalesReceipts().map((sr: any) => (
                    <tr
                      key={sr.id}
                      onClick={() => navigate(`/sales/sales-receipts/${sr.id}`)}
                      className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(String(sr.date || sr.salesReceiptDate || 0)).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{sr.salesReceiptNumber || sr.id}</td>
                      <td className="py-3 px-4 text-gray-900">{sr.referenceNumber || "-"}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{formatCurrency(sr.total || 0, sr.currency || customer?.currency || "AMD")}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-[11px] font-medium uppercase ${(sr.status || "").toLowerCase() === "paid" ? "bg-green-100 text-green-700" : (sr.status || "").toLowerCase() === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                          {sr.status || "Draft"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-sm text-gray-500">
                      There are no sales receipts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section expanded={expandedTransactions.refunds} title="Refunds" onToggle={() => toggleTransactionSection("refunds")} />
      {expandedTransactions.refunds && (
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="text-sm text-gray-500">No refunds found.</div>
        </div>
      )}
    </>
  );
}
