import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import CreditNotePreview from "./CreditNoteDetail/CreditNotePreview";
import type { CreditNote } from "../salesModel";

interface DownloadCreditNotesPdfOptions {
  notes: CreditNote[];
  organizationProfile?: any;
  baseCurrency?: string;
  fileName?: string;
}

const waitForImages = async (element: HTMLElement) => {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
};

const waitForPaint = async () => {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};

const renderCreditNoteCanvas = async (
  note: CreditNote,
  organizationProfile: any,
  baseCurrency: string
): Promise<HTMLCanvasElement> => {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "1120px";
  host.style.padding = "0";
  host.style.margin = "0";
  host.style.background = "transparent";
  host.style.zIndex = "-1";
  document.body.appendChild(host);

  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <CreditNotePreview
        creditNote={note}
        organizationProfile={organizationProfile}
        baseCurrency={baseCurrency}
      />
    );
  });

  if ("fonts" in document && document.fonts?.ready) {
    await document.fonts.ready;
  }

  await waitForPaint();
  const target = (host.querySelector("[data-credit-note-pdf-page]") as HTMLElement) || (host.firstElementChild as HTMLElement);
  if (!target) {
    root.unmount();
    document.body.removeChild(host);
    throw new Error("Credit note preview render failed.");
  }

  await waitForImages(target);

  const canvas = await html2canvas(target, {
    scale: 2.25,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: target.scrollWidth,
    windowHeight: target.scrollHeight
  });

  root.unmount();
  document.body.removeChild(host);
  return canvas;
};

export const downloadCreditNotesPdf = async ({
  notes,
  organizationProfile = {},
  baseCurrency = "USD",
  fileName
}: DownloadCreditNotesPdfOptions): Promise<void> => {
  const validNotes = Array.isArray(notes) ? notes.filter(Boolean) : [];
  if (!validNotes.length) {
    throw new Error("No credit notes available for PDF download.");
  }

  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  pdf.setProperties({
    title: fileName || "Credit Notes",
    subject: "Credit notes export",
    creator: "Invoice System"
  });

  for (let noteIndex = 0; noteIndex < validNotes.length; noteIndex += 1) {
    const note = validNotes[noteIndex];
    try {
      const canvas = await renderCreditNoteCanvas(note, organizationProfile, baseCurrency);
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (noteIndex > 0) {
        pdf.addPage();
      }

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= printableHeight;

      while (heightLeft > 0.01) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= printableHeight;
      }
    } catch (error) {
      console.error(`Error rendering credit note ${note?.creditNoteNumber || note?.id || noteIndex}:`, error);
    }
  }

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Generated ${generatedAt}`, margin, pageHeight - 5);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  if (totalPages === 0) {
    throw new Error("Unable to generate credit note PDF.");
  }

  const fallbackName = `credit-notes-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(fileName || fallbackName);
};
