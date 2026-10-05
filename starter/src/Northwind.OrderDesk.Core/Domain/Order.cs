using System;
using System.Collections.Generic;
using System.Linq;

namespace Northwind.OrderDesk.Core.Domain
{
    public class Order
    {
        public Order()
        {
            Lines = new List<OrderLine>();
            Status = OrderStatus.Received;
        }

        public int Id { get; set; }
        public string OrderNumber { get; set; }
        public int CustomerId { get; set; }
        public DateTime OrderDate { get; set; }
        public OrderStatus Status { get; set; }
        public OrderChannel Channel { get; set; }
        public string DeliveryAddress { get; set; }
        public string InvoiceNumber { get; set; }
        public string CreatedBy { get; set; }
        public decimal OrderDiscountPercent { get; set; }
        public decimal Total { get; set; }
        public List<OrderLine> Lines { get; private set; }

        public decimal LinesSubtotal
        {
            get { return Lines.Sum(l => l.LineTotal); }
        }

        public void ChangeStatus(OrderStatus newStatus)
        {
            if (!OrderStatusRules.CanTransition(Status, newStatus))
            {
                throw new InvalidOperationException(
                    string.Format("Order {0} cannot move from {1} to {2}.", OrderNumber, Status, newStatus));
            }

            Status = newStatus;
        }
    }
}
