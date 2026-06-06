const form = document.getElementById("invoiceForm");
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");

document.getElementById("invoiceDate").valueAsDate = new Date();

let drawing = false;
let invoices = JSON.parse(localStorage.getItem("invoices")) || [];

function setupCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
}

setTimeout(setupCanvas, 300);
window.addEventListener("resize", setupCanvas);

function getPosition(e) {
  const rect = canvas.getBoundingClientRect();
  const point = e.touches ? e.touches[0] : e;

  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

function startDrawing(e) {
  e.preventDefault();
  drawing = true;

  const pos = getPosition(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!drawing) return;

  e.preventDefault();

  const pos = getPosition(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDrawing(e) {
  if (!drawing) return;

  e.preventDefault();
  drawing = false;
}

canvas.addEventListener("pointerdown", startDrawing, { passive: false });
canvas.addEventListener("pointermove", draw, { passive: false });
canvas.addEventListener("pointerup", stopDrawing, { passive: false });
canvas.addEventListener("pointercancel", stopDrawing, { passive: false });
canvas.addEventListener("pointerleave", stopDrawing, { passive: false });

canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDrawing, { passive: false });

document.getElementById("clearSignature").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setupCanvas();
});

function getNextInvoiceNumber() {
  const lastNumber = Number(localStorage.getItem("lastInvoiceNumber")) || 1000;
  const nextNumber = lastNumber + 1;
  localStorage.setItem("lastInvoiceNumber", nextNumber);
  return nextNumber;
}

function getInvoiceFromForm(existingNumber = null) {
  return {
    invoiceNumber: existingNumber || getNextInvoiceNumber(),
    companyName: "IronNest Pressure Washing",
    customerName: document.getElementById("customerName").value,
    customerAddress: document.getElementById("customerAddress").value,
    customerPhone: document.getElementById("customerPhone").value,
    date: document.getElementById("invoiceDate").value,
    serviceDescription: document.getElementById("serviceDescription").value,
    price: document.getElementById("price").value,
    paymentStatus: document.getElementById("paymentStatus").value,
    signature: canvas.toDataURL("image/png")
  };
}

function renderInvoices() {
  const list = document.getElementById("invoiceList");
  list.innerHTML = "";

  invoices.forEach((invoice, index) => {
    const div = document.createElement("div");
    div.className = "saved-invoice";

    div.innerHTML = `
      <strong>${invoice.customerName}</strong><br>
      Invoice #${invoice.invoiceNumber}<br>
      ${invoice.date}<br>
      $${Number(invoice.price || 0).toFixed(2)} - ${invoice.paymentStatus || "UNPAID"}<br><br>
      <button onclick="downloadSavedInvoice(${index})">Download PDF</button>
      <button onclick="loadInvoice(${index})">Load Invoice</button>
      <button onclick="deleteInvoice(${index})">Delete</button>
    `;

    list.appendChild(div);
  });
}

window.loadInvoice = function(index) {
  const invoice = invoices[index];

  document.getElementById("customerName").value = invoice.customerName;
  document.getElementById("customerAddress").value = invoice.customerAddress;
  document.getElementById("customerPhone").value = invoice.customerPhone;
  document.getElementById("invoiceDate").value = invoice.date;
  document.getElementById("serviceDescription").value = invoice.serviceDescription;
  document.getElementById("price").value = invoice.price;
  document.getElementById("paymentStatus").value = invoice.paymentStatus || "UNPAID";

  alert("Invoice loaded.");
};

window.deleteInvoice = function(index) {
  if (!confirm("Delete this invoice?")) return;

  invoices.splice(index, 1);
  localStorage.setItem("invoices", JSON.stringify(invoices));
  renderInvoices();
};

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const invoice = getInvoiceFromForm();

  invoices.push(invoice);
  localStorage.setItem("invoices", JSON.stringify(invoices));

  renderInvoices();

  alert("Invoice saved locally on this device.");
});

function createPdf(invoice) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF tool did not load. Refresh the page and try again.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(0, 64, 115);
  doc.rect(0, 0, 210, 45, "F");

  doc.setFillColor(0, 168, 232);
  doc.circle(185, 20, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("IronNest Pressure Washing", 20, 18);

  doc.setFontSize(11);
  doc.text("Professional Pressure Washing Services", 20, 28);

  doc.setFontSize(13);
  doc.text(`Invoice #${invoice.invoiceNumber}`, 148, 18);
  doc.text(invoice.paymentStatus || "UNPAID", 148, 28);

  doc.setTextColor(210, 240, 255);
  doc.setFontSize(48);
  doc.text("IRONNEST", 42, 155, { angle: 35 });

  doc.setTextColor(0, 0, 0);

  doc.setFontSize(16);
  doc.text("Customer Information", 20, 60);

  doc.setDrawColor(0, 168, 232);
  doc.line(20, 64, 190, 64);

  doc.setFontSize(12);
  doc.text(`Date: ${invoice.date || ""}`, 20, 77);
  doc.text(`Customer: ${invoice.customerName || ""}`, 20, 87);
  doc.text(`Address: ${invoice.customerAddress || ""}`, 20, 97);
  doc.text(`Phone: ${invoice.customerPhone || ""}`, 20, 107);

  doc.setFontSize(16);
  doc.text("Service Details", 20, 127);

  doc.setDrawColor(0, 168, 232);
  doc.line(20, 131, 190, 131);

  doc.setFontSize(12);
  const serviceLines = doc.splitTextToSize(invoice.serviceDescription || "", 170);
  doc.text(serviceLines, 20, 144);

  doc.setFillColor(230, 247, 255);
  doc.roundedRect(20, 175, 170, 25, 3, 3, "F");

  doc.setFontSize(18);
  doc.text(`Total Due: $${Number(invoice.price || 0).toFixed(2)}`, 25, 191);

  if ((invoice.paymentStatus || "").toUpperCase() === "PAID") {
    doc.setTextColor(0, 150, 80);
    doc.setFontSize(38);
    doc.text("PAID", 135, 192);
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(12);
  doc.text("Customer Signature:", 20, 220);

  try {
    doc.addImage(invoice.signature, "PNG", 20, 225, 80, 35);
  } catch (error) {}

  doc.setDrawColor(0, 0, 0);
  doc.line(20, 263, 105, 263);

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Thank you for choosing IronNest Pressure Washing.", 20, 282);

  const safeName = invoice.customerName
    ? invoice.customerName.replace(/[^a-z0-9]/gi, "_").toLowerCase()
    : "customer";

  doc.save(`IronNest-Invoice-${invoice.invoiceNumber}-${safeName}.pdf`);
}

document.getElementById("downloadPdf").addEventListener("click", () => {
  const invoice = getInvoiceFromForm();
  createPdf(invoice);
});

window.downloadSavedInvoice = function(index) {
  createPdf(invoices[index]);
};

renderInvoices();