import { createRequire } from 'node:module'

import type { RealDb, TorahRef } from '../src/types/index.ts'

type RefPropertyName = 'refEndPartial' | 'refEnd'

type TargetSpecific = 'both' | 'gola' | 'israel'

interface ReadingTargetForScript {
  key: string
  specific: TargetSpecific
  ref: TorahRef
  refEndPartial?: TorahRef
  refEnd: TorahRef
}

interface QuestionableReferenceReportItem {
  id: string
  specific: TargetSpecific
  propertyName: RefPropertyName
  ref: TorahRef
  calculatedPage: number
  nextPageStart: TorahRef
  isAlreadyMarkedOnNextPage: boolean
  reason: 'next-verse' | 'next-perek' | 'next-book'
}

const require = createRequire(import.meta.url)

const realDb = require('../src/data/real_db.json') as RealDb
const targetPages = require('../src/data/target_pages.json') as ReadingTargetForScript[]

const referencePropertyNames: RefPropertyName[] = ['refEndPartial', 'refEnd']
const startingReferences = targetPages.map((target) => ({
  id: target.key,
  specific: target.specific,
  ref: target.ref,
}))

const getPageNumber = (
  realDbData: RealDb,
  bookNumber: number,
  chapterNumber: number,
  verseNumber: number
): number => {
  if (bookNumber < 1 || bookNumber > 5) return 0

  const bookData = realDbData[bookNumber - 1]

  if (!bookData || bookData.length === 0) return 0

  const [firstChapter, firstVerse, firstPage] = bookData[0]

  if (chapterNumber < firstChapter || (chapterNumber === firstChapter && verseNumber < firstVerse)) {
    if (bookNumber === 1) return 0

    return firstPage - 1
  }

  let left = 0
  let right = bookData.length - 1
  let resultPage = 0

  while (left <= right) {
    const mid = (left + right) >> 1
    const [chapter, verse, page] = bookData[mid]

    if (chapter < chapterNumber || (chapter === chapterNumber && verse <= verseNumber)) {
      resultPage = page
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return resultPage
}

const getPageStartRef = (realDbData: RealDb, pageNumber: number): TorahRef | null => {
  for (let bookIndex = 0; bookIndex < realDbData.length; bookIndex++) {
    const firstVerseOnPage = realDbData[bookIndex].find(([, , page]) => page === pageNumber)

    if (firstVerseOnPage) {
      const [chapter, verse, page] = firstVerseOnPage

      return {
        book: bookIndex + 1,
        chapter,
        verse,
        page,
      }
    }
  }

  return null
}

const getReason = (
  reference: TorahRef,
  nextPageStart: TorahRef | null
): QuestionableReferenceReportItem['reason'] | null => {
  if (!nextPageStart) return null

  const isNextVerseInSameChapter = (
    nextPageStart.book === reference.book &&
    nextPageStart.chapter === reference.chapter &&
    nextPageStart.verse === reference.verse + 1
  )

  if (isNextVerseInSameChapter) return 'next-verse'

  const isFirstVerseOfNextChapter = (
    nextPageStart.book === reference.book &&
    nextPageStart.chapter === reference.chapter + 1 &&
    nextPageStart.verse === 1 &&
    reference.verse >= 12
  )

  if (isFirstVerseOfNextChapter) return 'next-perek'

  const isFirstVerseOfNextBook = (
    nextPageStart.book === reference.book + 1 &&
    nextPageStart.chapter === 1 &&
    nextPageStart.verse === 1
  )

  if (isFirstVerseOfNextBook) return 'next-book'

  return null
}

const compareRefs = (left: TorahRef, right: TorahRef): number => {
  if (left.book !== right.book) return left.book - right.book
  if (left.chapter !== right.chapter) return left.chapter - right.chapter
  return left.verse - right.verse
}

const hasLaterStartOnSamePage = (reference: TorahRef): boolean => {
  return startingReferences.some(({ ref }) => (
    ref.page === reference.page &&
    compareRefs(ref, reference) > 0
  ))
}

const formatRef = (reference: TorahRef): string => {
  return `${reference.book}-${reference.chapter}-${reference.verse} (page ${reference.page})`
}

const formatReason = (reason: QuestionableReferenceReportItem['reason']): string => {
  if (reason === 'next-verse') return 'next page starts with the next verse'
  if (reason === 'next-perek') return 'next page starts with the first verse of the next perek'
  return 'next page starts with the first verse of the next book'
}

const formatReportLine = (item: QuestionableReferenceReportItem): string => {
  const status = item.isAlreadyMarkedOnNextPage
    ? `already marked on next page (${item.calculatedPage} -> ${item.ref.page})`
    : `needs review (currently on page ${item.ref.page}, next page would be ${item.calculatedPage + 1})`

  return [
    `- ${item.id} | ${item.specific} | ${item.propertyName}`,
    `  ref: ${formatRef(item.ref)}`,
    `  next page start: ${formatRef(item.nextPageStart)}`,
    `  reason: ${formatReason(item.reason)}`,
    `  status: ${status}`,
  ].join('\n')
}

const getQuestionableReferenceReport = (): QuestionableReferenceReportItem[] => {
  return targetPages.flatMap((target) =>
    referencePropertyNames.flatMap((propertyName) => {
      const reference = target[propertyName]

      if (!reference) return []

      const calculatedPage = getPageNumber(realDb, reference.book, reference.chapter, reference.verse)
      const nextPageStart = getPageStartRef(realDb, calculatedPage + 1)
      const reason = getReason(reference, nextPageStart)
      const isAlreadyMarkedOnNextPage = reference.page === calculatedPage + 1

      if (!nextPageStart || !reason) return []
      if (!isAlreadyMarkedOnNextPage && hasLaterStartOnSamePage(reference)) return []

      return [{
        id: target.key,
        specific: target.specific,
        propertyName,
        ref: reference,
        calculatedPage,
        nextPageStart,
        isAlreadyMarkedOnNextPage,
        reason,
      }]
    })
  )
}

const reportItems = getQuestionableReferenceReport()
const alreadyOnNextPageItems = reportItems.filter((item) => item.isAlreadyMarkedOnNextPage)
const reviewItems = reportItems.filter((item) => !item.isAlreadyMarkedOnNextPage)

const outputLines = [
  `Questionable references: ${reportItems.length}`,
  '',
  `Need review: ${reviewItems.length}`,
  ...(reviewItems.length > 0 ? reviewItems.map(formatReportLine) : ['- none']),
  '',
  `Already on next page: ${alreadyOnNextPageItems.length}`,
  ...(alreadyOnNextPageItems.length > 0 ? alreadyOnNextPageItems.map(formatReportLine) : ['- none']),
]

console.log(outputLines.join('\n'))
