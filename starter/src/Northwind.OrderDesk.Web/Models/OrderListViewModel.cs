using System.Collections.Generic;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Web.Models
{
    public class OrderListViewModel
    {
        public Customer Customer { get; set; }
        public int HistoryMonths { get; set; }
        public IList<Order> Orders { get; set; }
    }
}
