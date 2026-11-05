// Recording aid, injected only with --show-keys.
// Shows the last key pressed so video viewers can follow
// keyboard-only interaction. Hidden from assistive
// technology and excluded from axe.
(() => {
  const LABELS = { " ": "Space" };

  function overlay() {
    let el = document.getElementById("key-overlay");
    if (el) return el;
    el = document.createElement("div");
    el.id = "key-overlay";
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("popover", "manual");
    el.style.cssText = [
      "position:fixed", "inset:auto 24px 24px auto",
      "margin:0", "padding:12px 20px", "border:0",
      "border-radius:8px", "background:#16181d",
      "color:#ffffff",
      "font:600 28px/1 ui-monospace,Menlo,monospace",
    ].join(";");
    document.body.appendChild(el);
    return el;
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Shift") return;
    let key = LABELS[event.key] || event.key;
    if (event.shiftKey) key = "Shift+" + key;
    const el = overlay();
    el.textContent = key;
    // Re-show so it sits above an open modal dialog.
    try { el.hidePopover(); } catch (e) {}
    try { el.showPopover(); } catch (e) {}
  }, true);
})();
