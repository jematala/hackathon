type ClerkErrorShape = {
  errors?: { code?: string; longMessage?: string; message?: string }[];
};

export function clerkErrorMessage(err: unknown): string {
  const first = (err as ClerkErrorShape)?.errors?.[0];
  if (first?.code === "form_password_incorrect") {
    return "password is incorrect — try again";
  }
  return first?.longMessage ?? first?.message ?? "something went wrong — try again";
}
