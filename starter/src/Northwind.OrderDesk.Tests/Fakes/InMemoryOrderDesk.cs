using System;
using System.Collections.Generic;
using System.Linq;
using Northwind.OrderDesk.Core.Data;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Tests.Fakes
{
    /// <summary>
    /// Synthetic in-memory data shared by the unit tests. No database is needed.
    /// </summary>
    public class InMemoryOrderDesk : IOrderRepository, IProductCatalog, IPriceAgreementSource
    {
        public const int GoldCustomerId = 100;
        public const int StandardCustomerId = 200;
        public const int InactiveCustomerId = 300;

        public const int OliveOil = 1;
        public const int Pasta = 2;
        public const int Comte = 3;
        public const int DiscontinuedVinegar = 4;
        public const int Baguette = 5;
        public const int Honey = 6;

        private readonly Dictionary<int, Customer> _customers = new Dictionary<int, Customer>();
        private readonly Dictionary<int, Product> _products = new Dictionary<int, Product>();
        private readonly List<PriceAgreement> _agreements = new List<PriceAgreement>();
        private readonly Dictionary<int, Order> _orders = new Dictionary<int, Order>();
        private int _nextOrderId = 1000;
        private int _nextOrderNumber = 1;

        public InMemoryOrderDesk()
        {
            AddCustomer(GoldCustomerId, "C-0100", "Épicerie Fine Lumière", "FR", CustomerTier.Gold, "12 rue Mercière, 69002 Lyon", true);
            AddCustomer(StandardCustomerId, "C-0200", "Hôtel du Parc", "BE", CustomerTier.Standard, "Parklaan 4, 2000 Antwerpen", true);
            AddCustomer(InactiveCustomerId, "C-0300", "Closed Bistro", "LU", CustomerTier.Standard, "1 Grand-Rue, 1660 Luxembourg", false);

            AddProduct(OliveOil, "NW-OIL-001", "Olive oil, extra virgin, 5 L", "can", 42.50m, true);
            AddProduct(Pasta, "NW-PAS-010", "Durum wheat pasta, 1 kg", "bag", 3.20m, true);
            AddProduct(Comte, "NW-CHE-020", "Comté AOP 18 months, 1 kg", "kg", 24.90m, true);
            AddProduct(DiscontinuedVinegar, "NW-VIN-030", "Cider vinegar, 1 L", "bottle", 8.00m, false);
            AddProduct(Baguette, "NW-BAK-040", "Par-baked baguette", "piece", 1.30m, true);
            AddProduct(Honey, "NW-HON-050", "Lavender honey, 1 kg", "jar", 20.00m, true);

            _agreements.Add(new PriceAgreement { CustomerId = GoldCustomerId, ProductId = OliveOil, NegotiatedPrice = 39.90m });
            _agreements.Add(new PriceAgreement { CustomerId = GoldCustomerId, ProductId = Comte, NegotiatedPrice = 22.00m, ExcludeFromVolumeDiscount = true });
        }

        public bool FailOnSave { get; set; }
        public List<Tuple<int, OrderStatus, string>> StatusChanges { get; } = new List<Tuple<int, OrderStatus, string>>();
        public IEnumerable<Order> SavedOrders { get { return _orders.Values; } }

        public Order AddExistingOrder(int customerId, params Tuple<int, int>[] productQuantities)
        {
            var order = new Order
            {
                Id = _nextOrderId++,
                OrderNumber = "NW-OLD-" + _nextOrderId,
                CustomerId = customerId,
                OrderDate = new DateTime(2026, 9, 1),
                Status = OrderStatus.Delivered,
                Channel = OrderChannel.Phone,
                DeliveryAddress = _customers[customerId].DefaultDeliveryAddress,
                CreatedBy = @"NORTHWIND\agent01"
            };

            foreach (var item in productQuantities)
            {
                var product = _products[item.Item1];
                order.Lines.Add(new OrderLine
                {
                    LineNumber = order.Lines.Count + 1,
                    ProductId = product.Id,
                    Sku = product.Sku,
                    ProductName = product.Name,
                    Quantity = item.Item2,
                    UnitPrice = 1m,
                    LineTotal = item.Item2
                });
            }

            _orders.Add(order.Id, order);
            return order;
        }

        public Order GetOrder(int orderId)
        {
            Order order;
            return _orders.TryGetValue(orderId, out order) ? order : null;
        }

        public IList<Order> GetOrdersForCustomer(int customerId, DateTime fromDate)
        {
            return _orders.Values.Where(o => o.CustomerId == customerId && o.OrderDate >= fromDate).ToList();
        }

        public Customer GetCustomer(int customerId)
        {
            Customer customer;
            return _customers.TryGetValue(customerId, out customer) ? customer : null;
        }

        public int SaveNewOrder(Order order)
        {
            if (FailOnSave)
            {
                throw new InvalidOperationException("Simulated database failure.");
            }

            var id = _nextOrderId++;
            _orders.Add(id, order);
            return id;
        }

        public void UpdateStatus(int orderId, OrderStatus status, string changedBy)
        {
            StatusChanges.Add(Tuple.Create(orderId, status, changedBy));
        }

        public string NextOrderNumber()
        {
            return "NW-" + (_nextOrderNumber++).ToString("D7");
        }

        public Product GetProduct(int productId)
        {
            Product product;
            return _products.TryGetValue(productId, out product) ? product : null;
        }

        public IList<Product> GetActiveProducts()
        {
            return _products.Values.Where(p => p.IsActive).ToList();
        }

        public PriceAgreement GetAgreement(int customerId, int productId)
        {
            return _agreements.FirstOrDefault(a => a.CustomerId == customerId && a.ProductId == productId);
        }

        private void AddCustomer(int id, string code, string name, string country, CustomerTier tier, string address, bool active)
        {
            _customers.Add(id, new Customer { Id = id, Code = code, Name = name, CountryCode = country, Tier = tier, DefaultDeliveryAddress = address, IsActive = active });
        }

        private void AddProduct(int id, string sku, string name, string unit, decimal price, bool active)
        {
            _products.Add(id, new Product { Id = id, Sku = sku, Name = name, Unit = unit, ListPrice = price, IsActive = active });
        }
    }
}
