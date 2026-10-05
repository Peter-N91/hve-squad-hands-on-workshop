-- Northwind Order Desk — nightly StockPilot exchange (current-state CS-10).
-- Scheduled by SQL Server Agent job "NW - StockPilot nightly" at 02:00 on NWSQL01.
-- Files are written to D:\Exchange\StockPilot, which is synchronised to the Antwerp SFTP server
-- by a Windows scheduled task on NWSQL01.

CREATE PROCEDURE dbo.usp_ExportConfirmedOrdersForStockPilot
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @file NVARCHAR(260) = N'D:\Exchange\StockPilot\out\orders_' + CONVERT(NVARCHAR(8), GETDATE(), 112) + N'.csv';
    DECLARE @command NVARCHAR(4000) =
        N'bcp "SELECT o.OrderNumber, l.LineNumber, l.Sku, l.Quantity, o.DeliveryAddress FROM NorthwindOrders.dbo.Orders o ' +
        N'JOIN NorthwindOrders.dbo.OrderLines l ON l.OrderId = o.Id WHERE o.Status = 1 AND o.ExportedToStockPilot IS NULL" ' +
        N'queryout "' + @file + N'" -c -t; -T -S NWSQL01';

    EXEC master..xp_cmdshell @command, NO_OUTPUT;

    UPDATE dbo.Orders SET ExportedToStockPilot = GETDATE(), Status = 2
    WHERE Status = 1 AND ExportedToStockPilot IS NULL;
END;
GO

CREATE PROCEDURE dbo.usp_ImportShipmentsFromStockPilot
AS
BEGIN
    SET NOCOUNT ON;

    CREATE TABLE #Shipments (OrderNumber NVARCHAR(20), ShippedAt DATETIME, Carrier NVARCHAR(50));

    BULK INSERT #Shipments
    FROM 'D:\Exchange\StockPilot\in\shipments.csv'
    WITH (FIELDTERMINATOR = ';', ROWTERMINATOR = '\n', FIRSTROW = 2);

    UPDATE o SET o.Status = 3
    FROM dbo.Orders o
    JOIN #Shipments s ON s.OrderNumber = o.OrderNumber
    WHERE o.Status = 2;

    INSERT INTO dbo.OrderAudit (OrderId, Action, ChangedBy, Channel, ChangedAt)
    SELECT o.Id, N'Status:Shipped', N'StockPilot', NULL, GETUTCDATE()
    FROM dbo.Orders o
    JOIN #Shipments s ON s.OrderNumber = o.OrderNumber;
END;
GO
