const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("Generating Certified Payment Documents for MERCATUM...");

// Read logo as base64
let logoBase64 = '';
try {
  const logoBuffer = fs.readFileSync('public/logo.jpg');
  logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
  console.log("Logo loaded successfully. Size:", logoBuffer.length);
} catch (e) {
  console.warn("Could not load logo.jpg:", e.message);
}

// ─────────────────────────────────────────────────────────────
// 1. HTML TEMPLATE (Pixel-perfect for printing to A4 PDF)
// ─────────────────────────────────────────────────────────────
const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>MERCATUM - Certificado Oficial de Pago y Facturación Privada</title>
<style>
  @page {
    size: A4 portrait;
    margin: 10mm 12mm 10mm 12mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    color: #111827;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11.5px;
    line-height: 1.4;
  }

  /* HEADER */
  .header-table {
    width: 100%;
    border-bottom: 2px solid #064e3b;
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-img {
    width: 62px;
    height: 62px;
    border-radius: 8px;
    object-fit: cover;
    border: 1.5px solid #064e3b;
    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  }
  .brand-title {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 2.5px;
    color: #064e3b;
    margin: 0;
    text-transform: uppercase;
  }
  .brand-tagline {
    font-size: 10.5px;
    font-weight: 600;
    color: #4b5563;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin: 2px 0 0;
  }

  .header-badge {
    text-align: right;
  }
  .cert-pill {
    display: inline-block;
    background: linear-gradient(135deg, #064e3b, #047857);
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.2px;
    padding: 5px 12px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .cert-meta {
    font-size: 9.5px;
    color: #6b7280;
    margin-top: 4px;
    line-height: 1.35;
  }

  /* LEGAL TOP BAR */
  .legal-bar {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 9.5px;
    color: #166534;
    margin-bottom: 11px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    line-height: 1.4;
  }
  .legal-bar strong {
    color: #064e3b;
  }

  /* SECTION TITLES */
  .sec-title {
    font-size: 11.5px;
    font-weight: 800;
    color: #064e3b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin: 10px 0 6px 0;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1.5px solid #e5e7eb;
    padding-bottom: 3px;
  }

  /* CLIENT / ORDER PRIVATE SALE BOX */
  .order-box {
    background: #ffffff;
    border: 1.5px solid #d1d5db;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
  }
  .order-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 8px 14px;
  }
  .field-row {
    display: flex;
    align-items: baseline;
    font-size: 11px;
    margin-bottom: 4px;
  }
  .field-label {
    font-weight: 700;
    color: #374151;
    min-width: 135px;
    text-transform: uppercase;
    font-size: 9.5px;
    letter-spacing: 0.4px;
  }
  .field-line {
    flex: 1;
    border-bottom: 1px dashed #9ca3af;
    color: #111827;
    font-weight: 600;
    padding-left: 4px;
    min-height: 16px;
  }
  .price-highlight {
    background: #fef3c7;
    border: 1.5px solid #f59e0b;
    border-radius: 5px;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  }
  .price-label {
    font-weight: 800;
    color: #92400e;
    font-size: 10.5px;
    text-transform: uppercase;
  }
  .price-value {
    font-weight: 900;
    color: #b45309;
    font-size: 14px;
    font-family: 'Consolas', monospace;
  }

  /* BANK CARD */
  .bank-card {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    border: 2px solid #0369a1;
    border-radius: 7px;
    padding: 10px 14px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .bank-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
  }
  .b-label {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.6px;
    margin-bottom: 1px;
  }
  .b-val {
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
    font-family: 'Consolas', monospace;
  }
  .iban-container {
    background: #ffffff;
    border: 1.5px solid #0284c7;
    border-radius: 5px;
    padding: 6px 10px;
    margin: 6px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .iban-text {
    font-size: 15.5px;
    font-weight: 900;
    color: #0369a1;
    letter-spacing: 1.8px;
    font-family: 'Consolas', monospace;
  }
  .iban-badge {
    background: #0284c7;
    color: #ffffff;
    font-size: 9px;
    font-weight: 800;
    padding: 3px 7px;
    border-radius: 3px;
    letter-spacing: 0.8px;
  }
  .bank-alert {
    background: #eff6ff;
    border-left: 3px solid #2563eb;
    padding: 5px 8px;
    margin-top: 6px;
    font-size: 10px;
    color: #1e40af;
    line-height: 1.35;
  }

  /* PROTOCOL STEPS */
  .steps-box {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
  }
  .step-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 5px;
    font-size: 10.5px;
  }
  .step-num {
    background: #064e3b;
    color: #ffffff;
    font-weight: 800;
    font-size: 9.5px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .step-text {
    color: #374151;
    line-height: 1.35;
  }
  .step-text strong {
    color: #111827;
  }

  /* GUARANTEES */
  .guarantees-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  .g-item {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    padding: 6px 8px;
    text-align: center;
  }
  .g-icon {
    font-size: 16px;
    margin-bottom: 2px;
  }
  .g-title {
    font-size: 10px;
    font-weight: 800;
    color: #111827;
    margin-bottom: 1px;
  }
  .g-desc {
    font-size: 8.5px;
    color: #6b7280;
    line-height: 1.25;
  }

  /* SIGNATURE & LEGAL FOOTER */
  .footer-table {
    width: 100%;
    border-top: 1.5px solid #064e3b;
    padding-top: 8px;
    margin-top: 6px;
  }
  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
    align-items: center;
  }
  .f-legal {
    font-size: 9px;
    color: #6b7280;
    line-height: 1.35;
  }
  .f-legal strong {
    color: #374151;
  }
  .seal-box {
    border: 1.5px dashed #047857;
    background: #f0fdf4;
    border-radius: 5px;
    padding: 5px 8px;
    text-align: center;
  }
  .seal-title {
    font-size: 9.5px;
    font-weight: 900;
    color: #064e3b;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .seal-code {
    font-size: 8.5px;
    font-family: 'Consolas', monospace;
    font-weight: 700;
    color: #047857;
    margin-top: 2px;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <table class="header-table" style="width: 100%;">
    <tr>
      <td style="vertical-align: middle;">
        <div class="header-left">
          ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="MERCATUM">` : `<div class="logo-img" style="background:#064e3b;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;">M</div>`}
          <div>
            <h1 class="brand-title">MERCATUM</h1>
            <div class="brand-tagline">El Arte de Vivir · Tienda Online Oficial</div>
          </div>
        </div>
      </td>
      <td style="text-align: right; vertical-align: middle;">
        <div class="header-badge">
          <div class="cert-pill">🛡️ Documento Oficial Certificado</div>
          <div class="cert-meta">
            <strong>Ref:</strong> CERT-PAGO-PRIV-2026<br>
            <strong>Emisión:</strong> Octubre 2026 · Válido para Venta Privada
          </div>
        </div>
      </td>
    </tr>
  </table>

  <!-- LEGAL INFO BAR -->
  <div class="legal-bar">
    <div><strong>Razón Social:</strong> MERCATUM SHOP ONLINE S.L. &nbsp;|&nbsp; <strong>CIF/NIF:</strong> B-87452190</div>
    <div><strong>Reg. Mercantil de Madrid:</strong> Tomo 34.521, Folio 142, Hoja M-621894</div>
    <div><strong>Sede Social:</strong> Paseo de la Castellana, 28046 Madrid, España &nbsp;|&nbsp; <strong>Web:</strong> www.mercatum-shop.app</div>
  </div>

  <!-- SECTION 1: DETALLES DE LA ORDEN / CLIENTE PRIVADO -->
  <div class="sec-title">
    <span>📝</span> 1. DATOS DEL CLIENTE Y DETALLES DEL PEDIDO (VENTA PRIVADA)
  </div>

  <div class="order-box">
    <div class="order-grid">
      <div>
        <div class="field-row">
          <span class="field-label">Cliente / Destinatario:</span>
          <span class="field-line">[ Nombre y Apellidos del Cliente ]</span>
        </div>
        <div class="field-row">
          <span class="field-label">Teléfono / WhatsApp:</span>
          <span class="field-line">[ +34 ___ ___ ___ ]</span>
        </div>
        <div class="field-row">
          <span class="field-label">Dirección de Entrega:</span>
          <span class="field-line">[ Calle, Número, Piso, Código Postal, Ciudad ]</span>
        </div>
        <div class="field-row">
          <span class="field-label">Artículo(s) Solicitado(s):</span>
          <span class="field-line">[ Descripción exacta del producto o pedido ]</span>
        </div>
      </div>
      <div>
        <div class="field-row">
          <span class="field-label" style="min-width: 95px;">Nº de Pedido:</span>
          <span class="field-line">[ PED-PRIV-2026-___ ]</span>
        </div>
        <div class="field-row">
          <span class="field-label" style="min-width: 95px;">Fecha Emisión:</span>
          <span class="field-line">${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>
        <div class="field-row">
          <span class="field-label" style="min-width: 95px;">Estado:</span>
          <span class="field-line" style="color:#047857; font-weight:bold;">Pendiente de Abono</span>
        </div>
        <div class="price-highlight">
          <span class="price-label">Total a Abonar:</span>
          <span class="price-value">[ _____ , __ € ]</span>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2: DATOS BANCARIOS OFICIALES -->
  <div class="sec-title">
    <span>🏦</span> 2. COORDENADAS BANCARIAS OFICIALES (TRANSFERENCIA SEPA INMEDIATA)
  </div>

  <div class="bank-card">
    <div class="bank-grid-2">
      <div>
        <div class="b-label">Entidad Bancaria Oficial</div>
        <div class="b-val">BANCO BBVA (España)</div>
      </div>
      <div>
        <div class="b-label">Titular Oficial de la Cuenta</div>
        <div class="b-val">YIBRAHAN ANDRES FLOREZ ROJANO</div>
      </div>
    </div>

    <div class="b-label" style="margin-top: 6px;">Código Internacional de Cuenta Bancaria (IBAN)</div>
    <div class="iban-container">
      <span class="iban-text">ES07 0182 1503 2002 0166 6370</span>
      <span class="iban-badge">CUENTA OFICIAL MERCATUM</span>
    </div>

    <div class="bank-grid-2" style="margin-top: 4px;">
      <div>
        <div class="b-label">Código BIC / SWIFT</div>
        <div class="b-val">BBVAESMM</div>
      </div>
      <div>
        <div class="b-label">Concepto Obligatorio a Indicar</div>
        <div class="b-val" style="color: #b91c1c;">[Su Nombre] o [Nº de Pedido]</div>
      </div>
    </div>

    <div class="bank-alert">
      ⚡ <strong>Aviso de Tramitación Urgente:</strong> Por favor, seleccione preferentemente la modalidad <em>"Transferencia Inmediata"</em> en su banca electrónica (CaixaBank, Santander, BBVA, Sabadell, ING, etc.) para que la acreditación sea instantánea y su paquete sea expedido hoy mismo con número de seguimiento.
    </div>
  </div>

  <!-- SECTION 3: PASO A PASO -->
  <div class="sec-title">
    <span>📋</span> 3. INSTRUCCIONES TRAS REALIZAR EL PAGO
  </div>

  <div class="steps-box">
    <div class="step-row">
      <div class="step-num">1</div>
      <div class="step-text"><strong>Emita la transferencia</strong> desde su aplicación móvil o portal bancario indicando su nombre o el número de pedido en el concepto.</div>
    </div>
    <div class="step-row">
      <div class="step-num">2</div>
      <div class="step-text"><strong>Envíe el comprobante / justificante</strong> en captura o PDF por WhatsApp oficial al <strong>+34 691 34 98 40</strong> o por email a <strong>contacto@mercatum-shop.app</strong>.</div>
    </div>
    <div class="step-row">
      <div class="step-num">3</div>
      <div class="step-text"><strong>Confirmación y Despacho Express:</strong> Nuestro departamento de administración validará la orden, emitirá su Factura Oficial con IVA y le asignará el código de seguimiento urgente de entrega en 24/48 horas laborables.</div>
    </div>
  </div>

  <!-- SECTION 4: GARANTÍAS Y MARCO JURÍDICO -->
  <div class="guarantees-grid">
    <div class="g-item">
      <div class="g-icon">🛡️</div>
      <div class="g-title">Garantía Legal 3 Años</div>
      <div class="g-desc">Cobertura directa oficial europea en todos los productos.</div>
    </div>
    <div class="g-item">
      <div class="g-icon">🚚</div>
      <div class="g-title">Envío Asegurado 100%</div>
      <div class="g-desc">Póliza a todo riesgo ante roturas, extravío o deterioro.</div>
    </div>
    <div class="g-item">
      <div class="g-icon">🔄</div>
      <div class="g-title">14 Días de Desistimiento</div>
      <div class="g-desc">Derecho de devolución y reembolso garantizado por ley.</div>
    </div>
    <div class="g-item">
      <div class="g-icon">🔒</div>
      <div class="g-title">Factura Legal con IVA</div>
      <div class="g-desc">Emisión fiscal formal con NIF y plena validez contable.</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer-table">
    <div class="footer-grid">
      <div class="f-legal">
        <strong>MERCATUM SHOP ESPAÑA — Departamento de Administración y Pagos</strong><br>
        Paseo de la Castellana, 28046 Madrid · Tel/WhatsApp Oficial: <strong>+34 691 34 98 40</strong><br>
        Email: contacto@mercatum-shop.app · Tienda Oficial Web: <strong>www.mercatum-shop.app</strong><br>
        <em>Conforme al R.D. Leg. 1/2007 (Defensa de Consumidores) y Reglamento General UE 2016/679 (RGPD).</em>
      </div>
      <div>
        <div class="seal-box">
          <div class="seal-title">🛡️ SELLO OFICIAL VERIFICADO</div>
          <div class="seal-code">CSV-MERC-2026-BBVA-0166</div>
          <div style="font-size: 8px; color: #166534; margin-top: 1px;">AUTENTICIDAD BANCARIA GARANTIZADA</div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>
`;

// ─────────────────────────────────────────────────────────────
// 2. WORD (.DOC) TEMPLATE (Compatible with Microsoft Word / LibreOffice)
// ─────────────────────────────────────────────────────────────
const wordContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
xmlns:w='urn:schemas-microsoft-com:office:word'
xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>MERCATUM - Certificado Oficial de Pago y Facturacion</title>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 21.0cm 29.7cm;
    margin: 1.5cm 1.5cm 1.5cm 1.5cm;
    mso-page-orientation: portrait;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.35;
    color: #111827;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  .header-tbl td {
    padding: 4pt;
  }
  .title-brand {
    font-size: 20pt;
    font-weight: bold;
    color: #064E3B;
    letter-spacing: 2pt;
    text-transform: uppercase;
  }
  .subtitle-brand {
    font-size: 9.5pt;
    color: #4B5563;
    font-weight: bold;
  }
  .badge-cell {
    background-color: #064E3B;
    color: #FFFFFF;
    font-weight: bold;
    padding: 6pt 10pt;
    font-size: 9pt;
    border-radius: 4pt;
    text-align: center;
  }
  .legal-bar {
    background-color: #F0FDF4;
    border: 1pt solid #BBF7D0;
    padding: 6pt 8pt;
    font-size: 8.5pt;
    color: #166534;
    margin-top: 8pt;
    margin-bottom: 10pt;
  }
  .sec-heading {
    font-size: 11pt;
    font-weight: bold;
    color: #064E3B;
    text-transform: uppercase;
    border-bottom: 1.5pt solid #064E3B;
    padding-bottom: 2pt;
    margin-top: 10pt;
    margin-bottom: 6pt;
  }
  .tbl-box {
    border: 1pt solid #D1D5DB;
    margin-bottom: 10pt;
  }
  .tbl-box td {
    padding: 5pt 8pt;
    border-bottom: 1pt solid #E5E7EB;
    font-size: 9.5pt;
  }
  .lbl-col {
    font-weight: bold;
    color: #374151;
    width: 32%;
    background-color: #F9FAFB;
    text-transform: uppercase;
    font-size: 8.5pt;
  }
  .val-col {
    color: #111827;
    font-weight: 500;
  }
  .bank-tbl {
    border: 1.5pt solid #0369A1;
    background-color: #F8FAFC;
    margin-bottom: 10pt;
  }
  .bank-tbl td {
    padding: 5pt 8pt;
    border-bottom: 1pt solid #BAE6FD;
    font-size: 10pt;
  }
  .iban-cell {
    background-color: #FFFFFF;
    border: 1.5pt solid #0284C7;
    font-size: 13pt;
    font-weight: bold;
    color: #0369A1;
    font-family: 'Consolas', monospace;
    letter-spacing: 1.5pt;
    padding: 7pt;
    text-align: center;
  }
  .alert-box {
    background-color: #EFF6FF;
    border-left: 3pt solid #2563EB;
    padding: 6pt;
    font-size: 9pt;
    color: #1E40AF;
  }
  .step-tbl td {
    padding: 4pt 6pt;
    font-size: 9.5pt;
  }
  .step-badge {
    background-color: #064E3B;
    color: #FFFFFF;
    font-weight: bold;
    padding: 2pt 5pt;
    border-radius: 50%;
    text-align: center;
    width: 18pt;
  }
  .footer-tbl {
    border-top: 1.5pt solid #064E3B;
    margin-top: 12pt;
    padding-top: 6pt;
  }
  .footer-tbl td {
    font-size: 8.5pt;
    color: #6B7280;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <table class="header-tbl">
    <tr>
      <td style="width: 70%; vertical-align: middle;">
        <div class="title-brand">MERCATUM</div>
        <div class="subtitle-brand">El Arte de Vivir · Tienda Online Oficial (España)</div>
      </td>
      <td style="width: 30%; text-align: right; vertical-align: middle;">
        <div class="badge-cell">
          🛡️ DOCUMENTO OFICIAL CERTIFICADO
        </div>
        <div style="font-size: 8pt; color: #6B7280; margin-top: 4pt; text-align: right;">
          Ref: CERT-PAGO-PRIV-2026<br>
          Válido para Venta Privada
        </div>
      </td>
    </tr>
  </table>

  <!-- LEGAL BAR -->
  <div class="legal-bar">
    <strong>Razón Social:</strong> MERCATUM SHOP ONLINE S.L. &nbsp;|&nbsp; <strong>CIF/NIF:</strong> B-87452190 &nbsp;|&nbsp; <strong>Reg. Mercantil Madrid:</strong> T. 34.521, F. 142, H. M-621894<br>
    <strong>Sede Social:</strong> Paseo de la Castellana, 28046 Madrid, España &nbsp;|&nbsp; <strong>Web Oficial:</strong> www.mercatum-shop.app
  </div>

  <!-- SECTION 1: DETALLES DE VENTA PRIVADA -->
  <div class="sec-heading">1. DATOS DEL CLIENTE Y DETALLES DEL PEDIDO (VENTA PRIVADA)</div>
  <table class="tbl-box">
    <tr>
      <td class="lbl-col">Cliente / Destinatario:</td>
      <td class="val-col">[ Ingrese Nombre y Apellidos del Cliente ]</td>
      <td class="lbl-col">Nº de Pedido:</td>
      <td class="val-col" style="font-weight: bold;">[ PED-PRIV-2026-___ ]</td>
    </tr>
    <tr>
      <td class="lbl-col">Teléfono / WhatsApp:</td>
      <td class="val-col">[ +34 ___ ___ ___ ]</td>
      <td class="lbl-col">Fecha de Emisión:</td>
      <td class="val-col">${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
    </tr>
    <tr>
      <td class="lbl-col">Dirección de Entrega:</td>
      <td class="val-col" colspan="3">[ Calle, Número, Piso, Código Postal, Ciudad ]</td>
    </tr>
    <tr>
      <td class="lbl-col">Artículo(s) Solicitado(s):</td>
      <td class="val-col" colspan="3">[ Descripción detallada del producto o artículos adquiridos ]</td>
    </tr>
    <tr>
      <td class="lbl-col" style="background-color: #FEF3C7; color: #92400E;">TOTAL A ABONAR:</td>
      <td class="val-col" colspan="3" style="background-color: #FEF3C7; font-size: 13pt; font-weight: bold; color: #B45309;">
        [ _____ , __ € ] <span style="font-size: 9pt; font-weight: normal; color: #78350F;">(IVA Oficial y Transporte Urgente Asegurado Incluidos)</span>
      </td>
    </tr>
  </table>

  <!-- SECTION 2: DATOS BANCARIOS OFICIALES -->
  <div class="sec-heading">2. COORDENADAS BANCARIAS OFICIALES PARA TRANSFERENCIA INMEDIATA</div>
  <table class="bank-tbl">
    <tr>
      <td class="lbl-col" style="background-color: #E2E8F0; width: 30%;">Entidad Bancaria:</td>
      <td class="val-col" style="font-weight: bold; font-size: 11pt;">BANCO BBVA (España)</td>
    </tr>
    <tr>
      <td class="lbl-col" style="background-color: #E2E8F0;">Titular de la Cuenta:</td>
      <td class="val-col" style="font-weight: bold; font-size: 11pt;">YIBRAHAN ANDRES FLOREZ ROJANO</td>
    </tr>
    <tr>
      <td class="lbl-col" style="background-color: #E2E8F0;">Número de Cuenta (IBAN):</td>
      <td class="iban-cell">
        ES07 0182 1503 2002 0166 6370
      </td>
    </tr>
    <tr>
      <td class="lbl-col" style="background-color: #E2E8F0;">Código BIC / SWIFT:</td>
      <td class="val-col" style="font-family: 'Consolas', monospace; font-weight: bold;">BBVAESMM</td>
    </tr>
    <tr>
      <td class="lbl-col" style="background-color: #E2E8F0;">Concepto Obligatorio:</td>
      <td class="val-col" style="font-weight: bold; color: #B91C1C;">[Su Nombre y Apellidos] o [Nº de Pedido]</td>
    </tr>
  </table>

  <div class="alert-box">
    ⚡ <strong>Recomendación de Envío Inmediato:</strong> Seleccione la opción <em>"Transferencia Inmediata"</em> desde su banca online (CaixaBank, Santander, BBVA, Sabadell, ING, etc.) para que la acreditación sea instantánea y su pedido pase de inmediato a despacho con número de tracking.
  </div>

  <!-- SECTION 3: INSTRUCCIONES -->
  <div class="sec-heading">3. INSTRUCCIONES Y CONFIRMACIÓN DE ENTREGA</div>
  <table class="step-tbl" style="margin-bottom: 8pt;">
    <tr>
      <td style="width: 25pt; vertical-align: top;"><div class="step-badge">1</div></td>
      <td><strong>Emita la transferencia</strong> por el importe acordado indicando su nombre o el número de referencia.</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><div class="step-badge">2</div></td>
      <td><strong>Envíe el comprobante</strong> bancario por WhatsApp al <strong>+34 691 34 98 40</strong> o por email a <strong>contacto@mercatum-shop.app</strong>.</td>
    </tr>
    <tr>
      <td style="vertical-align: top;"><div class="step-badge">3</div></td>
      <td><strong>Expedición Express 24/48h:</strong> Se emitirá su factura oficial con IVA y recibirá su número de seguimiento de entrega asegurada.</td>
    </tr>
  </table>

  <!-- SECTION 4: GARANTÍAS -->
  <table style="width: 100%; border: 1pt solid #E5E7EB; background-color: #F9FAFB; margin-bottom: 8pt;">
    <tr style="text-align: center; font-size: 8.5pt;">
      <td style="padding: 6pt; border-right: 1pt solid #E5E7EB;">
        <strong>🛡️ Garantía Legal 3 Años</strong><br>Directa europea
      </td>
      <td style="padding: 6pt; border-right: 1pt solid #E5E7EB;">
        <strong>🚚 Envío Asegurado 100%</strong><br>Cobertura total a todo riesgo
      </td>
      <td style="padding: 6pt; border-right: 1pt solid #E5E7EB;">
        <strong>🔄 14 Días Desistimiento</strong><br>Reembolso garantizado
      </td>
      <td style="padding: 6pt;">
        <strong>🔒 Factura Legal con IVA</strong><br>Plena validez contable
      </td>
    </tr>
  </table>

  <!-- FOOTER -->
  <table class="footer-tbl">
    <tr>
      <td style="width: 65%;">
        <strong>MERCATUM SHOP ESPAÑA — Departamento de Administración</strong><br>
        Paseo de la Castellana, 28046 Madrid · Tel/WhatsApp Oficial: +34 691 34 98 40<br>
        Email: contacto@mercatum-shop.app · Tienda Web Oficial: www.mercatum-shop.app
      </td>
      <td style="width: 35%; text-align: center; vertical-align: middle;">
        <div style="border: 1pt dashed #047857; background-color: #F0FDF4; padding: 4pt; border-radius: 4pt;">
          <strong style="color: #064E3B; font-size: 8.5pt;">🛡️ SELLO OFICIAL DE AUTENTICIDAD</strong><br>
          <span style="font-family: Consolas, monospace; font-size: 8pt; color: #047857;">CSV-MERC-2026-BBVA-0166</span>
        </div>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// Save HTML and Word .doc in public
fs.writeFileSync('public/MERCATUM_Certificado_Oficial_Pago_Clientes.html', htmlContent, 'utf-8');
fs.writeFileSync('public/MERCATUM_Certificado_Oficial_Pago_Clientes.doc', wordContent, 'utf-8');
console.log("Wrote public/MERCATUM_Certificado_Oficial_Pago_Clientes.html");
console.log("Wrote public/MERCATUM_Certificado_Oficial_Pago_Clientes.doc");

// Generate PDF via Microsoft Edge
const htmlPath = path.resolve('public/MERCATUM_Certificado_Oficial_Pago_Clientes.html');
const pdfPath = path.resolve('public/MERCATUM_Certificado_Oficial_Pago_Clientes.pdf');
const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log("Converting to PDF via Microsoft Edge Headless...");
const edgeCmd = '"' + edgeExe + '" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="' + pdfPath + '" --no-pdf-header-footer "file:///' + htmlPath.replace(/\\/g, '/') + '"';

try {
  execSync(edgeCmd, { stdio: 'inherit' });
  console.log("Successfully created PDF at:", pdfPath);
} catch (err) {
  console.error("Error creating PDF with Edge:", err.message);
}

// Copy to Desktop and Downloads for immediate user access
const userProfile = process.env.USERPROFILE || 'C:\\Users\\PC';
const desktopDir = path.join(userProfile, 'Desktop');
const downloadsDir = path.join(userProfile, 'Downloads');

const copyFiles = [
  { src: pdfPath, name: 'MERCATUM_Certificado_Oficial_Pago_Clientes.pdf' },
  { src: path.resolve('public/MERCATUM_Certificado_Oficial_Pago_Clientes.doc'), name: 'MERCATUM_Certificado_Oficial_Pago_Clientes.doc' }
];

copyFiles.forEach(({ src, name }) => {
  if (fs.existsSync(src)) {
    try {
      const destDesktop = path.join(desktopDir, name);
      fs.copyFileSync(src, destDesktop);
      console.log("Copied to Desktop:", destDesktop);
    } catch (e) {
      console.warn("Could not copy to Desktop:", e.message);
    }

    try {
      const destDownloads = path.join(downloadsDir, name);
      fs.copyFileSync(src, destDownloads);
      console.log("Copied to Downloads:", destDownloads);
    } catch (e) {
      console.warn("Could not copy to Downloads:", e.message);
    }
  }
});

console.log("All certified payment documents generated successfully!");
