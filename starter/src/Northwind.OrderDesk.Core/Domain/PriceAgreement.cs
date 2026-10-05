namespace Northwind.OrderDesk.Core.Domain
{
    /// <summary>
    /// A negotiated price for one product and one customer.
    /// </summary>
    public class PriceAgreement
    {
        public int CustomerId { get; set; }
        public int ProductId { get; set; }
        public decimal NegotiatedPrice { get; set; }

        /// <summary>
        /// When true, volume discounts are not applied on top of the negotiated price.
        /// </summary>
        public bool ExcludeFromVolumeDiscount { get; set; }
    }
}
