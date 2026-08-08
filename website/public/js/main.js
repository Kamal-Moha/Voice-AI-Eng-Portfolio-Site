/* ============================================================
   DaLab AI — Staging Landing Page interactions (vanilla JS)
   - Mobile nav toggle
   - Scroll-reveal (IntersectionObserver on .reveal)
   - Animated stat counters (data-count / data-suffix)
   - Missed-call money calculator
   - CTA wiring (data-book -> booking URL)
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
})();
