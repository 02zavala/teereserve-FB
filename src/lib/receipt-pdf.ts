import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Use CommonJS require and normalize constructor for Next server runtime
const pdfkitRaw = require('pdfkit');
const PDFDocumentCtor = (pdfkitRaw && (pdfkitRaw.default || pdfkitRaw.PDFDocument)) || pdfkitRaw;
import QRCode from 'qrcode';
import { storage as adminStorage } from '@/lib/firebase-admin';

export type ReceiptDetails = {
  bookingId?: string;
  confirmationNumber?: string;
  courseName: string;
  courseLocation?: string;
  date: string; // already formatted string
  time: string;
  players: number | string;
  holes?: number | string;
  totalPrice?: number | string;
  customerName?: string;
  customerEmail?: string;
};

type GenerateOptions = {
  lang?: 'es' | 'en' | 'bilingual';
  siteUrl?: string;
};

function collectBufferFromDoc(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function generateReceiptPdf(details: ReceiptDetails, options: GenerateOptions = {}) {
  const {
    bookingId,
    confirmationNumber,
    courseName,
    courseLocation,
    date,
    time,
    players,
    holes = 18,
    totalPrice,
    customerName,
    customerEmail,
  } = details;

  const { lang = 'bilingual', siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf' } = options;

  // Prepare QR payload
  const verifyUrl = `${siteUrl}/booking/lookup?bookingId=${encodeURIComponent(
    confirmationNumber || bookingId || ''
  )}`;
  const qrPayload = JSON.stringify({
    v: 1,
    type: 'teereserve_receipt',
    bookingId,
    confirmationNumber,
    verifyUrl,
  });
  let qrBuffer: Buffer | null = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 180 });
    const qrBase64 = qrDataUrl.split(',')[1];
    qrBuffer = Buffer.from(qrBase64, 'base64');
  } catch (qrErr) {
    console.warn('QR code generation failed, proceeding without QR:', qrErr);
  }

  const doc = new PDFDocumentCtor({ size: 'A4', margin: 50 });
  const streamPromise = collectBufferFromDoc(doc);

  // Header
  doc.rect(0, 0, doc.page.width, 110).fill('#0f766e');
  doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold');
  doc.text('TeeReserve Golf', 50, 35, { align: 'left' });
  doc.fontSize(14).font('Helvetica');
  doc.text(
    confirmationNumber ? `Confirmación: ${confirmationNumber}` : bookingId ? `Reserva: ${bookingId}` : '',
    50,
    65,
    { align: 'left' }
  );

  // QR image in header area (optional)
  if (qrBuffer) {
    doc.image(qrBuffer, doc.page.width - 220, 20, { width: 160, height: 160 });
  }

  // Body start
  doc.moveDown();
  doc.fill('#000000');

  const drawSection = (title: string, rows: Array<[string, string | number | undefined]>) => {
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(16).fill('#0f766e');
    doc.text(title);
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(12).fill('#000000');
    rows.forEach(([label, value]) => {
      if (value === undefined || value === null || value === '') return;
      doc.text(`${label}: ${value}`);
    });
  };

  // Spanish section
  if (lang === 'es' || lang === 'bilingual') {
    drawSection('Detalles de la Reserva', [
      ['Cliente', customerName || ''],
      ['Correo', customerEmail || ''],
      ['Campo', courseName],
      ['Ubicación', courseLocation || ''],
      ['Fecha', date],
      ['Hora', time],
      ['Jugadores', players],
      ['Hoyos', holes],
      ['Total', typeof totalPrice === 'number' ? `$${totalPrice.toFixed(2)}` : totalPrice || ''],
    ]);

    doc.moveDown(0.5);
    doc.text(
      'Importante: Llegue 30 minutos antes de su tee time. Presente este recibo o una identificación válida en la recepción. Revise las políticas de cancelación en nuestro sitio.',
      { align: 'left' }
    );
  }

  // Divider
  if (lang === 'bilingual') {
    doc.moveDown(1);
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  }

  // English section
  if (lang === 'en' || lang === 'bilingual') {
    drawSection('Booking Details', [
      ['Customer', customerName || ''],
      ['Email', customerEmail || ''],
      ['Course', courseName],
      ['Location', courseLocation || ''],
      ['Date', date],
      ['Time', time],
      ['Players', players],
      ['Holes', holes],
      ['Total', typeof totalPrice === 'number' ? `$${totalPrice.toFixed(2)}` : totalPrice || ''],
    ]);

    doc.moveDown(0.5);
    doc.text(
      'Important: Please arrive 30 minutes before your tee time. Present this receipt or a valid ID at reception. Review cancellation policies on our website.',
      { align: 'left' }
    );
  }

  // Signature section
  doc.moveDown(2);
  const startY = doc.y;
  const leftX = 50;
  const rightX = doc.page.width / 2 + 20;
  const lineWidth = doc.page.width / 2 - 70;
  doc.strokeColor('#111827').lineWidth(1);
  doc.moveTo(leftX, startY + 40).lineTo(leftX + lineWidth, startY + 40).stroke();
  doc.moveTo(rightX, startY + 40).lineTo(rightX + lineWidth, startY + 40).stroke();
  doc.font('Helvetica').fontSize(10);
  doc.text('Firma del Cliente / Customer Signature', leftX, startY + 45, { width: lineWidth, align: 'center' });
  doc.text('Sello y Firma del Campo / Course Stamp & Signature', rightX, startY + 45, { width: lineWidth, align: 'center' });

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).fill('#6b7280');
  doc.text('TeeReserve Golf • teereserve.golf • soporte@teereserve.golf', 50, doc.page.height - 80, {
    align: 'center',
  });

  doc.end();
  const buffer = await streamPromise;
  const filename = `TRG-${confirmationNumber || bookingId || Date.now()}.pdf`;
  return { buffer, filename, verifyUrl };
}

export async function saveReceiptToStorage(
  buffer: Buffer,
  bookingId: string,
  confirmationNumber?: string
): Promise<{ gsPath?: string; signedUrl?: string } | null> {
  try {
    if (!adminStorage) return null as any;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return null;
    const bucket = adminStorage.bucket(bucketName);
    const path = `receipts/${bookingId}/${confirmationNumber || 'receipt'}.pdf`;
    const file = bucket.file(path);
    await file.save(buffer, {
      contentType: 'application/pdf',
      resumable: false,
      metadata: { cacheControl: 'private, max-age=0' },
    });
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    return { gsPath: `gs://${bucketName}/${path}`, signedUrl };
  } catch (error) {
    console.error('Error saving receipt to storage:', error);
    return null;
  }
}