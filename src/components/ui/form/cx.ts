/** Minimal className combiner — joins truthy class strings with a space. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
