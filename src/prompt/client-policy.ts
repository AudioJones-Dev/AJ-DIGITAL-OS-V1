export const buildClientPolicy = (
  clientId: string,
  clientConstraints?: Record<string, unknown>,
): string => {
  const constraints = clientConstraints && Object.keys(clientConstraints).length > 0
    ? JSON.stringify(clientConstraints, null, 2)
    : "No additional client constraints were provided.";

  return [
    `Client policy for "${clientId}":`,
    constraints,
  ].join("\n");
};
