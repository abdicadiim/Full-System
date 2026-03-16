import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PaymentLinkList from './PaymentLinks/PaymentLinkList'
import PaymentsReceived from './PaymentsReceived/PaymentsReceived'
import PaymentDetail from './PaymentsReceived/PaymentDetail/PaymentDetail'
import RecordPayment from './PaymentsReceived/RecordPayment/RecordPayment'
import ImportPayments from './PaymentsReceived/ImportPayments/ImportPayments'
import SendPaymentReceiptEmail from './PaymentsReceived/SendEmail/SendPaymentReceiptEmail'
import OnlinePaymentsPage from '../settings/OnlinePaymentsPage'

export default function PaymentsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="payments-received" replace />} />
      <Route path="received" element={<Navigate to="payments-received" replace />} />
      <Route path="payment-links" element={<PaymentLinkList />} />
      <Route path="payment-links/new" element={<PaymentLinkList />} />
      <Route path="payment-links/:linkId" element={<PaymentLinkList />} />
      <Route path="payment-links/:linkId/edit" element={<PaymentLinkList />} />
      <Route path="payments-received" element={<PaymentsReceived />} />
      <Route path="payments-received/new" element={<RecordPayment />} />
      <Route path="payments-received/import" element={<ImportPayments />} />
      <Route path="payments-received/import-retainer" element={<ImportPayments />} />
      <Route path="payments-received/import-applied-excess" element={<ImportPayments />} />
      <Route path="payments-received/:id/edit" element={<RecordPayment />} />
      <Route path="payments-received/:id/send-email" element={<SendPaymentReceiptEmail />} />
      <Route path="payments-received/:id" element={<PaymentDetail />} />
      <Route path="gateways" element={<OnlinePaymentsPage />} />
    </Routes>
  )
}
