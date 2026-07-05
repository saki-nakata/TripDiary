export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  details?: Record<string, string[] | undefined>;

  constructor(message = "Validation failed", details?: Record<string, string[] | undefined>) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}
