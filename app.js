document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("invoiceForm");
  const canvas = document.getElementById("signaturePad");
  const ctx = canvas.getContext("2d");
  const servicesContainer = document.getElementById("servicesContainer");
  const totalPreview = document.getElementById("totalPreview");

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

  document.getElementById("clearSignature").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupCanvas();
  });

  function addServiceRow(description = "", price = "") {
    const row = document.createElement("div");
    row.className = "service-row";

    row.innerHTML = `
      <textarea class="service-description" placeholder="Service Description" required>${description}</textarea>
      <input class="service-price" type="number" step="0.01" placeholder="Price" value="${price}" required />
      <button type="button" class="remove-service">Remove Service</button>
    `;

    servicesContainer.appendChild(row);

    const priceInput = row.querySelector(".service-price");
    const descInput = row.querySelector(".service-description");
    const removeButton = row.querySelector(".remove-service");

    priceInput.addEventListener("input", updateTotalPreview);
    descInput.addEventListener("input", updateTotalPreview);

    removeButton.addEventListener("click", () => {
      if (document.querySelectorAll(".service-row").length === 1) {
        alert("At least one service is required.");
        return;
      }

      row.remove();
      updateTotalPreview();
    });

    updateTotalPreview();
  }

  document.getElementById("addServiceButton").addEventListener("click", () => {
    addServiceRow();
  });

  function getServicesFromForm() {
    const rows = document.querySelectorAll(".service-row");
    const services = [];

    rows.forEach((row) => {
      const description = row.querySelector(".service-description").value.trim();
      const price = Number(row.querySelector(".service-price").value || 0);

      if (description || price > 0) {
        services.push({ description, price });
      }
    });

    return services;
  }

  function calculateTotal(services) {
    return services.reduce((sum, service) => sum + Number(service.price || 0), 0);
  }

  function updateTotalPreview() {
    const services = getServicesFromForm();
    totalPreview.textContent = calculateTotal(services).toFixed(2);
  }

  function getNextInvoiceNumber() {
    const lastNumber = Number(localStorage.getItem("lastInvoiceNumber")) || 1000;
    const nextNumber = lastNumber + 1;
    localStorage.setItem("lastInvoiceNumber", nextNumber);
    return nextNumber;
  }

  function getInvoiceFromForm(existingNumber = null) {
    const services = getServicesFromForm();

    return {
      invoiceNumber: existingNumber || getNextInvoiceNumber(),
      customerName: document.getElementById("customerName").value,
      customerAddress: document.getElementById("customerAddress").value,
      customerPhone: document.getElementById("customerPhone").value,
      date: document.getElementById("invoiceDate").value,
      services,
      total: calculateTotal(services),
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
        $${Number(invoice.total || 0).toFixed(2)} - ${invoice.paymentStatus || "UNPAID"}<br><br>
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
    document.getElementById("paymentStatus").value = invoice.paymentStatus || "UNPAID";

    servicesContainer.innerHTML = "";

    if (invoice.services && invoice.services.length > 0) {
      invoice.services.forEach((service) => {
        addServiceRow(service.description, service.price);
      });
    } else {
      addServiceRow();
    }

    updateTotalPreview();
    alert("Invoice loaded.");
  };

  window.deleteInvoice = function(index) {
    if (!confirm("Delete this invoice?")) return;
    invoices.splice(index, 1);
    localStorage.setItem("invoices", JSON.stringify(invoices));
    renderInvoices();
  };

  function createPdf(invoice) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text("IronNest Pressure Washing", 20, 20);

    doc.setFontSize(16);
    doc.text(`Invoice #${invoice.invoiceNumber}`, 20, 35);

    doc.setFontSize(12);
    doc.text(`Date: ${invoice.date}`, 20, 50);
    doc.text(`Customer: ${invoice.customerName}`, 20, 60);
    doc.text(`Address: ${invoice.customerAddress}`, 20, 70);
    doc.text(`Phone: ${invoice.customerPhone}`, 20, 80);

    doc.line(20, 90, 190, 90);

    doc.text("Services:", 20, 105);

    let y = 118;

    invoice.services.forEach((service) => {
      doc.text(service.description || "", 20, y);
      doc.text(`$${Number(service.price || 0).toFixed(2)}`, 160, y);
      y += 10;
    });

    doc.setFontSize(16);
    doc.text(`Total Due: $${Number(invoice.total || 0).toFixed(2)}`, 20, y + 15);

    doc.setFontSize(12);
    doc.text(`Status: ${invoice.paymentStatus}`, 20, y + 30);

    try {
      doc.text("Customer Signature:", 20, y + 50);
      doc.addImage(invoice.signature, "PNG", 20, y + 55, 80, 35);
    } catch (error) {}

    const safeName = invoice.customerName
      ? invoice.customerName.replace(/[^a-z0-9]/gi, "_").toLowerCase()
      : "customer";

    doc.save(`IronNest-INV-${invoice.invoiceNumber}-${safeName}.pdf`);
  }

  document.getElementById("downloadPdf").addEventListener("click", () => {
    const invoice = getInvoiceFromForm();

    if (invoice.services.length === 0) {
      alert("Please add at least one service.");
      return;
    }

    createPdf(invoice);
  });

  window.downloadSavedInvoice = function(index) {
    createPdf(invoices[index]);
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const invoice = getInvoiceFromForm();

    if (invoice.services.length === 0) {
      alert("Please add at least one service.");
      return;
    }

    invoices.push(invoice);
    localStorage.setItem("invoices", JSON.stringify(invoices));
    renderInvoices();

    alert("Invoice saved locally on this device.");
  });

  addServiceRow();
  renderInvoices();
});