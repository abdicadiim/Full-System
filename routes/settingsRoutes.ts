import { Router } from "express";
import {
  getOrganizationBranding,
  getOrganizationOwnerEmail,
  getOrganizationProfile,
  getPrimarySender,
  updateOrganizationBranding,
  updateOrganizationProfile,
} from "../controllers/settingsController.js";
import {
  getItemSettings,
  upsertItemSettings,
} from "../controllers/itemSettingsController.js";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import {
  createEmailRelayServer,
  createSenderEmail,
  deleteEmailRelayServer,
  deleteSenderEmail,
  getEmailNotificationPreferences,
  getEmailTemplateByKey,
  getEmailRelayServerById,
  getPrimarySenderEmail,
  getSenderEmailById,
  listEmailRelayServers,
  listEmailTemplates,
  listSenderEmails,
  resendSenderVerificationEmail,
  toggleEmailRelayServer,
  updateEmailNotificationPreferences,
  updateEmailRelayServer,
  updateSenderEmail,
  upsertEmailTemplateByKey,
} from "../controllers/emailSettingsController.js";
import { listUsersForSettings } from "../controllers/usersController.js";
import {
  getCustomersVendorsSettings,
  upsertCustomersVendorsSettings,
} from "../controllers/customersVendorsSettingsController.js";
import {
  getQuotesSettings,
  upsertQuotesSettings,
} from "../controllers/quotesSettingsController.js";
import {
  getGeneralSettings,
  upsertGeneralSettings,
} from "../controllers/generalSettingsController.js";

export const settingsRoutes = Router();

settingsRoutes.get("/organization/profile", requireAuth, getOrganizationProfile);
settingsRoutes.put("/organization/profile", requireAuth, requireOrgAdmin, updateOrganizationProfile);
settingsRoutes.get("/organization/branding", requireAuth, getOrganizationBranding);
settingsRoutes.put("/organization/branding", requireAuth, requireOrgAdmin, updateOrganizationBranding);
settingsRoutes.get("/organization/owner-email", requireAuth, getOrganizationOwnerEmail);

// Organization users (for dropdowns in settings UI)
settingsRoutes.get("/users", requireAuth, requireOrgAdmin, listUsersForSettings);

// Customers & Vendors (module settings)
settingsRoutes.get("/customers-vendors", requireAuth, getCustomersVendorsSettings);
settingsRoutes.put("/customers-vendors", requireAuth, requireOrgAdmin, upsertCustomersVendorsSettings);

// Products / Items (module settings)
settingsRoutes.get("/items", requireAuth, getItemSettings);
settingsRoutes.put("/items", requireAuth, requireOrgAdmin, upsertItemSettings);

// Quotes (module settings)
settingsRoutes.get("/quotes", requireAuth, getQuotesSettings);
settingsRoutes.put("/quotes", requireAuth, requireOrgAdmin, upsertQuotesSettings);

// General settings
settingsRoutes.get("/general", requireAuth, getGeneralSettings);
settingsRoutes.put("/general", requireAuth, requireOrgAdmin, upsertGeneralSettings);

// Sender emails
settingsRoutes.get("/sender-emails", requireAuth, listSenderEmails);
settingsRoutes.get("/sender-emails/primary", requireAuth, getPrimarySenderEmail);
settingsRoutes.get("/sender-emails/:id", requireAuth, getSenderEmailById);
settingsRoutes.post("/sender-emails", requireAuth, requireOrgAdmin, createSenderEmail);
settingsRoutes.put("/sender-emails/:id", requireAuth, requireOrgAdmin, updateSenderEmail);
settingsRoutes.delete("/sender-emails/:id", requireAuth, requireOrgAdmin, deleteSenderEmail);
settingsRoutes.post("/sender-emails/:id/resend-verification", requireAuth, requireOrgAdmin, resendSenderVerificationEmail);

// Email notification preferences
settingsRoutes.get("/email-notification-preferences", requireAuth, getEmailNotificationPreferences);
settingsRoutes.put("/email-notification-preferences", requireAuth, requireOrgAdmin, updateEmailNotificationPreferences);

// Email relay servers
settingsRoutes.get("/email-relay", requireAuth, listEmailRelayServers);
settingsRoutes.get("/email-relay/:id", requireAuth, getEmailRelayServerById);
settingsRoutes.post("/email-relay", requireAuth, requireOrgAdmin, createEmailRelayServer);
settingsRoutes.put("/email-relay/:id", requireAuth, requireOrgAdmin, updateEmailRelayServer);
settingsRoutes.delete("/email-relay/:id", requireAuth, requireOrgAdmin, deleteEmailRelayServer);
settingsRoutes.post("/email-relay/:id/toggle", requireAuth, requireOrgAdmin, toggleEmailRelayServer);

// Email templates
settingsRoutes.get("/email-templates", requireAuth, listEmailTemplates);
settingsRoutes.get("/email-templates/:key", requireAuth, getEmailTemplateByKey);
settingsRoutes.put("/email-templates/:key", requireAuth, requireOrgAdmin, upsertEmailTemplateByKey);

// Legacy/compat route
settingsRoutes.get("/sender-emails/primary-legacy", requireAuth, getPrimarySender);
