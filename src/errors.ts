export class OasgError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'OasgError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends OasgError {
  constructor(subject: 'policy' | 'request' | 'decision' | 'evidence' | 'x402' | 'safe', details: unknown) {
    super('VALIDATION_ERROR', `Invalid ${subject} input.`, details);
    this.name = 'ValidationError';
  }
}
