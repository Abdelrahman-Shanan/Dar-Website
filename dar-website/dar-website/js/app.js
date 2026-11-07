(function () {
  "use strict";

  const toast = document.getElementById("site-toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // Mobile navigation
  document.querySelectorAll(".mobile-menu-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const nav = button.parentElement.querySelector(".main-nav");
      if (!nav) return;
      const isOpen = nav.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "إغلاق القائمة" : "فتح القائمة");
      button.textContent = isOpen ? "×" : "☰";
    });
  });

  // Listing filters and category tabs on the home page
  const propertyCards = Array.from(document.querySelectorAll(".property-card"));
  const searchForm = document.getElementById("housing-search");
  const locationFilter = document.getElementById("location-filter");
  const universityFilter = document.getElementById("university-filter");
  const priceFilter = document.getElementById("price-filter");
  const feedback = document.getElementById("search-feedback");
  const emptyResults = document.getElementById("empty-results");
  let activeType = "all";

  function applyListingFilters(announce) {
    if (!propertyCards.length) return;
    const location = locationFilter ? locationFilter.value : "all";
    const university = universityFilter ? universityFilter.value : "all";
    const maxPrice = priceFilter && priceFilter.value !== "all" ? Number(priceFilter.value) : Infinity;
    let visibleCount = 0;

    propertyCards.forEach((card) => {
      const typeMatches = activeType === "all" || card.dataset.type === activeType;
      const locationMatches = location === "all" || card.dataset.location === location;
      const universityMatches = university === "all" || card.dataset.university === university;
      const priceMatches = Number(card.dataset.price) <= maxPrice;
      const visible = typeMatches && locationMatches && universityMatches && priceMatches;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (emptyResults) emptyResults.hidden = visibleCount > 0;
    if (feedback) {
      feedback.textContent = announce
        ? (visibleCount ? `وجدنا ${visibleCount.toLocaleString("ar-EG")} خيارات مناسبة لك.` : "لم نعثر على سكن بهذه المواصفات.")
        : "";
    }
  }

  document.querySelectorAll(".stay-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".stay-tab").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeType = tab.dataset.type || "all";
      applyListingFilters(false);
    });
  });

  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyListingFilters(true);
      const listingSection = document.getElementById("listings");
      if (listingSection) listingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Save-to-favourites interaction
  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const saved = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!saved));
      button.textContent = saved ? "♡" : "♥";
      button.setAttribute("aria-label", saved ? "إضافة إلى المفضلة" : "إزالة من المفضلة");
      showToast(saved ? "تمت إزالة السكن من المفضلة." : "تمت إضافة السكن إلى المفضلة.");
    });
  });

  // Property detail buttons are demo interactions because no details page/backend was supplied.
  document.querySelectorAll(".round-arrow").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".property-card");
      const title = card ? card.querySelector("h3")?.textContent : "هذا السكن";
      showToast(`تفاصيل «${title}» ستظهر هنا عند ربط الموقع بصفحة التفاصيل.`);
    });
  });

  // Show/hide password controls
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.setAttribute("aria-label", isPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور");
    });
  });

  function setFieldError(field, message) {
    if (!field) return;
    field.classList.toggle("has-error", Boolean(message));
    const error = field.querySelector(".field-error");
    if (error) error.textContent = message || "";
  }

  function clearFormErrors(form) {
    form.querySelectorAll(".form-field").forEach((field) => setFieldError(field, ""));
    form.querySelectorAll(".form-general-error").forEach((node) => {
      node.textContent = "";
      node.classList.remove("visible");
    });
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  // Register form: front-end validation only; real account creation needs a backend.
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearFormErrors(registerForm);
      let valid = true;
      const name = document.getElementById("full-name");
      const email = document.getElementById("register-email");
      const university = document.getElementById("university");
      const phone = document.getElementById("phone");
      const password = document.getElementById("register-password");
      const confirmPassword = document.getElementById("confirm-password");
      const terms = document.getElementById("terms-check");

      const validations = [
        [name, !name.value.trim() ? "اكتب اسمك الكامل." : ""],
        [email, !validateEmail(email.value) ? "أدخل بريدًا إلكترونيًا صحيحًا." : ""],
        [university, !university.value ? "اختر جامعتك." : ""],
        [phone, phone.value.replace(/[\s()+-]/g, "").length < 7 ? "أدخل رقم هاتف صحيحًا." : ""],
        [password, password.value.length < 8 ? "يجب ألا تقل كلمة المرور عن ٨ أحرف." : (!/[A-Za-z]/.test(password.value) || !/\d/.test(password.value) ? "أضف حرفًا واحدًا ورقمًا على الأقل." : "")],
        [confirmPassword, confirmPassword.value !== password.value || !confirmPassword.value ? "كلمتا المرور غير متطابقتين." : ""]
      ];

      validations.forEach(([input, message]) => {
        setFieldError(input.closest(".form-field"), message);
        if (message) valid = false;
      });

      const generalError = document.getElementById("register-general-error");
      if (!terms.checked) {
        valid = false;
        generalError.textContent = "يرجى الموافقة على الشروط والأحكام للمتابعة.";
        generalError.classList.add("visible");
      }

      if (!valid) {
        const firstError = registerForm.querySelector(".form-field.has-error input, .form-field.has-error select");
        if (firstError) firstError.focus();
        return;
      }

      showToast("نجح التحقق من البيانات. إنشاء الحساب فعليًا يحتاج إلى ربط Backend.");
    });
  }

  // Login form: validates entries, but does not authenticate without a backend.
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      clearFormErrors(loginForm);
      const email = document.getElementById("login-email");
      const password = document.getElementById("login-password");
      let valid = true;
      if (!validateEmail(email.value)) {
        setFieldError(email.closest(".form-field"), "أدخل بريدًا إلكترونيًا صحيحًا.");
        valid = false;
      }
      if (!password.value) {
        setFieldError(password.closest(".form-field"), "أدخل كلمة المرور.");
        valid = false;
      }
      if (!valid) {
        const firstError = loginForm.querySelector(".form-field.has-error input");
        if (firstError) firstError.focus();
        return;
      }
      showToast("تم التحقق من البيانات المدخلة. تسجيل الدخول يحتاج إلى ربط Backend.");
    });
  }

  // Demo actions that require real services to work in production.
  document.querySelectorAll('[data-demo="google"]').forEach((button) => {
    button.addEventListener("click", () => showToast("تسجيل الدخول باستخدام جوجل يحتاج إلى إعداد OAuth وربط Backend."));
  });
  document.querySelectorAll('[data-demo="forgot"]').forEach((button) => {
    button.addEventListener("click", () => showToast("يمكن إضافة استعادة كلمة المرور بعد إعداد البريد الإلكتروني وBackend."));
  });
})();
