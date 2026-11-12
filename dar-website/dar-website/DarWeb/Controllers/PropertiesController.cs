using Microsoft.AspNetCore.Mvc;

namespace DarWeb.Controllers;

public class PropertiesController : Controller
{
    public IActionResult Search() => View();

    public IActionResult Details(int id = 0) => View();
}
