using System;
using System.Linq;
using Northwind.OrderDesk.Core.Data;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Core.Pricing
{
    /// <summary>
    /// Customer pricing rules agreed with Sales in 2015 (revised 2019).
    /// 1. A negotiated price, when one exists, replaces the list price.
    /// 2. Volume discount per line: 5 % from 50 units, 8 % from 100 units,
    ///    unless the agreement excludes the product from volume discounts.
    /// 3. Gold customers receive 2 % off the whole order when the lines subtotal reaches EUR 1,000.
    /// Amounts are rounded to 2 decimals, half away from zero, per line and for the order total.
    /// </summary>
    public class PricingService
    {
        public const int VolumeTier1Quantity = 50;
        public const decimal VolumeTier1Percent = 5m;
        public const int VolumeTier2Quantity = 100;
        public const decimal VolumeTier2Percent = 8m;
        public const decimal GoldOrderThreshold = 1000m;
        public const decimal GoldOrderPercent = 2m;

        private readonly IProductCatalog _catalog;
        private readonly IPriceAgreementSource _agreements;

        public PricingService(IProductCatalog catalog, IPriceAgreementSource agreements)
        {
            if (catalog == null) throw new ArgumentNullException("catalog");
            if (agreements == null) throw new ArgumentNullException("agreements");
            _catalog = catalog;
            _agreements = agreements;
        }

        public void PriceOrder(Order order, Customer customer)
        {
            if (order == null) throw new ArgumentNullException("order");
            if (customer == null) throw new ArgumentNullException("customer");
            if (order.CustomerId != customer.Id)
            {
                throw new InvalidOperationException("The order does not belong to this customer.");
            }

            foreach (var line in order.Lines)
            {
                PriceLine(line, customer.Id);
            }

            var subtotal = order.Lines.Sum(l => l.LineTotal);
            order.OrderDiscountPercent =
                customer.Tier == CustomerTier.Gold && subtotal >= GoldOrderThreshold ? GoldOrderPercent : 0m;
            order.Total = Round(subtotal * (1m - order.OrderDiscountPercent / 100m));
        }

        public void PriceLine(OrderLine line, int customerId)
        {
            if (line == null) throw new ArgumentNullException("line");
            if (line.Quantity <= 0)
            {
                throw new ArgumentOutOfRangeException("line", "Quantity must be greater than zero.");
            }

            var product = _catalog.GetProduct(line.ProductId);
            if (product == null || !product.IsActive)
            {
                throw new InvalidOperationException(
                    string.Format("Product {0} is not available for ordering.", line.ProductId));
            }

            var agreement = _agreements.GetAgreement(customerId, product.Id);
            line.Sku = product.Sku;
            line.ProductName = product.Name;
            line.UnitPrice = agreement != null ? agreement.NegotiatedPrice : product.ListPrice;
            line.DiscountPercent = agreement != null && agreement.ExcludeFromVolumeDiscount
                ? 0m
                : VolumeDiscountPercent(line.Quantity);
            line.LineTotal = Round(line.Quantity * line.UnitPrice * (1m - line.DiscountPercent / 100m));
        }

        public static decimal VolumeDiscountPercent(int quantity)
        {
            if (quantity >= VolumeTier2Quantity) return VolumeTier2Percent;
            if (quantity >= VolumeTier1Quantity) return VolumeTier1Percent;
            return 0m;
        }

        private static decimal Round(decimal amount)
        {
            return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
        }
    }
}
