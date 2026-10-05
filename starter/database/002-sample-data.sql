-- Northwind Order Desk — small synthetic sample for local experiments. Not production data.

INSERT INTO dbo.Customers (Id, Code, Name, CountryCode, Tier, DefaultDeliveryAddress, IsActive) VALUES
 (100, N'C-0100', N'Épicerie Fine Lumière', 'FR', 1, N'12 rue Mercière, 69002 Lyon', 1),
 (200, N'C-0200', N'Hôtel du Parc', 'BE', 0, N'Parklaan 4, 2000 Antwerpen', 1),
 (210, N'C-0210', N'Brasserie Kirchberg', 'LU', 0, N'8 avenue J.F. Kennedy, 1855 Luxembourg', 1),
 (300, N'C-0300', N'Closed Bistro', 'LU', 0, N'1 Grand-Rue, 1660 Luxembourg', 0);

INSERT INTO dbo.Products (Id, Sku, Name, Unit, ListPrice, IsActive) VALUES
 (1, N'NW-OIL-001', N'Olive oil, extra virgin, 5 L', N'can', 42.50, 1),
 (2, N'NW-PAS-010', N'Durum wheat pasta, 1 kg', N'bag', 3.20, 1),
 (3, N'NW-CHE-020', N'Comté AOP 18 months, 1 kg', N'kg', 24.90, 1),
 (4, N'NW-VIN-030', N'Cider vinegar, 1 L', N'bottle', 8.00, 0),
 (5, N'NW-BAK-040', N'Par-baked baguette', N'piece', 1.30, 1),
 (6, N'NW-HON-050', N'Lavender honey, 1 kg', N'jar', 20.00, 1);

INSERT INTO dbo.PriceAgreements (CustomerId, ProductId, NegotiatedPrice, ExcludeFromVolumeDiscount, ValidFrom, ValidTo) VALUES
 (100, 1, 39.90, 0, '2026-01-01', NULL),
 (100, 3, 22.00, 1, '2026-01-01', NULL);
