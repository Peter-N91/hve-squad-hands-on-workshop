namespace Northwind.OrderDesk.Core.Domain
{
    public enum OrderStatus
    {
        Received = 0,
        Confirmed = 1,
        Picking = 2,
        Shipped = 3,
        Delivered = 4,
        Cancelled = 9
    }
}
