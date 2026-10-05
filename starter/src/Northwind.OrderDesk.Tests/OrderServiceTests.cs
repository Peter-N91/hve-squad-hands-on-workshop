using System;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Northwind.OrderDesk.Core.Domain;
using Northwind.OrderDesk.Core.Pricing;
using Northwind.OrderDesk.Core.Services;
using Northwind.OrderDesk.Tests.Fakes;

namespace Northwind.OrderDesk.Tests
{
    [TestClass]
    public class OrderServiceTests
    {
        private static readonly DateTime Now = new DateTime(2026, 10, 5, 9, 30, 0);
        private InMemoryOrderDesk _desk;
        private RecordingLogger _logger;
        private OrderService _service;

        [TestInitialize]
        public void SetUp()
        {
            _desk = new InMemoryOrderDesk();
            _logger = new RecordingLogger();
            _service = new OrderService(_desk, new PricingService(_desk, _desk), _logger, () => Now);
        }

        [TestMethod]
        public void CopyOrderCopiesProductsAndQuantitiesButNotPrices()
        {
            var source = _desk.AddExistingOrder(InMemoryOrderDesk.GoldCustomerId,
                Tuple.Create(InMemoryOrderDesk.OliveOil, 4),
                Tuple.Create(InMemoryOrderDesk.Pasta, 60));

            var draft = _service.CopyOrder(source.Id, InMemoryOrderDesk.GoldCustomerId);

            Assert.AreEqual(2, draft.Lines.Count);
            Assert.AreEqual(InMemoryOrderDesk.OliveOil, draft.Lines[0].ProductId);
            Assert.AreEqual(4, draft.Lines[0].Quantity);
            Assert.AreEqual(60, draft.Lines[1].Quantity);
            Assert.AreEqual(0m, draft.Lines[0].UnitPrice);
            Assert.AreEqual(OrderStatus.Received, draft.Status);
            Assert.AreEqual(source.DeliveryAddress, draft.DeliveryAddress);
        }

        [TestMethod]
        [ExpectedException(typeof(InvalidOperationException))]
        public void CopyOrderRefusesAnotherCustomersOrder()
        {
            var source = _desk.AddExistingOrder(InMemoryOrderDesk.GoldCustomerId, Tuple.Create(InMemoryOrderDesk.Pasta, 1));
            _service.CopyOrder(source.Id, InMemoryOrderDesk.StandardCustomerId);
        }

        [TestMethod]
        public void SubmitPricesNumbersAndSavesTheOrder()
        {
            var draft = _service.CopyOrder(
                _desk.AddExistingOrder(InMemoryOrderDesk.GoldCustomerId, Tuple.Create(InMemoryOrderDesk.OliveOil, 2)).Id,
                InMemoryOrderDesk.GoldCustomerId);

            var saved = _service.Submit(draft, OrderChannel.Portal, "lena@customer.example");

            Assert.AreEqual("NW-0000001", saved.OrderNumber);
            Assert.AreEqual(OrderChannel.Portal, saved.Channel);
            Assert.AreEqual(OrderStatus.Received, saved.Status);
            Assert.AreEqual(Now, saved.OrderDate);
            Assert.AreEqual(79.80m, saved.Total);
            Assert.IsTrue(saved.Id > 0);
            Assert.IsTrue(_desk.SavedOrders.Contains(saved));
            Assert.AreEqual(1, _logger.Information.Count);
        }

        [TestMethod]
        public void SubmitRemovesZeroQuantityLinesAndRenumbers()
        {
            var draft = _service.CopyOrder(
                _desk.AddExistingOrder(InMemoryOrderDesk.StandardCustomerId,
                    Tuple.Create(InMemoryOrderDesk.Pasta, 10),
                    Tuple.Create(InMemoryOrderDesk.Comte, 2),
                    Tuple.Create(InMemoryOrderDesk.Baguette, 40)).Id,
                InMemoryOrderDesk.StandardCustomerId);
            draft.Lines[1].Quantity = 0;

            var saved = _service.Submit(draft, OrderChannel.Phone, @"NORTHWIND\agent02");

            Assert.AreEqual(2, saved.Lines.Count);
            CollectionAssert.AreEqual(new[] { 1, 2 }, saved.Lines.Select(l => l.LineNumber).ToArray());
            Assert.AreEqual(InMemoryOrderDesk.Baguette, saved.Lines[1].ProductId);
        }

        [TestMethod]
        public void SubmitUsesDefaultDeliveryAddressWhenNoneIsGiven()
        {
            var draft = new Order { CustomerId = InMemoryOrderDesk.StandardCustomerId };
            draft.Lines.Add(new OrderLine { LineNumber = 1, ProductId = InMemoryOrderDesk.Pasta, Quantity = 1 });

            var saved = _service.Submit(draft, OrderChannel.Email, @"NORTHWIND\agent03");

            Assert.AreEqual("Parklaan 4, 2000 Antwerpen", saved.DeliveryAddress);
        }

        [TestMethod]
        [ExpectedException(typeof(InvalidOperationException))]
        public void SubmitRejectsAnOrderWithoutQuantities()
        {
            var draft = new Order { CustomerId = InMemoryOrderDesk.StandardCustomerId };
            draft.Lines.Add(new OrderLine { LineNumber = 1, ProductId = InMemoryOrderDesk.Pasta, Quantity = 0 });
            _service.Submit(draft, OrderChannel.Phone, @"NORTHWIND\agent01");
        }

        [TestMethod]
        [ExpectedException(typeof(InvalidOperationException))]
        public void SubmitRejectsInactiveCustomers()
        {
            var draft = new Order { CustomerId = InMemoryOrderDesk.InactiveCustomerId };
            draft.Lines.Add(new OrderLine { LineNumber = 1, ProductId = InMemoryOrderDesk.Pasta, Quantity = 1 });
            _service.Submit(draft, OrderChannel.Phone, @"NORTHWIND\agent01");
        }

        [TestMethod]
        public void SubmitLogsAndRethrowsWhenSavingFails()
        {
            _desk.FailOnSave = true;
            var draft = new Order { CustomerId = InMemoryOrderDesk.StandardCustomerId };
            draft.Lines.Add(new OrderLine { LineNumber = 1, ProductId = InMemoryOrderDesk.Pasta, Quantity = 1 });

            try
            {
                _service.Submit(draft, OrderChannel.Phone, @"NORTHWIND\agent01");
                Assert.Fail("Expected the save failure to be rethrown.");
            }
            catch (InvalidOperationException)
            {
            }

            Assert.AreEqual(1, _logger.Errors.Count);
        }

        [TestMethod]
        public void ChangeStatusRecordsWhoChangedIt()
        {
            var order = _desk.AddExistingOrder(InMemoryOrderDesk.GoldCustomerId, Tuple.Create(InMemoryOrderDesk.Pasta, 1));
            order.Status = OrderStatus.Received;

            _service.ChangeStatus(order.Id, OrderStatus.Confirmed, @"NORTHWIND\agent04");

            Assert.AreEqual(1, _desk.StatusChanges.Count);
            Assert.AreEqual(OrderStatus.Confirmed, _desk.StatusChanges[0].Item2);
            Assert.AreEqual(@"NORTHWIND\agent04", _desk.StatusChanges[0].Item3);
        }
    }
}
