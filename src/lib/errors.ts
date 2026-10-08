export type ApiErrorCode =
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BUSINESS_SUSPENDED"
  | "INSUFFICIENT_CREDITS"
  | "INVALID_PHONE_NUMBER"
  | "INVALID_MESSAGE"
  | "PAYMENT_FAILED"
  | "PAYMENT_NOT_VERIFIED"
  | "SMS_PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorBody(code: ApiErrorCode, message: string) {
  return { success: false as const, error: { code, message } };
}

export function ok<T>(data: T) {
  return { success: true as const, data };
}
