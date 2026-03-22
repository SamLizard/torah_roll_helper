import targetsData from '@/data/target_pages.json';
import type { TorahRef } from '@/types';

type TargetSpecific = 'both' | 'gola' | 'israel'
type TargetType = 'parasha' | 'holyday'
type TargetBadgeKind = Exclude<TargetSpecific, 'both'>

interface ReadingTarget {
  key: string
  group: string
  specific: TargetSpecific
  type: TargetType
  ref: TorahRef
  refEndPartial?: TorahRef
  refEnd: TorahRef
}

const readingTargets = targetsData as ReadingTarget[]

const matchesTargetSpecific = (specific: TargetSpecific, isInGola: boolean) => {
  if (specific === 'both') return true
  return isInGola ? specific === 'gola' : specific === 'israel'
}

const isTargetVisible = (target: ReadingTarget, isInGola: boolean) => {
  return matchesTargetSpecific(target.specific, isInGola)
}

const findReadingTargetByKey = (key: string, isInGola: boolean) => {
  return readingTargets.find((target) => target.key === key && isTargetVisible(target, isInGola)) ?? null
}

const getVisibleReadingTargets = (isInGola: boolean) => {
  return readingTargets.filter((target) => isTargetVisible(target, isInGola))
}

const getTargetBadgeKind = (target: ReadingTarget): TargetBadgeKind | null => {
  return target.specific === 'both' ? null : target.specific
}

export {
  findReadingTargetByKey,
  getTargetBadgeKind,
  getVisibleReadingTargets,
  isTargetVisible,
  matchesTargetSpecific,
  readingTargets,
}

export type {
  ReadingTarget,
  TargetBadgeKind,
  TargetSpecific,
  TargetType,
}
