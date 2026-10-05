-- Northwind Order Desk — schema (SQL Server 2014). Synthetic workshop data model.
-- Database: NorthwindOrders on NWSQL01. Collation: French_CI_AS.

CREATE TABLE dbo.Customers (
    Id                     INT            NOT NULL PRIMARY KEY,
    Code                   NVARCHAR(20)   NOT NULL UNIQUE,
    Name                   NVARCHAR(200)  NOT NULL,
    CountryCode            CHAR(2)        NOT NULL,
    Tier                   TINYINT        NOT NULL DEFAULT 0,   -- 0 Standard, 1 Gold
    DefaultDeliveryAddress NVARCHAR(400)  NOT NULL,
    IsActive               BIT            NOT NULL DEFAULT 1
);

CREATE TABLE dbo.Products (
    Id        INT            NOT NULL PRIMARY KEY,
    Sku       NVARCHAR(20)   NOT NULL UNIQUE,
    Name      NVARCHAR(200)  NOT NULL,
    Unit      NVARCHAR(20)   NOT NULL,
    ListPrice DECIMAL(10, 2) NOT NULL,
    IsActive  BIT            NOT NULL DEFAULT 1
);

CREATE TABLE dbo.PriceAgreements (
    CustomerId                INT            NOT NULL REFERENCES dbo.Customers (Id),
    ProductId                 INT            NOT NULL REFERENCES dbo.Products (Id),
    NegotiatedPrice           DECIMAL(10, 2) NOT NULL,
    ExcludeFromVolumeDiscount BIT            NOT NULL DEFAULT 0,
    ValidFrom                 DATE           NOT NULL,
    ValidTo                   DATE           NULL,
    CONSTRAINT PK_PriceAgreements PRIMARY KEY (CustomerId, ProductId, ValidFrom)
);

CREATE SEQUENCE dbo.OrderNumberSequence AS BIGINT START WITH 1 INCREMENT BY 1;

CREATE TABLE dbo.Orders (
    Id                   INT IDENTITY(1, 1) NOT NULL PRIMARY KEY,
    OrderNumber          NVARCHAR(20)   NOT NULL UNIQUE,
    CustomerId           INT            NOT NULL REFERENCES dbo.Customers (Id),
    OrderDate            DATETIME       NOT NULL,
    Status               TINYINT        NOT NULL,   -- 0 Received, 1 Confirmed, 2 Picking, 3 Shipped, 4 Delivered, 9 Cancelled
    Channel              TINYINT        NOT NULL,   -- 0 Phone, 1 Email, 2 OrderForm, 3 Portal
    DeliveryAddress      NVARCHAR(400)  NOT NULL,
    InvoiceNumber        NVARCHAR(20)   NULL,
    CreatedBy            NVARCHAR(100)  NOT NULL,
    OrderDiscountPercent DECIMAL(5, 2)  NOT NULL DEFAULT 0,
    Total                DECIMAL(12, 2) NOT NULL,
    ExportedToStockPilot DATETIME       NULL
);
CREATE INDEX IX_Orders_Customer_Date ON dbo.Orders (CustomerId, OrderDate DESC);

CREATE TABLE dbo.OrderLines (
    OrderId         INT            NOT NULL REFERENCES dbo.Orders (Id),
    LineNumber      INT            NOT NULL,
    ProductId       INT            NOT NULL REFERENCES dbo.Products (Id),
    Sku             NVARCHAR(20)   NOT NULL,
    ProductName     NVARCHAR(200)  NOT NULL,
    Quantity        INT            NOT NULL,
    UnitPrice       DECIMAL(10, 2) NOT NULL,
    DiscountPercent DECIMAL(5, 2)  NOT NULL,
    LineTotal       DECIMAL(12, 2) NOT NULL,
    CONSTRAINT PK_OrderLines PRIMARY KEY (OrderId, LineNumber)
);

-- Audit trail kept for 7 years (business case NFR-08).
CREATE TABLE dbo.OrderAudit (
    Id        BIGINT IDENTITY(1, 1) NOT NULL PRIMARY KEY,
    OrderId   INT           NOT NULL REFERENCES dbo.Orders (Id),
    Action    NVARCHAR(50)  NOT NULL,
    ChangedBy NVARCHAR(100) NULL,
    Channel   TINYINT       NULL,
    ChangedAt DATETIME      NOT NULL
);
CREATE INDEX IX_OrderAudit_Order ON dbo.OrderAudit (OrderId);
