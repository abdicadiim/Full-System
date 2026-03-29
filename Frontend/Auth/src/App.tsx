import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import EmailOtpLoginPage from "./pages/EmailOtpLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import SignupPage from "./pages/SignupPage";
import UserInvitationPage from "./pages/UserInvitationPage";
import OrgSetupPage from "./pages/OrgSetupPage";
import OptimizePage from "./pages/OptimizePage";
import MovingSystemPage from "./pages/MovingSystemPage";
import VerifyingPage from "./pages/VerifyingPage";

export default function App() {
  return (
    <Routes>
      <Route index element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/email-otp" element={<EmailOtpLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/invite" element={<UserInvitationPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/org-setup" element={<OrgSetupPage />} />
      <Route path="/optimize" element={<OptimizePage />} />
      <Route path="/moving-system" element={<MovingSystemPage />} />
      <Route path="/verifying" element={<VerifyingPage />} />
      <Route path="*" element={<div style={{ padding: 16 }}>Not Found</div>} />
    </Routes>
  );
}

