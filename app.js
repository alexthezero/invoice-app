const form = document.getElementById("invoiceForm");
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");

const invoiceDate = document.getElementById("invoiceDate");
invoiceDate.valueAsDate = new Date();

let drawing = false;
let invoices = JSON.parse(localStorage.getItem("invoices")) || [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function getPosition(e) {
  const rect = canvas.getBoundingClientRect();

  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }

  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
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
  e.preventDefault();
  drawing = false;
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

canvas.addEventListener("touchstart", startDrawing);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("touchend", stopDrawing);

document.getElementById("clearSignature").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function updatePreview(invoice) {
  document.getElementById("previewCompany").textContent = invoice.companyName;
  document.getElementById("previewDate").textContent = invoice.date;
  document.getElementById("previewCustomer").textContent = invoice.customerName;
  document.getElementById("previewAddress").textContent = invoice.customerAddress;
  document.getElementById("previewPhone").textContent = invoice.customerPhone;
  document.getElementById("previewService").textContent = invoice.serviceDescription;
  document.getElementById("previewPrice").textContent = Number(invoice.price).toFixed(2);
  document.getElementById("previewSignature").src = invoice.signature;
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
      $${Number(invoice.price).toFixed(2)}<br><br>
      <button onclick="loadInvoice(${index})">View</button>
      <button onclick="deleteInvoice(${index})">Delete</button>
    `;
    list.appendChild(div);
  });
}

window.loadInvoice = function(index) {
  updatePreview(invoices[index]);
};

window.deleteInvoice = function(index) {
  if (!confirm("Delete this invoice?")) return;
  invoices.splice(index, 1);
  localStorage.setItem("invoices", JSON.stringify(invoices));
  renderInvoices();
};

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const invoice = {
    companyName: document.getElementById("companyName").value,
    customerName: document.getElementById("customerName").value,
    customerAddress: document.getElementById("customerAddress").value,
    customerPhone: document.getElementById("customerPhone").value,
    date: document.getElementById("invoiceDate").value,
    serviceDescription: document.getElementById("serviceDescription").value,
    price: document.getElementById("price").value,
    signature: canvas.toDataURL()
  };

  invoices.push(invoice);
  localStorage.setItem("invoices", JSON.stringify(invoices));

  updatePreview(invoice);
  renderInvoices();

  alert("Invoice saved locally on this device.");
});

document.getElementById("downloadPdf").addEventListener("click", () => {
  const preview = document.getElementById("invoicePreview");

  const options = {
    margin: 0.5,
    filename: "invoice.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
  };

  html2pdf().set(options).from(preview).save();
});

renderInvoices();