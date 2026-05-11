'use server';

import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

const ALLOWED = ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'];
const BUCKET = 'submissions';

async function watermarkPdf(pdfBytes, orderId) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const mainText = 'PREVIEW — NOT FOR DISTRIBUTION';
  const idText = `Order: ${orderId.slice(0, 8).toUpperCase()}`;

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Tiled diagonal grid — 3 columns × 4 rows
    const cols = 3;
    const rows = 4;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = cellW * c + cellW / 2 - 110;
        const cy = cellH * r + cellH / 2;

        page.drawText(mainText, {
          x: cx,
          y: cy,
          size: 13,
          font,
          color: rgb(0.8, 0.05, 0.05),
          opacity: 0.18,
          rotate: degrees(45),
        });

        // Order ID stamp below each main text tile
        page.drawText(idText, {
          x: cx + 20,
          y: cy - 18,
          size: 9,
          font,
          color: rgb(0.8, 0.05, 0.05),
          opacity: 0.22,
          rotate: degrees(45),
        });
      }
    }

    // Solid border strip top + bottom with order ID — harder to crop cleanly
    page.drawText(`PREVIEW ONLY  •  ${idText}  •  PREVIEW ONLY`, {
      x: 20,
      y: height - 18,
      size: 8,
      font,
      color: rgb(0.7, 0.05, 0.05),
      opacity: 0.55,
    });
    page.drawText(`PREVIEW ONLY  •  ${idText}  •  PREVIEW ONLY`, {
      x: 20,
      y: 8,
      size: 8,
      font,
      color: rgb(0.7, 0.05, 0.05),
      opacity: 0.55,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

export async function submitPaper(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not signed in' };
  if (user.role !== 'writer') return { error: 'Only writers can submit' };

  const orderId = formData.get('order_id');
  const file = formData.get('pdf_file');

  if (!orderId || !file || file.size === 0) {
    return { error: 'Please select a PDF file' };
  }
  if (file.type !== 'application/pdf') {
    return { error: 'Only PDF files are accepted' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'File must be under 10 MB' };
  }

  const guard = await pool.query(
    `SELECT writer_id, status FROM orders WHERE uuid = $1`,
    [orderId]
  );
  if (guard.rows.length === 0) return { error: 'Order not found' };
  if (guard.rows[0].writer_id !== user.uuid) return { error: 'Not your order' };
  if (!ALLOWED.includes(guard.rows[0].status)) {
    return { error: `Cannot submit when order is ${guard.rows[0].status}` };
  }

  const timestamp = Date.now();
  const originalPath = `${orderId}/original_${timestamp}.pdf`;
  const watermarkedPath = `${orderId}/watermarked_${timestamp}.pdf`;

  const supabase = getAdminSupabase();
  const pdfBytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(originalPath, pdfBytes, { contentType: 'application/pdf', upsert: false });

  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  let watermarked;
  try {
    watermarked = await watermarkPdf(pdfBytes, orderId);
  } catch {
    return { error: 'Failed to process PDF — ensure it is a valid, unencrypted PDF' };
  }

  const { error: wmErr } = await supabase.storage
    .from(BUCKET)
    .upload(watermarkedPath, watermarked, { contentType: 'application/pdf', upsert: false });

  if (wmErr) return { error: `Watermark upload failed: ${wmErr.message}` };

  try {
    await pool.query(
      `CALL sp_submit_paper($1, $2, $3)`,
      [orderId, originalPath, watermarkedPath]
    );
  } catch (e) {
    return { error: e.message || 'Failed to submit' };
  }

  redirect(`/orders/${orderId}`);
}
