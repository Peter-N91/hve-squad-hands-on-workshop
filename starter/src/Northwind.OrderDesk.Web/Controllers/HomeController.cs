using System.Web.Mvc;

namespace Northwind.OrderDesk.Web.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            ViewBag.UserName = User.Identity.Name;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult FindCustomer(int customerId)
        {
            return RedirectToAction("Index", "Orders", new { customerId });
        }
    }
}
