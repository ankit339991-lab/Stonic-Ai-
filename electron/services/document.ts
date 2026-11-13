import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { app } from 'electron';

export interface DocumentAnalysisResult {
  fileName: string;
  filePath: string;
  fileType: string;
  sizeBytes: number;
  text: string;
  summary?: string;
  metadata?: Record<string, any>;
  tableData?: any[];
}

export class DocumentService {
  /**
   * Parse any supported document: PDF, Word (.docx), Excel (.xlsx/.xls), Text/Code (.txt, .md, .csv, .json, .py, etc.)
   */
  async readDocument(filePath: string): Promise<DocumentAnalysisResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    // 1. PDF
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return {
        fileName,
        filePath,
        fileType: 'PDF Document',
        sizeBytes: stat.size,
        text: pdfData.text || '',
        metadata: {
          pages: pdfData.numpages,
          info: pdfData.info,
        },
      };
    }

    // 2. Word .docx
    if (ext === '.docx') {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return {
        fileName,
        filePath,
        fileType: 'Word Document (.docx)',
        sizeBytes: stat.size,
        text: result.value || '',
        metadata: {
          messages: result.messages,
        },
      };
    }

    // 3. Excel .xlsx, .xls, .csv
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      const workbook = XLSX.readFile(filePath);
      let combinedText = '';
      const tableData: any[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        combinedText += `\n--- Sheet: ${sheetName} ---\n`;
        combinedText += XLSX.utils.sheet_to_txt(sheet);
        tableData.push({
          sheet: sheetName,
          rows: json.slice(0, 100), // top 100 rows for preview
          totalRows: json.length,
        });
      }

      return {
        fileName,
        filePath,
        fileType: `Spreadsheet (${ext})`,
        sizeBytes: stat.size,
        text: combinedText.trim(),
        tableData,
        metadata: {
          sheetNames: workbook.SheetNames,
        },
      };
    }

    // 4. Plain text / Markdown / Code / JSON
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      return {
        fileName,
        filePath,
        fileType: `Text Document (${ext || 'plain'})`,
        sizeBytes: stat.size,
        text,
      };
    } catch {
      throw new Error(`Unsupported or binary file type: ${ext}`);
    }
  }

  /**
   * Create or write a new document
   */
  async createDocument(filePath: string, content: string): Promise<{ success: boolean; filePath: string }> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  }

  /**
   * Safe document folder organization helper:
   * Categorizes files in a directory into Images, Documents, Audio, Video, Code, Archives
   */
  async organizeFolderPreview(folderPath: string): Promise<Array<{ fileName: string; currentPath: string; proposedFolder: string }>> {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }

    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    const plan: Array<{ fileName: string; currentPath: string; proposedFolder: string }> = [];

    const categories: Record<string, string[]> = {
      Documents: ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.pptx', '.csv'],
      Images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
      Audio: ['.mp3', '.wav', '.flac', '.m4a', '.aac'],
      Videos: ['.mp4', '.mkv', '.avi', '.mov', '.wmv'],
      Code: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json'],
      Archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    };

    for (const file of files) {
      if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        let targetCategory = 'Other';
        for (const [category, extList] of Object.entries(categories)) {
          if (extList.includes(ext)) {
            targetCategory = category;
            break;
          }
        }

        if (targetCategory !== 'Other') {
          plan.push({
            fileName: file.name,
            currentPath: path.join(folderPath, file.name),
            proposedFolder: path.join(folderPath, targetCategory),
          });
        }
      }
    }

    return plan;
  }

  /**
   * Execute folder organization plan (Requires user confirmation)
   */
  async executeOrganization(plan: Array<{ currentPath: string; proposedFolder: string }>): Promise<{ success: boolean; movedCount: number }> {
    let movedCount = 0;
    for (const item of plan) {
      try {
        if (!fs.existsSync(item.proposedFolder)) {
          fs.mkdirSync(item.proposedFolder, { recursive: true });
        }
        const fileName = path.basename(item.currentPath);
        const destination = path.join(item.proposedFolder, fileName);
        if (!fs.existsSync(destination)) {
          fs.renameSync(item.currentPath, destination);
          movedCount++;
        }
      } catch (e) {
        console.error('Error moving file during organization', item.currentPath, e);
      }
    }
    return { success: true, movedCount };
  }
}
