using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Northwind.OrderDesk.Core.Domain;
using Northwind.OrderDesk.Core.Pricing;
using Northwind.OrderDesk.Tests.Fakes;

namespace Northwind.OrderDesk.Tests
{
    /// <summary>
    /// Pricing is business-critical (current-state CS-20). These expectations must not change.
    /// </summary>
    [TestClass]
    public class PricingServiceTests
    {
        private InMemoryOrderDesk _desk;
        private PricingService _pricing;

        [TestInitialize]
        public void SetUp()
        {
            _desk = new InMemoryOrderDesk();
            _pricing = new PricingService(_desk, _desk);
        }

        [TestMethod]
        public void ListPriceIsUsedWhenNoAgreementExists()
        {
            var order = Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.Pasta, 10));

            Assert.AreEqual(3.20m, order.Lines[0].UnitPrice);
            Assert.AreEqual(0m, order.Lines[0].DiscountPercent);
            Assert.AreEqual(32.00m, order.Lines[0].LineTotal);
            Assert.AreEqual(32.00m, order.Total);
        }

        [TestMethod]
        public void NegotiatedPriceReplacesListPrice()
        {
            var order = Price(InMemoryOrderDesk.GoldCustomerId, Line(InMemoryOrderDesk.OliveOil, 2));

            Assert.AreEqual(39.90m, order.Lines[0].UnitPrice);
            Assert.AreEqual(79.80m, order.Lines[0].LineTotal);
        }

        [TestMethod]
        public void BelowFiftyUnitsHasNoVolumeDiscount()
        {
            var order = Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.Pasta, 49));

            Assert.AreEqual(0m, order.Lines[0].DiscountPercent);
            Assert.AreEqual(156.80m, order.Lines[0].LineTotal);
        }

        [TestMethod]
        public void FiftyUnitsGetFivePercent()
        {
            var order = Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.Pasta, 50));

            Assert.AreEqual(5m, order.Lines[0].DiscountPercent);
            Assert.AreEqual(152.00m, order.Lines[0].LineTotal);
        }

        [TestMethod]
        public void HundredUnitsGetEightPercent()
        {
            var order = Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.Pasta, 100));

            Assert.AreEqual(8m, order.Lines[0].DiscountPercent);
            Assert.AreEqual(294.40m, order.Lines[0].LineTotal);
        }

        [TestMethod]
        public void VolumeDiscountTierBoundaries()
        {
            Assert.AreEqual(0m, PricingService.VolumeDiscountPercent(1));
            Assert.AreEqual(0m, PricingService.VolumeDiscountPercent(49));
            Assert.AreEqual(5m, PricingService.VolumeDiscountPercent(50));
            Assert.AreEqual(5m, PricingService.VolumeDiscountPercent(99));
            Assert.AreEqual(8m, PricingService.VolumeDiscountPercent(100));
            Assert.AreEqual(8m, PricingService.VolumeDiscountPercent(5000));
        }

        [TestMethod]
        public void AgreementCanExcludeVolumeDiscount()
        {
            var order = Price(InMemoryOrderDesk.GoldCustomerId, Line(InMemoryOrderDesk.Comte, 60));

            Assert.AreEqual(22.00m, order.Lines[0].UnitPrice);
            Assert.AreEqual(0m, order.Lines[0].DiscountPercent);
            Assert.AreEqual(1320.00m, order.Lines[0].LineTotal);
        }

        [TestMethod]
        public void LineTotalsRoundHalfAwayFromZero()
        {
            // 51 x 1.30 x 0.95 = 62.985: banker's rounding would give 62.98.
            var order = Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.Baguette, 51));

            Assert.AreEqual(62.99m, order.Lines[0].LineTotal);
        }

        [TestMethod]
        public void GoldCustomerBelowThresholdHasNoOrderDiscount()
        {
            var order = Price(InMemoryOrderDesk.GoldCustomerId, Line(InMemoryOrderDesk.OliveOil, 25));

            Assert.AreEqual(997.50m, order.LinesSubtotal);
            Assert.AreEqual(0m, order.OrderDiscountPercent);
            Assert.AreEqual(997.50m, order.Total);
        }

        [TestMethod]
        public void GoldCustomerAtThresholdGetsTwoPercent()
        {
            var order = Price(InMemoryOrderDesk.GoldCustomerId,
                Line(InMemoryOrderDesk.Honey, 25),
                Line(InMemoryOrderDesk.Honey, 25));

            Assert.AreEqual(1000.00m, order.LinesSubtotal);
            Assert.AreEqual(2m, order.OrderDiscountPercent);
            Assert.AreEqual(980.00m, order.Total);
        }

        [TestMethod]
        public void GoldOrderDiscountIsRoundedOnTheTotal()
        {
            // 26 x 39.90 = 1,037.40; less 2 % = 1,016.652.
            var order = Price(InMemoryOrderDesk.GoldCustomerId, Line(InMemoryOrderDesk.OliveOil, 26));

            Assert.AreEqual(1016.65m, order.Total);
        }

        [TestMethod]
        public void StandardCustomerNeverGetsOrderDiscount()
        {
            var order = Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.Comte, 45));

            Assert.AreEqual(1120.50m, order.LinesSubtotal);
            Assert.AreEqual(0m, order.OrderDiscountPercent);
            Assert.AreEqual(1120.50m, order.Total);
        }

        [TestMethod]
        [ExpectedException(typeof(InvalidOperationException))]
        public void InactiveProductCannotBeOrdered()
        {
            Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.DiscontinuedVinegar, 1));
        }

        [TestMethod]
        [ExpectedException(typeof(ArgumentOutOfRangeException))]
        public void ZeroQuantityIsRejected()
        {
            Price(InMemoryOrderDesk.StandardCustomerId, Line(InMemoryOrderDesk.Pasta, 0));
        }

        [TestMethod]
        [ExpectedException(typeof(InvalidOperationException))]
        public void OrderMustBelongToTheCustomer()
        {
            var order = new Order { CustomerId = InMemoryOrderDesk.GoldCustomerId };
            order.Lines.Add(Line(InMemoryOrderDesk.Pasta, 1));
            _pricing.PriceOrder(order, _desk.GetCustomer(InMemoryOrderDesk.StandardCustomerId));
        }

        private Order Price(int customerId, params OrderLine[] lines)
        {
            var order = new Order { CustomerId = customerId };
            foreach (var line in lines)
            {
                line.LineNumber = order.Lines.Count + 1;
                order.Lines.Add(line);
            }

            _pricing.PriceOrder(order, _desk.GetCustomer(customerId));
            return order;
        }

        private static OrderLine Line(int productId, int quantity)
        {
            return new OrderLine { ProductId = productId, Quantity = quantity };
        }
    }
}
