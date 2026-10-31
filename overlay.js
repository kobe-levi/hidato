/* Floating game overlay: the game section floats above the main page.
   Adds a title bar (minimize / close), a reopen pill and a dim backdrop.
   Purely additive: the game DOM is never moved or unmounted, so game state
   always survives minimize and close. */
(function () {
  "use strict";
  var html = document.documentElement;
  var state = "open"; // the game opens floating; minimize/close reveal the main page
  var panel = null, bar = null, titleEl = null, pill = null, backdrop = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildChrome() {
    if (bar) return;
    bar = el("div", "ovl-bar");
    titleEl = el("div", "ovl-bar-title", "חידאתו");

    var minB = el("button", "ovl-btn ovl-min", "–");
    minB.type = "button";
    minB.title = "מזער";
    minB.setAttribute("aria-label", "מזער את מסך המשחק");
    minB.addEventListener("click", function () { setState("min"); });

    var closeB = el("button", "ovl-btn ovl-close", "✕");
    closeB.type = "button";
    closeB.title = "סגור";
    closeB.setAttribute("aria-label", "סגור את מסך המשחק");
    closeB.addEventListener("click", function () {
      setState("closed");
      window.scrollTo(0, 0);
    });

    bar.appendChild(titleEl);
    bar.appendChild(minB);
    bar.appendChild(closeB);

    pill = el("button", "ovl-pill");
    pill.type = "button";
    pill.setAttribute("aria-label", "חזרה למשחק");
    var icon = el("span", null, "🧩");
    icon.setAttribute("aria-hidden", "true");
    pill.appendChild(icon);
    pill.appendChild(el("span", null, "חזרה למשחק"));
    pill.addEventListener("click", function () { setState("open"); });
    document.body.appendChild(pill);

    backdrop = el("div", "ovl-backdrop");
    backdrop.addEventListener("click", function () { setState("min"); });
    document.body.appendChild(backdrop);

    // tapping a mode/difficulty chip on the main page (re)opens the game
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest(".choice-opt")) setState("open");
    }, true);
  }

  function setState(s) { state = s; apply(); }

  function apply() {
    var has = !!panel;
    html.classList.toggle("ovl-open", has && state === "open");
    html.classList.toggle("ovl-gone", has && state !== "open");
    if (pill) pill.style.display = has && state !== "open" ? "" : "none";
    if (backdrop) backdrop.style.display = has && state === "open" ? "" : "none";
  }

  function currentTitle() {
    var rows = document.querySelectorAll(".hidato-root .choice-row");
    var parts = [];
    for (var i = 0; i < rows.length; i++) {
      var sel = rows[i].querySelector(".choice-opt.sel");
      if (sel) parts.push(sel.textContent.trim());
    }
    return parts.join(" · ") || "חידאתו";
  }

  function tagPanel() {
    var inner = document.querySelector(".hidato-root .hidato-board") ||
                document.querySelector(".hidato-root .name-gate");
    var p = inner && inner.closest ? inner.closest(".group") : null;
    if (p !== panel) {
      if (panel) panel.classList.remove("ovl-panel", "big-tray");
      panel = p;
      if (panel) {
        panel.classList.add("ovl-panel");
        panel.appendChild(bar); // order:-1 keeps the bar on top; React never touches this node
      }
    }
    if (panel) {
      var chips = panel.querySelectorAll(".chip").length;
      panel.classList.toggle("big-tray", chips > 45);
      titleEl.textContent = currentTitle();
    }
    apply();
  }

  var scheduled = false;
  function scheduleTag() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; tagPanel(); }, 0);
  }

  function init() {
    buildChrome();
    tagPanel();
    var root = document.getElementById("root");
    if (root) {
      new MutationObserver(scheduleTag).observe(root, {
        childList: true, subtree: true, attributes: true, attributeFilter: ["class"]
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
