import { DocumentConverter } from '../../engines/document/document-converter';

export const txtToPdfEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.txtToPdf(file);
  },
};

export const pdfToTxtEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.pdfToTxt(file);
  },
};

export const txtToDocxEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.txtToDocx(file);
  },
};

export const docxToTxtEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.docxToTxt(file);
  },
};

export const csvToJsonEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.csvToJson(file);
  },
};

export const csvToPdfEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.csvToPdf(file);
  },
};

export const csvToDocxEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.csvToDocx(file);
  },
};

export const csvToXlsxEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.csvToXlsx(file);
  },
};

export const jsonToCsvEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.jsonToCsv(file);
  },
};

export const pdfToDocxEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.pdfToDocx(file);
  },
};

export const docxToPdfEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.docxToPdf(file);
  },
};

export const pdfToXlsxEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.pdfToXlsx(file);
  },
};

export const xlsxToDocxEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.xlsxToDocx(file);
  },
};

export const docxToXlsxEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.docxToXlsx(file);
  },
};

export const xlsxToCsvEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.xlsxToCsv(file);
  },
};

export const xlsxToPdfEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    return DocumentConverter.xlsxToPdf(file);
  },
};

export const identityEngine = {
  runConversion: async (file: File): Promise<Blob> => {
    const buffer = await file.arrayBuffer();
    return new Blob([buffer], {
      type: file.type || 'application/octet-stream',
    });
  },
};
