/* ============================================================
   DaLab AI — site interactions (vanilla JS)
   - Mobile nav toggle
   - Scroll-reveal (IntersectionObserver on .reveal)
   - Animated stat counters (data-count / data-suffix)
   - Missed-call money calculator
   - CTA wiring (data-book -> booking URL)
   - Feature showcase tabs (auto-advance, pause on hover)
   - Waitlist form (data-endpoint, mailto fallback)
   - Footer year
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- CTA wiring ---------- */
  // The booking URL lives once on <body data-book="...">. Every .js-book
  // element points to it, so you change the link in ONE place (index.html).
  var bookUrl = document.body.getAttribute("data-book") || "#";
  document.querySelectorAll(".js-book").forEach(function (el) {
    if (el.tagName === "A") {
      el.setAttribute("href", bookUrl);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    } else {
      el.addEventListener("click", function () {
        window.open(bookUrl, "_blank", "noopener");
      });
    }
  });

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav__toggle");
  var links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close after tapping a link
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("is-open");
        toggle.classList.remove("is-open");
      });
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { revObs.observe(el); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var dur = 1400;
    if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target + suffix;
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll("[data-count]");
  if (!("IntersectionObserver" in window)) {
    counters.forEach(animateCount);
  } else {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ---------- Missed-call money calculator ---------- */
  var callsRange = document.getElementById("callsRange");
  var jobRange = document.getElementById("jobRange");
  var callsVal = document.getElementById("callsVal");
  var jobVal = document.getElementById("jobVal");
  var lossMonth = document.getElementById("lossMonth");
  var lossYear = document.getElementById("lossYear");

  // Share of missed callers who book with a competitor instead of waiting.
  var BOOK_RATE = 0.6;

  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  function paintRange(input) {
    var min = parseFloat(input.min) || 0;
    var max = parseFloat(input.max) || 100;
    var pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--pct", pct + "%");
  }

  function recalc() {
    if (!callsRange || !jobRange) return;
    var calls = parseFloat(callsRange.value);   // missed calls per week
    var job = parseFloat(jobRange.value);        // avg job value
    if (callsVal) callsVal.textContent = calls;
    if (jobVal) jobVal.textContent = money(job);

    var perMonth = calls * 4.33 * BOOK_RATE * job; // lost revenue / month
    if (lossMonth) lossMonth.textContent = money(perMonth);
    if (lossYear) lossYear.textContent = money(perMonth * 12);

    paintRange(callsRange);
    paintRange(jobRange);
  }

  if (callsRange && jobRange) {
    callsRange.addEventListener("input", recalc);
    jobRange.addEventListener("input", recalc);
    recalc();
  }

  /* ---------- Feature showcase tabs (home page) ---------- */
  // Each tab swaps the phone screen + story panel. While .show--auto is set,
  // the active tab's progress bar animates (CSS) and its animationend moves to
  // the next tab. Hover/focus pauses it; picking a tab stops auto-advance.
  var show = document.querySelector(".show");
  var tabs = show ? show.querySelectorAll(".show__tab") : [];
  if (show && tabs.length) {
    var screens = show.querySelectorAll(".show__screen");
    var panels = show.querySelectorAll(".show__panel");
    var current = 0;

    var select = function (i, focus) {
      current = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
      });
      panels.forEach(function (p, k) {
        p.hidden = k !== i;
        p.classList.toggle("is-active", k === i);
      });
      screens.forEach(function (sc, k) {
        sc.classList.remove("is-active");
        if (k === i) { void sc.offsetWidth; sc.classList.add("is-active"); } // restart message animations
      });
      if (focus) tabs[i].focus();
    };

    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () {
        show.classList.remove("show--auto");
        select(k);
      });
      t.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        show.classList.remove("show--auto");
        select((current + dir + tabs.length) % tabs.length, true);
      });
      var bar = t.querySelector(".show__bar i");
      if (bar) bar.addEventListener("animationend", function () {
        if (show.classList.contains("show--auto") && k === current) select((current + 1) % tabs.length);
      });
    });

    if (!reduceMotion) {
      show.classList.add("show--auto");
      show.addEventListener("mouseenter", function () { show.classList.add("show--paused"); });
      show.addEventListener("mouseleave", function () { show.classList.remove("show--paused"); });
      show.addEventListener("focusin", function () { show.classList.add("show--paused"); });
      show.addEventListener("focusout", function () { show.classList.remove("show--paused"); });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { show.classList.toggle("show--running", en.isIntersecting); });
        }, { threshold: 0.35 }).observe(show);
      } else {
        show.classList.add("show--running");
      }
    }
  }

  /* ---------- Waitlist form (home page) ---------- */
  // POSTs JSON to the form's data-endpoint (e.g. a Formspree URL). If no
  // endpoint is configured yet, it opens a pre-filled email instead so the
  // signup still reaches us.
  var wform = document.getElementById("waitlistForm");
  var wmsg = document.getElementById("waitlistMsg");

  function say(text, kind) {
    if (!wmsg) return;
    wmsg.textContent = text;
    wmsg.className = "wform__msg" + (kind ? " is-" + kind : "");
  }

  if (wform) {
    wform.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      new FormData(wform).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : v; });

      if (!data.name || !data.whatsapp) { say("Please add your name and WhatsApp number.", "err"); return; }
      if (!/^\+?[\d\s()-]{9,}$/.test(data.whatsapp)) { say("That WhatsApp number doesn't look right.", "err"); return; }
      if (!data.consent) { say("Please tick the box so we can message you on WhatsApp.", "err"); return; }

      var endpoint = wform.getAttribute("data-endpoint");
      if (!endpoint) {
        var to = wform.getAttribute("data-fallback-email") || "info@dalabai.com";
        var body = "Name: " + data.name + "\nWhatsApp: " + data.whatsapp +
          "\nTown: " + (data.town || "-") + "\nMain use: " + (data.use || "-");
        window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Dalab waitlist") +
          "&body=" + encodeURIComponent(body);
        say("Your email app should open. Just press send and you're on the list.", "ok");
        return;
      }

      var btn = wform.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;
      say("Adding you to the list…");
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        wform.reset();
        say("You're on the list! We'll message you on WhatsApp when your spot is ready.", "ok");
      }).catch(function () {
        say("Something went wrong. Please try again, or email info@dalabai.com.", "err");
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  }
})();
