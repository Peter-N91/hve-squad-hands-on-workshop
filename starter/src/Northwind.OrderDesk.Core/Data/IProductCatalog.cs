using System.Collections.Generic;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Core.Data
{
    public interface IProductCatalog
    {
        Product GetProduct(int productId);
        IList<Product> GetActiveProducts();
    }
}
