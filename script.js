/* ============================================================
   CodeSnap — Client-side Code-to-Image Generator
   Pure vanilla JS · html2canvas for PNG export
   White card, black text. Works offline after first load.
   ============================================================ */

// ── DOM refs ──
const editor = document.getElementById("editor");
const codeContent = document.getElementById("codeContent");
const codeCard = document.getElementById("codeCard");
const windowHeader = document.getElementById("windowHeader");
const windowTitle = document.getElementById("windowTitle");
const previewScroll = document.getElementById("previewScroll");

const langSelect = document.getElementById("langSelect");
const fontSizeSlider = document.getElementById("fontSize");
const lineHeightSlider = document.getElementById("lineHeight");
const paddingSlider = document.getElementById("padding");
const borderRadius = document.getElementById("borderRadius");
const showLinesCheck = document.getElementById("showLines");
const showHeaderCheck = document.getElementById("showHeader");
const widthModeSelect = document.getElementById("widthMode");
const fixedWidthCtrl = document.getElementById("fixedWidthCtrl");
const fixedWidthSlider = document.getElementById("fixedWidth");
const fixedWidthVal = document.getElementById("fixedWidthVal");

const fontVal = document.getElementById("fontVal");
const lhVal = document.getElementById("lhVal");
const padVal = document.getElementById("padVal");
const radVal = document.getElementById("radVal");
const lineCount = document.getElementById("editorLineCount");

const downloadBtn = document.getElementById("downloadBtn");
const downloadLbl = document.getElementById("downloadLabel");
const copyBtn = document.getElementById("copyBtn");
const copyLabel = document.getElementById("copyLabel");
const copyImageBtn = document.getElementById("copyImageBtn");
const copyImageLabel = document.getElementById("copyImageLabel");
const clearBtn = document.getElementById("clearBtn");

// ── Timer ref for debouncing ──
let timer = null;

/* ============================================================
   RENDER: Build the code content with optional line numbers
   Uses textContent so <, >, & display literally.
   ============================================================ */
function renderCode() {
  const raw = editor.value;
  // Split into lines, drop trailing empty line for cleaner output
  let lines = raw.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const total = lines.length;

  // Update line count display in editor footer
  lineCount.textContent = total + (total === 1 ? " line" : " lines");

  // Build output string
  let output;

  if (showLinesCheck.checked && total > 0) {
    const gutter = String(total).length; // width of line-number gutter
    output = lines
      .map(function (line, i) {
        const num = String(i + 1).padStart(gutter, " ");
        return num + "  " + line;
      })
      .join("\n");
  } else {
    output = lines.join("\n");
  }

  // Use textContent — never innerHTML — so HTML entities render literally
  codeContent.textContent = output || " ";
}

/* ============================================================
   APPLY STYLES: Font, padding, radius, line-height, header
   Applied directly as inline styles for html2canvas compatibility
   ============================================================ */
function applyStyles() {
  var fs = fontSizeSlider.value;
  var lh = lineHeightSlider.value;
  var pad = paddingSlider.value;
  var rad = borderRadius.value;

  // Update numeric labels
  fontVal.textContent = fs;
  lhVal.textContent = lh;
  padVal.textContent = pad;
  radVal.textContent = rad;

  // Code block styles
  codeCard.style.fontSize = fs + "px";
  codeCard.style.lineHeight = lh;
  codeCard.style.padding = pad + "px";
  codeCard.style.borderRadius = rad + "px";

  // Also set on the pre for correct rendering
  var codeBlock = document.getElementById("codeBlock");
  codeBlock.style.fontSize = fs + "px";
  codeBlock.style.lineHeight = lh;
  codeBlock.style.padding = pad + "px";

  // Image width mode: how the exported/preview card sizes itself
  var widthMode = widthModeSelect.value;
  fixedWidthCtrl.style.display = widthMode === "fixed" ? "flex" : "none";

  if (widthMode === "auto") {
    // Shrink to the longest line — no extra empty space on either side
    codeCard.style.width = "auto";
    codeCard.style.minWidth = "0";
    codeCard.style.maxWidth = "none";
  } else if (widthMode === "fixed") {
    var fw = fixedWidthSlider.value;
    fixedWidthVal.textContent = fw;
    codeCard.style.width = fw + "px";
    codeCard.style.minWidth = fw + "px";
    codeCard.style.maxWidth = fw + "px";
  } else {
    // "full" — original behavior, fills the preview area
    codeCard.style.width = "100%";
    codeCard.style.minWidth = "400px";
    codeCard.style.maxWidth = "960px";
  }

  // Window header visibility
  if (showHeaderCheck.checked) {
    windowHeader.classList.remove("hidden");
  } else {
    windowHeader.classList.add("hidden");
  }

  // Language title
  windowTitle.textContent = langSelect.value;
}

/* ============================================================
   FULL UPDATE: render text + apply styles
   ============================================================ */
function update() {
  renderCode();
  applyStyles();
}

/* ============================================================
   DEBOUNCED UPDATE: called on every input event
   ============================================================ */
function scheduleUpdate() {
  clearTimeout(timer);
  timer = setTimeout(update, 50);
}

/* ============================================================
   SHARED: run pre-export checks + render the card to a canvas
   Used by both "Download PNG" and "Copy Image".
   Throws a descriptive Error if it can't proceed, so callers
   can alert() and reset their own button state.
   ============================================================ */
async function captureCardCanvas() {
  // Ensure latest state is rendered
  update();

  if (typeof html2canvas === "undefined") {
    throw new Error(
      "html2canvas library failed to load.\n\n" +
        "Please check your internet connection and refresh the page.",
    );
  }

  if (!editor.value.trim()) {
    editor.focus();
    throw new Error("Type or paste some code first.");
  }

  return html2canvas(codeCard, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
    allowTaint: false,
    width: codeCard.scrollWidth,
    height: codeCard.scrollHeight,
  });
}

/* ============================================================
   DOWNLOAD PNG via html2canvas
   ============================================================ */
async function downloadPNG() {
  try {
    downloadBtn.disabled = true;
    downloadLbl.textContent = "Generating…";

    var canvas = await captureCardCanvas();

    var link = document.createElement("a");
    var lang = langSelect.value
      .toLowerCase()
      .replace(/\+\+/g, "pp")
      .replace(/\s+/g, "-");
    link.download = "codesnap-" + lang + "-" + Date.now() + ".png";
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("PNG export failed:", err);
    alert(err && err.message ? err.message : "PNG export failed. Please try again.");
  } finally {
    downloadBtn.disabled = false;
    downloadLbl.textContent = "Download PNG";
  }
}

/* ============================================================
   COPY IMAGE to clipboard — lets you paste straight into
   Telegram, Discord, WhatsApp Web, etc. with Ctrl/Cmd+V.
   ============================================================ */
async function copyImage() {
  // Clipboard image support requires a secure context (https/localhost)
  // and the ClipboardItem API. Fail fast with a clear message instead
  // of a silent/confusing error.
  if (
    !window.isSecureContext ||
    !navigator.clipboard ||
    !navigator.clipboard.write ||
    typeof ClipboardItem === "undefined"
  ) {
    alert(
      "Your browser doesn't support copying images to the clipboard.\n\n" +
        "Try Chrome/Edge over HTTPS, or use Download PNG and attach the file manually.",
    );
    return;
  }

  try {
    copyImageBtn.disabled = true;
    copyImageLabel.textContent = "Copying…";

    var canvas = await captureCardCanvas();

    var blob = await new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b);
        else reject(new Error("Could not generate image data."));
      }, "image/png");
    });

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);

    copyImageBtn.classList.add("btn-copied");
    copyImageLabel.textContent = "Copied!";
    setTimeout(function () {
      copyImageBtn.classList.remove("btn-copied");
      copyImageLabel.textContent = "Copy Image";
    }, 1800);
  } catch (err) {
    console.error("Copy image failed:", err);
    alert(
      err && err.message
        ? err.message
        : "Copying the image failed. Please try again or use Download PNG.",
    );
  } finally {
    copyImageBtn.disabled = false;
    if (copyImageLabel.textContent === "Copying…") {
      copyImageLabel.textContent = "Copy Image";
    }
  }
}

/* ============================================================
   COPY CODE to clipboard
   ============================================================ */
async function copyCode() {
  var code = editor.value;

  if (!code.trim()) {
    alert("Nothing to copy — the editor is empty.");
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Fallback for older browsers
    editor.select();
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
  }

  // Visual feedback
  copyBtn.classList.add("btn-copied");
  copyLabel.textContent = "Copied!";

  setTimeout(function () {
    copyBtn.classList.remove("btn-copied");
    copyLabel.textContent = "Copy Code";
  }, 1800);
}

/* ============================================================
   CLEAR EDITOR
   ============================================================ */
function clearEditor() {
  if (!editor.value.trim()) return;

  var confirmed = window.confirm("Clear all code from the editor?");
  if (!confirmed) return;

  editor.value = "";
  editor.focus();
  update();
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
editor.addEventListener("input", scheduleUpdate);

langSelect.addEventListener("change", update);
fontSizeSlider.addEventListener("input", update);
lineHeightSlider.addEventListener("input", update);
paddingSlider.addEventListener("input", update);
borderRadius.addEventListener("input", update);
showLinesCheck.addEventListener("change", update);
showHeaderCheck.addEventListener("change", update);
widthModeSelect.addEventListener("change", update);
fixedWidthSlider.addEventListener("input", update);

downloadBtn.addEventListener("click", downloadPNG);
copyBtn.addEventListener("click", copyCode);
copyImageBtn.addEventListener("click", copyImage);
clearBtn.addEventListener("click", clearEditor);

/* ============================================================
   INITIAL RENDER — run once on page load so the preview
   reflects the default sample code and control values.
   ============================================================ */
update();