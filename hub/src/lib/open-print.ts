/** Same-page print overlay so mobile can dismiss preview (window.open tabs often cannot). */

const OVERLAY_ID = "bb-print-overlay";
const STYLE_ID = "bb-print-overlay-css";

const OVERLAY_CSS = `#bb-print-overlay{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;background:#fff;color:#111;}
#bb-print-overlay .bb-print-bar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:#f4f0ea;border-bottom:1px solid #d9d0c4;font-family:Tajawal,Arial,sans-serif;}
#bb-print-overlay .bb-print-bar span{flex:1;text-align:center;font-size:14px;}
#bb-print-overlay .bb-print-bar button{min-height:44px;min-width:88px;padding:0 16px;border:1px solid #8a8173;border-radius:8px;background:#fff;font-size:16px;font-family:Tajawal,Arial,sans-serif;}
#bb-print-overlay iframe{flex:1;width:100%;border:0;background:#fff;}`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = OVERLAY_CSS;
  document.head.appendChild(style);
}

function fallbackWindow(html: string) {
  const w = window.open("", "_blank", "width=820,height=960");
  if (!w) return false;
  const withClose = html.replace(
    /<\/body>/i,
    `<script>
(function(){
  function done(){ try{ window.close(); }catch(e){} }
  window.addEventListener("afterprint", done);
  try{
    var mq=window.matchMedia("print");
    if(mq.addEventListener) mq.addEventListener("change", function(e){ if(!e.matches) done(); });
    else if(mq.addListener) mq.addListener(function(e){ if(!e.matches) done(); });
  }catch(e){}
})();
<\/script></body>`,
  );
  w.document.open();
  w.document.write(withClose);
  w.document.close();
  return true;
}

function bindPrintDone(win: Window, done: () => void) {
  win.addEventListener("afterprint", done);
  try {
    const mq = win.matchMedia("print");
    const onMq = (e: MediaQueryListEvent) => {
      if (!e.matches) done();
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if ("addListener" in mq) {
      (
        mq as MediaQueryList & { addListener: (fn: (e: MediaQueryListEvent) => void) => void }
      ).addListener(onMq);
    }
  } catch {
    /* older WebKit */
  }
}

export type OpenPrintOpts = {
  dir?: "rtl" | "ltr";
  label?: string;
  closeLabel?: string;
  printLabel?: string;
};

export function openPrintHtml(html: string, opts?: OpenPrintOpts) {
  if (typeof document === "undefined") return false;
  ensureStyle();
  document.getElementById(OVERLAY_ID)?.remove();

  const dir = opts?.dir ?? "rtl";
  const closeLabel = opts?.closeLabel ?? (dir === "ltr" ? "Close" : "إغلاق");
  const printLabel = opts?.printLabel ?? (dir === "ltr" ? "Print" : "طباعة");
  const title = opts?.label ?? (dir === "ltr" ? "Print preview" : "معاينة الطباعة");

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.dir = dir;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title);
  overlay.innerHTML = `<div class="bb-print-bar">
      <button type="button" class="bb-print-close">${closeLabel}</button>
      <span>${title}</span>
      <button type="button" class="bb-print-again">${printLabel}</button>
    </div>
    <iframe title="${title}"></iframe>`;
  document.body.appendChild(overlay);

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const iframe = overlay.querySelector("iframe");
  const doc = iframe?.contentDocument;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey);
    document.body.style.overflow = prevOverflow;
    overlay.remove();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  overlay.querySelector(".bb-print-close")?.addEventListener("click", close);
  overlay.querySelector(".bb-print-again")?.addEventListener("click", () => {
    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
  });
  document.addEventListener("keydown", onKey);
  (overlay.querySelector(".bb-print-close") as HTMLButtonElement | null)?.focus();

  if (!iframe || !doc) {
    close();
    return fallbackWindow(html);
  }

  iframe.addEventListener("load", () => {
    const win = iframe.contentWindow;
    if (win) bindPrintDone(win, () => setTimeout(close, 400));
  });

  doc.open();
  doc.write(html);
  doc.close();
  return true;
}
