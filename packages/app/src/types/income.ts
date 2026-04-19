export enum IncomeSource {
  MANUAL   = 0,
  PRIVARA  = 1,
  BANK_LINK = 2,
  PAYROLL  = 3,
}

const SOURCE_LABELS: Record<IncomeSource, string> = {
  [IncomeSource.MANUAL]:    'Manual',
  [IncomeSource.PRIVARA]:   'Privara',
  [IncomeSource.BANK_LINK]: 'Banco',
  [IncomeSource.PAYROLL]:   'Nómina',
}

const SOURCE_ICONS: Record<IncomeSource, string> = {
  [IncomeSource.MANUAL]:    '✏️',
  [IncomeSource.PRIVARA]:   '🔐',
  [IncomeSource.BANK_LINK]: '🏦',
  [IncomeSource.PAYROLL]:   '💼',
}

export function getSourceLabel(source: number): string {
  return SOURCE_LABELS[source as IncomeSource] ?? 'Desconocido'
}

export function getSourceIcon(source: number): string {
  return SOURCE_ICONS[source as IncomeSource] ?? '❓'
}
