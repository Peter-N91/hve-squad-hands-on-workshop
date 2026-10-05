using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Core.Data
{
    public interface IPriceAgreementSource
    {
        /// <summary>Returns the agreement, or null when the customer pays the list price.</summary>
        PriceAgreement GetAgreement(int customerId, int productId);
    }
}
