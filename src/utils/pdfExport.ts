import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ActionItem } from "./actionPlan";
import { CompanyData } from "./cnpj";
import { EvaluatorData } from "./database";
import { formatCPF } from "./cpf";

export function exportActionPlanPDF(
  company: CompanyData,
  actions: ActionItem[],
  date: string,
  evaluator?: EvaluatorData
) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // Header bar
  doc.setFillColor(31, 122, 154);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MEDWORK", margin, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Avaliação Inicial dos Fatores de Riscos Psicossociais", margin, 21);
  doc.setFontSize(7);
  doc.text(`Gerado em: ${date}`, pageWidth - margin, 21, { align: "right" });

  y = 40;

  // Company info
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Dados da Empresa", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const companyInfo = [
    `Razão Social: ${company.legalName}`,
    company.tradeName ? `Nome Fantasia: ${company.tradeName}` : "",
    `CNPJ: ${company.cnpj}`,
    `Endereço: ${company.address}`,
    `Cidade/UF: ${company.city} - ${company.state}`,
  ].filter(Boolean);

  for (const line of companyInfo) {
    doc.text(line, margin, y);
    y += 5;
  }

  y += 3;

  // Evaluator info
  if (evaluator) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Dados do Avaliador", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const evalInfo = [
      `Nome: ${evaluator.name}`,
      `Função/Cargo: ${evaluator.roleTitle}`,
      `CPF: ${formatCPF(evaluator.cpf)}`,
      `E-mail: ${evaluator.email}`,
      `Data da Avaliação: ${date}`,
    ];
    for (const line of evalInfo) {
      doc.text(line, margin, y);
      y += 5;
    }
    y += 3;
  }

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 122, 154);
  doc.text("Plano de Ação para Implementação Imediata", margin, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(46, 139, 87);
  doc.text("Prevenção dos Riscos Psicossociais", margin, y);
  y += 8;

  // Summary
  const obrigatorias = actions.filter((a) => a.classification === "Obrigatória").length;
  const indispensaveis = actions.filter((a) => a.classification === "Indispensável").length;
  const recomendadas = actions.filter((a) => a.classification === "Recomendada").length;

  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.text(`Total de ações: ${actions.length}`, margin, y);
  doc.text(`Obrigatórias: ${obrigatorias}`, margin + 40, y);
  doc.text(`Indispensáveis: ${indispensaveis}`, margin + 80, y);
  doc.text(`Recomendadas: ${recomendadas}`, margin + 125, y);
  y += 5;

  // Executive summary
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const summaryText = `Esta avaliação inicial identificou ${actions.length} ação(ões) necessária(s) para adequação da empresa ${company.legalName} aos requisitos de prevenção dos riscos psicossociais. Este diagnóstico inicial não substitui o levantamento formal dos riscos psicossociais, mas serve como etapa preparatória essencial.`;
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4 + 5;

  // Table
  const tableData = actions.map((a, i) => [
    String(i + 1),
    a.questionCode,
    a.actionText,
    a.classification,
    a.priority,
    a.theme,
    "", // Responsável
    "", // Data prevista
    "", // Status
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Item", "Ação Recomendada", "Classif.", "Prior.", "Tema", "Responsável", "Data Prev.", "Status"]],
    body: tableData,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [31, 41, 55],
      lineColor: [209, 213, 219],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [31, 122, 154],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 248],
    },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 10 },
      2: { cellWidth: contentWidth - 100 },
      3: { cellWidth: 16 },
      4: { cellWidth: 12 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
      7: { cellWidth: 14 },
      8: { cellWidth: 12 },
    },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(31, 122, 154);
      doc.rect(0, pageH - 12, pageWidth, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Med Work — Gestão de Riscos Ocupacionais | Documento gerado automaticamente", margin, pageH - 5);
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageH - 5, { align: "right" });
    },
  });

  doc.save(`plano-acao-${company.cnpj.replace(/\D/g, "")}.pdf`);
}
