const form = document.getElementById("invoiceForm");
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");

const logoPath = "./BAB89AB6-21E7-4651-B1DD-469BD6682619.png?v=1";

document.getElementById("invoiceDate").valueAsDate = new Date();

let drawing = false;
let invoices = JSON.parse(localStorage.getItem("invoices")) || [];
let logoImage = null;

function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function () {
      const logoCanvas = document.createElement("canvas");
      logoCanvas.width = img.width;
      logoCanvas.height = img.height;

      const logoCtx = logoCanvas.getContext("2d");
      logoCtx.drawImage(img, 0, 0);

      logoImage = logoCanvas.toDataURL("image/png");
      resolve();
    };

    img.onerror = function () {
      console.log("Logo failed to load.");
      resolve();
    };

    img.src = logoPath;
  });
}

loadLogo();

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

async function createPdf(invoice) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF tool did not load. Refresh the page and try again.");
    return;
  }

  if (!logoImage) {
    await loadLogo();
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFillColor(0, 64, 115);
  doc.rect(0, 0, 210, 55, "F");

  if (logoImage) {
    try {
      doc.addImage(logoImage, "PNG", 6, 4, 72, 46);
    } catch (error) {
      console.log("Header logo could not be added.");
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.text("IronNest Pressure Washing", 82, 18);

  doc.setFontSize(10);
  doc.text("Professional Pressure Washing Services", 82, 29);
  doc.text("Palm Coast, Florida", 82, 39);

  // Invoice title
  doc.setFontSize(24);
  doc.setTextColor(0, 64, 115);
  doc.text("INVOICE", 20, 72);

  // Watermark
  if (logoImage) {
    try {
      doc.setGState(new doc.GState({ opacity: 0.035 }));
      doc.addImage(logoImage, "PNG", 30, 92, 150, 110);
      doc.setGState(new doc.GState({ opacity: 1 }));
    } catch (error) {
      console.log("Watermark logo could not be added.");
    }
  }

  // Customer section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text("Customer Information", 20, 90);

  doc.setDrawColor(0, 168, 232);
  doc.line(20, 95, 190, 95);

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Date:", 20, 109);
  doc.text("Customer:", 20, 121);
  doc.text("Address:", 20, 133);
  doc.text("Phone:", 20, 145);

  doc.setFont(undefined, "normal");
  doc.text(invoice.date || "", 48, 109);
  doc.text(invoice.customerName || "", 48, 121);
  doc.text(invoice.customerAddress || "", 48, 133);
  doc.text(invoice.customerPhone || "", 48, 145);

  // Service section
  doc.setFontSize(16);
  doc.text("Service Details", 20, 162);

  doc.setDrawColor(0, 168, 232);
  doc.line(20, 167, 190, 167);

  doc.setFontSize(11);
  doc.setTextColor(0, 64, 115);
  doc.setFont(undefined, "bold");
  doc.text("Description", 20, 179);
  doc.text("Amount", 160, 179);

  doc.setDrawColor(150, 150, 150);
  doc.line(20, 184, 190, 184);

  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");
  doc.setFontSize(12);

  const serviceLines = doc.splitTextToSize(invoice.serviceDescription || "", 125);
  doc.text(serviceLines, 20, 196);
  doc.text(`$${Number(invoice.price || 0).toFixed(2)}`, 160, 196);

  doc.setDrawColor(220, 220, 220);
  doc.line(20, 207, 190, 207);

  // Total box
  doc.setFillColor(0, 64, 115);
  doc.roundedRect(20, 218, 170, 26, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.setFont(undefined, "bold");
  doc.text(`Total Due: $${Number(invoice.price || 0).toFixed(2)}`, 26, 235);

  // Signature section
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text("Customer Authorization:", 20, 257);

  doc.setFont(undefined, "normal");

  try {
    doc.addImage(invoice.signature, "PNG", 20, 262, 70, 28);
  } catch (error) {
    console.log("Signature could not be added.");
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(20, 290, 105, 290);

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Customer Signature", 20, 295);

  // Invoice status card in lower-right
  const cardX = 135;
  const cardY = 254;
  const cardW = 55;
  const cardH = 34;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, "F");

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, "S");

  doc.setDrawColor(0, 168, 232);
  doc.setLineWidth(0.8);
  doc.line(cardX + 8, cardY + 8, cardX + 23, cardY + 8);
  doc.line(cardX + 32, cardY + 8, cardX + 47, cardY + 8);

  doc.setTextColor(0, 64, 115);
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text(`INV-${invoice.invoiceNumber}`, cardX + 13, cardY + 20);

  if ((invoice.paymentStatus || "").toUpperCase() === "PAID") {
    doc.setTextColor(0, 150, 0);
  } else {
    doc.setTextColor(200, 0, 0);
  }

  doc.setFontSize(12);
  doc.text(invoice.paymentStatus || "UNPAID", cardX + 18, cardY + 29);

  doc.setDrawColor(0, 168, 232);
  doc.setLineWidth(1.2);
  doc.line(cardX, cardY + cardH, cardX + 24, cardY + cardH);
  doc.line(cardX + 31, cardY + cardH, cardX + cardW, cardY + cardH);
  doc.line(cardX + 24, cardY + cardH, cardX + 27.5, cardY + cardH + 3);
  doc.line(cardX + 31, cardY + cardH, cardX + 27.5, cardY + cardH + 3);

  doc.setFont(undefined, "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Generated by IronNest Invoice System", 125, 296);

  const safeName = invoice.customerName
    ? invoice.customerName.replace(/[^a-z0-9]/gi, "_").toLowerCase()
    : "customer";

  doc.save(`IronNest-INV-${invoice.invoiceNumber}-${safeName}.pdf`);
}

document.getElementById("downloadPdf").addEventListener("click", () => {
  const invoice = getInvoiceFromForm();
  createPdf(invoice);
});

window.downloadSavedInvoice = function(index) {
  createPdf(invoices[index]);
};

renderInvoices();