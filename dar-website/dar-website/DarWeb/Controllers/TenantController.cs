using Microsoft.AspNetCore.Mvc;

namespace DarWeb.Controllers;

public class TenantController : Controller
{
    public IActionResult MyRequests() => View();

    public IActionResult Profile() => View();
}
