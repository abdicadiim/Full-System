const EXPENSE_CUSTOM_VIEWS_KEY = "expense_custom_views_v1";

const getSavedCustomViews = () => {
    if (typeof window === "undefined" || !window.localStorage) {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(EXPENSE_CUSTOM_VIEWS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const getExpenseCustomViews = () => {
    const defaults = [
        "All Expenses",
        "Categorized",
        "Uncategorized",
        "Billable",
        "Non-Billable",
        "Invoiced",
        "Uninvoiced",
        "With Receipts",
        "Without Receipts",
    ];

    const customViewNames = getSavedCustomViews()
        .map((view: any) => String(view?.name || "").trim())
        .filter(Boolean);

    return Array.from(new Set([...defaults, ...customViewNames]));
};

export const saveExpenseCustomView = (view: any) => {
    if (!view || !String(view?.name || "").trim()) {
        return false;
    }

    if (typeof window === "undefined" || !window.localStorage) {
        return false;
    }

    try {
        const existing = getSavedCustomViews();
        const next = [
            ...existing,
            {
                ...view,
                id: view.id || `expense-view-${Date.now()}`,
                createdAt: view.createdAt || new Date().toISOString(),
            },
        ];
        window.localStorage.setItem(EXPENSE_CUSTOM_VIEWS_KEY, JSON.stringify(next));
        return true;
    } catch {
        return false;
    }
};
