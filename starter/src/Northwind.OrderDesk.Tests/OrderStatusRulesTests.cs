using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Tests
{
    [TestClass]
    public class OrderStatusRulesTests
    {
        [TestMethod]
        public void NormalLifecycleIsAllowed()
        {
            Assert.IsTrue(OrderStatusRules.CanTransition(OrderStatus.Received, OrderStatus.Confirmed));
            Assert.IsTrue(OrderStatusRules.CanTransition(OrderStatus.Confirmed, OrderStatus.Picking));
            Assert.IsTrue(OrderStatusRules.CanTransition(OrderStatus.Picking, OrderStatus.Shipped));
            Assert.IsTrue(OrderStatusRules.CanTransition(OrderStatus.Shipped, OrderStatus.Delivered));
        }

        [TestMethod]
        public void CancellationIsOnlyAllowedBeforePicking()
        {
            Assert.IsTrue(OrderStatusRules.CanTransition(OrderStatus.Received, OrderStatus.Cancelled));
            Assert.IsTrue(OrderStatusRules.CanTransition(OrderStatus.Confirmed, OrderStatus.Cancelled));
            Assert.IsFalse(OrderStatusRules.CanTransition(OrderStatus.Picking, OrderStatus.Cancelled));
            Assert.IsFalse(OrderStatusRules.CanTransition(OrderStatus.Shipped, OrderStatus.Cancelled));
        }

        [TestMethod]
        public void StepsCannotBeSkippedOrReversed()
        {
            Assert.IsFalse(OrderStatusRules.CanTransition(OrderStatus.Received, OrderStatus.Shipped));
            Assert.IsFalse(OrderStatusRules.CanTransition(OrderStatus.Shipped, OrderStatus.Picking));
            Assert.IsFalse(OrderStatusRules.CanTransition(OrderStatus.Delivered, OrderStatus.Received));
            Assert.IsFalse(OrderStatusRules.CanTransition(OrderStatus.Cancelled, OrderStatus.Confirmed));
        }

        [TestMethod]
        [ExpectedException(typeof(InvalidOperationException))]
        public void OrderRejectsAnInvalidTransition()
        {
            var order = new Order { OrderNumber = "NW-0000001" };
            order.ChangeStatus(OrderStatus.Delivered);
        }
    }
}
