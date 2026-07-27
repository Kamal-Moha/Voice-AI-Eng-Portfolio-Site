/* ============================================================
   Portfolio interactivity
   ============================================================ */
(function () {
  "use strict";

  /* ---- Current year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Navbar background on scroll ---- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 20) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav toggle ---- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close menu when a link is clicked
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Animated stat counters ---- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    // Decode HTML entities like &lt;
    var tmp = document.createElement("textarea");
    tmp.innerHTML = prefix; prefix = tmp.value;
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = prefix + Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var statEls = document.querySelectorAll(".stat__num[data-count]");
  if ("IntersectionObserver" in window) {
    var statIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    statEls.forEach(function (el) { statIO.observe(el); });
  }

  /* ---- YouTube thumbnail fallback (maxres -> hq) ---- */
  document.querySelectorAll(".project__thumb").forEach(function (img) {
    img.addEventListener("error", function handler() {
      var fb = img.getAttribute("data-fallback");
      if (fb && img.src !== fb) {
        img.src = fb;
      } else {
        img.removeEventListener("error", handler);
      }
    });
  });

  /* ---- Inline YouTube embed (video plays inside the card, on-site) ---- */
  function playInline(mediaEl, videoId) {
    if (!mediaEl || !videoId || mediaEl.classList.contains("is-playing")) return;

    var iframe = document.createElement("iframe");
    iframe.setAttribute(
      "src",
      "https://www.youtube.com/embed/" +
        encodeURIComponent(videoId) +
        "?autoplay=1&rel=0&modestbranding=1&playsinline=1"
    );
    iframe.setAttribute("title", "Project demo video");
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    );
    iframe.setAttribute("allowfullscreen", "");

    mediaEl.classList.add("is-playing");
    mediaEl.appendChild(iframe);
  }

  document.querySelectorAll(".js-video").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var id = el.getAttribute("data-yt");
      if (!id) return; // no video id -> allow default (fallback link)
      e.preventDefault();

      // The media area to embed into: the element itself if it's the thumbnail,
      // otherwise the .project__media within the same card (e.g. "Watch Demo" link).
      var media = el.classList.contains("project__media")
        ? el
        : (el.closest(".project") && el.closest(".project").querySelector(".project__media"));

      if (media) {
        playInline(media, id);
        if (!el.classList.contains("project__media")) {
          media.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (el.href) {
        window.location.href = el.href; // ultimate fallback
      }
    });
  });
})();
