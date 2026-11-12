using Microsoft.AspNetCore.Mvc;

namespace DarWeb.Controllers;

public class OwnerController : Controller
{
    public IActionResult MyListings() => View();

    public IActionResult AddListing() => View();

    public IActionResult EditListing(int id = 0) => View();

    public IActionResult IncomingRequests() => View();

    public IActionResult Profile() => View();
}
