// mammoth ships no TypeScript declarations; only the subset we use is typed here.
declare module "mammoth" {
  export interface ExtractRawTextResult {
    value: string
    messages: unknown[]
  }

  export function extractRawText(input: {
    buffer: Buffer
  }): Promise<ExtractRawTextResult>

  export interface MammothImageElement {
    contentType: string
    altText?: string
    read(encoding?: "base64"): Promise<string>
    read(): Promise<Buffer>
    readAsBase64String(): Promise<string>
  }

  export interface ConvertToHtmlResult {
    value: string
    messages: unknown[]
  }

  export function convertToHtml(
    input: { buffer: Buffer },
    options?: {
      convertImage?: (element: MammothImageElement, messages: unknown[]) => unknown
    }
  ): Promise<ConvertToHtmlResult>

  export const images: {
    imgElement: (
      func: (element: MammothImageElement) => unknown
    ) => (element: MammothImageElement, messages: unknown[]) => unknown
  }
}
