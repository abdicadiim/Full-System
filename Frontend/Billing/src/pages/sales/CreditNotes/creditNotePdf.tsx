import React from "react";
import { createRoot } from "react-dom/client";
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

const renderCreditNoteCanvas = async (
  note: CreditNote,
  organizationProfile: any,
  baseCurrency: string
): Promise<HTMLCanvasElement> => {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "1100px";
  host.style.padding = "24px";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(
    <CreditNotePreview
      creditNote={note}
      organizationProfile={organizationProfile}
      baseCurrency={baseCurrency}
    />
  );

  await new Promise((resolve) => setTimeout(resolve, 120));
  const target = host.firstElementChild as HTMLElement;
  if (!target) {
    root.unmount();
    document.body.removeChild(host);
    throw new Error("Credit note preview render failed.");
  }

  await waitForImages(target);

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
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

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  for (let noteIndex = 0; noteIndex < validNotes.length; noteIndex += 1) {
    const note = validNotes[noteIndex];
    const canvas = await renderCreditNoteCanvas(note, organizationProfile, baseCurrency);
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (noteIndex > 0) {
      pdf.addPage();
    }

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;

    while (heightLeft > 0.01) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;
    }
  }

  const fallbackName = `credit-notes-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(fileName || fallbackName);
};
