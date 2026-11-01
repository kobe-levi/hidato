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


  /* --- sentence of the day on the win screen (no repeats; ends when the bank runs out) --- */
  var QUOTES = ["פתרת! מחר חידה חדשה, ואתה כבר מוכן.", "ישר ולעניין: היום ניצחת. תהנה מהרגע.", "זה היה יפה. ממש יפה. המספרים עצמם התרגשו.", "המספר האחרון מברך: תודה שהגעת אליי בדרך המלך.", "כל מספר מצא את מקומו. כמו בחיים, רק מהר יותר.", "התחלת ב-1, סיימת בגדול. כמו שצריך.", "לא כל גיבור לובש גלימה. חלקם פותרים חידות בפיג׳מה.", "היום אתה האלוף. מחר? מחר נלחם מחדש.", "הצלחה קטנה כל יום. זה הסוד, ואתה מכיר אותו.", "הפתרון היה בתוכך כל הזמן. טוב, לא בדיוק, אבל נשמע נחמד.", "אלוף היום, ועוד לא ערב. מה עוד תעשה היום? העולם מחכה.", "פתרון נקי, מוח צלול, יום מנוצח. הבא.", "יום בלי חידה זה כמו יום בלי לנצח משהו קטן. טוב שיש אותנו.", "זכית בקרב על תשומת הלב של עצמך. זה הקרב הכי חשוב שיש.", "לקח לך כמה דקות לעשות משהו טוב למוח שלך. השקעה מצוינת.", "כל יום שפותרים בו חידה הוא יום שלא התבזבז. מקור: היגיון בסיסי.", "ניצחון! קטן, יומיומי, וממכר בדיוק במידה הנכונה.", "סיימת. עכשיו אפשר להתרברב בארוחת הערב. מגיע לך.", "יום שמתחיל בחידה פתורה הוא יום שנפתח כמו שצריך.", "תשמור את הביטחון הזה. תצטרך אותו מחר, החידה לא מתביישת.", "המספרים התכנסו הערב וסיכמו: איתך כיף לשחק.", "מספר 14 ביקש להעביר שהוא אוהב אותך יותר מ-13. אל תספר ל-13.", "הכוורת מאושרת. הדבורים שוקלות להצטרף. (אין דבורים. זו בדיחה.)", "המגש למטה התרוקן בזכותך. הוא מרגיש מנוצל. בצורה טובה.", "הלוח נפרד ממך לשלום ומחכה למחר. אל תשאיר אותו בודד יותר מדי.", "גם המספרים לא האמינו שתצליח כל כך מהר. הם מתנצלים על הספק.", "הייתה כאן תחרות קשה בינך לבין עצמך של אתמול. ניצחת.", "הטיימר עצר. הוא מתרגש לספר לחבריו, השעונים.", "דירקטוריון המספרים אישר פה אחד: אתה מנהל מצוין של רצפים.", "הכוכב הצהוב שלך בדרך. חברת השליחויות של המספרים טיפלה בזה אישית.", "אם תקשיב טוב, תשמע תשואות. קטנות. של מספרים. מתרגשים.", "הלוח התמלא, הלב התמלא, הכל כשורה.", "המספר 1 גאה בך. הוא אומר שהרגיש את זה מההתחלה.", "טקס חלוקת התעודות יערך מחר, באותה שעה, באותו מקום. אל תאחר.", "הקפה שלך מתגעגע. החידה נגמרה, אפשר לחזור אליו.", "גרמת לעשרות מספרים להסתדר ביחד. האו\"ם מתקשר בהמשך.", "המוח ביקש חופשה אחרי ביצוע כזה. הענקנו לו עד מחר בבוקר.", "סיימת! לך תספר למישהו. לא נשפוט אם תגזים קצת.", "בחצות נולדת חידה חדשה. היא כבר שמעה עליך, והיא לחוצה.", "יש רק דבר אחד טוב מלפתור חידה: לפתור אותה מחר שוב."];
  var QUOTE_START = Date.UTC(2026, 10, 1);
  function quoteOfToday() {
    var d = new Date();
    var pos = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - QUOTE_START) / 86400000);
    if (pos < 0 || pos >= QUOTES.length) return null;
    var order = QUOTES.map(function (_, i) { return i; });
    var s = 20261101;
    function rnd() { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var x = order[i]; order[i] = order[j]; order[j] = x; }
    return QUOTES[order[pos]];
  }
  function quoteScan(p) {
    var win = p.querySelector("[data-testid='win']");
    if (!win) return;
    var title = win.querySelector(".win-title");
    if (!title || title.textContent.indexOf("הפתרון המלא") !== -1) return;
    if (win.querySelector(".win-quote")) return;
    var q = quoteOfToday();
    if (!q) return;
    var n = document.createElement("div");
    n.className = "win-quote";
    n.textContent = q;
    n.style.cssText = "margin-top:8px;font-size:15px;line-height:1.35;font-weight:600;text-align:center;color:inherit";
    win.appendChild(n);
  }

  function analyticsScan(p) {
    quoteScan(p);
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
