import 'server-only';
import { rgb } from 'pdf-lib';
import { PdfWriter } from '@/lib/pdf-text';

export async function renderAgreementPdf(opts: {
  body: string;
  versionNo: number;
  signature?: { png: Uint8Array; signedAt: string; name: string } | null;
}): Promise<Uint8Array> {
  const w = await PdfWriter.create('Rental agreement');
  w.markdown(opts.body);
  if (opts.signature) {
    w.ensure(150);
    w.y -= 10;
    w.text('Accepted in the Family Property Manager app by the Tenant:', { size: 10, color: rgb(0.35, 0.35, 0.35) });
    const img = await w.doc.embedPng(opts.signature.png);
    const scale = Math.min(220 / img.width, 80 / img.height);
    w.page.drawImage(img, { x: w.margin, y: w.y - img.height * scale, width: img.width * scale, height: img.height * scale });
    w.y -= img.height * scale + 8;
    w.text(`${opts.signature.name} · ${new Date(opts.signature.signedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, { size: 10 });
  }
  w.footer(`Version ${opts.versionNo}. In-app acceptance is a record; the stamped/registered copy is the legal agreement.`);
  return w.doc.save();
}
