// backend/src/features/export/export.service.ts
import { Injectable } from '@nestjs/common';
import * as exceljs from 'exceljs';
import { Absence, EtatAbsence } from '../../entities/absence.entity';

@Injectable()
export class ExportService {
  async generateAbsencesXls(absences: Absence[], titre?: string): Promise<Buffer> {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet(titre || 'Absences');

    
    worksheet.columns = [
      { header: 'N°', key: 'id' },
      { header: 'Code Massar', key: 'massar' },
      { header: 'Nom', key: 'nom' },
      { header: 'Prénom', key: 'prenom' },
      { header: 'Classe', key: 'classe' },
      { header: 'Matière', key: 'matiere' },
      { header: 'Date', key: 'date' },
      { header: 'Horaire', key: 'horaire' },
      { header: 'Enseignant', key: 'enseignant' },
      { header: 'État', key: 'etat' },
      { header: 'Motif', key: 'motif' },
    ];

    // Vue figée (ySplit:1), auto-filter
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Header styling: fill bleu foncé (#1E3A5F), font blanc bold.
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    absences.forEach((abs, index) => {
      const row = worksheet.addRow({
        id: index + 1,
        massar: abs.eleve?.codeMassar || '-',
        nom: abs.eleve?.nom || '-',
        prenom: abs.eleve?.prenom || '-',
        classe: abs.classe ? `${abs.classe.niveau}-${abs.classe.numero}` : '-',
        matiere: abs.matiere,
        date: typeof abs.date === 'string' ? abs.date : (abs.date as any).toISOString().split('T')[0],
        horaire: abs.heureDebut + ' - ' + abs.heureFin,
        enseignant: abs.saisiePar ? `${abs.saisiePar.nom} ${abs.saisiePar.prenom}` : '-',
        etat: abs.etat,
        motif: abs.motif || '-',
      });

      // Lignes : alternance blanc/#F0F4FA
      const rowColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF0F4FA';
      
      // État : amber pour EN_ATTENTE, vert pour JUSTIFIEE, rouge pour NON_JUSTIFIEE.
      let etatColor = rowColor;
      if (abs.etat === EtatAbsence.EN_ATTENTE) etatColor = 'FFFFBF00'; // Amber
      if (abs.etat === EtatAbsence.JUSTIFIEE) etatColor = 'FF50C878'; // Emerald/Green
      if (abs.etat === EtatAbsence.NON_JUSTIFIEE) etatColor = 'FFFF5733'; // Red

      row.eachCell((cell, colNumber) => {
        // Apply default row color except for the "État" column (colNumber 10)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colNumber === 10 ? etatColor : rowColor }
        };
        // Add border
        cell.border = {
          top: {style:'thin', color: {argb:'FFE2E8F0'}},
          left: {style:'thin', color: {argb:'FFE2E8F0'}},
          bottom: {style:'thin', color: {argb:'FFE2E8F0'}},
          right: {style:'thin', color: {argb:'FFE2E8F0'}}
        };
      });
    });

    worksheet.columns?.forEach((column) => {
      let maxLength = 0;

      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const value = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, value.length);
      });

      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });


    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
