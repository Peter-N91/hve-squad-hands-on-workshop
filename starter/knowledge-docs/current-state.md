# Northwind Traders — Current state of Order Desk

> Fictitious, synthetic inventory for the HVE Squad hands-on workshop.

This document describes Order Desk as it runs today in the Lyon data centre. The source code
is in `src/` and the database scripts are in `database/` at the root of this repository.
Items have stable identifiers (for example `CS-04`) so that designs and plans can cite them.

## 1. Application overview

| ID | Fact |
|---|---|
| CS-01 | Order Desk is an ASP.NET MVC 5 web application on **.NET Framework 4.8**, built in 2013 and maintained by the internal IT team. Solution: `src/Northwind.OrderDesk.sln`. |
| CS-02 | Projects: `Northwind.OrderDesk.Core` (domain, pricing, data access), `Northwind.OrderDesk.Web` (MVC 5 user interface), `Northwind.OrderDesk.Tests` (MSTest v1 unit tests). All use the old, non-SDK project format with `packages.config`. |
| CS-03 | Users: 38 Order Desk staff and about 45 other internal users (sales, finance, warehouse supervisors). About 60 concurrent users at peak (Monday 08:00–11:00). |
| CS-04 | Staff sign in with **Windows Integrated Authentication** against the on-premises Active Directory domain `NORTHWIND`. There is no customer-facing access today. |
| CS-05 | Volume: about 1,900 orders and 14,000 order lines per week. 1,150 active customers, 2,300 active products. |

## 2. Infrastructure

| ID | Component | Details |
|---|---|---|
| CS-06 | Web server `NWWEB01` | Windows Server 2012 R2, IIS 8.5, 4 vCPU, 16 GB RAM, VMware VM. Average CPU 18 %, peak 55 %. Single server, no load balancer. |
| CS-07 | Database server `NWSQL01` | SQL Server 2014 Standard, Windows Server 2012 R2, 8 vCPU, 32 GB RAM. Database `NorthwindOrders`, **48 GB**, growing about 1 GB per month. Full backup nightly, log backup every 15 minutes, kept 35 days on a local backup appliance. |
| CS-08 | File share `\\NWFS01\invoices` | About **120 GB** of invoice PDFs written by the finance system and read by Order Desk to attach invoices. Grows about 2 GB per month. |
| CS-09 | Network | Lyon data centre with a site-to-site VPN to the Antwerp warehouse. Internet egress through an on-premises firewall. No Azure presence yet; the company has a Microsoft 365 tenant and Microsoft Entra ID synchronised from Active Directory with Entra Connect. |

## 3. Integrations

| ID | Integration | Details |
|---|---|---|
| CS-10 | StockPilot (warehouse management, Antwerp, on premises) | A **nightly batch job at 02:00** exports confirmed orders to StockPilot as CSV files on an SFTP server, and imports shipment updates from StockPilot. Order statuses Picking and Shipped are therefore updated in Order Desk **once per night**. |
| CS-11 | Finance system (invoicing) | Writes one PDF per invoice to `\\NWFS01\invoices\{year}\{invoiceNumber}.pdf`. Order Desk reads them. |
| CS-12 | E-mail | Order confirmations are sent through the internal SMTP relay `smtp.northwind.local` on port 25 without authentication. |

## 4. Application characteristics that matter for the move

These were found by the IT team during a quick review. Treat them as known facts, not as a
complete list.

| ID | Finding | Where |
|---|---|---|
| CS-13 | The database connection string uses `Integrated Security=SSPI` and the server name `NWSQL01`. | `src/Northwind.OrderDesk.Web/Web.config` |
| CS-14 | Invoice PDFs are read from a UNC path configured in `appSettings` (`InvoiceSharePath`). | `Web.config`, `InvoiceStore.cs` |
| CS-15 | Errors are written to the **Windows Event Log** with `System.Diagnostics.EventLog`. | `EventLogErrorLogger.cs` |
| CS-16 | Session state is `InProc`. The order-entry screen keeps the order being entered in session. | `Web.config`, `OrdersController.cs` |
| CS-17 | Configuration is read through `System.Configuration.ConfigurationManager` throughout the code. | Several classes |
| CS-18 | Unit tests use MSTest v1 referenced from the Visual Studio installation (GAC), so they only run inside Visual Studio on the build machine. | `Northwind.OrderDesk.Tests.csproj` |
| CS-19 | There is no automated build or deployment. A developer publishes from Visual Studio to a file share and an administrator copies the files to `NWWEB01`. | — |
| CS-20 | Pricing rules (customer-negotiated prices and volume discounts) live in `PricingService.cs` and are covered by unit tests. They must not change during the move. | `Northwind.OrderDesk.Core` |

## 5. Operations

| ID | Fact |
|---|---|
| CS-21 | Planned maintenance window: Sunday 06:00–12:00 CET. |
| CS-22 | Monitoring is limited to ping checks of the two servers and a weekly look at the Event Log. |
| CS-23 | Last disaster-recovery test: never. Backups have been restored manually twice in five years. |
