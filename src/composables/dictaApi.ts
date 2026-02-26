type UnknownRecord = Record<string, unknown>;

interface DictaParallelItem extends UnknownRecord {
  compBookXmlId?: string;
  compName?: string;
  compNameHe?: string;
  url?: string;
  verseId?: string;
}

interface DictaAnalysisResult {
  ocrText: string;
  parallels: DictaParallelItem[];
}

const DICTA_OCR_URL = 'https://segmentserver.dicta.org.il/ocr/';
const DICTA_PARALLELS_BASE_URL = 'https://parallels-2-1.loadbalancer.dicta.org.il/parallels/api';

const asRecord = (value: unknown): UnknownRecord | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const parseDictaParallelsResponse = (payload: unknown): DictaParallelItem[] => {
  const root = asRecord(payload);
  if (!root) return [];

  const results = root.results;
  if (!Array.isArray(results) || results.length === 0) return [];

  const firstGroup = asRecord(results[0]);
  if (firstGroup && Array.isArray(firstGroup.data)) {
    return firstGroup.data
      .map((item) => asRecord(item))
      .filter((item): item is DictaParallelItem => item !== null);
  }

  return results
    .map((item) => asRecord(item))
    .filter((item): item is DictaParallelItem => item !== null);
};

const runDictaOcr = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile, imageFile.name || 'capture.jpg');

  const response = await fetch(DICTA_OCR_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Dicta OCR failed with status ${response.status}`);
  }

  const data = (await response.json()) as { text?: unknown };
  return typeof data.text === 'string' ? data.text.trim() : '';
};

const runDictaParallels = async (ocrText: string): Promise<DictaParallelItem[]> => {
  const endpoint = `${DICTA_PARALLELS_BASE_URL}/findincorpus?minthreshold=10&maxdistance=4`;
  const body = `text=${encodeURIComponent(ocrText)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Dicta parallels failed with status ${response.status}`);
  }

  const data = await response.json();
  return parseDictaParallelsResponse(data);
};

const analyzeDictaImage = async (imageFile: File): Promise<DictaAnalysisResult> => {
  const ocrText = await runDictaOcr(imageFile);
  if (!ocrText) {
    return { ocrText: '', parallels: [] };
  }

  const parallels = await runDictaParallels(ocrText);
  return { ocrText, parallels };
};

export type { DictaParallelItem, DictaAnalysisResult };
export { analyzeDictaImage };
