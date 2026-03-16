import React from "react";
import { useLocation } from "react-router-dom";
import ReportingTagsPage from "./ReportingTagsPage";
import NewReportingTagPage from "./NewReportingTagPage";
import ReportingTagDetailPage from "./ReportingTagDetailPage";
import ReportingTagsReorderPage from "./ReportingTagsReorderPage";

export default function ReportingTagsRouter() {
    const location = useLocation();
    const path = location.pathname;
    const match = path.match(/reporting-tags\/([^/]+)/);
    const id = match?.[1];

    if (path.includes("/reorder")) {
        return <ReportingTagsReorderPage />;
    }

    if (path.includes("/new")) {
        return <NewReportingTagPage />;
    }

    if (path.includes("/edit") && id && id !== "new") {
        return <NewReportingTagPage tagId={id} mode="edit" />;
    }

    if (id && id !== "new") {
        return <ReportingTagDetailPage tagId={id} />;
    }

    return <ReportingTagsPage />;
}
