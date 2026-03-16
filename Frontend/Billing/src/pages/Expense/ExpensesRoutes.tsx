import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Expenses from './expenses/Expenses'
import RecurringExpenses from './expenses/RecurringExpenses'
import RecordExpense from './expenses/RecordExpense'
import NewRecurringExpense from './expenses/NewRecurringExpense'
import ExpenseDetail from './expenses/ExpenseDetail'
import RecurringExpenseDetail from './expenses/RecurringExpenseDetail'
import ImportExpenses from './expenses/ImportExpenses'
import ImportRecurringExpenses from './expenses/ImportRecurringExpenses'
import ReceiptsInbox from './expenses/ReceiptsInbox'
import NewExpenseCustomView from './expenses/NewExpenseCustomView'

export default function ExpensesRoutes() {
    return (
        <Routes>
            <Route index element={<Expenses />} />
            <Route path="receipts" element={<ReceiptsInbox />} />
            <Route path="new" element={<RecordExpense />} />
            <Route path="record" element={<RecordExpense />} />
            <Route path="import" element={<ImportExpenses />} />
            <Route path="custom-view/new" element={<NewExpenseCustomView />} />
            <Route path=":id" element={<ExpenseDetail />} />
            <Route path=":id/edit" element={<RecordExpense />} />

            <Route path="recurring-expenses" element={<RecurringExpenses />} />
            <Route path="recurring-expenses/new" element={<NewRecurringExpense />} />
            <Route path="recurring-expenses/import" element={<ImportRecurringExpenses />} />
            <Route path="recurring-expenses/:id" element={<RecurringExpenseDetail />} />
            <Route path="recurring-expenses/:id/edit" element={<NewRecurringExpense />} />

            <Route path="*" element={<Navigate to="/expenses" replace />} />
        </Routes>
    )
}
