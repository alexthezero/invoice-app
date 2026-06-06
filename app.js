document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("invoiceForm");
  const canvas = document.getElementById("signaturePad");
  const ctx = canvas.getContext("2d");
  const servicesContainer = document.getElementById("servicesContainer");
  const totalPreview = document.getElementById("totalPreview");

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
        logoCanvas.getContext("2d").drawImage(img, 0, 0);
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

    row.querySelector(".service-price").addEventListener("input", updateTotalPreview);
    row.querySelector(".service-description").addEventListener("input", updateTotalPreview);

    row.querySelector(".remove-service").addEventListener("click", () => {
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
    return services.reduce((sum, service) => {
      return sum + Number(service.price || 0);
    }, 0);
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

    const status = (invoice.paymentStatus || "UNPAID").toUpperCase();

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

    // Invoice badge
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(162, 8, 42, 22, 3, 3, "F");

    doc.setDrawColor(0, 168, 232);
    doc.setLineWidth(0.35);
    doc.roundedRect(162, 8, 42, 22, 3, 3, "S");

    doc.setTextColor(90, 90, 90);
    doc.setFont(undefined, "normal");
    doc.setFontSize(6.5);
    doc.text("Invoice #", 168, 15);

    doc.setTextColor(0, 64, 115);
    doc.setFont(undefined, "bold");
    doc.setFontSize(8.5);
    doc.text(`INV-${invoice.invoiceNumber}`, 168, 24);

    // Invoice title
    doc.setFontSize(24);
    doc.setTextColor(0, 64, 115);
    doc.setFont(undefined, "bold");
    doc.text("INVOICE", 20, 72);

    // Watermark
    if (logoImage) {
      try {
        doc.setGState(new doc.GState({ opacity: 0.015 }));
        doc.addImage(logoImage, "PNG", 30, 112, 150, 105);
        doc.setGState(new doc.GState({ opacity: 1 }));
      } catch (error) {
        console.log("Watermark logo could not be added.");
      }
    }

    // Service card
    const serviceCardX = 10;
    const serviceCardY = 85;
    const serviceCardW = 105;
    const serviceCardH = 70;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(serviceCardX, serviceCardY, serviceCardW, serviceCardH, 5, 5, "F");

    doc.setDrawColor(0, 120, 190);
    doc.setLineWidth(0.45);
    doc.roundedRect(serviceCardX, serviceCardY, serviceCardW, serviceCardH, 5, 5, "S");

    doc.setTextColor(0, 64, 115);
    doc.setFont(undefined, "bold");
    doc.setFontSize(13);
    doc.text("Service Details", serviceCardX + 5, serviceCardY + 11);

    doc.setFontSize(8);
    doc.text("Description", serviceCardX + 5, serviceCardY + 22);
    doc.text("Charge", serviceCardX + 78, serviceCardY + 22);

    doc.setDrawColor(210, 210, 210);
    doc.line(serviceCardX + 5, serviceCardY + 26, serviceCardX + 100, serviceCardY + 26);

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    let y = serviceCardY + 36;

    invoice.services.forEach((service) => {
      if (y > serviceCardY + 47) return;

      const lines = doc.splitTextToSize(service.description || "", 66);
      doc.text(lines, serviceCardX + 5, y);
      doc.text(`$${Number(service.price || 0).toFixed(2)}`, serviceCardX + 78, y);

      y += Math.max(6, lines.length * 4.5);
    });

    // Total row
    doc.setFillColor(0, 64, 115);
    doc.roundedRect(serviceCardX + 5, serviceCardY + 52, serviceCardW - 10, 13, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(7);
    doc.text("TOTAL DUE", serviceCardX + 9, serviceCardY + 57);

    doc.setFontSize(11);
    doc.text(`$${Number(invoice.total || 0).toFixed(2)}`, serviceCardX + 9, serviceCardY + 63);

    if (status === "PAID") {
      doc.setFillColor(0, 145, 65);
    } else {
      doc.setFillColor(190, 0, 0);
    }

    doc.roundedRect(serviceCardX + 72, serviceCardY + 55, 28, 8, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.8);

    if (status === "PAID") {
      doc.text(status, serviceCardX + 80, serviceCardY + 60.5);
    } else {
      doc.text(status, serviceCardX + 76, serviceCardY + 60.5);
    }

    // Customer card
    const customerCardX = 122;
    const customerCardY = 85;
    const customerCardW = 78;
    const customerCardH = 70;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(customerCardX, customerCardY, customerCardW, customerCardH, 5, 5, "F");

    doc.setDrawColor(0, 120, 190);
    doc.setLineWidth(0.45);
    doc.roundedRect(customerCardX, customerCardY, customerCardW, customerCardH, 5, 5, "S");

    doc.setTextColor(0, 64, 115);
    doc.setFont(undefined, "bold");
    doc.setFontSize(13);
    doc.text("Customer Details", customerCardX + 5, customerCardY + 11);

    doc.setTextColor(90, 90, 90);
    doc.setFont(undefined, "bold");
    doc.setFontSize(7);
    doc.text("Name", customerCardX + 5, customerCardY + 24);
    doc.text("Address", customerCardX + 5, customerCardY + 36);
    doc.text("Phone", customerCardX + 5, customerCardY + 48);
    doc.text("Date", customerCardX + 5, customerCardY + 60);

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8.2);
    doc.text(doc.splitTextToSize(invoice.customerName || "", 43), customerCardX + 29, customerCardY + 24);
    doc.text(doc.splitTextToSize(invoice.customerAddress || "", 41), customerCardX + 29, customerCardY + 36);
    doc.text(invoice.customerPhone || "", customerCardX + 29, customerCardY + 48);
    doc.text(invoice.date || "", customerCardX + 29, customerCardY + 60);

    // Signature section
    const signatureY = 185;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("Customer Authorization:", 20, signatureY);

    try {
      doc.addImage(invoice.signature, "PNG", 20, signatureY + 7, 80, 32);
    } catch (error) {
      console.log("Signature could not be added.");
    }

    doc.setDrawColor(0, 0, 0);
    doc.line(20, signatureY + 43, 105, signatureY + 43);

    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Customer Signature", 20, signatureY + 49);

    doc.text("Generated by IronNest Invoice System", 20, 286);

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

  addServiceRow();
  renderInvoices();
});