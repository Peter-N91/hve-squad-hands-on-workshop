using System.Collections.Generic;
using Northwind.OrderDesk.Core.Domain;

namespace Northwind.OrderDesk.Web.Models
{
    public class DraftOrderInput
    {
        public DraftOrderInput()
        {
            Quantities = new List<int>();
        }

        public List<int> Quantities { get; set; }
        public string DeliveryAddress { get; set; }
        public OrderChannel Channel { get; set; }
    }
}
