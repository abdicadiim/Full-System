export type PermissionTree = Record<string, any>;

const SUPER_ROLES = new Set(["admin", "owner"]);
const BROAD_ROLES = new Set(["staff", "member", "staff assigned"]);
const TIMESHEET_ONLY_ROLE = "timesheet staff";

const MODULE_ALIASES: Record<string, string[]> = {
  dashboard: ["dashboard"],
  contacts: ["customers"],
  customers: ["customers"],
  products: ["products"],
  banking: ["banking"],
  accountant: ["accountant"],
  tasks: ["tasks"],
  locations: ["locations"],
  sales: ["transactions", "subscriptions"],
  transactions: ["transactions"],
  subscriptions: ["subscriptions"],
  payments: ["transactions"],
  purchases: ["purchases"],
  expenses: ["expenses"],
  "time tracking": ["timesheets"],
  timesheets: ["timesheets"],
  "vat filing": ["vatFiling"],
  "usage records": ["usageRecords"],
  "multiple transaction series": ["multipleTransactionSeries"],
  events: ["settings"],
  reports: ["reportsData"],
  documents: ["documents"],
  settings: ["settings"],
  items: ["items"],
};

const DOCUMENT_ACTION_KEYS: Record<string, string[]> = {
  view: ["View Documents"],
  create: ["Upload Documents"],
  edit: ["Manage Folder"],
  delete: ["Delete Documents"],
};

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compact = (value: unknown) => normalize(value).replace(/\s+/g, "");

const isActionName = (value: unknown) => {
  const normalized = normalize(value);
  return ["view", "create", "edit", "delete", "approve", "export", "schedule", "share"].includes(normalized);
};

const normalizePath = (pathname: string) => {
  const path = String(pathname || "").split("?")[0].split("#")[0].trim();
  return path || "/";
};

export const inferModuleFromPath = (pathname: string) => {
  const path = normalizePath(pathname);
  if (path === "/" || path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/products/items") || path === "/items") return "items";
  if (path.startsWith("/documents")) return "documents";
  if (path.startsWith("/time-tracking")) return "timesheets";
  if (path.startsWith("/expenses")) return "expenses";
  if (path.startsWith("/purchases")) return "purchases";
  if (path.startsWith("/banking")) return "banking";
  if (path.startsWith("/sales/subscriptions")) return "subscriptions";
  if (path.startsWith("/sales")) return "sales";
  if (path.startsWith("/payments")) return "payments";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/reports")) return "reports";
  return null;
};

const hasTruthyDeep = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((entry) => hasTruthyDeep(entry));
};

const findDeepEntry = (value: any, target: string): any => {
  if (!value || typeof value !== "object") return null;

  for (const [key, entry] of Object.entries(value)) {
    if (key === "fullReportsAccess") continue;
    if (compact(key) === target) return entry;
    if (entry && typeof entry === "object") {
      if (compact((entry as any).label) === target) return entry;
      const nested = findDeepEntry(entry, target);
      if (nested !== null) return nested;
    }
  }

  return null;
};

const checkLeafAccess = (leaf: any, action: string) => {
  if (typeof leaf === "boolean") return leaf;
  if (!leaf || typeof leaf !== "object") return false;

  if (Boolean((leaf as any).full)) return true;

  const normalizedAction = normalize(action);
  if (normalizedAction && typeof (leaf as any)[normalizedAction] === "boolean") {
    return Boolean((leaf as any)[normalizedAction]);
  }

  if (normalizedAction === "view") {
    return Object.values(leaf).some((entry) => entry === true);
  }

  return false;
};

const checkLeafSection = (
  section: Record<string, any>,
  submodule: string | undefined,
  action: string,
  ignoreKeys: string[] = []
) => {
  const ignored = new Set(["fullReportsAccess", ...ignoreKeys]);
  const entries = Object.entries(section || {}).filter(([key]) => !ignored.has(key));
  if (submodule) {
    const target = compact(submodule);
    const match = entries.find(([key, value]) => compact(key) === target || compact((value as any)?.label) === target);
    if (!match) return false;
    return checkLeafAccess(match[1], action);
  }

  return entries.some(([, value]) => checkLeafAccess(value, action));
};

const checkBooleanSection = (
  section: Record<string, any>,
  submodule: string | undefined,
  action: string,
  labelMap?: Record<string, string[]>
) => {
  const entries = Object.entries(section || {}).filter(([key]) => key !== "fullReportsAccess");
  if (submodule) {
    const target = compact(submodule);
    const match = entries.find(([key]) => compact(key) === target);
    if (match) return Boolean(match[1]);
  }

  const requestedAction = normalize(action);
  if (labelMap?.[requestedAction]) {
    return labelMap[requestedAction].some((label) => Boolean(section?.[label]));
  }

  return entries.some(([, value]) => Boolean(value));
};

const checkReportsSection = (section: Record<string, any>, submodule: string | undefined, action: string) => {
  if (!section || typeof section !== "object") return false;
  if (Boolean(section.fullReportsAccess)) return true;

  if (submodule) {
    const target = compact(submodule);
    const match = findDeepEntry(section, target);
    if (match === null || match === undefined) return false;
    return checkLeafAccess(match, action);
  }

  return hasTruthyDeep(section);
};

const standardRoleAllows = (roleName: string, moduleName: string) => {
  const normalizedRole = normalize(roleName);
  const normalizedModule = normalize(moduleName);

  if (SUPER_ROLES.has(normalizedRole)) return true;
  if (BROAD_ROLES.has(normalizedRole)) {
    return [
      "dashboard",
      "customers",
      "products",
      "sales",
      "transactions",
      "subscriptions",
      "payments",
      "expenses",
      "time tracking",
      "timesheets",
      "events",
      "documents",
      "items",
    ].includes(normalizedModule);
  }

  if (normalizedRole === TIMESHEET_ONLY_ROLE) {
    return ["dashboard", "time tracking", "time-tracking", "timesheets"].includes(normalizedModule);
  }

  return false;
};

const customRoleAllows = (permissions: PermissionTree, moduleName: string, submodule: string | undefined, action: string) => {
  const normalizedModule = normalize(moduleName);
  const aliases = MODULE_ALIASES[normalizedModule] || [normalizedModule];
  const normalizedAction = normalize(action) || "view";

  for (const alias of aliases) {
    const section = permissions?.[alias];
    if (!section) continue;

    if (alias === "reportsData") {
      if (checkReportsSection(section, submodule, normalizedAction)) return true;
      continue;
    }

    if (alias === "documents") {
      if (submodule) {
        const target = compact(submodule);
        const match = Object.keys(section).find((key) => compact(key) === target);
        if (match) return Boolean(section[match]);
      }
      const docLabels = DOCUMENT_ACTION_KEYS[normalizedAction];
      if (docLabels?.length) {
        if (docLabels.some((label) => Boolean(section[label]))) return true;
      }
      if (checkBooleanSection(section, submodule, normalizedAction, DOCUMENT_ACTION_KEYS)) return true;
      continue;
    }

    if (alias === "settings") {
      const eventPermission = section.Events ?? section["Events"];
      if (normalizedModule === "events") {
        if (submodule) {
          const target = compact(submodule);
          const match = Object.keys(section).find((key) => compact(key) === target);
          if (match) return Boolean(section[match]);
        }
        return Boolean(eventPermission);
      }

      if (checkBooleanSection(section, submodule, normalizedAction)) return true;
      continue;
    }

    if (alias === "dashboard") {
      if (checkBooleanSection(section, submodule, normalizedAction, { view: ["View Dashboard"] })) return true;
      continue;
    }

    if (typeof section === "object") {
      if (checkLeafSection(section, submodule, normalizedAction, alias === "timesheets" ? ["noExpenses"] : [])) return true;
      continue;
    }

    if (Boolean(section)) return true;
  }

  return false;
};

export const createPermissionEvaluator = ({
  role,
  permissions,
  pathname,
}: {
  role?: string | null;
  permissions?: PermissionTree | null;
  pathname?: string | null;
}) => {
  const normalizedRole = normalize(role);
  const inferredModule = pathname ? inferModuleFromPath(pathname) : null;

  const hasPermission = (
    module?: string,
    submoduleOrAction?: string,
    actionArg?: string
  ) => {
    const resolvedModule = normalize(module) || inferredModule || "dashboard";
    const resolvedAction = normalize(actionArg || (isActionName(submoduleOrAction) ? submoduleOrAction : "view")) || "view";
    const resolvedSubmodule = actionArg ? submoduleOrAction : isActionName(submoduleOrAction) ? undefined : submoduleOrAction;

    if (SUPER_ROLES.has(normalizedRole)) return true;

    if (BROAD_ROLES.has(normalizedRole) || normalizedRole === TIMESHEET_ONLY_ROLE) {
      return standardRoleAllows(normalizedRole, resolvedModule);
    }

    if (permissions && typeof permissions === "object") {
      return customRoleAllows(permissions, resolvedModule, resolvedSubmodule, resolvedAction);
    }

    return false;
  };

  return {
    hasPermission,
    canView: (module?: string, submodule?: string) => hasPermission(module, submodule, "view"),
    canCreate: (module?: string, submodule?: string) => hasPermission(module, submodule, "create"),
    canEdit: (module?: string, submodule?: string) => hasPermission(module, submodule, "edit"),
    canDelete: (module?: string, submodule?: string) => hasPermission(module, submodule, "delete"),
  };
};
