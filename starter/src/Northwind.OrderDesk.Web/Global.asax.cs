using System;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using Northwind.OrderDesk.Web.Infrastructure;

namespace Northwind.OrderDesk.Web
{
    public class MvcApplication : HttpApplication
    {
        protected void Application_Start()
        {
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
        }

        protected void Application_Error(object sender, EventArgs e)
        {
            var exception = Server.GetLastError();
            if (exception != null)
            {
                ServiceFactory.Logger.LogError("Unhandled error in Order Desk.", exception);
            }
        }
    }
}
