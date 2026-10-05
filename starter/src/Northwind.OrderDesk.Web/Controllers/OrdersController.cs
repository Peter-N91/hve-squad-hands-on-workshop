using System;
using System.Configuration;
using System.Globalization;
using System.Web.Mvc;
using Northwind.OrderDesk.Core.Domain;
using Northwind.OrderDesk.Web.Infrastructure;
using Northwind.OrderDesk.Web.Models;

namespace Northwind.OrderDesk.Web.Controllers
{
    public class OrdersController : Controller
    {
        private const string DraftSessionKey = "DraftOrder";

        public ActionResult Index(int customerId)
        {
            var store = ServiceFactory.CreateStore();
            var customer = store.GetCustomer(customerId);
            if (customer == null)
            {
                return HttpNotFound();
            }

            var months = int.Parse(ConfigurationManager.AppSettings["OrderHistoryMonths"], CultureInfo.InvariantCulture);
            var model = new OrderListViewModel
            {
                Customer = customer,
                HistoryMonths = months,
                Orders = store.GetOrdersForCustomer(customerId, DateTime.Today.AddMonths(-months))
            };
            return View(model);
        }

        public ActionResult Details(int id)
        {
            var order = ServiceFactory.CreateStore().GetOrder(id);
            if (order == null)
            {
                return HttpNotFound();
            }

            return View(order);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Copy(int id, int customerId)
        {
            var store = ServiceFactory.CreateStore();
            var draft = ServiceFactory.CreateOrderService(store).CopyOrder(id, customerId);
            Session[DraftSessionKey] = draft;
            return RedirectToAction("Draft");
        }

        public ActionResult Draft()
        {
            var draft = Session[DraftSessionKey] as Order;
            if (draft == null)
            {
                return RedirectToAction("Index", "Home");
            }

            return View(draft);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Draft(DraftOrderInput input)
        {
            var draft = Session[DraftSessionKey] as Order;
            if (draft == null)
            {
                return RedirectToAction("Index", "Home");
            }

            for (var i = 0; i < draft.Lines.Count && i < input.Quantities.Count; i++)
            {
                draft.Lines[i].Quantity = input.Quantities[i];
            }

            if (!string.IsNullOrWhiteSpace(input.DeliveryAddress))
            {
                draft.DeliveryAddress = input.DeliveryAddress.Trim();
            }

            try
            {
                var store = ServiceFactory.CreateStore();
                var saved = ServiceFactory.CreateOrderService(store).Submit(draft, input.Channel, User.Identity.Name);
                Session.Remove(DraftSessionKey);
                TempData["Message"] = "Order " + saved.OrderNumber + " was created.";
                return RedirectToAction("Details", new { id = saved.Id });
            }
            catch (InvalidOperationException ex)
            {
                ModelState.AddModelError(string.Empty, ex.Message);
                return View(draft);
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ChangeStatus(int id, OrderStatus status)
        {
            var store = ServiceFactory.CreateStore();
            try
            {
                ServiceFactory.CreateOrderService(store).ChangeStatus(id, status, User.Identity.Name);
            }
            catch (InvalidOperationException ex)
            {
                TempData["Message"] = ex.Message;
            }

            return RedirectToAction("Details", new { id });
        }

        public ActionResult Invoice(int id)
        {
            var order = ServiceFactory.CreateStore().GetOrder(id);
            if (order == null || order.Status != OrderStatus.Delivered || string.IsNullOrEmpty(order.InvoiceNumber))
            {
                return HttpNotFound();
            }

            var stream = ServiceFactory.CreateInvoiceStore().OpenInvoice(order.InvoiceNumber, order.OrderDate);
            if (stream == null)
            {
                return HttpNotFound();
            }

            return File(stream, "application/pdf", order.InvoiceNumber + ".pdf");
        }
    }
}
