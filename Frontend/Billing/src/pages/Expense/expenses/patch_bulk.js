const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'RecordExpense.tsx');
try {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update State
  const stateTarget = /\/\/ Bulk expenses state\s+const\s+\[bulkExpenses,\s+setBulkExpenses\]\s+=\s+useState\(\s+Array\.from\({\s+length:\s+10\s+},\s+\(_,\s+i\)\s+=>\s+\(\{\s+id:\s+Date\.now\(\)\s+\+\s+i,\s+date:\s+\(\(\)\s+=>\s+\{\s+const\s+today\s+=\s+new\s+Date\(\);\s+const\s+d\s+=\s+String\(today\.getDate\(\)\)\.padStart\(2,\s+'0'\);\s+const\s+m\s+=\s+String\(today\.getMonth\(\)\s+\+\s+1\)\.padStart\(2,\s+'0'\);\s+const\s+y\s+=\s+today\.getFullYear\(\);\s+return\s+`\$\{d\}\/\$\{m\}\/\$\{y\}`;\s+\}\)\(\),\s+expenseAccount:\s+"",\s+amount:\s+"",\s+currency:\s+initialCurrencyCode,\s+paidThrough:\s+"",\s+vendor:\s+"",\s+customerName:\s+"",\s+projects:\s+"",\s+billable:\s+false\s+\}\)\)\s+\);/;

  const newState = `// Bulk expenses state
  const [bulkExpenses, setBulkExpenses] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      date: (() => {
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        return \`\${d}/\${m}/\${y}\`;
      })(),
      expenseAccount: "",
      amount: "",
      currency: initialCurrencyCode,
      location: initialLocationName,
      tax: "",
      isTaxInclusive: true,
      vendor: "",
      customerName: "",
      projects: "",
      billable: false,
      reportingTags: []
    }))
  );
  const [bulkPaidThrough, setBulkPaidThrough] = useState("");
  const [activeBulkRowIndex, setActiveBulkRowIndex] = useState<number | null>(null);`;

  if (stateTarget.test(content)) {
    content = content.replace(stateTarget, newState);
    console.log('State updated');
  } else {
    console.log('State target not found');
  }

  // 2. Update handleSave
  const handleSaveTarget = /if\s+\(activeTab === "bulk"\)\s+\{([\s\S]+?)if\s+\(!formData\.date\s+\|\|\s+!formData\.expenseAccount/;
  const newHandleSave = `if (activeTab === "bulk") {
      // Filter out empty rows - require at least Date, Account, and Amount
      const validBulkExpenses = bulkExpenses.filter(
        exp => exp.date && exp.expenseAccount && exp.amount
      );

      if (validBulkExpenses.length === 0) {
        alert("Please fill in at least one expense with all required fields (Date, Category Name, Amount)");
        setSaveLoadingState(null);
        return false;
      }

      if (!bulkPaidThrough) {
        alert("Please select a Paid Through account for bulk expenses");
        setSaveLoadingState(null);
        return false;
      }

      try {
        let successCount = 0;
        let errorMessages = [];

        for (const exp of validBulkExpenses) {
          // Find IDs from names
          const vendor = allVendors.find(v => (v.displayName || v.name) === exp.vendor);
          const customer = allCustomers.find(c => (c.displayName || c.name) === exp.customerName);
          const project = allProjects.find(p => p.name === exp.projects);

          const expenseAccountObj = accounts.find(a => a.accountName === exp.expenseAccount || a.accountName?.toLowerCase() === (exp.expenseAccount || '').toLowerCase());
          const paidThroughObj = accounts.find(a => a.accountName === bulkPaidThrough || a.accountName?.toLowerCase() === (bulkPaidThrough || '').toLowerCase());

          const expenseData: any = {
            date: formatDateForAPI(exp.date),
            account_name: exp.expenseAccount,
            account_id: expenseAccountObj?._id || expenseAccountObj?.id,
            amount: parseFloat(exp.amount),
            paid_through_account_name: bulkPaidThrough,
            paid_through_account_id: paidThroughObj?._id || paidThroughObj?.id,
            currency_code: exp.currency || baseCurrencyCode,
            location: exp.location,
            tax_id: exp.tax,
            is_inclusive_tax: exp.isTaxInclusive,
            vendor_id: vendor ? (vendor._id || vendor.id) : undefined,
            customer_id: customer ? (customer._id || customer.id) : undefined,
            project_id: project ? (project._id || project.id) : undefined,
            is_billable: exp.billable,
            reportingTags: exp.reportingTags,
            description: "",
          };

          const response = await expensesAPI.create(expenseData);

          if (response && (response.code === 0 || response.success)) {
            await generateJournalEntry(expenseData);
            successCount++;
          } else {
            errorMessages.push(\`Row \${exp.id}: \${response?.message || "Error"}\`);
          }
        }

        if (successCount > 0) {
          alert(\`\${successCount} expenses saved successfully!\${errorMessages.length > 0 ? \`\\nErrors: \${errorMessages.join(', ')}\` : ''}\`);
          window.dispatchEvent(new Event("expensesUpdated"));

          if (navigateAway) {
            navigate("/expenses");
          }
          return true;
        } else {
          alert(\`Failed to save expenses: \${errorMessages.join(', ')}\`);
          return false;
        }
      } catch (error: any) {
        console.error("Error saving bulk expenses:", error);
        alert(error?.message || "Error creating bulk expenses. Please try again.");
        return false;
      } finally {
        setSaveLoadingState(null);
      }
    }

    if (!formData.date || !formData.expenseAccount`;

  if (handleSaveTarget.test(content)) {
    content = content.replace(handleSaveTarget, newHandleSave);
    console.log('handleSave updated');
  } else {
    console.log('handleSave target not found');
  }

  // 3. Update Table
  const bulkBlockTarget = /<div className="p-6 max-w-full">[\s\S]+?\+ Add More Expenses\s+<\/button>\s+<\/div>/;
  const newBulkBlock = `<div className="p-6 max-w-full">
              {/* Global Paid Through Selector */}
              <div className="mb-6 flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-700">PAID THROUGH*</label>
                <div className="w-[300px]">
                  <select
                    value={bulkPaidThrough}
                    onChange={(e) => setBulkPaidThrough(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                  >
                    <option value="">Select an account</option>
                    {Object.entries(structuredPaidThrough).map(([category, items]: [string, any]) => (
                      <optgroup key={category} label={category}>
                        {items.map((account: string) => (
                          <option key={account} value={account}>
                            {account}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: "white", borderRadius: "6px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#C53030", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          DATE<span style={{ color: "#C53030" }}>*</span>
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#C53030", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          CATEGORY NAME<span style={{ color: "#C53030" }}>*</span>
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#C53030", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          AMOUNT<span style={{ color: "#C53030" }}>*</span>
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          LOCATION
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          TAX
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          CUSTOMER NAME
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          PROJECTS
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          BILLABLE
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#C53030", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          REPORTING TAGS
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "center", width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkExpenses.map((expense, index) => (
                        <tr key={expense.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          {/* DATE */}
                          <td style={{ padding: "8px 16px", width: "140px" }}>
                            <DatePicker
                              value={expense.date}
                              onChange={(date) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].date = date;
                                setBulkExpenses(newExpenses);
                              }}
                              placeholder="dd MMM yyyy"
                            />
                          </td>

                          {/* CATEGORY NAME */}
                          <td style={{ padding: "8px 16px", width: "200px" }}>
                            <select
                              value={expense.expenseAccount}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].expenseAccount = e.target.value;
                                setBulkExpenses(newExpenses);
                              }}
                              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                              style={{ color: expense.expenseAccount ? "#374151" : "#9ca3af" }}
                            >
                              <option value="">Select an account</option>
                              {Object.entries(structuredAccounts).map(([category, items]: [string, any]) => (
                                <optgroup key={category} label={category}>
                                  {items.map((acc: string) => (
                                    <option key={acc} value={acc}>{acc}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>

                          {/* AMOUNT */}
                          <td style={{ padding: "8px 16px", width: "160px" }}>
                            <div className="flex rounded-md border border-gray-300 overflow-hidden focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372]">
                              <div className="relative bg-[#f8fafc] border-r border-gray-300">
                                <select
                                  value={expense.currency}
                                  onChange={(e) => {
                                    if (e.target.value === "ADD_NEW") {
                                      setNewCurrencyModalOpen(true);
                                    } else {
                                      const newExpenses = [...bulkExpenses];
                                      newExpenses[index].currency = e.target.value;
                                      setBulkExpenses(newExpenses);
                                    }
                                  }}
                                  className="appearance-none bg-transparent pl-2 pr-6 py-1.5 text-xs font-semibold text-gray-700 outline-none cursor-pointer"
                                >
                                  {currencyOptions.map((code) => (
                                    <option key={\`\${expense.id}-\${code}\`} value={code}>{code}</option>
                                  ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                              </div>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={expense.amount}
                                onChange={(e) => {
                                  const newExpenses = [...bulkExpenses];
                                  newExpenses[index].amount = e.target.value;
                                  setBulkExpenses(newExpenses);
                                }}
                                className="w-full px-2 py-1.5 text-sm outline-none border-none"
                              />
                            </div>
                          </td>

                          {/* LOCATION */}
                          <td style={{ padding: "8px 16px", width: "180px" }}>
                            <select
                              value={expense.location}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].location = e.target.value;
                                setBulkExpenses(newExpenses);
                              }}
                              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                            >
                              {locationOptions.map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          </td>

                          {/* TAX */}
                          <td style={{ padding: "8px 16px", width: "200px" }}>
                            <div className="space-y-1">
                              <select
                                value={expense.tax}
                                onChange={(e) => {
                                  const newExpenses = [...bulkExpenses];
                                  newExpenses[index].tax = e.target.value;
                                  setBulkExpenses(newExpenses);
                                }}
                                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                style={{ color: expense.tax ? "#374151" : "#9ca3af" }}
                              >
                                <option value="">Select a Tax</option>
                                {taxes.map(tax => (
                                  <option key={getTaxId(tax)} value={getTaxId(tax)}>{taxLabel(tax)}</option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={expense.isTaxInclusive}
                                  onChange={(e) => {
                                    const newExpenses = [...bulkExpenses];
                                    newExpenses[index].isTaxInclusive = e.target.checked;
                                    setBulkExpenses(newExpenses);
                                  }}
                                  className="h-3 w-3 rounded border-gray-300 text-[#156372]"
                                />
                                Tax Inclusive
                              </label>
                            </div>
                          </td>

                          {/* CUSTOMER NAME */}
                          <td style={{ padding: "8px 16px", width: "180px" }}>
                            <select
                              value={expense.customerName}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].customerName = e.target.value;
                                setBulkExpenses(newExpenses);
                              }}
                              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                              style={{ color: expense.customerName ? "#374151" : "#9ca3af" }}
                            >
                              <option value="">Select</option>
                              {allCustomers.map(c => (
                                <option key={c._id || c.id} value={c.displayName || c.name}>
                                  {c.displayName || c.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* PROJECTS */}
                          <td style={{ padding: "8px 16px", width: "180px" }}>
                            <select
                              value={expense.projects}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].projects = e.target.value;
                                setBulkExpenses(newExpenses);
                              }}
                              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                              style={{ color: expense.projects ? "#374151" : "#9ca3af" }}
                            >
                              <option value="">Select</option>
                              {allProjects.map(p => (
                                <option key={p._id || p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* BILLABLE */}
                          <td style={{ padding: "8px 16px", textAlign: "center", width: "70px" }}>
                            <input
                              type="checkbox"
                              checked={expense.billable}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].billable = e.target.checked;
                                setBulkExpenses(newExpenses);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-[#156372] cursor-pointer"
                            />
                          </td>

                          {/* REPORTING TAGS */}
                          <td style={{ padding: "8px 16px", width: "150px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBulkRowIndex(index);
                                setAssociateTagsModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-[#156372]"
                            >
                              <Bookmark size={14} className="rotate-90 text-gray-400" />
                              Associate Tags
                            </button>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "8px 16px", textAlign: "center", width: "40px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (bulkExpenses.length > 1) {
                                  setBulkExpenses(bulkExpenses.filter((_, i) => i !== index));
                                }
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add More Expenses Button */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkExpenses([...bulkExpenses, {
                        id: Date.now(),
                        date: (() => {
                          const today = new Date();
                          const d = String(today.getDate()).padStart(2, '0');
                          const m = String(today.getMonth() + 1).padStart(2, '0');
                          const y = today.getFullYear();
                          return \`\${d}/\${m}/\${y}\`;
                        })(),
                        expenseAccount: "",
                        amount: "",
                        currency: baseCurrencyCode || "USD",
                        location: initialLocationName,
                        tax: "",
                        isTaxInclusive: true,
                        vendor: "",
                        customerName: "",
                        projects: "",
                        billable: false,
                        reportingTags: []
                      }]);
                    }}
                    className="text-[14px] font-medium text-[#156372] hover:underline flex items-center gap-1"
                  >
                    + Add More Expenses
                  </button>
                </div>
              </div>
            </div>`;

  if (bulkBlockTarget.test(content)) {
    content = content.replace(bulkBlockTarget, newBulkBlock);
    console.log('Bulk block updated');
  } else {
    console.log('Bulk block target not found');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patch complete');
} catch (e) {
  console.error(e);
  process.exit(1);
}
