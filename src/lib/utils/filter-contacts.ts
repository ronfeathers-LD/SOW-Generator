export function filterContacts<T extends { Name?: string; Email?: string; Title?: string }>(
  contacts: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;
  return contacts.filter((c) =>
    [c.Name, c.Email, c.Title].some((v) => v?.toLowerCase().includes(q))
  );
}
