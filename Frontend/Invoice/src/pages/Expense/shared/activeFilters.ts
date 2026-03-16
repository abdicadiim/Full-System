export const filterActiveRecords = (records: any[]) => {
    if (!Array.isArray(records)) return [];
    return records.filter((r: any) => {
        const status = String(r?.status || "").trim().toLowerCase();
        const active = r?.active;
        return status === "active" || active === true || String(active).toLowerCase() === "true";
    });
};
