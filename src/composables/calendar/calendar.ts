import { HDate } from '@hebcal/hdate'
import { getLeyningOnDate } from '@hebcal/leyning/dist/esm/getLeyningOnDate'
import type { Leyning, LeyningWeekday } from '@hebcal/leyning/dist/esm/types'
import { useOptionsStore } from '@/stores/options'
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
      for (const occurrence of getTorahOccurrences(day, leining)) {
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
  leining: Leyning | LeyningWeekday
): TorahOccurrence[] => {
  // For DONE 17:
  // Pay attention to the jumelée parashiots. It looks like this:
  // {"name":{"en":"Vayakhel-Pekudei","he":"וַיַּקְהֵל־פְקוּדֵי"},"type":"weekday","parsha":["Vayakhel","Pekudei"],"parshaNum":[22,23],"weekday":{"1":{"k":"Exodus","b":"35:1","e":"35:3","v":3},"2":{"k":"Exodus","b":"35:4","e":"35:10","v":7},"3":{"k":"Exodus","b":"35:11","e":"35:20","v":10}},"summary":"Exodus 35:1-20"}
  // Or this:
  // {"name":{"en":"Vayakhel-Pekudei","he":"וַיַּקְהֵל־פְקוּדֵי"},"type":"shabbat","parsha":["Vayakhel","Pekudei"],"parshaNum":[22,23],"summary":"Exodus 35:1-40:38, 12:1-20","fullkriyah":{"1":{"k":"Exodus","b":"35:1","e":"35:29","v":29},"2":{"k":"Exodus","b":"35:30","e":"37:16","v":60},"3":{"k":"Exodus","b":"37:17","e":"37:29","v":13},"4":{"k":"Exodus","b":"38:1","e":"39:1","v":32},"5":{"k":"Exodus","b":"39:2","e":"39:21","v":20},"6":{"k":"Exodus","b":"39:22","e":"39:43","v":22},"7":{"k":"Exodus","b":"40:1","e":"40:38","v":38},"M":{"p":15,"k":"Exodus","b":"12:1","e":"12:20","v":20,"reason":"Shabbat HaChodesh"}},"haftara":"Ezekiel 45:16-46:18","haft":{"k":"Ezekiel","b":"45:16","e":"46:18","v":28,"reason":"Shabbat HaChodesh"},"haftaraNumV":28,"seph":{"k":"Ezekiel","b":"45:18","e":"46:15","v":23,"reason":"Shabbat HaChodesh"},"sephardic":"Ezekiel 45:18-46:15","sephardicNumV":23,"summaryParts":[{"k":"Exodus","b":"35:1","e":"40:38"},{"k":"Exodus","b":"12:1","e":"12:20"}],"reason":{"haftara":"Shabbat HaChodesh","sephardic":"Shabbat HaChodesh","M":"Shabbat HaChodesh"}}

  // In this case, we will return a special result that tell that it is two parashiot, with both ids. In the front, we will display them with join("-"), and the full end will be the end of the second one.
  
  const titleEn = normalizeTitleEn(leining.name.en)
  const readingId = toCanonicalReadingId(leining, titleEn)
  const dateIso = toISODateString(day)

  const results: TorahOccurrence[] = []
  if (leining.weekday) {
    results.push({
      readingId,
      dateIso,
    })
  }

  if ('fullkriyah' in leining && leining.fullkriyah) {
    results.push({
      readingId,
      dateIso,
    })

    const maftirAliyah = leining.fullkriyah.M
    const maftirReason = maftirAliyah?.reason
    const specialMaftirName = extractSpecialShabbatName(maftirReason)
    const specialMaftirReadingId = specialMaftirName
      ? toSpecialStandaloneMaftirReadingId(specialMaftirName)
      : null
    if (specialMaftirName && specialMaftirReadingId && maftirAliyah) {
      results.push({
        readingId: specialMaftirReadingId,
        dateIso,
      })
    }
  }

  return results
}

const normalizeTitleEn = (title: string) => {
  return title.replace(/-/g, ' ').trim()
}

const toCanonicalReadingId = (leining: Leyning | LeyningWeekday, titleEn: string) => {
  if (leining.parsha) {
    const parshaIds = parshaIdsFromLeining(leining, titleEn)
    if (parshaIds.length >= 2) {
      return toPairedParashaReadingId(parshaIds[0], parshaIds[1])
    }
    return parshaIds[0]
  }
  return holidayIdFromTitle(titleEn)
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
    .map((name) => toRepositoryReadingId(name))
  if (fromParshaNames.length > 0) return uniqueParashaIds(fromParshaNames)

  const firstPart = titleEn.split(' ')[0]
  return [toRepositoryReadingId(firstPart)]
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

const holidayIdFromTitle = (titleEn: string): string => {
  if (titleEn.startsWith('Rosh Chodesh')) return 'rosh-chodesh';
  
  const fastDays = ["Ta'anit Esther", "Tzom Gedaliah", "Tzom Tammuz", "Asara B'Tevet", "Tish'a B'Av (Mincha)"];
  if (fastDays.some(fast => titleEn.startsWith(fast))) return 'taanit-tzibur';
  
  if (titleEn.startsWith("Tish'a B'Av")) return 'tisha-bav';
  if (titleEn.startsWith('Rosh Hashana I')) return 'rosh-1';
  if (titleEn.startsWith('Rosh Hashana II')) return 'rosh-2';
  if (titleEn.startsWith('Yom Kippur')) return 'yom-kippur';
  if (titleEn.startsWith('Purim') || titleEn.startsWith('Shushan Purim')) return 'purim';
  if (titleEn.startsWith('Shmini Atzeret')) return 'shmini-atzeret';
  if (titleEn.startsWith('Simchat Torah') || titleEn.startsWith('Erev Simchat Torah')) return 'simchat-torah';
  if (titleEn.startsWith('Shavuot I')) return 'shavuot-1';
  if (titleEn.startsWith('Shavuot II')) return 'shavuot-2';

  if (titleEn.startsWith('Sukkot Shabbat Chol ha Moed')) return 'sukkot-shabbat-chol-hamoed';
  if (titleEn.startsWith('Sukkot Final Day')) return 'sukkot-7';
  if (titleEn.startsWith('Sukkot Chol ha Moed Day ')) {
    const day = extractDayNumber(titleEn);
    if (day != null) return `sukkot-${day + 2}`;
  }
  if (titleEn.startsWith('Sukkot I')) return 'sukkot-1';
  if (titleEn.startsWith('Sukkot II')) return 'sukkot-2';

  if (titleEn.startsWith('Pesach Shabbat Chol ha Moed')) return 'pesach-shabbat-chol-hamoed';
  if (titleEn.startsWith('Pesach Chol ha Moed Day ')) {
    const day = extractDayNumber(titleEn);
    if (day != null) return `pesach-${day + 2}`;
  }
  if (titleEn.startsWith('Pesach I')) return 'pesach-1';
  if (titleEn.startsWith('Pesach II')) return 'pesach-2';
  if (titleEn.startsWith('Pesach VII')) return 'pesach-7';
  if (titleEn.startsWith('Pesach VIII')) return 'pesach-8';

  if (titleEn.startsWith('Chanukah Day ')) {
    const day = extractDayNumber(titleEn);
    if (day === 6) return 'rosh-chodesh';
    if (day != null && [1, 2, 3, 4, 5, 7, 8].includes(day)) return `chanukah-${day}`;
  }

  return toRepositoryReadingId(titleEn);
};

const extractDayNumber = (titleEn: string) => {
  const dayMatch = /\bDay\s+(\d+)/.exec(titleEn)
  if (!dayMatch?.[1]) return null
  return Number(dayMatch[1])
}

const extractSpecialShabbatName = (reason: string | undefined) => {
  if (!reason) return null
  if (!reason.startsWith('Shabbat ')) return null

  const shabbatSplit = reason.split('Shabbat ')
  const afterShabbat = shabbatSplit[1]?.trim()
  if (!afterShabbat) return null

  return afterShabbat.split('(')[0].trim()
}

const normalizeSpecialStandaloneMaftirName = (name: string) => {
  return name.toLowerCase().trim()
}

const toSpecialStandaloneMaftirReadingId = (name: string): string | null => {
  const normalized = normalizeSpecialStandaloneMaftirName(name)
  const specialStandaloneMaftirs = ['shekalim', 'zachor', 'parah', 'hachodesh']
  return specialStandaloneMaftirs.includes(normalized) ? normalized : null
}

const toRepositoryReadingId = (titleEn: string) => {
  return slugify(titleEn)
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
    day.getTime() <= end.getTime();
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