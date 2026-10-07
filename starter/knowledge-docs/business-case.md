# Northwind Traders — Business case: Customer Portal, Order Desk renewal and delivery claims

> Fictitious company created for the HVE Squad hands-on workshop. Any resemblance to real
> customers is coincidental. All figures are synthetic and safe to share.

| Field | Value |
|---|---|
| Document owner | Lena Varga, Head of Customer Operations |
| Sponsor | Marc Dubois, Chief Operating Officer |
| Version | 2.0 — workshop edition, with business areas and delivery tracks |
| Status | Approved for discovery. Not yet approved for build. |

Every statement the squads rely on has a stable identifier (for example `BR-03`). When you
produce requirements, stories or designs, cite these identifiers. Anything that cannot be
traced to this document, to `current-state.md` or to `engineering-standards.md` is an
**assumption** and must be labelled as one.

## 1. Who we are

Northwind Traders is a B2B distributor of specialty food products based in Lyon, with a
second warehouse in Antwerp. We supply about **1,150 active business customers** — independent
grocers, delicatessens, restaurants and hotel kitchens — in France, Belgium and Luxembourg.
We employ 240 people, 38 of whom work in Customer Operations (the "Order Desk").

## 2. The problem

Customers order through three channels: phone, e-mail and a PDF order form. Order Desk staff
re-key every order into **Order Desk**, an internal web application built in 2013 on
ASP.NET MVC 5 and .NET Framework 4.8, running in our own data centre.

- **P-01** About **1,900 orders per week** are entered manually. 62 % arrive by phone or e-mail.
- **P-02** Re-keying causes errors: **4.1 %** of order lines need a correction after entry
  (wrong product, wrong quantity, wrong delivery address).
- **P-03** Customers cannot see the status of their orders. The Order Desk receives about
  **410 "where is my order?" calls per week**, roughly 35 % of all inbound calls.
- **P-04** Reordering is slow: 70 % of orders repeat a previous order with small changes,
  but customers must dictate or re-type the full list every time.
- **P-05** Customers ask for copies of invoices by e-mail; staff search a network file share
  for the PDF and send it manually (about 120 requests per week).
- **P-06** About **85 delivery claims per week** (damaged, missing or wrong products) arrive by
  phone or e-mail. Staff record them in a shared spreadsheet and Finance approves credit notes
  by e-mail. A claim takes **9 working days** on average to resolve, and **11 %** of claims are
  lost or recorded twice.

## 3. What we want

Three things, grouped into the business areas of section 4: a secure, web-based self-service
**Customer Portal** for our business customers, Order Desk running in **Microsoft Azure**
before the data-centre lease ends, and a **delivery-claims** process that replaces the
spreadsheet.

### 3.1 Business requirements

| ID | Requirement | Priority |
|---|---|---|
| BR-01 | A customer user can sign in and see only the orders of their own company. | Must |
| BR-02 | A customer user can see the list of their company's orders from the last 24 months with order date, status and total. | Must |
| BR-03 | A customer user can open an order and see its lines, quantities, prices, delivery address and current status. | Must |
| BR-04 | A customer user sees the status of an order as one of: Received, Confirmed, Picking, Shipped, Delivered, Cancelled. The status is always up to date. | Must |
| BR-05 | A customer user can create a new order by copying a previous order and changing quantities or removing lines before submitting it. | Must |
| BR-06 | A submitted portal order appears in Order Desk without being re-keyed, with the status Received. | Must |
| BR-07 | A customer user can download the PDF invoice of a delivered order. | Should |
| BR-08 | A customer administrator can invite and remove users of their own company. | Should |
| BR-09 | A customer user receives an e-mail when an order changes to Shipped. | Could |
| BR-10 | Order Desk staff can see whether an order was placed through the portal or entered by staff. | Must |
| BR-11 | The portal is available in French and English. Dutch is requested by Belgian customers. | Should |
| BR-12 | The portal respects each customer's negotiated prices; the customer sees their price, not the list price. | Must |
| BR-13 | Order Desk staff keep working through the move to Azure. Planned downtime stays inside the Sunday maintenance window (see `current-state.md`). | Must |
| BR-14 | Order Desk staff record a delivery claim against one or more lines of an existing order in under 2 minutes, with a reason (damaged, missing, wrong product) and up to 5 photos. | Must |
| BR-15 | Claims above **EUR 500** are approved by Finance. Nobody can approve a claim they recorded. | Must |
| BR-16 | An approved claim reaches the finance system as a credit-note request without being re-keyed. | Must |
| BR-17 | Warehouse supervisors in Antwerp see the claims about missing or wrong products from their warehouse and record the cause. | Should |
| BR-18 | Customer Operations sees a weekly claims dashboard: number, value, cause and time to resolve. | Should |
| BR-19 | The customer receives an e-mail when their claim is approved or rejected. | Could |

### 3.2 Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | Availability of 99.5 % during business hours, Monday to Saturday 06:00–20:00 CET. |
| NFR-02 | Order list and order detail pages respond in under 2 seconds for 95 % of requests. |
| NFR-03 | Customer data and order data stay in the European Union. |
| NFR-04 | Customer users authenticate with an identity managed outside the application; Northwind staff use their Microsoft Entra ID accounts. |
| NFR-05 | No secret (password, connection string with password, key) is stored in source code or in configuration files in the repository. |
| NFR-06 | Recovery point objective (RPO) of 1 hour and recovery time objective (RTO) of 4 hours for order data. |
| NFR-07 | The portal meets WCAG 2.2 level AA. |
| NFR-08 | Every change to an order (who, what, when, channel) is recorded for 7 years for audit purposes. |
| NFR-09 | Every claim decision (who, what, when, amount) is recorded for 7 years for audit purposes. |

### 3.3 Constraints

| ID | Constraint |
|---|---|
| C-01 | Our data-centre lease ends on **30 June 2027**. Order Desk must run in Microsoft Azure before that date. |
| C-02 | The Order Desk web server runs Windows Server 2012 R2, and its database runs SQL Server 2014. Both are past end of support; we pay for Extended Security Updates and want to stop. |
| C-03 | The warehouse management system **StockPilot** stays on premises in Antwerp until at least 2028. It exchanges order and shipment data with Order Desk (see `current-state.md`). |
| C-04 | Target run cost of the Azure platform (Order Desk and portal, production and one test environment) is **at most EUR 1,500 per month**. |
| C-05 | The portal must reuse Order Desk as the single source of truth for orders. We will not build a second order database. |
| C-06 | Our IT team (6 people) knows .NET and SQL Server well. They have limited experience with containers and Kubernetes. |
| C-07 | Power Platform is our approved platform for internal back-office applications. Staff hold Microsoft 365 E3 licences, which include Power Apps and Power Automate for Microsoft 365 with standard connectors only. |
| C-08 | Licences and run cost of the claims solution: **at most EUR 900 per month** for about 52 users (38 Order Desk staff, 6 Finance staff, 8 warehouse supervisors). |

### 3.4 Success measures

| ID | Measure | Baseline | Target |
|---|---|---|---|
| SM-01 | Share of orders placed through the portal | 0 % | 35 %, 6 months after portal launch |
| SM-02 | "Where is my order?" calls per week | 410 | 250 or fewer, 6 months after portal launch |
| SM-03 | Order lines needing correction after entry | 4.1 % | 2.5 % or fewer, 6 months after portal launch |
| SM-04 | Invoice copy requests handled by staff per week | 120 | 40 or fewer, 6 months after portal launch |
| SM-05 | Average time to resolve a delivery claim | 9 working days | 3 working days, 3 months after the claims launch |
| SM-06 | Claims lost or recorded twice | 11 % | under 1 %, 3 months after the claims launch |
| SM-07 | Production servers past end of support | 2 | 0 by 30 June 2027 |

## 4. Business areas and delivery tracks

The work is split into independent business areas. Each area is delivered by its own team,
on its own **delivery track**, from its own release. A track never waits for another one: a
dependency between areas is written down as an open item, not assumed. More areas and tracks
can be added later in the same way.

| ID | Business area | What it covers | Identifiers | Delivery track |
|---|---|---|---|---|
| BA-01 | Platform and data-centre exit | Run Order Desk and its database in Azure before the lease ends, keep the StockPilot exchange working, meet the availability, recovery and cost targets. | BR-13, NFR-01, NFR-03, NFR-05, NFR-06, C-01 to C-04, C-06, SM-07 | **Azure** |
| BA-02 | Ordering and customer self-service | The Customer Portal and the Order Desk application that serves it: sign-in, orders, status, reorder, invoices, prices, plus the upgrade of Order Desk that the portal depends on. | BR-01 to BR-12, NFR-02, NFR-04, NFR-05, NFR-07, NFR-08, C-05, SM-01 to SM-04 | **.NET** |
| BA-03 | Delivery claims and credit notes | Recording, approving and tracking delivery claims, and handing credit-note requests to Finance. | BR-14 to BR-19, NFR-03, NFR-04, NFR-09, C-07, C-08, SM-05, SM-06 | **Power Platform** |

NFR-03, NFR-04 and NFR-05 apply wherever they are relevant, whichever area a story belongs to.

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Lena Varga, Head of Customer Operations | Fewer calls, fewer errors and faster claims for her team. Owns the product backlog. |
| Marc Dubois, COO (sponsor) | Exit the data centre on time and within budget. |
| Ahmed Benali, IT Manager | Platforms his 6-person team can operate. Cares about security, licences and cost. |
| Sofie Peeters, Key Account Manager (Belgium) | Belgian customers asking for Dutch and for mobile access. |
| Customer users (grocers, chefs, purchasing staff) | Fast reorder, status visibility, invoice access, quick answers to claims. |
| Julien Moreau, Finance | Invoices and credit notes are produced by the finance system; other applications only show or request them. Approves claims above EUR 500. |
| Pieter Janssens, Warehouse Supervisor (Antwerp) | Wants to know which picking errors cause claims. |

## 6. Out of scope for the first release

- Online payment. Customers continue to pay by bank transfer on invoice.
- A native mobile app. A responsive web portal is enough for now.
- Changes to StockPilot.
- Replacing the finance system that produces invoices and credit notes.
- Customers recording claims themselves in the portal. In the first release, staff record
  every claim.

## 7. Known open questions

- **OQ-01** Which identity provider should customer users use? Options discussed include
  Microsoft Entra External ID and invitations into our tenant. No decision yet.
- **OQ-02** Must Dutch (BR-11) be in the first release, or can it follow?
- **OQ-03** Do customer administrators (BR-08) exist for every customer, or only for large ones?
- **OQ-04** Who approves claims of EUR 500 or less (BR-15)?
- **OQ-05** Must the claims already in the spreadsheet be moved to the new solution?

## 8. Timeline expectations

- Discovery and planning: October–November 2026.
- Delivery claims solution: pilot with the Lyon Order Desk team in Q1 2027.
- Order Desk in Azure (lift and modernise): before **30 June 2027** (C-01).
- Customer Portal first release: pilot with 20 customers in Q2 2027.
