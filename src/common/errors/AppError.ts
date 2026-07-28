export class AppError extends Error {
  statusCode: number;
  errorDetails: unknown;

  constructor(
    message: string,
    statusCode = 500,
    errorDetails: unknown = null
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
  }
}