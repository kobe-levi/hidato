/* Floating game overlay: the game section floats above the main page.
   Adds a title bar (minimize / close), a reopen pill and a dim backdrop.
   Purely additive: the game DOM is never moved or unmounted, so game state
   always survives minimize and close. */
(function () {
  "use strict";
  var html = document.documentElement;
  var state = "open"; // the game opens floating; minimize/close reveal the main page
  var panel = null, bar = null, titleEl = null, pill = null, backdrop = null;
  /* --- anonymous usage analytics (visits, game starts, wins) --- */
  var SB_URL = "https://dazfqxtkmiqlknywyiey.supabase.co";
  var SB_KEY = "sb_publishable_mUOgQmo4X0hLV55uJzRz5w_QDWHbOnM";
  var lastSig = null, winLoggedFor = null, visitSent = false;

  function deviceClass() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPod/.test(ua)) return "iphone";
    if (/iPad/.test(ua)) return "ipad";
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? "android-phone" : "android-tablet";
    if (/Mobile/.test(ua)) return "mobile";
    return "desktop";
  }

  function track(type, extra) {
    try {
      var row = {
        type: type,
        vw: window.innerWidth, vh: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
        device: deviceClass(),
        touch: (navigator.maxTouchPoints || 0) > 0,
        lang: navigator.language || null
      };
      if (extra) for (var k in extra) row[k] = extra[k];
      fetch(SB_URL + "/rest/v1/events", {
        method: "POST",
        headers: {
          "apikey": SB_KEY,
          "Authorization": "Bearer " + SB_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(row),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function modeDiff() {
    var chips = document.querySelectorAll(".choice-opt");
    var mode = chips[1] && chips[1].classList.contains("sel") ? "daily" : "free";
    var diff = null;
    var rows = document.querySelectorAll(".choice-row");
    if (mode === "free" && rows[1]) {
      var sel = rows[1].querySelector(".choice-opt.sel");
      if (sel) diff = sel.textContent.trim();
    }
    return { mode: mode, diff: diff };
  }

  function numOrNull(text) {
    var n = +(text || "");
    return isNaN(n) || text == null || text === "" ? null : n;
  }

  function msFromTimer(text) {
    var m = /^(\d+):(\d{1,2})$/.exec(text || "");
    return m ? (+m[1] * 60 + +m[2]) * 1000 : null;
  }

  function analyticsScan(p) {
    var svg = p.querySelector(".hidato-board svg");
    if (!svg) return;
    var sig = svg.getAttribute("data-solution");
    if (!sig) return;
    var md = modeDiff();
    var cells = p.querySelectorAll(".chip").length;
    if (sig !== lastSig) {
      lastSig = sig;
      winLoggedFor = null;
      var fresh = !p.querySelector(".cell.filled") &&
        (p.querySelector("[data-testid='score']") || {}).textContent === "0";
      if (fresh) track("start", { mode: md.mode, diff: md.diff, cells: cells });
    }
    if (p.querySelector("[data-testid='win']") && winLoggedFor !== sig) {
      winLoggedFor = sig;
      var t = (p.querySelector("[data-testid='timer']") || {}).textContent;
      track("win", {
        mode: md.mode, diff: md.diff, cells: cells,
        score: numOrNull((p.querySelector("[data-testid='score']") || {}).textContent),
        mistakes: numOrNull((p.querySelector("[data-testid='mistakes']") || {}).textContent),
        ms: msFromTimer(t)
      });
    }
  }


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
      try { analyticsScan(panel); } catch (e) {}
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
    if (!visitSent) { visitSent = true; track("visit", {}); }
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
