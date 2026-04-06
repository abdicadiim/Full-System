export const hasValue = (value: any) =>
  value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");

export const pickFirstValue = (...values: any[]) => {
  const found = values.find(hasValue);
  return found ?? "";
};

export const getCustomerFieldValue = (customer: any, key: string) => {
  switch (key) {
    case "name":
      return pickFirstValue(customer.name, customer.displayName);
    case "companyName":
      return pickFirstValue(customer.companyName, customer.company_name);
    case "email":
      return pickFirstValue(customer.email, customer.emailAddress, customer.contactEmail);
    case "workPhone":
      return pickFirstValue(customer.workPhone, customer.phone, customer.phoneNumber);
    case "receivables":
      return Number(customer.receivables ?? customer.accountsReceivable ?? 0);
    case "unusedCredits":
      return Number(customer.unusedCredits ?? customer.unused_credits ?? 0);
    case "first_name":
      return pickFirstValue(customer.firstName, customer.first_name);
    case "last_name":
      return pickFirstValue(customer.lastName, customer.last_name);
    case "mobile":
      return pickFirstValue(customer.mobilePhone, customer.mobile, customer.mobileNumber);
    case "payment_terms":
      return pickFirstValue(customer.paymentTerms, customer.payment_terms);
    case "status":
      return pickFirstValue(customer.status, "Active");
    case "website":
      return pickFirstValue(customer.website, customer.webSite);
    case "source":
      return pickFirstValue(customer.source, customer.customerSource, customer.origin);
    case "customerNumber":
      return pickFirstValue(
        customer.customerNumber,
        customer.customer_number,
        customer.customerNo,
        customer.customer_no
      );
    case "receivables_bcy":
      return Number(customer.receivables ?? customer.accountsReceivable ?? 0);
    case "unused_credits_bcy":
      return Number(customer.unusedCredits ?? customer.unused_credits ?? 0);
    default:
      return pickFirstValue(customer[key], customer[key?.toLowerCase?.() || key]);
  }
};

export const evaluateCriterion = (fieldValue: any, comparator: string, value: any) => {
  const fieldStr = String(fieldValue || "").toLowerCase();
  const valueStr = String(value || "").toLowerCase();

  switch (comparator) {
    case "is":
      return fieldStr === valueStr;
    case "is not":
      return fieldStr !== valueStr;
    case "starts with":
      return fieldStr.startsWith(valueStr);
    case "contains":
      return fieldStr.includes(valueStr);
    case "doesn't contain":
      return !fieldStr.includes(valueStr);
    case "is in":
      return valueStr.split(",").map((v) => v.trim()).includes(fieldStr);
    case "is not in":
      return !valueStr.split(",").map((v) => v.trim()).includes(fieldStr);
    case "is empty":
      return !fieldValue || fieldStr === "";
    case "is not empty":
      return fieldValue && fieldStr !== "";
    case "greater than":
      return parseFloat(fieldValue) > parseFloat(value);
    case "less than":
      return parseFloat(fieldValue) < parseFloat(value);
    case "greater than or equal":
      return parseFloat(fieldValue) >= parseFloat(value);
    case "less than or equal":
      return parseFloat(fieldValue) <= parseFloat(value);
    default:
      return true;
  }
};

export const evaluateCustomViewCriteria = (customersList: any[], criteria: any[]) => {
  if (!criteria || criteria.length === 0) {
    return customersList;
  }

  return customersList.filter((customer: any) => {
    return criteria.every((criterion: any) => {
      if (!criterion.field || !criterion.comparator) {
        return true;
      }

      const fieldValue = getCustomerFieldValue(customer, criterion.field);
      return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
    });
  });
};

export const filterCustomersByView = (customersList: any[], viewName: string, customViews: any[]) => {
  if (viewName === "All Customers") {
    return customersList;
  }

  const customView = customViews.find((v: any) => v.name === viewName);
  if (customView && customView.criteria) {
    return evaluateCustomViewCriteria(customersList, customView.criteria);
  }

  switch (viewName) {
    case "Active Customers":
      return customersList.filter((c) =>
        c.status?.toLowerCase() === "active" || c.isActive === true || (!c.status && !c.isInactive)
      );
    case "Inactive Customers":
      return customersList.filter((c) =>
        c.status?.toLowerCase() === "inactive" || c.isInactive === true
      );
    case "CRM Customers":
      return customersList.filter((c) => c.customerType === "CRM" || c.source === "CRM");
    case "Duplicate Customers": {
      const nameMap: Record<string, number> = {};
      const emailMap: Record<string, number> = {};
      customersList.forEach((c) => {
        if (c.name) {
          nameMap[c.name] = (nameMap[c.name] || 0) + 1;
        }
        if (c.email) {
          emailMap[c.email] = (emailMap[c.email] || 0) + 1;
        }
      });
      return customersList.filter(
        (c) => (c.name && nameMap[c.name] > 1) || (c.email && emailMap[c.email] > 1)
      );
    }
    case "Customer Portal Enabled":
      return customersList.filter((c) => c.enablePortal === true || c.portalStatus === "Enabled");
    case "Customer Portal Disabled":
      return customersList.filter(
        (c) => c.enablePortal === false || c.portalStatus === "Disabled" || !c.enablePortal
      );
    case "Overdue Customers":
      return customersList.filter((c) => parseFloat(c.receivables || 0) > 0);
    case "Unpaid Customers":
      return customersList.filter((c) => parseFloat(c.receivables || 0) > 0);
    default:
      return customersList;
  }
};

export const getFilteredAndSortedCustomers = (
  customers: any[],
  selectedView: string,
  customViews: any[],
  sortConfig: { key: string | null; direction: "asc" | "desc" }
) => {
  let filtered = filterCustomersByView(customers, selectedView, customViews);

  if (sortConfig.key) {
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key as string];
      let bValue = b[sortConfig.key as string];

      if (sortConfig.key === "name") {
        aValue = a.name || "";
        bValue = b.name || "";
      } else if (sortConfig.key === "companyName") {
        aValue = a.companyName || "";
        bValue = b.companyName || "";
      } else if (sortConfig.key === "receivables") {
        aValue = parseFloat(a.receivables || 0);
        bValue = parseFloat(b.receivables || 0);
      } else if (sortConfig.key === "createdTime") {
        aValue = new Date(a.createdAt || 0);
        bValue = new Date(b.createdAt || 0);
      } else if (sortConfig.key === "lastModifiedTime") {
        aValue = new Date(a.updatedAt || a.createdAt || 0);
        bValue = new Date(b.updatedAt || b.createdAt || 0);
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  return filtered;
};

export const mapCustomerForList = (customer: any) => {
  const customerId = customer?.id ? String(customer.id) : customer?._id ? String(customer._id) : "";
  if (!customerId) return null;

  let customerName = customer.displayName || customer.name;
  if (!customerName || customerName.trim() === "") {
    const firstName = customer.firstName || "";
    const lastName = customer.lastName || "";
    const companyName = customer.companyName || "";
    if (firstName || lastName) {
      customerName = `${firstName} ${lastName}`.trim();
    } else if (companyName) {
      customerName = companyName.trim();
    } else {
      customerName = "Customer";
    }
  }

  customerName = customerName.trim() || "Customer";

  return {
    ...customer,
    id: customerId,
    _id: customer._id || customerId,
    name: customerName,
    displayName: customer.displayName || customerName || "Customer",
    companyName: pickFirstValue(customer.companyName, customer.company_name),
    email: pickFirstValue(customer.email, customer.emailAddress, customer.contactEmail),
    workPhone: pickFirstValue(customer.workPhone, customer.phone, customer.phoneNumber),
    mobilePhone: pickFirstValue(customer.mobilePhone, customer.mobile, customer.mobileNumber),
    firstName: pickFirstValue(customer.firstName, customer.first_name),
    lastName: pickFirstValue(customer.lastName, customer.last_name),
    source: pickFirstValue(customer.source, customer.customerSource, customer.origin),
    customerNumber: pickFirstValue(
      customer.customerNumber,
      customer.customer_number,
      customer.customerNo,
      customer.customer_no
    ),
    paymentTerms: pickFirstValue(customer.paymentTerms, customer.payment_terms),
    status: pickFirstValue(customer.status, "Active"),
    website: pickFirstValue(customer.website, customer.webSite),
    receivables: Number(customer.receivables ?? customer.accountsReceivable ?? 0),
    unusedCredits: Number(customer.unusedCredits ?? customer.unused_credits ?? 0),
    currency: pickFirstValue(customer.currency, customer.currencyCode, "KES"),
  };
};

export const getCustomerIdForNavigation = (customer: any) => {
  const rawId = customer?._id ?? customer?.id;
  if (rawId === undefined || rawId === null) return "";
  return String(rawId).trim();
};

export const formatNumberForExport = (number: any, format: string) => {
  const num = parseFloat(number) || 0;

  switch (format) {
    case "1,234,567.89":
      return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "1234567,89":
      return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "1.234.567,89":
      return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "1234567.89":
    default:
      return num.toFixed(2);
  }
};

