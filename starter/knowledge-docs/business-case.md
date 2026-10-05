# Northwind Traders — Business case: Customer Portal and Order Desk renewal

> Fictitious company created for the HVE Squad hands-on workshop. Any resemblance to real
> customers is coincidental. All figures are synthetic and safe to share.

| Field | Value |
|---|---|
| Document owner | Lena Varga, Head of Customer Operations |
| Sponsor | Marc Dubois, Chief Operating Officer |
| Version | 1.0 — workshop edition |
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

## 3. What we want: the Northwind Customer Portal

A secure, web-based self-service portal for our business customers.

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

### 3.3 Constraints

| ID | Constraint |
|---|---|
| C-01 | Our data-centre lease ends on **30 June 2027**. Order Desk must run in Microsoft Azure before that date. |
| C-02 | The Order Desk web server runs Windows Server 2012 R2, and its database runs SQL Server 2014. Both are past end of support; we pay for Extended Security Updates and want to stop. |
| C-03 | The warehouse management system **StockPilot** stays on premises in Antwerp until at least 2028. It exchanges order and shipment data with Order Desk (see `current-state.md`). |
| C-04 | Target run cost of the Azure platform (Order Desk and portal, production and one test environment) is **at most EUR 1,500 per month**. |
| C-05 | The portal must reuse Order Desk as the single source of truth for orders. We will not build a second order database. |
| C-06 | Our IT team (6 people) knows .NET and SQL Server well. They have limited experience with containers and Kubernetes. |

### 3.4 Success measures

| ID | Measure | Baseline | Target, 6 months after portal launch |
|---|---|---|---|
| SM-01 | Share of orders placed through the portal | 0 % | 35 % |
| SM-02 | "Where is my order?" calls per week | 410 | 250 or fewer |
| SM-03 | Order lines needing correction after entry | 4.1 % | 2.5 % or fewer |
| SM-04 | Invoice copy requests handled by staff per week | 120 | 40 or fewer |

## 4. Stakeholders

| Stakeholder | Interest |
|---|---|
| Lena Varga, Head of Customer Operations | Fewer calls and fewer errors for her team. Owns the portal backlog. |
| Marc Dubois, COO (sponsor) | Exit the data centre on time and within budget. |
| Ahmed Benali, IT Manager | A platform his 6-person team can operate. Cares about security and cost. |
| Sofie Peeters, Key Account Manager (Belgium) | Belgian customers asking for Dutch and for mobile access. |
| Customer users (grocers, chefs, purchasing staff) | Fast reorder, status visibility, invoice access. |
| Julien Moreau, Finance | Invoices are produced by the finance system; the portal only shows them. |

## 5. Out of scope for the first release

- Online payment. Customers continue to pay by bank transfer on invoice.
- A native mobile app. A responsive web portal is enough for now.
- Changes to StockPilot.
- Replacing the finance system that produces invoices.

## 6. Known open questions

- **OQ-01** Which identity provider should customer users use? Options discussed include
  Microsoft Entra External ID and invitations into our tenant. No decision yet.
- **OQ-02** Must Dutch (BR-11) be in the first release, or can it follow?
- **OQ-03** Do customer administrators (BR-08) exist for every customer, or only for large ones?

## 7. Timeline expectations

- Discovery and planning: October–November 2026.
- Order Desk in Azure (lift and modernise): before **30 June 2027** (C-01).
- Customer Portal first release: pilot with 20 customers in Q2 2027.
