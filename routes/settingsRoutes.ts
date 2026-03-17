import { Router } from "express";
import {
  getOrganizationBranding,
  getOrganizationOwnerEmail,
  getOrganizationProfile,
  getPrimarySender,
  updateOrganizationBranding,
  updateOrganizationProfile,
} from "../controllers/settingsController.js";
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

// Sender emails
settingsRoutes.get("/sender-emails", requireAuth, listSenderEmails);
settingsRoutes.get("/sender-emails/primary", requireAuth, getPrimarySenderEmail);
settingsRoutes.get("/sender-emails/:id", requireAuth, getSenderEmailById);
settingsRoutes.post("/sender-emails", requireAuth, requireOrgAdmin, createSenderEmail);
settingsRoutes.put("/sender-emails/:id", requireAuth, requireOrgAdmin, updateSenderEmail);
settingsRoutes.delete("/sender-emails/:id", requireAuth, requireOrgAdmin, deleteSenderEmail);

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
