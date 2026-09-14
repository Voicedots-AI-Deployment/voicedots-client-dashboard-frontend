// Display formatting only: preserve stored names, codes and login identifiers.
export function displayName(value?: string) {
 const text=(value || '').trim().toLocaleLowerCase();
 return text ? text.charAt(0).toLocaleUpperCase()+text.slice(1) : '';
}
