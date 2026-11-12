using Microsoft.AspNetCore.Mvc;

namespace DarWeb.Controllers;

public class AdminController : Controller
{
    public IActionResult Dashboard() => View();

    public IActionResult Listings() => View();

    public IActionResult Reviews() => View();

    public IActionResult Users() => View();
}
