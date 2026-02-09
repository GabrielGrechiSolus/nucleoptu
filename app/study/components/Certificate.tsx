'use client';

import React from 'react';
import { jsPDF } from 'jspdf';

export default function Certificate({
  studentName,
  courseTitle,
}: {
  studentName: string;
  courseTitle: string;
}) {
  const generate = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(30);
    doc.text('Certificado de Conclusão', 148, 60, { align: 'center' });
    doc.setFontSize(20);
    doc.text(`Concedido a: ${studentName}`, 148, 95, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`Pelo curso: ${courseTitle}`, 148, 120, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 148, 145, { align: 'center' });
    doc.save(`${studentName.replace(/\s+/g,'_')}_${courseTitle.replace(/\s+/g,'_')}_certificado.pdf`);
  };

  return (
    <div>
      <button onClick={generate} className="px-4 py-2 bg-green-600 rounded">Baixar certificado (PDF)</button>
    </div>
  );
}
