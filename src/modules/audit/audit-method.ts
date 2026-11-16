const METHODS_TO_AUDIT = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function shouldAuditMethod(method: string): boolean {
  return METHODS_TO_AUDIT.has(method.toUpperCase());
}
