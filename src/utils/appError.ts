
export class AppError extends Error {
  statusCode: number;
  errorDetails: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    errorDetails: unknown = null
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
