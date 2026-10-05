namespace Northwind.OrderDesk.Core.Domain
{
    public class Product
    {
        public int Id { get; set; }
        public string Sku { get; set; }
        public string Name { get; set; }
        public string Unit { get; set; }
        public decimal ListPrice { get; set; }
        public bool IsActive { get; set; }
    }
}
