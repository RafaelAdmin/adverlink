export class DealActionError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'DealActionError'
    this.status = status
  }
}

export function isDealActionError(error: unknown): error is DealActionError {
  return error instanceof DealActionError
}
