using System;
using System.Linq;
using Northwind.OrderDesk.Core.Data;
using Northwind.OrderDesk.Core.Domain;
using Northwind.OrderDesk.Core.Logging;
using Northwind.OrderDesk.Core.Pricing;

namespace Northwind.OrderDesk.Core.Services
{
    public class OrderService
    {
        private readonly IOrderRepository _orders;
        private readonly PricingService _pricing;
        private readonly IErrorLogger _logger;
        private readonly Func<DateTime> _clock;

        public OrderService(IOrderRepository orders, PricingService pricing, IErrorLogger logger)
            : this(orders, pricing, logger, () => DateTime.Now)
        {
        }

        public OrderService(IOrderRepository orders, PricingService pricing, IErrorLogger logger, Func<DateTime> clock)
        {
            if (orders == null) throw new ArgumentNullException("orders");
            if (pricing == null) throw new ArgumentNullException("pricing");
            if (logger == null) throw new ArgumentNullException("logger");
            if (clock == null) throw new ArgumentNullException("clock");
            _orders = orders;
            _pricing = pricing;
            _logger = logger;
            _clock = clock;
        }

        /// <summary>
        /// Starts a new draft order for the same customer with the lines of an existing order.
        /// Prices are recalculated when the draft is submitted, never copied.
        /// </summary>
        public Order CopyOrder(int sourceOrderId, int customerId)
        {
            var source = _orders.GetOrder(sourceOrderId);
            if (source == null || source.CustomerId != customerId)
            {
                throw new InvalidOperationException("The order to copy was not found for this customer.");
            }

            var draft = new Order
            {
                CustomerId = source.CustomerId,
                DeliveryAddress = source.DeliveryAddress
            };

            foreach (var line in source.Lines.OrderBy(l => l.LineNumber))
            {
                draft.Lines.Add(new OrderLine
                {
                    LineNumber = draft.Lines.Count + 1,
                    ProductId = line.ProductId,
                    Sku = line.Sku,
                    ProductName = line.ProductName,
                    Quantity = line.Quantity
                });
            }

            return draft;
        }

        public Order Submit(Order draft, OrderChannel channel, string user)
        {
            if (draft == null) throw new ArgumentNullException("draft");
            if (string.IsNullOrWhiteSpace(user)) throw new ArgumentException("A user is required.", "user");

            var customer = _orders.GetCustomer(draft.CustomerId);
            if (customer == null || !customer.IsActive)
            {
                throw new InvalidOperationException("Orders can only be placed for active customers.");
            }

            var lines = draft.Lines.Where(l => l.Quantity > 0).ToList();
            if (lines.Count == 0)
            {
                throw new InvalidOperationException("An order needs at least one line with a quantity.");
            }

            draft.Lines.Clear();
            foreach (var line in lines)
            {
                line.LineNumber = draft.Lines.Count + 1;
                draft.Lines.Add(line);
            }

            if (string.IsNullOrWhiteSpace(draft.DeliveryAddress))
            {
                draft.DeliveryAddress = customer.DefaultDeliveryAddress;
            }

            _pricing.PriceOrder(draft, customer);
            draft.Status = OrderStatus.Received;
            draft.Channel = channel;
            draft.CreatedBy = user;
            draft.OrderDate = _clock();
            draft.OrderNumber = _orders.NextOrderNumber();

            try
            {
                draft.Id = _orders.SaveNewOrder(draft);
            }
            catch (Exception ex)
            {
                _logger.LogError("Saving order " + draft.OrderNumber + " failed.", ex);
                throw;
            }

            _logger.LogInformation(string.Format("Order {0} created by {1} via {2}.", draft.OrderNumber, user, channel));
            return draft;
        }

        public void ChangeStatus(int orderId, OrderStatus newStatus, string user)
        {
            var order = _orders.GetOrder(orderId);
            if (order == null)
            {
                throw new InvalidOperationException("Order not found.");
            }

            order.ChangeStatus(newStatus);
            _orders.UpdateStatus(orderId, newStatus, user);
        }
    }
}
