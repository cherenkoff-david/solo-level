import type { EventType, SourceType } from './types.ts';

export interface LedgerEntry {
  id: string;
  occurredAt: string;
  sourceType: SourceType;
  sourceId: string;
  eventType: EventType;
  periodKey: string;
  sphereId: string | null;
  baseXp: number;
  bonusXp: number;
  totalXp: number;
  ruleVersion: string;
  reversesId: string | null;
}

export function idempotencyKey(
  sourceType: SourceType,
  sourceId: string,
  periodKey: string,
  eventType: EventType,
): string {
  return `${sourceType}:${sourceId}:${periodKey}:${eventType}`;
}

export function ledgerEntryKey(entry: LedgerEntry): string {
  return idempotencyKey(
    entry.sourceType,
    entry.sourceId,
    entry.periodKey,
    entry.eventType,
  );
}

export function isReversal(entry: LedgerEntry): boolean {
  return entry.eventType === 'reversal' || entry.reversesId !== null;
}

export function totalXpFromLedger(entries: readonly LedgerEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.totalXp, 0);
}

export function sphereXpFromLedger(
  entries: readonly LedgerEntry[],
  sphereId: string,
): number {
  return entries
    .filter((entry) => entry.sphereId === sphereId)
    .reduce((sum, entry) => sum + entry.totalXp, 0);
}

export class DuplicateRewardError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`Награда уже начислена: ${key}`);
    this.name = 'DuplicateRewardError';
    this.key = key;
  }
}

export function appendEntry(
  entries: readonly LedgerEntry[],
  entry: LedgerEntry,
): LedgerEntry[] {
  const key = ledgerEntryKey(entry);
  const exists = entries.some((existing) => ledgerEntryKey(existing) === key);
  if (exists) {
    throw new DuplicateRewardError(key);
  }
  return [...entries, entry];
}

export function appendEntryIdempotent(
  entries: readonly LedgerEntry[],
  entry: LedgerEntry,
): LedgerEntry[] {
  const key = ledgerEntryKey(entry);
  const exists = entries.some((existing) => ledgerEntryKey(existing) === key);
  if (exists) {
    return [...entries];
  }
  return [...entries, entry];
}

export function createReversal(
  entries: readonly LedgerEntry[],
  targetId: string,
  newId: string,
  occurredAt: string,
): LedgerEntry[] {
  const target = entries.find((entry) => entry.id === targetId);
  if (!target) {
    throw new Error(`Запись не найдена: ${targetId}`);
  }
  const alreadyReversed = entries.some((entry) => entry.reversesId === targetId);
  if (alreadyReversed) {
    return [...entries];
  }
  const reversal: LedgerEntry = {
    id: newId,
    occurredAt,
    sourceType: target.sourceType,
    sourceId: target.sourceId,
    eventType: 'reversal',
    periodKey: target.periodKey,
    sphereId: target.sphereId,
    baseXp: 0,
    bonusXp: 0,
    totalXp: -target.totalXp,
    ruleVersion: target.ruleVersion,
    reversesId: targetId,
  };
  return [...entries, reversal];
}

export function isReversed(
  entries: readonly LedgerEntry[],
  entryId: string,
): boolean {
  return entries.some((entry) => entry.reversesId === entryId);
}
