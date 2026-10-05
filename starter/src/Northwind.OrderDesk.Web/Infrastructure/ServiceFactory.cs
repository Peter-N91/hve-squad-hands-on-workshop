using Northwind.OrderDesk.Core.Data;
using Northwind.OrderDesk.Core.Invoices;
using Northwind.OrderDesk.Core.Logging;
using Northwind.OrderDesk.Core.Pricing;
using Northwind.OrderDesk.Core.Services;

namespace Northwind.OrderDesk.Web.Infrastructure
{
    /// <summary>
    /// Creates services for controllers. Order Desk predates the team's use of a DI container.
    /// </summary>
    public static class ServiceFactory
    {
        private static readonly IErrorLogger SharedLogger = new EventLogErrorLogger();

        public static IErrorLogger Logger
        {
            get { return SharedLogger; }
        }

        public static SqlOrderDeskStore CreateStore()
        {
            return new SqlOrderDeskStore();
        }

        public static OrderService CreateOrderService(SqlOrderDeskStore store)
        {
            return new OrderService(store, new PricingService(store, store), SharedLogger);
        }

        public static InvoiceStore CreateInvoiceStore()
        {
            return new InvoiceStore();
        }
    }
}
