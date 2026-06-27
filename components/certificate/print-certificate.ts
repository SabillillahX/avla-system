import type { CertificateData } from "./CertificateTemplate"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildFileName(data: CertificateData): string {
  const raw = `${data.dateText}-${data.studentName}`
  return raw.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim()
}

export function printCertificate(data: CertificateData): void {
  const origin = window.location.origin
  const fileName = escapeHtml(buildFileName(data))
  const studentName = escapeHtml(data.studentName)
  const courseName = escapeHtml(data.courseName)
  const instructorName = escapeHtml(data.instructorName)
  const dateText = escapeHtml(data.dateText)
  const certificateId = escapeHtml(data.certificateId)
  const lectureLabel = `${data.lectureCount} ${data.lectureCount === 1 ? "lecture" : "lectures"}`

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${fileName}</title>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 297mm; height: 210mm; }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Open Sans", system-ui, sans-serif;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { position: relative; width: 297mm; height: 210mm; padding: 16mm 20mm; display: flex; flex-direction: column; }
  .frame { position: absolute; inset: 9mm; border: 1px solid #e5e7eb; }
  .header { position: relative; display: flex; align-items: flex-start; justify-content: space-between; }
  .logo { height: 15mm; width: auto; object-fit: contain; }
  .cert-no { text-align: right; font-size: 8pt; line-height: 1.6; color: #9ca3af; }
  .cert-no .label { text-transform: uppercase; letter-spacing: 0.08em; }
  .cert-no .value { font-family: monospace; font-weight: 600; color: #4b5563; }
  .body { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .title { font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.35em; color: #4f46e5; }
  .divider { margin-top: 4mm; width: 22mm; height: 1px; background: #e5e7eb; }
  .lead { margin-top: 10mm; font-size: 11pt; color: #6b7280; }
  .name { margin-top: 4mm; padding: 0 8mm 4mm; border-bottom: 2px solid #e5e7eb; font-family: "Poppins", sans-serif; font-size: 32pt; font-weight: 700; color: #111827; }
  .course { margin-top: 4mm; max-width: 220mm; font-size: 19pt; font-weight: 600; color: #1f2937; line-height: 1.3; }
  .sub { margin-top: 9mm; font-size: 11pt; color: #6b7280; }
  .footer { position: relative; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: end; gap: 8mm; padding-top: 8mm; border-top: 1px solid #f3f4f6; }
  .foot-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; }
  .foot-value { font-size: 11pt; font-weight: 600; color: #374151; }
  .foot-left { text-align: left; }
  .foot-center { text-align: center; }
  .foot-right { text-align: right; }
  .signature { padding-bottom: 2mm; border-bottom: 1px solid #d1d5db; font-family: "Poppins", sans-serif; font-style: italic; font-size: 13pt; color: #374151; }
  .signature-label { margin-top: 2mm; }
</style>
</head>
<body>
  <div class="page">
    <div class="frame"></div>

    <div class="header">
      <img class="logo" src="${origin}/logo-black.png" alt="Drafin" />
      <div class="cert-no">
        <div class="label">Certificate no.</div>
        <div class="value">${certificateId}</div>
      </div>
    </div>

    <div class="body">
      <div class="title">Certificate of Completion</div>
      <div class="divider"></div>
      <div class="lead">This certifies that</div>
      <div class="name">${studentName}</div>
      <div class="sub">has successfully completed the online course</div>
      <div class="course">${courseName}</div>
    </div>

    <div class="footer">
      <div class="foot-left">
        <div class="foot-label">Date</div>
        <div class="foot-value">${dateText}</div>
      </div>
      <div class="foot-center">
        <div class="signature">${instructorName}</div>
        <div class="foot-label signature-label">Instructor</div>
      </div>
      <div class="foot-right">
        <div class="foot-label">Length</div>
        <div class="foot-value">${lectureLabel}</div>
      </div>
    </div>
  </div>

  <script>
    function waitForImages() {
      var images = Array.prototype.slice.call(document.images)
      return Promise.all(images.map(function (image) {
        if (image.complete) return Promise.resolve()
        return new Promise(function (resolve) { image.onload = resolve; image.onerror = resolve })
      }))
    }
    window.onload = function () {
      waitForImages().then(function () {
        window.focus()
        window.print()
      })
    }
    window.onafterprint = function () { window.close() }
  </script>
</body>
</html>`

  const printWindow = window.open("", "_blank", "width=1200,height=860")
  if (!printWindow) return
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
