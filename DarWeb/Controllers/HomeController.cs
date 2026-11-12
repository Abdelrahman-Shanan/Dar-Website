using Microsoft.AspNetCore.Mvc;

namespace DarWeb.Controllers;

public class HomeController : Controller
{
    public IActionResult Index() => View();

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error() => View("~/Views/Shared/Error.cshtml");
}
