namespace Northwind.OrderDesk.Core.Domain
{
    public class OrderLine
    {
        public int LineNumber { get; set; }
        public int ProductId { get; set; }
        public string Sku { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal LineTotal { get; set; }
    }
}
