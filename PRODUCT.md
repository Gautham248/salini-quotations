# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Office staff at a trading desk, using desktop/laptop during business hours, generating quotations for walk-in and phone customers. Two roles exist:

- **Admin** — manages master data (items, units, users, company settings), has visibility into all quotations.
- **Staff** — creates and manages their own quotations.

## Product Purpose

Salini Traders Quotation Generator is an internal tool for a steel and construction materials trading business. It enables staff to create itemized, GST-compliant quotations quickly — typically under two minutes while a customer waits at the counter or on the phone — and export them as print-ready PDFs.

## Positioning

Industry-specific pricing logic combined with a speed-first counter-service workflow. The tool handles weight-based pricing, unit conversions (kg/ton/piece), GST calculation, loading charges, and other steel-trading-specific conventions that a generic invoicing tool would not understand. Every design decision prioritizes rapid quotation assembly over generic document-editing metaphors.

## Operating Context

- Desktop-only usage at a trading counter or office desk
- Customer is present (in person or on phone) while the quotation is built
- Quotations must be printable and shareable as PDFs
- Business operates in Kerala, India — GST regime, Indian numbering conventions
- The company name is "SALINI TRADERS" (per existing CompanySettings defaults)

## Capabilities and Constraints

**Confirmed capabilities:**
- Master data management: items with descriptions, units, rates, GST percentages, weight/ piece counts, and multi-category classification
- Unit management with conversion factors (e.g., kg to ton)
- User management with admin/staff roles
- Company settings (name, address, contact, bank details, GSTIN, disclaimer, loading note)
- Quotation CRUD: create, view, edit, duplicate, finalize/lock
- Line item composition: item selection, quantity, rate, GST, automatic net value calculation
- Quotation-level totals: subtotal, CGST, SGST, round-off, net amount (amount in words)
- PDF export with jspdf-autotable
- Role-based routing: admin → dashboard, staff → their quotations

**Technical constraints:**
- Next.js 16 App Router, React 19, Tailwind CSS v4
- shadcn/ui component library (base-nova style, neutral base color)
- Prisma ORM with SQLite (libsql)
- NextAuth v5 for authentication
- jspdf + jspdf-autotable for PDF generation

**Undecided:**
- Whether dark mode is desired by users or just a developer convenience
- Whether the tool needs any offline or low-connectivity support

## Brand Commitments

No formal brand identity, logo, color scheme, or visual guidelines exist. The company name "Salini Traders" is the only fixed element. All visual identity is free to be created.

## Evidence on Hand

- `prisma/schema.prisma` — complete data model with CompanySettings defaults confirming the company name and contact details
- `package.json` — full dependency list confirming the tech stack
- `src/app/` — route structure confirming all screens
- `components.json` — shadcn configuration confirming base-nova style, neutral base
- `src/app/globals.css` — current CSS custom properties confirming the neutral gray theme
- No logo file, brand guide, or marketing collateral exists in the repository

## Product Principles

1. **Speed over everything.** Every interaction must be measured in seconds, not minutes. The customer is waiting.
2. **Accuracy is trust.** GST, unit conversions, and calculations must be visibly correct at every step. Mistakes cost real money and reputation.
3. **Familiarity for trading desk staff.** The interface should feel natural to someone who works with ledgers, rate lists, and paper quotations — not someone who lives in SaaS tools.
4. **Print is the output.** The PDF is the deliverable. The screen is just the means to produce it.
5. **Quiet confidence, not flash.** The tool should feel capable, grounded, and professional — like well-maintained industrial equipment, not a consumer app.

## Accessibility & Inclusion

No specific user needs have been identified beyond standard web accessibility. Desktop-only usage with known staff users.
