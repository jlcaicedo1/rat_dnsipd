export type ReportSection = { heading: string; html: string };

export type ReportSignature = {
  role: string;
  name?: string;
  cargo?: string;
};

export type InstitutionalReportOptions = {
  logoSrc: string;
  title: string;
  subtitle?: string;
  objective: string;
  code: string;
  metadata: Array<[string, string]>;
  toc?: string[];
  sections: ReportSection[];
  signatures?: ReportSignature[];
  footerText?: string;
};

const REPORT_CSS = `
@page { size: A4; margin: 14mm 12mm }
*{ box-sizing: border-box; margin: 0; padding: 0 }
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 9.6pt;
  line-height: 1.6;
  color: #1f2b38;
  background: #fff;
}
#report {
  max-width: 210mm;
  margin: 0 auto;
  padding: 8mm 10mm;
}
h1,h2,h3,h4 { color: #1a3a5c; line-height: 1.3 }
h1 { font-size: 20pt; font-weight: 800; margin-bottom: 6px }
h2 { font-size: 13.5pt; font-weight: 700; margin: 26px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e8a000; page-break-after: avoid }
h3 { font-size: 11.5pt; font-weight: 700; margin: 18px 0 7px }
h4 { font-size: 10.5pt; font-weight: 700; margin: 13px 0 5px; color: #33506e }
p { margin: 0 0 9px; text-align: justify }
ul,ol { margin: 0 0 10px 20px }
li { margin-bottom: 4px }

/* PORTADA */
.rpt-cover { text-align: center; padding: 28mm 0 20mm; border-bottom: 3px solid #e8a000; page-break-after: always }
.rpt-cover img { height: 72px; margin-bottom: 18px }
.rpt-cover .rc-org { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #41546a }
.rpt-cover .rc-dep { font-size: 9.5pt; color: #6c757d; margin-top: 4px }
.rpt-cover .rc-tt { font-size: 21pt; font-weight: 800; color: #1a3a5c; margin: 24px 0 8px; line-height: 1.22 }
.rpt-cover .rc-sub { font-size: 11pt; color: #41546a; margin-bottom: 20px }
.rpt-cover .rc-obj { font-size: 11pt; font-weight: 600; color: #1f2b38; background: #f2f5fa; border: 1px solid #c8d0dc; border-radius: 6px; padding: 12px 16px; margin: 0 auto 20px; max-width: 80%; text-align: center }
.rpt-cover .rc-cod { display: inline-block; background: #1a3a5c; color: #fff; font-size: 10pt; font-weight: 700; letter-spacing: 1px; padding: 5px 16px; border-radius: 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact }

/* FICHA DE METADATOS */
.rpt-meta { width: 100%; border-collapse: collapse; font-size: 9.4pt; margin-top: 20px }
.rpt-meta td { border: 1px solid #cdd5e0; padding: 6px 9px }
.rpt-meta td.k { background: #f2f5fa; font-weight: 600; width: 31%; color: #33506e; -webkit-print-color-adjust: exact; print-color-adjust: exact }

/* TABLAS DE CONTENIDO */
table { width: 100%; border-collapse: collapse; font-size: 8.6pt; margin: 8px 0 14px; break-inside: avoid }
th { background: #1a3a5c; color: #fff; padding: 6px 7px; text-align: left; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; border: 1px solid #1a3a5c }
td { padding: 5px 7px; border: 1px solid #cdd5e0; vertical-align: top }
tbody tr:nth-child(even) td { background: #f6f8fb; -webkit-print-color-adjust: exact; print-color-adjust: exact }

/* CALLOUTS */
.rpt-note { font-size: 9pt; background: #f4f7fb; border-left: 4px solid #2557a0; padding: 9px 12px; margin: 10px 0 14px; line-height: 1.6; color: #33506e }
.rpt-alert { font-size: 9pt; background: #fdecea; border-left: 4px solid #c0392b; padding: 9px 12px; margin: 10px 0 14px; line-height: 1.6; color: #7d1f14 }
.rpt-ok { font-size: 9pt; background: #eaf6ef; border-left: 4px solid #2d8a4e; padding: 9px 12px; margin: 10px 0 14px; line-height: 1.6; color: #1c5c37 }

/* BADGES */
.badge { display: inline-block; padding: 2px 8px; border-radius: 9px; font-size: 7.8pt; font-weight: 700; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.badge-critico { background: #991b1b }
.badge-alto { background: #9a3412 }
.badge-medio { background: #92400e }
.badge-bajo { background: #14532d }

/* FIRMAS */
.rpt-sig { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 16px; break-inside: avoid }
.rpt-sig .s { border: 1px solid #cdd5e0; border-radius: 6px; overflow: hidden; font-size: 8.8pt }
.rpt-sig .s .r { background: #1a3a5c; color: #fff; padding: 6px; text-align: center; font-weight: 700; font-size: 8.4pt; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.rpt-sig .s .b { padding: 9px 10px }
.rpt-sig .s .line { border-top: 1px solid #333; margin: 52px 8px 5px }
.rpt-sig .s .sn { font-weight: 700; font-size: 8.4pt; color: #1a3a5c }
.rpt-sig .s .sc { color: #6c757d; font-size: 7.8pt }

/* FOOTER */
.rpt-foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #cdd5e0; font-size: 8pt; color: #6c757d; text-align: center; line-height: 1.6 }

/* TOC */
.rpt-toc { font-size: 10pt }
.rpt-toc li { margin-bottom: 5px }

.pgbreak { page-break-before: always }
`;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildInstitutionalReport(opts: InstitutionalReportOptions): string {
  const today = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  let html = `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title>
<style>${REPORT_CSS}</style>
</head><body><div id="report">`;

  /* ── PORTADA ── */
  html += `<div class="rpt-cover">`;
  html += `<img src="${opts.logoSrc}" alt="IESS">`;
  html += `<div class="rc-org">Instituto Ecuatoriano de Seguridad Social</div>`;
  html += `<div class="rc-dep">Dirección Nacional de Seguridad de la Información y Protección de Datos — DNSIPD</div>`;
  html += `<div class="rc-tt">${esc(opts.title)}</div>`;
  if (opts.subtitle) html += `<div class="rc-sub">${esc(opts.subtitle)}</div>`;
  html += `<div class="rc-obj">${esc(opts.objective)}</div>`;
  html += `<div class="rc-cod">${esc(opts.code)}</div>`;
  html += `</div>`;

  /* ── FICHA DE METADATOS ── */
  const metaRows: Array<[string, string]> = [
    ...opts.metadata,
    ["Fecha de generación", today],
  ];
  html += `<table class="rpt-meta"><tbody>`;
  metaRows.forEach(([k, v]) => {
    if (v) html += `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`;
  });
  html += `</tbody></table>`;

  /* ── ÍNDICE ── */
  if (opts.toc && opts.toc.length > 0) {
    html += `<div class="pgbreak"></div><h2>Contenido</h2><ol class="rpt-toc">`;
    opts.toc.forEach((item) => { html += `<li>${esc(item)}</li>`; });
    html += `</ol>`;
  }

  /* ── SECCIONES ── */
  opts.sections.forEach(({ heading, html: content }) => {
    html += `<div class="pgbreak"></div><h2>${esc(heading)}</h2>${content}`;
  });

  /* ── FIRMAS ── */
  const sigs = opts.signatures ?? [];
  if (sigs.length > 0) {
    html += `<div class="pgbreak"></div><h2>Suscripción</h2><div class="rpt-sig">`;
    sigs.forEach((s) => {
      html += `<div class="s">`;
      html += `<div class="r">${esc(s.role)}</div>`;
      html += `<div class="b">`;
      html += `<div class="line"></div>`;
      if (s.name) html += `<div class="sn">${esc(s.name)}</div>`;
      if (s.cargo) html += `<div class="sc">${esc(s.cargo)}</div>`;
      html += `</div></div>`;
    });
    html += `</div>`;
  }

  /* ── PIE ── */
  const footerText = opts.footerText ??
    "Instituto Ecuatoriano de Seguridad Social — IESS · DNSIPD · Ley Orgánica de Protección de Datos Personales";
  html += `<div class="rpt-foot">${esc(footerText)}<br>Generado el ${today} — Documento de uso institucional, sujeto a clasificación de seguridad.</div>`;

  html += `</div></body></html>`;
  return html;
}

export function printInstitutionalReport(html: string, title?: string): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("El navegador bloqueó la ventana emergente. Por favor, permita ventanas emergentes para este sitio.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  if (title) win.document.title = title;
  win.addEventListener("load", () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 250);
  });
}

/* ── Helpers for content blocks ── */

export function rptTable(headers: string[], rows: string[][], colWidths?: string[]): string {
  const widths = colWidths ?? [];
  const th = headers.map((h, i) => `<th${widths[i] ? ` style="width:${widths[i]}"` : ""}>${esc(h)}</th>`).join("");
  const tbody = rows.map((row) =>
    `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
  ).join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table>`;
}

export function rptNote(text: string): string {
  return `<div class="rpt-note">${esc(text)}</div>`;
}

export function rptAlert(text: string): string {
  return `<div class="rpt-alert">${esc(text)}</div>`;
}

export function rptOk(text: string): string {
  return `<div class="rpt-ok">${esc(text)}</div>`;
}

export function rptBadge(text: string, level: "critico" | "alto" | "medio" | "bajo"): string {
  return `<span class="badge badge-${level}">${esc(text)}</span>`;
}
