(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const toast = $("#site-toast");
  let toastTimer;
  const nf = new Intl.NumberFormat("ar-EG");

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // Generic toast buttons (actions that need a Backend)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toast]");
    if (t) { e.preventDefault(); showToast(t.dataset.toast); }
  });

  /* ---------- Tabs + text search + select filter on list pages ---------- */
  function refreshList(id) {
    const list = document.getElementById(id);
    if (!list) return;
    const tab = $(`.tabs[data-list="${id}"] .tab.active`);
    const filter = tab ? tab.dataset.filter : "all";
    const q = ($(`input[data-list="${id}"]`)?.value || "").trim().toLowerCase();
    const sel = $(`select[data-list="${id}"]`)?.value || "all";
    let shown = 0;
    $$("[data-item]", list).forEach((item) => {
      const statuses = (item.dataset.status || "").split(" ");
      const ok =
        (filter === "all" || statuses.includes(filter)) &&
        (!q || item.textContent.toLowerCase().includes(q)) &&
        (sel === "all" || (item.dataset.group || "").includes(sel));
      item.hidden = !ok;
      if (ok) shown += 1;
    });
    const empty = $(`[data-empty="${id}"]`);
    if (empty) empty.hidden = shown > 0;
  }
  $$(".tabs[data-list]").forEach((tabs) => {
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest(".tab");
      if (!b) return;
      $$(".tab", tabs).forEach((x) => x.classList.toggle("active", x === b));
      refreshList(tabs.dataset.list);
    });
  });
  $$("input[data-list], select[data-list]").forEach((el) =>
    el.addEventListener("input", () => refreshList(el.dataset.list))
  );

  /* ---------- Status changes (accept / reject / approve) ---------- */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-set-status]");
    if (!btn) return;
    const item = btn.closest("[data-item]");
    if (!item) return;
    if (btn.dataset.require) {
      const field = $(btn.dataset.require, item);
      if (field && !field.value.trim()) {
        field.classList.add("error");
        field.focus();
        showToast("اكتب سبب الرفض ليتمكن المالك من تصحيح الإعلان.");
        return;
      }
    }
    const badge = $(".js-badge", item);
    if (badge) {
      badge.className = "badge js-badge " + btn.dataset.badge;
      badge.textContent = btn.dataset.label;
    }
    item.dataset.status = btn.dataset.setStatus;
    $$(".js-actions", item).forEach((a) => (a.hidden = true));
    const confirm = $(".confirm-box", item);
    if (confirm) confirm.hidden = true;
    const done = $(".js-done", item);
    if (done) { done.hidden = false; if (btn.dataset.note) done.textContent = btn.dataset.note; }
    showToast(btn.dataset.toastMsg || "تم تحديث الحالة. حفظها فعليًا يحتاج إلى ربط Backend.");
    const list = item.closest("[data-list-root]");
    if (list) refreshList(list.id);
  });
  $$("textarea.error, .plain-input").forEach((el) =>
    el.addEventListener("input", () => el.classList.remove("error"))
  );

  // Toggle visibility of another element
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle]");
    if (!t) return;
    const target = $(t.dataset.toggle, t.closest("[data-item]") || document);
    if (target) target.hidden = !target.hidden;
  });

  /* ---------- Owner listing buttons (stop / republish / etc.) ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-listing-state]");
    if (!b) return;
    const card = b.closest("[data-item]");
    const badge = $(".js-badge", card);
    badge.className = "badge js-badge " + b.dataset.badge;
    badge.textContent = b.dataset.label;
    card.dataset.status = b.dataset.listingState;
    const note = $(".l-note", card);
    if (note && b.dataset.note) note.textContent = b.dataset.note;
    b.hidden = true;
    showToast(b.dataset.toastMsg);
    refreshList(card.closest("[data-list-root]").id);
  });

  /* ---------- Gallery ---------- */
  const mainImg = $("#gallery-main");
  $$(".g-thumbs button").forEach((b) =>
    b.addEventListener("click", () => {
      mainImg.src = b.dataset.src;
      mainImg.alt = b.dataset.alt || "";
      $$(".g-thumbs button").forEach((x) => x.classList.toggle("active", x === b));
    })
  );

  /* ---------- Forms: validation, counters, consent ---------- */
  function validateForm(form) {
    let first = null;
    $$("[required]", form).forEach((el) => {
      const field = el.closest(".f") || el.closest(".chk");
      const bad = el.type === "checkbox" ? !el.checked : !String(el.value).trim();
      if (field) field.classList.toggle("has-error", bad);
      if (bad && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }
  $$("form[data-demo-form]").forEach((form) => {
    form.addEventListener("input", (e) => {
      const f = e.target.closest(".f");
      if (f) f.classList.remove("has-error");
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const submitter = e.submitter;
      if (submitter && submitter.dataset.skipValidation !== undefined) {
        showToast("تم حفظ المسودة محليًا في الواجهة. الحفظ الفعلي يحتاج إلى Backend.");
        return;
      }
      if (!validateForm(form)) {
        showToast("أكمل الحقول المطلوبة المعلّمة بالأحمر.");
        return;
      }
      showToast(form.dataset.demoForm);
    });
  });
  $$("[data-count]").forEach((ta) => {
    const out = $(ta.dataset.count);
    const update = () => {
      if (out) out.textContent = `${nf.format(ta.value.length)} / ${nf.format(ta.maxLength > 0 ? ta.maxLength : 2000)} حرف`;
    };
    ta.addEventListener("input", update);
    update();
  });

  /* ---------- Listing form: availability date ---------- */
  const availMode = $("#avail_mode");
  if (availMode) {
    const dateInput = $("#available_from");
    availMode.addEventListener("change", () => {
      const show = availMode.value === "date";
      dateInput.hidden = !show;
      dateInput.required = show;
      if (!show) dateInput.value = "";
    });
  }

  /* ---------- Photo upload ---------- */
  const fileInput = $("#photo-input");
  const grid = $("#photo-grid");
  const photoCount = $("#photo-count");
  const MAX_PHOTOS = 8;
  function updatePhotoCount() {
    if (photoCount) photoCount.textContent = `${nf.format(grid.children.length)} من ${nf.format(MAX_PHOTOS)} صور · اسحب لترتيب الصور`;
  }
  function addPhoto(src, label) {
    const fig = document.createElement("figure");
    fig.className = "ph";
    fig.style.margin = "0";
    fig.innerHTML = '<img alt=""><div class="ph-foot"><span></span><button type="button">إزالة</button></div>';
    fig.querySelector("img").src = src;
    fig.querySelector("span").textContent = label;
    fig.querySelector("button").addEventListener("click", () => { fig.remove(); updatePhotoCount(); });
    grid.appendChild(fig);
  }
  function handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (!/^image\/(jpeg|png)$/.test(file.type)) { showToast("الصيغ المقبولة: جي بي جي وبي إن جي فقط."); return; }
      if (file.size > 5 * 1024 * 1024) { showToast("حجم الصورة يجب ألا يتجاوز ٥ ميغابايت."); return; }
      if (grid.children.length >= MAX_PHOTOS) { showToast("الحد الأقصى ٨ صور."); return; }
      const reader = new FileReader();
      reader.onload = () => { addPhoto(reader.result, grid.children.length ? "صورة السكن" : "صورة الغلاف"); updatePhotoCount(); };
      reader.readAsDataURL(file);
    });
  }
  if (fileInput && grid) {
    fileInput.addEventListener("change", () => { handleFiles(fileInput.files); fileInput.value = ""; });
    $$(".ph-foot button", grid).forEach((b) =>
      b.addEventListener("click", () => { b.closest(".ph").remove(); updatePhotoCount(); })
    );
    const drop = $(".drop");
    if (drop) {
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
      drop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
    }
    updatePhotoCount();
  }

  /* ---------- Form step nav (scroll spy) ---------- */
  const steps = $$(".form-steps a");
  if (steps.length && "IntersectionObserver" in window) {
    const map = new Map(steps.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) steps.forEach((a) => a.classList.toggle("active", a === map.get(en.target.id)));
      });
    }, { rootMargin: "-20% 0px -65% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Profile: password form ---------- */
  const pwForm = $("#password-form");
  if (pwForm) {
    pwForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const cur = $("#pw-current"), n = $("#pw-new"), c = $("#pw-confirm");
      [cur, n, c].forEach((i) => i.closest(".f").classList.remove("has-error"));
      const checks = [
        [cur, !cur.value, "أدخل كلمة المرور الحالية."],
        [n, n.value.length < 8 || !/[A-Za-z]/.test(n.value) || !/\d/.test(n.value), "٨ أحرف على الأقل، مع حرف ورقم."],
        [c, c.value !== n.value || !c.value, "كلمتا المرور غير متطابقتين."]
      ];
      let first = null;
      checks.forEach(([el, bad, msg]) => {
        const f = el.closest(".f");
        f.classList.toggle("has-error", bad);
        if (bad) { f.querySelector(".err").textContent = msg; if (!first) first = el; }
      });
      if (first) { first.focus(); return; }
      pwForm.reset();
      showToast("تم التحقق من كلمة المرور. تحديثها فعليًا يحتاج إلى Backend.");
    });
  }

  /* ---------- Admin: owner verification rejection ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-verify-reject]");
    if (!b) return;
    const n = $("#verify-note");
    if (!n.value.trim()) { n.classList.add("error"); n.focus(); showToast("اكتب سبب الرفض ثم أعد المحاولة."); return; }
    n.classList.remove("error");
    showToast("تم رفض التوثيق وإرسال السبب للمالك (تجريبيًا).");
  });

  /* ---------- Admin: users table ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-user]");
    if (!b) return;
    const row = b.closest(".tbl-row");
    const name = $("strong", row).textContent;
    const status = $(".u-status", row);
    const acts = $(".acts", row);
    if (b.dataset.user === "suspend") {
      status.className = "badge b-bad u-status"; status.textContent = "موقوف";
      b.textContent = "إعادة تفعيل"; b.className = "btn btn-outline btn-sm"; b.dataset.user = "activate";
      row.dataset.status = "suspended " + (row.dataset.role || "");
      showToast(`تم إيقاف حساب ${name}. يلزم تسجيل السبب عند الربط مع Backend.`);
    } else if (b.dataset.user === "activate") {
      status.className = "badge b-ok u-status"; status.textContent = "نشط";
      b.textContent = "إيقاف"; b.className = "btn btn-danger btn-sm"; b.dataset.user = "suspend";
      row.dataset.status = row.dataset.role || "";
      showToast(`تمت إعادة تفعيل حساب ${name}.`);
    } else if (b.dataset.user === "verify") {
      const cell = $(".u-verify", row);
      cell.innerHTML = '<span class="badge b-info">موثّق</span>';
      row.dataset.status = (row.dataset.status || "").replace("pending", "").trim();
      showToast(`تم توثيق ${name}.`);
    }
    if (acts) refreshList("users-table");
  });

  /* ---------- Search page: filters ---------- */
  const resultsGrid = $("#results-grid");
  if (resultsGrid) {
    const cards = $$(".property-card", resultsGrid);
    const minR = $("#price-min-range"), maxR = $("#price-max-range");
    const minN = $("#price-min"), maxN = $("#price-max");
    const fill = $(".range .fill");
    const RANGE_MIN = Number(minR.min), RANGE_MAX = Number(minR.max);
    const sortSel = $("#sort");
    const countEls = $$("[data-result-count]");
    const sub = $("#results-sub");
    const form = $("#filters");

    function syncFill() {
      const a = Number(minR.value), b = Number(maxR.value);
      const span = RANGE_MAX - RANGE_MIN;
      const start = ((Math.min(a, b) - RANGE_MIN) / span) * 100;
      const end = ((Math.max(a, b) - RANGE_MIN) / span) * 100;
      fill.style.insetInlineStart = start + "%";
      fill.style.width = end - start + "%";
    }
    function apply() {
      const types = $$('input[name="type"]:checked', form).map((i) => i.value);
      const lo = Math.min(Number(minN.value) || 0, Number(maxN.value) || 0);
      const hi = Math.max(Number(minN.value) || 0, Number(maxN.value) || 0);
      const flags = $$('input[name="flag"]:checked', form).map((i) => i.value);
      const maxDist = Number(($("#dist")?.value) || 0);
      let n = 0;
      cards.forEach((c) => {
        const ok =
          types.includes(c.dataset.type) &&
          Number(c.dataset.price) >= lo && Number(c.dataset.price) <= hi &&
          flags.every((f) => c.dataset[f] === "1") &&
          (!maxDist || Number(c.dataset.dist) <= maxDist);
        c.hidden = !ok;
        if (ok) n += 1;
      });
      const order = sortSel.value;
      const sorted = cards.slice().sort((a, b) =>
        order === "price" ? a.dataset.price - b.dataset.price :
        order === "price-desc" ? b.dataset.price - a.dataset.price :
        a.dataset.dist - b.dataset.dist);
      sorted.forEach((c) => resultsGrid.appendChild(c));
      countEls.forEach((el) => (el.textContent = nf.format(n)));
      if (sub) sub.textContent = n ? `${nf.format(n)} خيارًا مناسبًا بالقرب من الجامعة الأردنية` : "لا توجد خيارات مطابقة";
      $("#empty-results").hidden = n > 0;
      syncFill();
    }
    function fromRange(changed) {
      let a = Number(minR.value), b = Number(maxR.value);
      if (a > b) { if (changed === minR) { a = b; minR.value = a; } else { b = a; maxR.value = b; } }
      minN.value = a; maxN.value = b; apply();
    }
    minR.addEventListener("input", () => fromRange(minR));
    maxR.addEventListener("input", () => fromRange(maxR));
    [minN, maxN].forEach((el) => el.addEventListener("input", () => {
      minR.value = Math.max(RANGE_MIN, Math.min(RANGE_MAX, Number(minN.value) || RANGE_MIN));
      maxR.value = Math.max(RANGE_MIN, Math.min(RANGE_MAX, Number(maxN.value) || RANGE_MAX));
      apply();
    }));
    form.addEventListener("change", apply);
    sortSel.addEventListener("change", apply);

    function resetAll() {
      form.reset();
      minR.value = RANGE_MIN; maxR.value = RANGE_MAX; minN.value = RANGE_MIN; maxN.value = RANGE_MAX;
      $$('input[name="flag"]', form).forEach((i) => (i.checked = false));
      $$(".chip").forEach((c) => c.remove());
      apply();
    }
    $("#reset-filters").addEventListener("click", resetAll);
    $(".chip-clear")?.addEventListener("click", resetAll);
    $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
      const k = chip.dataset.reset;
      if (k === "price") { minR.value = RANGE_MIN; maxR.value = RANGE_MAX; minN.value = RANGE_MIN; maxN.value = RANGE_MAX; }
      if (k === "furnished") $('input[value="furnished"]', form).checked = false;
      if (k === "university") $("#uni").value = "all";
      chip.remove(); apply();
    }));
    $("#show-results")?.addEventListener("click", () => resultsGrid.scrollIntoView({ behavior: "smooth", block: "start" }));
    $("#hero-search")?.addEventListener("submit", (e) => { e.preventDefault(); resultsGrid.scrollIntoView({ behavior: "smooth" }); });
    $(".big-search .clear")?.addEventListener("click", () => { const i = $("#hero-q"); i.value = ""; i.focus(); });
    apply();
  }
})();
