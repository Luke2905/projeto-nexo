export function userFacingError(
  error: { message?: string } | null | undefined,
  fallback = "Não foi possível concluir esta ação. Tente novamente.",
) {
  const message = error?.message?.trim();
  if (
    !message ||
    /^[\[{]/.test(message) ||
    /invalid_(?:type|value)|invalid option|expected one of|zoderror/i.test(message)
  ) {
    return fallback;
  }
  return message;
}
