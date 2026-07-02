type ClerkErrorShape = {
  errors?: { longMessage?: string; message?: string }[];
};

export function clerkErrorMessage(err: unknown): string {
  const first = (err as ClerkErrorShape)?.errors?.[0];
  return first?.longMessage ?? first?.message ?? "something went wrong — try again";
}
