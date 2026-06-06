const form = document.getElementById("invoiceForm");
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");

const invoiceDate = document.getElementById("invoiceDate");
invoiceDate.valueAsDate = new Date();

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

function getInvoiceFromForm() {
  return {
    companyName: document.getElementById("companyName").value,
    customerName: document.getElementById("customerName").value,
    customerAddress: document.getElementById("customerAddress").value,
    customerPhone: document.getElementById("customerPhone").value,
    date: document.getElementById("invoiceDate").value,
    serviceDescription: document.getElementById("serviceDescription").value,
    price: document.getElementById("price").value,
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
      ${invoice.date}<br>
      $${Number(invoice.price || 0).toFixed(2)}<br><br>
      <button onclick="loadInvoice(${index})">Load Invoice</button>
      <button onclick="deleteInvoice(${index})">Delete</button>
    `;

    list.appendChild(div);
  });
}

window.loadInvoice = function(index) {
  const invoice = invoices[index];

  document.getElementById("companyName").value = invoice.companyName;
  document.getElementById("customerName").value = invoice.customerName;
  document.getElementById("customerAddress").value = invoice.customerAddress;
  document.getElementById("customerPhone").value = invoice.customerPhone;
  document.getElementById("invoiceDate").value = invoice.date;
  document.getElementById("serviceDescription").value = invoice.serviceDescription;
  document.getElementById("price").value = invoice.price;

  alert("Invoice loaded. You can now download it as PDF.");
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

document.getElementById("downloadPdf").addEventListener("click", () => {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF tool did not load. Refresh the page and try again.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const invoice = getInvoiceFromForm();

  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.text(invoice.companyName || "Invoice", 20, 20);

  doc.setFontSize(16);
  doc.text("Invoice", 20, 35);

  doc.setFontSize(12);
  doc.text(`Date: ${invoice.date || ""}`, 20, 50);
  doc.text(`Customer: ${invoice.customerName || ""}`, 20, 60);
  doc.text(`Address: ${invoice.customerAddress || ""}`, 20, 70);
  doc.text(`Phone: ${invoice.customerPhone || ""}`, 20, 80);

  doc.line(20, 90, 190, 90);

  doc.text("Service Description:", 20, 105);

  const serviceLines = doc.splitTextToSize(invoice.serviceDescription || "", 170);
  doc.text(serviceLines, 20, 115);

  doc.setFontSize(16);
  doc.text(`Total: $${Number(invoice.price || 0).toFixed(2)}`, 20, 145);

  doc.setFontSize(12);
  doc.text("Customer Signature:", 20, 165);

  try {
    doc.addImage(invoice.signature, "PNG", 20, 170, 80, 35);
  } catch (error) {
    console.log("Signature could not be added.");
  }

  const safeName = invoice.customerName
    ? invoice.customerName.replace(/[^a-z0-9]/gi, "_").toLowerCase()
    : "customer";

  doc.save(`invoice-${safeName}.pdf`);
});

renderInvoices();