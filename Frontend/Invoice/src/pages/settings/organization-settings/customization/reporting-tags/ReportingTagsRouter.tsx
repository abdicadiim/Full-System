import React from "react";
import { useLocation, useParams } from "react-router-dom";
import ReportingTagsPage from "./ReportingTagsPage";
import NewReportingTagPage from "./NewReportingTagPage";
import ReportingTagDetailPage from "./ReportingTagDetailPage";

export default function ReportingTagsRouter() {
    const location = useLocation();
    const path = location.pathname;
    const { id } = useParams<{ id?: string }>();

    if (path.includes("/new")) {
        return <NewReportingTagPage />;
    }

    if (id) {
        return <ReportingTagDetailPage tagId={id} />;
    }

    return <ReportingTagsPage />;
}
