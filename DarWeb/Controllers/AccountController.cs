using Microsoft.AspNetCore.Mvc;

namespace DarWeb.Controllers;

public class AccountController : Controller
{
    public IActionResult Login() => View();

    public IActionResult Register() => View();

    public IActionResult ForgotPassword() => View();

    public IActionResult ResetPassword() => View();
}
