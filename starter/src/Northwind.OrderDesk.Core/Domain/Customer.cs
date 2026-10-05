namespace Northwind.OrderDesk.Core.Domain
{
    public enum CustomerTier
    {
        Standard = 0,
        Gold = 1
    }

    public class Customer
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string CountryCode { get; set; }
        public CustomerTier Tier { get; set; }
        public string DefaultDeliveryAddress { get; set; }
        public bool IsActive { get; set; }
    }
}
