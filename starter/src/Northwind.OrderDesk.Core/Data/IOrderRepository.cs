using System;
using System.Collections.Generic;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Core.Data
{
    public interface IOrderRepository
    {
        Order GetOrder(int orderId);
        IList<Order> GetOrdersForCustomer(int customerId, DateTime fromDate);
        Customer GetCustomer(int customerId);
        int SaveNewOrder(Order order);
        void UpdateStatus(int orderId, OrderStatus status, string changedBy);
        string NextOrderNumber();
    }
}
