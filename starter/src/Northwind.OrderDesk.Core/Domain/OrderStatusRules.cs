namespace Northwind.OrderDesk.Core.Domain
{
    public static class OrderStatusRules
    {
        public static bool CanTransition(OrderStatus from, OrderStatus to)
        {
            switch (from)
            {
                case OrderStatus.Received:
                    return to == OrderStatus.Confirmed || to == OrderStatus.Cancelled;
                case OrderStatus.Confirmed:
                    return to == OrderStatus.Picking || to == OrderStatus.Cancelled;
                case OrderStatus.Picking:
                    return to == OrderStatus.Shipped;
                case OrderStatus.Shipped:
                    return to == OrderStatus.Delivered;
                default:
                    return false;
            }
        }
    }
}
