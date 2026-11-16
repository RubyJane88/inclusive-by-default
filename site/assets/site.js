/* Demo site behavior: tabs, version switch, live axe scan,
   copy buttons. Without this script the page is still one
   readable document with every section visible. */
(function () {
  "use strict";
  var WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  var NAMES = {
    broken: "Broken version: inaccessible on purpose",
    fixed: "Fixed version",
    hollow: "Hollow version: names that say nothing"
  };
  document.documentElement.classList.add("js");

  /* ---------- Code blocks ----------
     A block is a keyboard stop only when it scrolls sideways.
     Then it gets a name, taken from its caption. */
  function captionText(pre) {
    var caption = pre.parentNode.querySelector("figcaption");
    if (!caption) return "Code";
    var copy = caption.cloneNode(true);
    Array.prototype.forEach.call(
      copy.querySelectorAll("button, [role=status]"),
      function (el) { el.remove(); }
    );
    return copy.textContent.replace(/\s+/g, " ").trim();
  }
  function markScrollable() {
    Array.prototype.forEach.call(
      document.querySelectorAll("pre"),
      function (pre) {
        if (pre.scrollWidth > pre.clientWidth) {
          pre.tabIndex = 0;
          pre.setAttribute("role", "group");
          pre.setAttribute("aria-label", captionText(pre));
        } else {
          pre.removeAttribute("tabindex");
          pre.removeAttribute("role");
          pre.removeAttribute("aria-label");
        }
      }
    );
  }
  window.addEventListener("resize", markScrollable);
  Array.prototype.forEach.call(
    document.querySelectorAll("details"),
    function (d) { d.addEventListener("toggle", markScrollable); }
  );

  /* ---------- Tabs ---------- */
  var tablist = document.querySelector("[role=tablist]");
  var tabs = Array.prototype.slice.call(
    tablist.querySelectorAll("[role=tab]")
  );
  var panels = tabs.map(function (tab) {
    var panel = document.getElementById(tab.dataset.panel);
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    return panel;
  });
  tablist.hidden = false;

  function select(index, opts) {
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    markScrollable();
    if (opts && opts.focus) tabs[index].focus();
    if (opts && opts.hash) {
      history.replaceState(null, "", "#" + panels[index].id);
    }
  }
  function indexFromHash() {
    var id = location.hash.slice(1);
    for (var i = 0; i < panels.length; i++) {
      if (panels[i].id === id) return i;
    }
    return -1;
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      select(i, { hash: true });
    });
    tab.addEventListener("keydown", function (event) {
      var to = null;
      if (event.key === "ArrowRight") to = (i + 1) % tabs.length;
      else if (event.key === "ArrowLeft") to = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") to = 0;
      else if (event.key === "End") to = tabs.length - 1;
      if (to !== null) {
        event.preventDefault();
        select(to, { focus: true, hash: true });
      }
    });
  });
  window.addEventListener("hashchange", function () {
    var i = indexFromHash();
    if (i >= 0) select(i);
  });
  select(Math.max(indexFromHash(), 0));

  /* ---------- Version switch and frame controls ---------- */
  Array.prototype.forEach.call(
    document.querySelectorAll(".try"),
    function (box) {
      var frame = box.querySelector("iframe");
      var nameEl = box.querySelector("[data-frame-name]");
      var openLink = box.querySelector("[data-open]");
      var out = box.querySelector("[data-axe-out]");
      var scanBtn = box.querySelector("[data-scan]");

      function variant() {
        return box.querySelector(".switch input:checked").value;
      }
      function setVariant(v) {
        frame.src = "app/" + v + "/";
        frame.title = "Sign-up page, " + v + " version";
        nameEl.textContent = NAMES[v];
        openLink.href = "app/" + v + "/";
        out.textContent = "";
        Array.prototype.forEach.call(
          box.querySelectorAll("[data-show]"),
          function (el) { el.hidden = el.dataset.show !== v; }
        );
      }
      Array.prototype.forEach.call(
        box.querySelectorAll(".switch input"),
        function (input) {
          input.addEventListener("change", function () {
            setVariant(variant());
          });
        }
      );
      box.querySelector("[data-reload]").addEventListener(
        "click",
        function () {
          out.textContent = "";
          frame.contentWindow.location.reload();
        }
      );

      /* ---------- Live axe scan ---------- */
      function loadAxe(win, doc) {
        if (win.axe) return Promise.resolve();
        return new Promise(function (resolve, reject) {
          var script = doc.createElement("script");
          script.src = new URL("vendor/axe.min.js", document.baseURI).href;
          script.onload = resolve;
          script.onerror = function () {
            reject(new Error("could not load axe-core"));
          };
          doc.head.appendChild(script);
        });
      }
      function dialogIsOpen(doc) {
        var layer = doc.getElementById("confirm-layer");
        if (layer) return layer.classList.contains("open");
        var dialog = doc.getElementById("confirm");
        return !!(dialog && dialog.open);
      }
      function runScan() {
        var win = frame.contentWindow;
        var doc = frame.contentDocument;
        var scope = scanBtn.dataset.scan;
        var openedHere = false;
        var options = { runOnly: { type: "tag", values: WCAG_TAGS } };
        return loadAxe(win, doc).then(function () {
          if (scope !== "dialog") return win.axe.run(doc, options);
          if (!dialogIsOpen(doc)) {
            doc.getElementById("delete").click();
            openedHere = true;
          }
          return win.axe.run("#confirm", options).then(
            function (results) {
              if (openedHere) doc.getElementById("cancel").click();
              scanBtn.focus();
              return results;
            }
          );
        });
      }
      function show(results, what) {
        var violations = results.violations;
        var wrap = document.createElement("div");
        var head = document.createElement("p");
        var strong = document.createElement("b");
        var version = results.testEngine.version;
        wrap.className =
          "axe-result " + (violations.length ? "found" : "clean");
        if (violations.length) {
          strong.textContent =
            "axe " + version + " found " + violations.length +
            (violations.length === 1 ? " failing rule" : " failing rules") +
            " on " + what + ".";
        } else {
          strong.textContent =
            "axe " + version + " found no violations on " + what + ".";
        }
        head.appendChild(strong);
        wrap.appendChild(head);
        if (violations.length) {
          var list = document.createElement("ul");
          violations.forEach(function (v) {
            var li = document.createElement("li");
            var code = document.createElement("code");
            code.textContent = v.id;
            li.appendChild(code);
            li.appendChild(document.createTextNode(
              ": " + v.help + " (" + v.nodes.length +
              (v.nodes.length === 1 ? " element)" : " elements)")
            ));
            list.appendChild(li);
          });
          wrap.appendChild(list);
        }
        if (results.incomplete.length) {
          var note = document.createElement("p");
          note.textContent =
            "Incomplete, needs a person to check: " +
            results.incomplete.map(function (v) { return v.id; }).join(", ") + ".";
          wrap.appendChild(note);
        }
        out.textContent = "";
        out.appendChild(wrap);
      }
      scanBtn.addEventListener("click", function () {
        var v = variant();
        var what = scanBtn.dataset.scan === "dialog"
          ? "the open dialog of the " + v + " page"
          : "the " + v + " page";
        out.textContent = "Scanning…";
        runScan().then(
          function (results) { show(results, what); },
          function (error) {
            out.textContent =
              "The scan could not run: " + error.message +
              ". Reload the page and try again.";
          }
        );
      });
    }
  );

  /* ---------- Copy buttons ---------- */
  Array.prototype.forEach.call(
    document.querySelectorAll("[data-copy]"),
    function (button) {
      var live = document.createElement("span");
      live.setAttribute("role", "status");
      live.className = "hint";
      button.insertAdjacentElement("afterend", live);
      button.addEventListener("click", function () {
        var code = button.closest("figure").querySelector("pre code");
        var text = code.textContent;
        function done(message) {
          live.textContent = message;
          setTimeout(function () { live.textContent = ""; }, 4000);
        }
        function fallback() {
          var range = document.createRange();
          range.selectNodeContents(code);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          done("Selected. Press Ctrl or Command + C to copy.");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () { done("Copied"); },
            fallback
          );
        } else {
          fallback();
        }
      });
    }
  );
})();
