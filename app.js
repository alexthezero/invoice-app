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

    // Summary cards
    const cardY = 82;
    const leftX = 20;
    const rightX = 110;
    const cardH = 50;

    doc.setFillColor(0, 64, 115);
    doc.roundedRect(leftX, cardY, 80, cardH, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("TOTAL DUE", leftX + 6, cardY + 10);

    doc.setFontSize(20);
    doc.text(`$${Number(invoice.total || 0).toFixed(2)}`, leftX + 6, cardY + 28);

    doc.setFontSize(9);
    doc.text(`INV-${invoice.invoiceNumber}`, leftX + 6, cardY + 41);

    if ((invoice.paymentStatus || "").toUpperCase() === "PAID") {
      doc.setTextColor(60, 255, 120);
    } else {
      doc.setTextColor(255, 110, 110);
    }

    doc.text(invoice.paymentStatus || "UNPAID", leftX + 42, cardY + 41);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(rightX, cardY, 80, cardH, 3, 3, "F");

    doc.setDrawColor(0, 168, 232);
    doc.setLineWidth(0.6);
    doc.roundedRect(rightX, cardY, 80, cardH, 3, 3, "S");

    doc.setTextColor(0, 64, 115);
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("CUSTOMER", rightX + 6, cardY + 10);

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    const nameLines = doc.splitTextToSize(invoice.customerName || "", 65);
    const addressLines = doc.splitTextToSize(invoice.customerAddress || "", 65);

    doc.text(nameLines, rightX + 6, cardY + 20);
    doc.text(addressLines, rightX + 6, cardY + 29);
    doc.text(invoice.customerPhone || "", rightX + 6, cardY + 38);
    doc.text(invoice.date || "", rightX + 6, cardY + 46);

    // Watermark
    if (logoImage) {
      try {
        doc.setGState(new doc.GState({ opacity: 0.01 }));
        doc.addImage(logoImage, "PNG", 30, 112, 150, 110);
        doc.setGState(new doc.GState({ opacity: 1 }));
      } catch (error) {
        console.log("Watermark logo could not be added.");
      }
    }

    // Services
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(16);
    doc.text("Service Details", 20, 150);

    doc.setDrawColor(0, 168, 232);
    doc.line(20, 155, 190, 155);

    doc.setFontSize(11);
    doc.setTextColor(0, 64, 115);
    doc.setFont(undefined, "bold");
    doc.text("Description", 20, 168);
    doc.text("Amount", 160, 168);

    doc.setDrawColor(150, 150, 150);
    doc.line(20, 173, 190, 173);

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(12);

    let y = 185;

    invoice.services.forEach((service) => {
      const serviceLines = doc.splitTextToSize(service.description || "", 125);

      doc.text(serviceLines, 20, y);
      doc.text(`$${Number(service.price || 0).toFixed(2)}`, 160, y);

      y += Math.max(8, serviceLines.length * 5 + 3);
    });

    doc.setDrawColor(220, 220, 220);
    doc.line(20, y + 2, 190, y + 2);

    // Authorization
    const signatureY = Math.min(245, Math.max(220, y + 18));

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("Customer Authorization:", 20, signatureY);

    doc.setFont(undefined, "normal");

    try {
      doc.addImage(invoice.signature, "PNG", 20, signatureY + 4, 75, 28);
    } catch (error) {
      console.log("Signature could not be added.");
    }

    doc.setDrawColor(0, 0, 0);
    doc.line(20, signatureY + 34, 105, signatureY + 34);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Customer Signature", 20, signatureY + 40);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Generated by IronNest Invoice System", 20, 290);

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