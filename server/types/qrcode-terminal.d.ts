/**
 * Type declarations for qrcode-terminal
 * Provides QR code generation in terminal
 */

declare module 'qrcode-terminal' {
  interface GenerateOptions {
    small?: boolean;
  }

  function generate(qrString: string, options?: GenerateOptions): void;
  function setErrorLevel(level: 'L' | 'M' | 'Q' | 'H'): void;

  export { generate, setErrorLevel };
}
