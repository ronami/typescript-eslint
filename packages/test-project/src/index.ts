export function noCommonRoot(
  // paths: string[],
  // foos: [string, string],
  bars: Record<string, string>[] | number[] | string[],
  // bazzs: [string, Record<string, string>],
): string {
  return `

${bars.join('\n')}

  `.trim();
}
