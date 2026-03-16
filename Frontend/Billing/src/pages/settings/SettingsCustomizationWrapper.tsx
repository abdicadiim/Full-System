import React from "react";
import SettingsLayout from "./SettingsLayout";
import { useLocation } from "react-router-dom";
import TransactionNumberSeriesPage from "./TransactionNumberSeriesPage";
import PDFTemplatesPage from "./PDFTemplatesPage";
import TemplateEditorPage from "./TemplateEditorPage";
import EmailNotificationsPage from "./EmailNotificationsPage";
import NewServerPage from "./NewServerPage";
import ReportingTagsRouter from "./organization-settings/customization/reporting-tags/ReportingTagsRouter";
import WebTabsPage from "./WebTabsPage";

export default function SettingsCustomizationWrapper() {
  const location = useLocation();
  const path = location.pathname;

  let Component = null;
  if (path.includes("transaction-number-series")) {
    Component = TransactionNumberSeriesPage;
  } else if (path.includes("pdf-templates/edit")) {
    Component = TemplateEditorPage;
  } else if (path.includes("pdf-templates")) {
    Component = PDFTemplatesPage;
  } else if (path.includes("email-notifications/new-server")) {
    Component = NewServerPage;
  } else if (path.includes("email-notifications")) {
    Component = EmailNotificationsPage;
  } else if (path.includes("reporting-tags")) {
    Component = ReportingTagsRouter;
  } else if (path.includes("web-tabs")) {
    Component = WebTabsPage;
  }

  // Template editor and New Server should be full screen without SettingsLayout
  if (path.includes("pdf-templates/edit") || path.includes("email-notifications/new-server")) {
    return <Component />;
  }

  return (
    <SettingsLayout>
      {Component && <Component />}
    </SettingsLayout>
  );
}

