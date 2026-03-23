import { HDate } from '@hebcal/hdate';
import { getLeyningOnDate } from '@hebcal/leyning/dist/esm/getLeyningOnDate';
import type { Leyning, LeyningWeekday } from '@hebcal/leyning/dist/esm/types';
import { useOptionsStore } from '@/stores/options';
import { slugify } from './tikkun_io_utils';

export interface MonthlyReadingEntry {
  readingId: string
  dates: string[]
}

export interface MonthlyReadings {
  lastMonth: MonthlyReadingEntry[]
  nextMonth: MonthlyReadingEntry[]
}

type TorahOccurrence = {
  readingId: string
  dateIso: string
}

type Group = {
  readingId: string
  dates: Set<string>
}

type AliyotMap = NonNullable<Leyning['fullkriyah']>
type Aliyah = AliyotMap[keyof AliyotMap]

const PARSHA_IDS = [
  'bereshit',
  'noach',
  'lech_lecha',
  'vayera',
  'chayei_sara',
  'toldot',
  'vayetzei',
  'vayishlach',
  'vayeshev',
  'miketz',
  'vayigash',
  'vayechi',
  'shemot',
  'vaera',
  'bo',
  'beshalach',
  'yitro',
  'mishpatim',
  'terumah',
  'tetzaveh',
  'ki_tisa',
  'vayakhel',
  'pekudei',
  'vayikra',
  'tzav',
  'shmini',
  'tazria',
  'metzora',
  'achrei_mot',
  'kedoshim',
  'emor',
  'behar',
  'bechukotai',
  'bamidbar',
  'nasso',
  'behaalotcha',
  'shlach',
  'korach',
  'chukat',
  'balak',
  'pinchas',
  'matot',
  'masei',
  'devarim',
  'vaetchanan',
  'eikev',
  'reeh',
  'shoftim',
  'ki_teitzei',
  'ki_tavo',
  'nitzavim',
  'vayeilech',
  'haazinu',
  'vezot_haberakhah',
]

const FAST_DAY_MINCHA_TITLES = new Set([
  "Tish'a B'Av (Mincha)",
  "Ta'anit Esther (Mincha)",
  'Tzom Gedaliah (Mincha)',
  'Tzom Tammuz (Mincha)',
  "Asara B'Tevet (Mincha)",
])

const FAST_DAY_TITLES = [
  "Ta'anit Esther",
  'Tzom Gedaliah',
  'Tzom Tammuz',
  "Asara B'Tevet",
]

const PESACH_CHOL_HAMOED_READING_ID_BY_START: Record<string, string> = {
  'Leviticus|22:26': 'pesach-2',
  'Exodus|13:1': 'pesach-3',
  'Exodus|22:24': 'pesach-4',
  'Exodus|34:1': 'pesach-5',
  'Numbers|9:1': 'pesach-6',
}

const CHANUKAH_RANGE_BY_ID: Record<string, { b: string; e: string }> = {
  'chanukah-1': { b: '6:22', e: '7:17' },
  'chanukah-2': { b: '7:18', e: '7:23' },
  'chanukah-3': { b: '7:24', e: '7:29' },
  'chanukah-4': { b: '7:30', e: '7:35' },
  'chanukah-5': { b: '7:36', e: '7:41' },
  'chanukah-6': { b: '7:42', e: '7:47' },
  'chanukah-7': { b: '7:48', e: '7:53' },
  'chanukah-8': { b: '7:54', e: '8:4' },
}

const CHANUKAH_READING_ID_BY_START = Object.entries(CHANUKAH_RANGE_BY_ID).reduce<
  Record<string, string>
>((acc, [readingId, range]) => {
  acc[`Numbers|${range.b}`] = readingId
  return acc
}, {})

CHANUKAH_READING_ID_BY_START['Numbers|7:1'] = 'chanukah-1'

const PAIRED_PARASHA_READING_ID_SEPARATOR = '::'

const generateMonthlyReadings = (
  day: Date = new Date()
): MonthlyReadings => {
  const today = atNoon(day)
  const optionsStore = useOptionsStore()
  const isIsrael = !optionsStore.isInGola

  return {
    lastMonth: collectRange({
      start: addMonths(today, -1),
      end: today,
      isIsrael,
    }),
    nextMonth: collectRange({
      start: today,
      end: addMonths(today, 1),
      isIsrael,
    }),
  }
}

const collectRange = ({
  start,
  end,
  isIsrael,
}: {
  start: Date
  end: Date
  isIsrael: boolean
}): MonthlyReadingEntry[] => {
  const groups = new Map<string, Group>()

  for (const day of eachDate(start, end)) {
    const leinings = getLeyningOnDate(new HDate(day), isIsrael, true)
    for (const leining of leinings) {
      for (const occurrence of getTorahOccurrences(day, leining, isIsrael)) {
        const existing = groups.get(occurrence.readingId)
        if (!existing) {
          groups.set(occurrence.readingId, {
            readingId: occurrence.readingId,
            dates: new Set([occurrence.dateIso]),
          })
          continue
        }

        existing.dates.add(occurrence.dateIso)
      }
    }

    for (const occurrence of getPreviousShabbatParashaOccurrences(day, isIsrael)) {
      const existing = groups.get(occurrence.readingId)
      if (!existing) {
        groups.set(occurrence.readingId, {
          readingId: occurrence.readingId,
          dates: new Set([occurrence.dateIso]),
        })
        continue
      }

      existing.dates.add(occurrence.dateIso)
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      readingId: group.readingId,
      dates: Array.from(group.dates).sort(),
    }))
    .sort(compareByFirstDateThenId)
}

const getTorahOccurrences = (
  day: Date,
  leining: Leyning | LeyningWeekday,
  isIsrael: boolean
): TorahOccurrence[] => {
  const titleEn = normalizeTitleEn(leining.name.en)
  const dateIso = toISODateString(day)
  const hasFullKriyah = 'fullkriyah' in leining && Boolean(leining.fullkriyah)

  const results: TorahOccurrence[] = []

  if (leining.weekday && (leining.parsha || !hasFullKriyah)) {
    results.push({
      readingId: toCanonicalReadingId(leining, titleEn, isIsrael),
      dateIso,
    })
  }

  if ('fullkriyah' in leining && leining.fullkriyah) {
    if (leining.parsha) {
      results.push({
        readingId: toCanonicalReadingId(leining, titleEn, isIsrael),
        dateIso,
      })

      const specialMaftirReadingId = toParshaSpecialMaftirReadingId({
        reason: leining.fullkriyah.M?.reason,
        maftirAliyah: leining.fullkriyah.M,
      })
      if (specialMaftirReadingId) {
        results.push({
          readingId: specialMaftirReadingId,
          dateIso,
        })
      }

      if (isShabbatRoshChodeshAliyah(leining.fullkriyah['7'])) {
        results.push({
          readingId: 'rosh-chodesh-special',
          dateIso,
        })
      }
    } else {
      for (const readingId of resolveHolidayReadingIds({
        day,
        titleEn,
        aliyotMap: leining.fullkriyah,
        isIsrael,
      })) {
        results.push({
          readingId,
          dateIso,
        })
      }
    }
  }

  return results
}

const getPreviousShabbatParashaOccurrences = (day: Date, isIsrael: boolean) => {
  if (day.getDay() !== 6) return []

  const nextShabbat = atNoon(new Date(day))
  nextShabbat.setDate(nextShabbat.getDate() + 7)

  const nextParshaLeining = getLeyningOnDate(new HDate(nextShabbat), isIsrael, true).find(
    (candidate) => candidate.parsha && 'fullkriyah' in candidate && candidate.fullkriyah
  )
  if (!nextParshaLeining?.parsha) return []

  return [
    {
      readingId: toCanonicalReadingId(
        nextParshaLeining,
        normalizeTitleEn(nextParshaLeining.name.en),
        isIsrael
      ),
      dateIso: toISODateString(day),
    },
  ]
}

const normalizeTitleEn = (title: string) => {
  return title.replace(/-/g, ' ').trim()
}

const toCanonicalReadingId = (
  leining: Leyning | LeyningWeekday,
  titleEn: string,
  isIsrael: boolean
) => {
  if (leining.parsha) {
    const parshaIds = parshaIdsFromLeining(leining, titleEn)
    if (parshaIds.length >= 2) {
      return toPairedParashaReadingId(parshaIds[0], parshaIds[1])
    }
    return parshaIds[0]
  }

  return holidayIdFromTitle(titleEn, isIsrael)
}

const parshaIdsFromLeining = (leining: Leyning | LeyningWeekday, titleEn: string) => {
  const rawParshaNum = leining.parshaNum
  const parshaNums = Array.isArray(rawParshaNum) ? rawParshaNum : [rawParshaNum]
  const fromParshaNums = parshaNums
    .map((parshaNum) => parshaIdFromNumber(parshaNum))
    .filter((parshaId): parshaId is string => parshaId !== null)
  if (fromParshaNums.length > 0) return uniqueParashaIds(fromParshaNums)

  const rawParshaNames = leining.parsha
  const parshaNames = Array.isArray(rawParshaNames) ? rawParshaNames : [rawParshaNames]
  const fromParshaNames = parshaNames
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .map((name) => toParashaReadingId(name))
  if (fromParshaNames.length > 0) return uniqueParashaIds(fromParshaNames)

  const fromTitleParts = titleEn
    .split('-')
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name) => toParashaReadingId(name))
  if (fromTitleParts.length > 0) return uniqueParashaIds(fromTitleParts)

  return [toParashaReadingId(titleEn)]
}

const parshaIdFromNumber = (parshaNum: unknown) => {
  if (typeof parshaNum !== 'number') return null
  if (parshaNum < 1 || parshaNum > PARSHA_IDS.length) return null
  return PARSHA_IDS[parshaNum - 1]
}

const uniqueParashaIds = (parashaIds: string[]) => {
  return Array.from(new Set(parashaIds))
}

const toPairedParashaReadingId = (firstParashaId: string, secondParashaId: string) => {
  return `${firstParashaId}${PAIRED_PARASHA_READING_ID_SEPARATOR}${secondParashaId}`
}

const splitPairedParashaReadingId = (readingId: string): [string, string] | null => {
  const [firstParashaId, secondParashaId, ...rest] =
    readingId.split(PAIRED_PARASHA_READING_ID_SEPARATOR)
  if (rest.length > 0) return null
  if (!firstParashaId || !secondParashaId) return null
  return [firstParashaId, secondParashaId]
}

const holidayIdFromTitle = (titleEn: string, isIsrael = false): string => {
  if (titleEn.startsWith('Erev Simchat Torah')) return 'vezot_haberakhah'
  if (titleEn.startsWith('Rosh Chodesh')) return 'rosh-chodesh'

  if (FAST_DAY_MINCHA_TITLES.has(titleEn)) return 'taanit-tzibur'
  if (FAST_DAY_TITLES.some((fastDayTitle) => titleEn.startsWith(fastDayTitle))) {
    return 'taanit-tzibur'
  }

  if (titleEn.startsWith("Tish'a B'Av")) return 'tisha-bav'
  if (titleEn.startsWith('Rosh Hashana II')) return 'rosh-2'
  if (titleEn.startsWith('Rosh Hashana I')) return 'rosh-1'
  if (titleEn.startsWith('Yom Kippur (Mincha)')) return 'yom-kippur-mincha'
  if (titleEn.startsWith('Yom Kippur')) return 'yom-kippur'
  if (titleEn.startsWith('Purim') || titleEn.startsWith('Shushan Purim')) return 'purim'

  if (titleEn.startsWith('Sukkot Shabbat Chol ha Moed')) return 'sukkot-shabbat-chol-hamoed'
  if (titleEn.startsWith('Sukkot Final Day')) return 'sukkot-7'
  if (titleEn.startsWith('Sukkot Chol ha Moed Day ')) {
    const readingId = resolveSukkotCholHamoedReadingId({ titleEn, isIsrael })
    if (readingId) return readingId
  }
  if (titleEn.startsWith('Sukkot II')) return 'sukkot-2'
  if (titleEn.startsWith('Sukkot I')) return 'sukkot-1'

  if (titleEn.startsWith('Shmini Atzeret')) {
    return titleEn.includes('(on Shabbat)')
      ? 'shmini-atzeret-shabbat'
      : 'shmini-atzeret'
  }

  if (titleEn.startsWith('Simchat Torah')) return 'simchat-torah-a'

  if (titleEn.startsWith('Shavuot II')) {
    return titleEn.includes('(on Shabbat)') ? 'shavuot-2-shabbat' : 'shavuot-2'
  }
  if (titleEn.startsWith('Shavuot I') || titleEn === 'Shavuot') return 'shavuot-1'

  if (titleEn.startsWith('Pesach Shabbat Chol ha Moed')) return 'pesach-shabbat-chol-hamoed'
  if (titleEn.startsWith('Pesach I (on Shabbat)')) return 'pesach-1-shabbat'
  if (titleEn.startsWith('Pesach VIII')) {
    return titleEn.includes('(on Shabbat)') ? 'pesach-8-shabbat' : 'pesach-8'
  }
  if (titleEn.startsWith('Pesach VII')) return 'pesach-7'
  if (titleEn.startsWith("Pesach II (CH''M)")) return 'pesach-2'
  if (titleEn.startsWith("Pesach III (CH''M)")) return 'pesach-3'
  if (titleEn.startsWith("Pesach IV (CH''M)")) return 'pesach-4'
  if (titleEn.startsWith("Pesach V (CH''M)")) return 'pesach-5'
  if (titleEn.startsWith("Pesach VI (CH''M)")) return 'pesach-6'
  if (titleEn.startsWith('Pesach Chol ha Moed Day ')) {
    const dayNumber = extractDayNumber(titleEn)
    if (dayNumber != null) return `pesach-${dayNumber + 2}`
  }
  if (titleEn.startsWith('Pesach II')) return 'pesach-2'
  if (titleEn.startsWith('Pesach I')) return 'pesach-1'

  if (titleEn.startsWith('Chanukah Day ')) {
    const dayNumber = extractDayNumber(titleEn)
    if (dayNumber != null && dayNumber >= 1 && dayNumber <= 8) {
      return `chanukah-${dayNumber}`
    }
  }

  return toRepositoryReadingId(titleEn)
}

const resolveHolidayReadingIds = ({
  day,
  titleEn,
  aliyotMap,
  isIsrael,
}: {
  day: Date
  titleEn: string
  aliyotMap: AliyotMap
  isIsrael: boolean
}) => {
  if (titleEn.startsWith('Yom Kippur (Mincha)')) return ['yom-kippur-mincha']
  if (FAST_DAY_MINCHA_TITLES.has(titleEn)) return ['taanit-tzibur']
  if (titleEn.startsWith('Erev Simchat Torah')) return ['vezot_haberakhah']

  if (titleEn.startsWith('Chanukah Day ')) {
    return resolveChanukahReadingIds({
      titleEn,
      aliyotMap,
    })
  }

  if (titleEn.startsWith('Simchat Torah')) {
    const orderedAliyot = getOrderedAliyot({ aliyotMap })
    const results = ['simchat-torah-a']

    const bereshitAliyah = orderedAliyot[orderedAliyot.length - 1]
    if (bereshitAliyah?.k === 'Genesis') {
      results.push('simchat-torah-b')
    }

    if (aliyotMap.M) {
      results.push('sukkot-end-maftir')
    }

    return results
  }

  const readingId = resolveHolidayMainReadingId({
    day,
    titleEn,
    aliyotMap,
    isIsrael,
  })
  const split = splitHolidayAliyot({
    titleEn,
    readingId,
    aliyotMap,
    isIsrael,
  })

  const results = split.hasMain ? [readingId] : []
  if (split.hasMaftir) {
    results.push(toHolidayMaftirReadingId(readingId, titleEn))
  }

  return results
}

const resolveHolidayMainReadingId = ({
  day,
  titleEn,
  aliyotMap,
  isIsrael,
}: {
  day: Date
  titleEn: string
  aliyotMap: AliyotMap
  isIsrael: boolean
}) => {
  if (titleEn.startsWith('Rosh Chodesh')) return 'rosh-chodesh'

  if (FAST_DAY_MINCHA_TITLES.has(titleEn)) return 'taanit-tzibur'
  if (FAST_DAY_TITLES.some((fastDayTitle) => titleEn.startsWith(fastDayTitle))) {
    return 'taanit-tzibur'
  }

  if (titleEn.startsWith("Tish'a B'Av")) return 'tisha-bav'
  if (titleEn.startsWith('Rosh Hashana II')) return 'rosh-2'
  if (titleEn.startsWith('Rosh Hashana I')) return 'rosh-1'
  if (titleEn.startsWith('Yom Kippur')) return 'yom-kippur'
  if (titleEn.startsWith('Purim') || titleEn.startsWith('Shushan Purim')) return 'purim'

  if (titleEn.startsWith('Sukkot Shabbat Chol ha Moed')) return 'sukkot-shabbat-chol-hamoed'
  if (titleEn.startsWith('Sukkot Final Day')) return 'sukkot-7'
  if (titleEn.startsWith('Sukkot Chol ha Moed Day ')) {
    const readingId = resolveSukkotCholHamoedReadingId({ titleEn, isIsrael })
    if (readingId) return readingId
  }
  if (titleEn.startsWith('Sukkot II')) return 'sukkot-2'
  if (titleEn.startsWith('Sukkot I')) return 'sukkot-1'

  if (titleEn.startsWith('Shmini Atzeret')) {
    return titleEn.includes('(on Shabbat)')
      ? 'shmini-atzeret-shabbat'
      : 'shmini-atzeret'
  }

  if (titleEn.startsWith('Shavuot II')) {
    return titleEn.includes('(on Shabbat)') ? 'shavuot-2-shabbat' : 'shavuot-2'
  }
  if (titleEn.startsWith('Shavuot I') || titleEn === 'Shavuot') return 'shavuot-1'

  if (titleEn.startsWith('Pesach Shabbat Chol ha Moed')) return 'pesach-shabbat-chol-hamoed'
  if (titleEn.startsWith('Pesach I (on Shabbat)')) return 'pesach-1-shabbat'
  if (titleEn.startsWith('Pesach VIII')) {
    return titleEn.includes('(on Shabbat)') ? 'pesach-8-shabbat' : 'pesach-8'
  }
  if (titleEn.startsWith('Pesach VII')) return 'pesach-7'
  if (titleEn.startsWith('Erev Simchat Torah')) return 'vezot_haberakhah'
  if (isPesachCholHamoedTitle(titleEn)) {
    const shabbatInterruptedIsraelReadingId = resolvePesachShabbatInterruptedIsraelReadingId({
      day,
      titleEn,
      isIsrael,
    })
    if (shabbatInterruptedIsraelReadingId) return shabbatInterruptedIsraelReadingId

    const readingId = resolvePesachCholHamoedReadingId(aliyotMap)
    if (readingId) return readingId

    if (titleEn.startsWith("Pesach II (CH''M)")) return 'pesach-2'
    if (titleEn.startsWith("Pesach III (CH''M)")) return 'pesach-3'
    if (titleEn.startsWith("Pesach IV (CH''M)")) return 'pesach-4'
    if (titleEn.startsWith("Pesach V (CH''M)")) return 'pesach-5'
    if (titleEn.startsWith("Pesach VI (CH''M)")) return 'pesach-6'

    const dayNumber = extractDayNumber(titleEn)
    if (dayNumber != null) return `pesach-${dayNumber + 2}`
  }
  if (titleEn.startsWith('Pesach II')) return 'pesach-2'
  if (titleEn.startsWith('Pesach I')) return 'pesach-1'

  if (titleEn.startsWith('Chanukah Day ')) {
    const dayNumber = extractDayNumber(titleEn)
    if (dayNumber != null && dayNumber >= 1 && dayNumber <= 8) {
      return `chanukah-${dayNumber}`
    }
  }

  if (titleEn.startsWith('Simchat Torah')) return 'simchat-torah-a'

  return toRepositoryReadingId(titleEn)
}

const resolvePesachShabbatInterruptedIsraelReadingId = ({
  day,
  titleEn,
  isIsrael,
}: {
  day: Date
  titleEn: string
  isIsrael: boolean
}) => {
  if (!isIsrael) return null

  if (day.getDay() === 0 && titleEn.startsWith("Pesach IV (CH''M)")) return 'pesach-3'
  if (day.getDay() === 1 && titleEn.startsWith("Pesach V (CH''M)")) return 'pesach-4'
  if (day.getDay() === 2 && titleEn.startsWith("Pesach VI (CH''M)")) return 'pesach-6'

  return null
}

const splitHolidayAliyot = ({
  titleEn,
  readingId,
  aliyotMap,
  isIsrael,
}: {
  titleEn: string
  readingId: string
  aliyotMap: AliyotMap
  isIsrael: boolean
}) => {
  const aliyot = getOrderedAliyot({ aliyotMap })
  if (!aliyot.length) {
    return {
      hasMain: false,
      hasMaftir: false,
    }
  }

  if (titleEn.startsWith('Erev Simchat Torah')) {
    return {
      hasMain: false,
      hasMaftir: false,
    }
  }

  if (titleEn.startsWith('Sukkot Final Day')) {
    return {
      hasMain: (isIsrael ? aliyot.slice(2, 3) : aliyot.slice(1, 3)).length > 0,
      hasMaftir: Boolean(aliyot[aliyot.length - 1]),
    }
  }

  if (titleEn.startsWith('Sukkot Chol ha Moed Day ')) {
    return {
      hasMain: (isIsrael ? aliyot.slice(0, 1) : aliyot.slice(0, 2)).length > 0,
      hasMaftir: Boolean(aliyot[aliyot.length - 1]),
    }
  }

  if (isPesachCholHamoedTitle(titleEn)) {
    return {
      hasMain: aliyot.slice(0, -1).length > 0,
      hasMaftir: Boolean(aliyot[aliyot.length - 1]),
    }
  }

  if (
    !titleEn.includes('(on Shabbat)') &&
    ['shmini-atzeret', 'pesach-8', 'shavuot-2'].includes(readingId)
  ) {
    return {
      hasMain: aliyot.slice(2).length > 0,
      hasMaftir: Boolean(aliyotMap.M),
    }
  }

  if (aliyotMap.M) {
    return {
      hasMain: true,
      hasMaftir: true,
    }
  }

  return {
    hasMain: true,
    hasMaftir: false,
  }
}

const toHolidayMaftirReadingId = (readingId: string, titleEn: string) => {
  if (titleEn.startsWith('Rosh Hashana')) return 'rosh-maftir'
  if (titleEn.startsWith('Yom Kippur')) return 'yom-kippur-maftir'
  if (titleEn.startsWith('Shavuot')) return 'shavuot-maftir'
  if (titleEn.startsWith('Shmini Atzeret') || titleEn.startsWith('Simchat Torah')) {
    return 'sukkot-end-maftir'
  }
  if (titleEn.startsWith('Sukkot')) return 'sukkot-maftir'
  if (
    matchesRomanDayPrefix({ titleEn, family: 'Pesach', romanDay: 'I' }) ||
    (matchesRomanDayPrefix({ titleEn, family: 'Pesach', romanDay: 'II' }) &&
      !titleEn.includes("CH''M"))
  ) {
    return 'pesach-yom-tov-maftir'
  }
  if (titleEn.startsWith('Pesach')) return 'pesach-chol-hamoed-maftir'

  return `${readingId}-maftir`
}

const resolveChanukahReadingIds = ({
  titleEn,
  aliyotMap,
}: {
  titleEn: string
  aliyotMap: AliyotMap
}) => {
  const orderedAliyot = getOrderedAliyot({ aliyotMap })
  const dayNumber = extractDayNumber(titleEn)
  const usesRoshChodeshSplit =
    titleEn.includes('on Rosh Chodesh') ||
    (orderedAliyot[0]?.k === 'Numbers' && orderedAliyot[0]?.b === '28:1')

  const chanukahAliyah = usesRoshChodeshSplit
    ? orderedAliyot[orderedAliyot.length - 1]
    : orderedAliyot[0]
  const readingId =
    dayNumber === 1 ? 'chanukah-1' : resolveChanukahReadingId(chanukahAliyah)
  if (!readingId) return []

  return usesRoshChodeshSplit ? ['rosh-chodesh', readingId] : [readingId]
}

const resolvePesachCholHamoedReadingId = (aliyotMap: AliyotMap | undefined) => {
  const firstAliyah = getOrderedAliyot({ aliyotMap })[0]
  const startKey = toAliyahStartKey(firstAliyah)
  if (!startKey) return null
  return PESACH_CHOL_HAMOED_READING_ID_BY_START[startKey] ?? null
}

const resolveSukkotCholHamoedReadingId = ({
  titleEn,
  isIsrael,
}: {
  titleEn: string
  isIsrael: boolean
}) => {
  if (titleEn.startsWith('Sukkot Final Day')) return 'sukkot-7'

  const day = extractDayNumber(titleEn)
  if (day == null) return null

  const offset = isIsrael ? 1 : 2
  return `sukkot-${day + offset}`
}

const resolveChanukahReadingId = (aliyah: Aliyah | undefined) => {
  const startKey = toAliyahStartKey(aliyah)
  if (!startKey) return null
  return CHANUKAH_READING_ID_BY_START[startKey] ?? null
}

const getOrderedAliyot = ({
  aliyotMap,
  includeMaftir,
}: {
  aliyotMap: AliyotMap | undefined
  includeMaftir?: boolean
}) => {
  if (!aliyotMap) return []

  return Object.entries(aliyotMap)
    .filter(([key]) => includeMaftir || key !== 'M')
    .map(([, aliyah]) => aliyah)
}

const toAliyahStartKey = (aliyah: Aliyah | undefined) => {
  if (!aliyah?.b) return null
  return `${aliyah.k}|${aliyah.b}`
}

const extractDayNumber = (titleEn: string) => {
  const dayMatch = /\bDay\s+(\d+)/.exec(titleEn)
  if (!dayMatch?.[1]) return null
  return Number(dayMatch[1])
}

const matchesRomanDayPrefix = ({
  titleEn,
  family,
  romanDay,
}: {
  titleEn: string
  family: string
  romanDay: string
}) => {
  return new RegExp(`^${family} ${romanDay}(?:\\b| \\()`).test(titleEn)
}

const isPesachCholHamoedTitle = (titleEn: string) => {
  return (
    titleEn.startsWith('Pesach Chol ha Moed Day ') ||
    titleEn.startsWith("Pesach II (CH''M)") ||
    titleEn.startsWith("Pesach III (CH''M)") ||
    titleEn.startsWith("Pesach IV (CH''M)") ||
    titleEn.startsWith("Pesach V (CH''M)") ||
    titleEn.startsWith("Pesach VI (CH''M)")
  )
}

const extractSpecialShabbatName = (reason: string | undefined) => {
  if (!reason) return null
  if (!reason.startsWith('Shabbat ')) return null

  const afterShabbat = reason.slice('Shabbat '.length).trim()
  if (!afterShabbat) return null

  return afterShabbat.split('(')[0]?.trim() ?? null
}

const toParshaSpecialMaftirReadingId = ({
  reason,
  maftirAliyah,
}: {
  reason: string | undefined
  maftirAliyah: Aliyah | undefined
}) => {
  const specialName = extractSpecialShabbatName(reason)
  const specialStandaloneReadingId = specialName
    ? toSpecialStandaloneMaftirReadingId(specialName)
    : null
  if (specialStandaloneReadingId) return specialStandaloneReadingId

  if (!reason || !maftirAliyah) return null
  if (!reason.includes('Chanukah')) return null

  return resolveChanukahReadingId(maftirAliyah)
}

const toSpecialStandaloneMaftirReadingId = (name: string): string | null => {
  const normalized = name.toLowerCase().trim()
  const ids = ['shekalim', 'zachor', 'parah', 'hachodesh']
  return ids.includes(normalized) ? normalized : null
}

const toParashaReadingId = (titleEn: string) => {
  return slugify(titleEn).replace(/-/g, '_')
}

const toRepositoryReadingId = (titleEn: string) => {
  return slugify(titleEn)
}

const isShabbatRoshChodeshAliyah = (aliyah: Aliyah | undefined) => {
  return aliyah?.k === 'Numbers' && aliyah.b === '28:9' && aliyah.e === '28:15'
}

const compareByFirstDateThenId = (a: MonthlyReadingEntry, b: MonthlyReadingEntry) => {
  const ad = a.dates[0] ?? ''
  const bd = b.dates[0] ?? ''
  if (ad !== bd) return ad.localeCompare(bd)
  return a.readingId.localeCompare(b.readingId)
}

const addMonths = (date: Date, months: number) => {
  const out = new Date(date)
  out.setMonth(out.getMonth() + months)
  return atNoon(out)
}

const eachDate = (start: Date, end: Date) => {
  const dates: Date[] = []
  for (
    const day = atNoon(start);
    day.getTime() <= atNoon(end).getTime();
    day.setDate(day.getDate() + 1)
  ) {
    dates.push(new Date(day))
  }
  return dates
}

const toISODateString = (date: Date) => {
  const minutesOffset = date.getTimezoneOffset()
  const millisecondsOffset = minutesOffset * 60 * 1000
  const local = new Date(+date - millisecondsOffset)
  return local.toISOString().substring(0, 10)
}

const atNoon = (date: Date) => {
  const out = new Date(date)
  out.setHours(12, 0, 0, 0)
  return out
}

export {
  generateMonthlyReadings,
  splitPairedParashaReadingId,
}

/* pay attention:
there are 4 parashiyot that the last verse is finishing at the following page of the start of the last verse:
- Vayestse
- Ki tisa
- Emor
- Ekev

But there is no parasha that the last verse is finishing at the end of current page, and the next verse is in next page.
*/