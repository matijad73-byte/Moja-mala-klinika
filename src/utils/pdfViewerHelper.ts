import { jsPDF } from 'jspdf';
import { LabReport } from '../types';

/**
 * Converts a base64 data URI to a Blob
 */
function base64ToBlob(base64DataUri: string, mimeType: string): Blob {
  const base64Clean = base64DataUri.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
  const byteCharacters = atob(base64Clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Generates an authentic medical laboratory PDF document Blob from LabReport data
 */
export function generateMedicalLabPdfBlob(report: LabReport): Blob {
  // If report already has an original PDF data URL, use it directly
  if (report.fileDataUrl) {
    if (report.fileDataUrl.startsWith('data:application/pdf')) {
      return base64ToBlob(report.fileDataUrl, 'application/pdf');
    }
  }

  // Create a structured medical PDF using jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Bar
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.rect(margin, y, contentWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LABORATORIJSKI MEDICINSKI NALAZ', margin + 6, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Moja mala klinika - Digitalna arhiva', margin + 6, y + 14);

  y += 24;

  // Document & Patient Metadata Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Dokument:', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(report.fileName || 'Nalaz.pdf', margin + 28, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Datum nalaza:', margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(report.date || 'N/A', margin + 28, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Pacijent:', margin + 105, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(report.patientName || 'Dušan Matijašević', margin + 125, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Ekstrahovano:', margin + 105, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.parameters?.length || 0} parametara`, margin + 132, y + 12);

  y += 30;

  // Parameters Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  doc.text('PARAMETAR', margin + 3, y + 5.5);
  doc.text('KATEGORIJA', margin + 62, y + 5.5);
  doc.text('REZULTAT', margin + 105, y + 5.5);
  doc.text('JEDINICA', margin + 128, y + 5.5);
  doc.text('REFERENTNE GRANICE', margin + 148, y + 5.5);

  y += 10;

  // Parameter Rows
  const rowHeight = 7.5;
  (report.parameters || []).forEach((param, idx) => {
    // Check page overflow
    if (y > 270) {
      doc.addPage();
      y = 16;
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('PARAMETAR', margin + 3, y + 5.5);
      doc.text('KATEGORIJA', margin + 62, y + 5.5);
      doc.text('REZULTAT', margin + 105, y + 5.5);
      doc.text('JEDINICA', margin + 128, y + 5.5);
      doc.text('REFERENTNE GRANICE', margin + 148, y + 5.5);
      y += 10;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, y - 2, contentWidth, rowHeight, 'F');

    // Parameter Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const paramTitle = param.alias ? `${param.name} (${param.alias})` : param.name;
    doc.text(paramTitle.substring(0, 32), margin + 3, y + 3);

    // Category
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text((param.category || '').substring(0, 20), margin + 62, y + 3);

    // Value (Colored if abnormal)
    doc.setFont('helvetica', 'bold');
    if (param.status === 'high' || param.status === 'critical') {
      doc.setTextColor(225, 29, 72); // Rose
    } else if (param.status === 'low') {
      doc.setTextColor(217, 119, 6); // Amber
    } else {
      doc.setTextColor(15, 23, 42);
    }
    const displayVal = param.textValue || (param.value !== null ? String(param.value) : '—');
    doc.text(displayVal, margin + 105, y + 3);

    // Unit
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(param.unit || '', margin + 128, y + 3);

    // Ref text
    doc.text(param.refText || '-', margin + 148, y + 3);

    // Row underline
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 4.5, margin + contentWidth, y + 4.5);

    y += rowHeight;
  });

  // Summary Note
  if (report.summary && y < 260) {
    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'D');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    doc.text(`Komentar: "${report.summary.substring(0, 110)}"`, margin + 4, y + 8);
  }

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokument overen u digitalnom sistemu • Datum štampe: ${new Date().toLocaleDateString('sr-RS')}`,
    margin,
    290
  );

  return doc.output('blob');
}

/**
 * Returns a Blob URL for the PDF
 */
export function generateMedicalLabPdfBlobUrl(report: LabReport): string {
  const blob = generateMedicalLabPdfBlob(report);
  return URL.createObjectURL(blob);
}

/**
 * Opens or sends the PDF report directly to Adobe Acrobat Reader or native PDF application
 * on computer (Adobe Acrobat, Preview, Chrome PDF) or mobile phone (Drive PDF, Acrobat, Files).
 */
export async function openPdfBlobInAcrobat(
  blob: Blob,
  fileName: string = 'Laboratorijski_Nalaz.pdf'
): Promise<{ success: boolean; message: string }> {
  try {
    const finalName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

    // 1. Check for Mobile Web Share API
    if (typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
      try {
        const file = new File([blob], finalName, {
          type: 'application/pdf',
          lastModified: Date.now(),
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: finalName,
            text: `Medicinski laboratorijski nalaz: ${finalName}`,
            files: [file],
          });
          return {
            success: true,
            message: 'Nalaz je poslat na otvaranje u Acrobat Reader-u.',
          };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true, message: 'Otkazano' };
        }
        console.warn('Web Share API error, falling back to direct download/launch:', shareErr);
      }
    }

    // 2. Direct native download/launch for Adobe Acrobat Reader
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalName;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);

    return {
      success: true,
      message: 'PDF nalaz je preuzet i spreman za otvaranje u Adobe Acrobat Reader-u.',
    };
  } catch (err: any) {
    console.error('Error opening in Acrobat Reader:', err);
    return {
      success: false,
      message: 'Došlo je do greške pri otvaranju u Acrobat Reader-u.',
    };
  }
}

/**
 * Opens a LabReport in Adobe Acrobat Reader
 */
export async function openReportInNativePdfApp(
  report: LabReport
): Promise<{ success: boolean; message: string }> {
  try {
    const blob = generateMedicalLabPdfBlob(report);
    return openPdfBlobInAcrobat(blob, report.fileName);
  } catch (err: any) {
    console.error('Error launching Acrobat Reader for report:', err);
    return {
      success: false,
      message: 'Došlo je do greške pri otvaranju u Acrobat Reader-u.',
    };
  }
}
