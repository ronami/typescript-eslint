export function noCommonRoot(
  paths: string[],
  foos: [string, string],
  bars: Record<string, string>[],
  bazzs: [string, Record<string, string>],
): string {
  return `

${paths.join('\n')}

${foos.join('\n')}

${bars.join('\n')}

${bazzs.join('\n')}

  `.trim();
}
