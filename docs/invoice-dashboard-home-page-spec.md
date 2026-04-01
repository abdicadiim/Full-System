# Invoice System Dashboard / Home Page Specification

## 1. Purpose

This document defines a professional, enterprise-ready dashboard/home page for the invoice system.

The goal of the home page is to give users an immediate, reliable snapshot of business health, pending work, and fast access to the most important actions in the system.

The dashboard should feel:

- Clear
- Fast
- Financially trustworthy
- Role-aware
- Action-oriented
- Visually polished

## 2. Current System Context

The existing invoice application already has the core backend data needed for a meaningful dashboard.

### Existing backend capability

The backend exposes a dashboard summary endpoint in `controllers/dashboardController.ts` through `routes/dashboardRoutes.ts`.

That endpoint already provides:

- Net revenue
- Receivables
- MRR
- Active subscriptions
- Churn rate
- ARPU
- LTV
- Subscription activity
- Income vs expense
- Top expense categories
- Project activity and unbilled work
- Organization metadata

### Current frontend state

The invoice frontend home page in `Frontend/Invoice/src/pages/home/DashboardRoutes.tsx` is currently minimal and only shows:

- User avatar or icon
- Display name
- Email
- A short welcome message

This means the product already has the data foundation for a strong dashboard, but the user experience is not yet using it fully.

## 3. Product Objective

The dashboard should answer these questions in less than 10 seconds:

1. How is the business performing right now?
2. What is overdue or needs attention today?
3. What changed this month?
4. What actions should the user take next?
5. Which customers, invoices, projects, or expenses need follow-up?

## 4. Design Principles

### 4.1 Executive clarity

The first screen should communicate business health through a concise set of KPI cards and a summary hero.

### 4.2 Progressive detail

The page should begin with high-level metrics, then allow the user to move into charts, lists, and drill-down sections.

### 4.3 Role awareness

Different users should see different emphasis:

- Finance users see receivables, payments, expenses, revenue trends
- Sales users see invoices, quotes, customers, and follow-ups
- Operations users see projects, time, and unbilled work

### 4.4 Action over decoration

The dashboard should not be purely decorative. Every section should support a decision or action.

### 4.5 Trust and readability

Financial data must be legible, consistent, and formatted cleanly:

- Currency symbols must be clear
- Negative values must be visually distinct
- Overdue items must be highlighted carefully
- Empty states must not look broken

## 5. Recommended Home Page Layout

## 5.1 Top Hero Section

Purpose:

- Welcome the user
- Show organization identity
- Show currency context
- Provide quick access to key actions

Recommended content:

- User name and avatar
- Organization name
- Base currency
- Date range selector
- Primary action buttons

Suggested primary actions:

- Create Invoice
- Record Payment
- Add Expense
- New Customer

### Why this matters

The hero section creates orientation. It should make the dashboard feel personalized and operational rather than generic.

## 5.2 KPI Summary Cards

Use 4 to 6 top cards with the most important business indicators.

Recommended cards:

- Net Revenue
- Receivables Outstanding
- Paid This Month
- Overdue Invoices
- MRR
- Active Customers or Subscriptions

Each card should include:

- Main value
- Small trend indicator
- Comparison period
- Optional tooltip or helper text

Recommended design behavior:

- Green for growth and positive performance
- Orange for warnings
- Red for urgent overdue states
- Neutral slate for supporting metrics

## 5.3 Main Analytics Area

Use two-column or three-column responsive charts.

Recommended chart blocks:

- Revenue trend line
- Receivables aging bar chart
- Income vs expense chart
- Subscription growth chart
- Churn rate trend
- ARPU and LTV trend

### Chart rules

- Every chart must have a title
- Charts need legends and date context
- Zero-data states must still look intentional
- Mobile view should stack charts vertically

## 5.4 Operational Lists

The dashboard should include at least one list-focused section for immediate action.

Recommended lists:

- Recent invoices
- Overdue invoices
- Recent payments
- Unpaid bills
- Top customers by balance
- Recent expenses
- Unbilled project time

Each row should show:

- Name or reference number
- Amount
- Status
- Date
- Quick action

## 5.5 Alerts and Tasks

This is one of the most important parts of a professional home page.

Show alert cards for items such as:

- Overdue invoices
- Low cash flow indicators
- Draft invoices waiting for approval
- Unbilled project hours
- Missing customer details
- Failed payment attempts

These alerts should be prioritized by urgency and business impact.

## 5.6 Quick Actions Panel

A dashboard is stronger when it reduces navigation friction.

Recommended quick actions:

- Create invoice
- Add quote
- Record expense
- Receive payment
- Add customer
- Start project timer
- View reports

This panel can appear as:

- A compact side rail on desktop
- A collapsible section on mobile

## 6. Data Mapping From Backend

The existing summary API already supports a large part of the proposed dashboard.

### Data already available

- `metrics.netRevenue`
- `metrics.receivables`
- `metrics.mrr`
- `metrics.activeSubscriptions`
- `metrics.churnRate`
- `metrics.arpu`
- `metrics.ltv`
- `subscriptionSummary`
- `incomeExpense`
- `topExpenses`
- `projects`
- `organization`

### Recommended usage

- `metrics.netRevenue` -> revenue trend card
- `metrics.receivables` -> aging and overdue summary
- `metrics.mrr` -> recurring revenue KPI
- `metrics.activeSubscriptions` -> active recurring business KPI
- `metrics.churnRate` -> retention health indicator
- `metrics.arpu` -> average customer value
- `metrics.ltv` -> long-term value metric
- `incomeExpense` -> financial performance comparison chart
- `topExpenses` -> cost concentration donut or category list
- `projects` -> unbilled work and project risk summary

## 7. Information Architecture

Recommended dashboard hierarchy:

1. Hero and context
2. KPI cards
3. Main charts
4. Actionable alerts
5. Operational lists
6. Secondary insights

This order matters because it reflects how real users scan finance systems:

- First: status
- Second: trend
- Third: exception
- Fourth: action

## 8. Visual Design Direction

The dashboard should look premium, calm, and business-oriented.

### Suggested visual style

- Background: soft neutral surface with subtle texture or gradient
- Cards: white or very light surface with thin borders
- Accents: restrained blue, green, amber, and red for semantic meaning
- Typography: modern, readable, slightly condensed heading style
- Spacing: generous, with clear section separation
- Shadows: subtle, not heavy

### Suggested layout feel

- More "operations cockpit" than "marketing website"
- More "accounting system" than "social media app"
- Dense enough for productivity, but not cramped

## 9. User Experience Requirements

### 9.1 Personalization

Show the user’s name and organization context immediately.

### 9.2 Currency awareness

Use the organization’s base currency consistently across all money values.

### 9.3 Permission-based visibility

Sections should appear only when the user has permission.

### 9.4 Empty states

Empty dashboards should still look complete and guide the user toward setup.

Examples:

- No invoices yet
- No payments recorded
- No project activity
- No subscription data

### 9.5 Loading states

Use skeletons or lightweight cards while the summary loads.

### 9.6 Error states

If data fails to load, the dashboard should:

- Explain the failure simply
- Keep the page usable
- Offer retry behavior if possible

## 10. Functional Requirements

The dashboard should support:

- Viewing summary metrics
- Switching date range
- Inspecting trends over time
- Opening detailed records from cards and lists
- Seeing alerts requiring attention
- Accessing common creation flows quickly
- Respecting role permissions

## 11. Non-Functional Requirements

### Performance

- Dashboard should load quickly
- Summary calls should be efficient
- Charts should avoid unnecessary re-rendering

### Accessibility

- Strong contrast
- Keyboard navigable controls
- Clear focus states
- Text labels for icons and charts where possible

### Responsiveness

- Desktop: full analytics layout
- Tablet: stacked cards and compressed lists
- Mobile: single-column flow with sticky actions if needed

### Maintainability

- Keep chart and card components reusable
- Keep data formatting centralized
- Keep permissions logic isolated

## 12. Suggested Content Modules

Below is a professional dashboard module set for an invoice system:

### Core finance

- Revenue
- Receivables
- Payments received
- Expenses
- Net cash position

### Recurring business

- MRR
- Active subscriptions
- Churn
- ARPU
- LTV

### Operational work

- Projects
- Unbilled time
- Unbilled expenses
- Budget progress

### Actions

- New invoice
- Receive payment
- New customer
- Record expense
- New quote

## 13. Suggested Page Flow

### On first load

1. Show hero and loading skeletons
2. Fetch summary data
3. Render KPI cards
4. Render charts
5. Render alerts and lists

### When data is available

1. Highlight urgent items
2. Surface trends
3. Provide next actions

### When there is no data

1. Show onboarding guidance
2. Show starter actions
3. Avoid blank white screens

## 14. Implementation Guidance

The dashboard should be built as a composition of reusable pieces:

- Hero header
- Stat cards
- Line chart card
- Bar chart card
- Donut chart card
- Table/list card
- Alert banner
- Quick action grid

Recommended implementation pattern:

- Keep data fetching near the page container
- Keep chart rendering in reusable presentational components
- Keep money and number formatting in shared utility functions
- Keep role visibility logic in permission helpers

## 15. Suggested Roadmap

### Phase 1

- Replace the minimal home page with a structured dashboard shell
- Show hero, summary cards, and at least one revenue chart
- Connect existing backend summary data

### Phase 2

- Add receivables, income vs expense, and subscription panels
- Add alerts and quick actions
- Improve loading and error states

### Phase 3

- Add recent invoices, overdue items, and task-oriented lists
- Add filtering by date range
- Add permissions-based module visibility

### Phase 4

- Add advanced UX polish
- Add chart interactions and drill-down links
- Add optional user-configurable dashboard sections

## 16. Acceptance Criteria

The dashboard is considered professional when:

- It feels like a financial operations hub
- The user can understand business status quickly
- Data is visually organized and trustworthy
- Key actions are reachable without hunting through menus
- The page works well on desktop and mobile
- Empty and loading states are polished
- Permissions are respected

## 17. Recommended Final Positioning Statement

The dashboard/home page should be presented as:

> A business command center for invoices, receivables, subscriptions, expenses, and project profitability.

That positioning is stronger than a simple “welcome page” because it communicates operational value immediately.

## 18. Summary

The system already has a strong backend foundation for a professional dashboard. The best next step is to turn the home page into a decision-making surface with:

- Clear financial KPIs
- Trend charts
- Alerts
- Quick actions
- Role-aware sections

This will make the invoice system feel complete, modern, and enterprise-ready.

