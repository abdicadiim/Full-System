import React, { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getAuthFaviconDataUrl, getAuthTabTitle } from "./lib/appBranding";
import LoginPage from "./pages/LoginPage";
import EmailOtpLoginPage from "./pages/EmailOtpLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import UserInvitationPage from "./pages/UserInvitationPage";
import OrgSetupPage from "./pages/OrgSetupPage";
import OrganizationSelectionPage from "./pages/OrganizationSelectionPage";
import OptimizePage from "./pages/OptimizePage";
import MovingSystemPage from "./pages/MovingSystemPage";
import VerifyingPage from "./pages/VerifyingPage";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    document.title = getAuthTabTitle();

    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = getAuthFaviconDataUrl();
  }, [location.pathname, location.search]);

  return (
    <Routes>
      <Route index element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/email-otp" element={<EmailOtpLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/invite" element={<UserInvitationPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/org-select" element={<OrganizationSelectionPage />} />
      <Route path="/org-setup" element={<OrgSetupPage />} />
      <Route path="/optimize" element={<OptimizePage />} />
      <Route path="/moving-system" element={<MovingSystemPage />} />
      <Route path="/verifying" element={<VerifyingPage />} />
      <Route path="*" element={<div style={{ padding: 16 }}>Not Found</div>} />
    </Routes>
  );
}

