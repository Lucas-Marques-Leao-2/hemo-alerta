import { BloodType as PrismaBloodType, StockStatus } from "@/prisma/generated/client"
import * as cheerio from "cheerio"

import { prisma } from "@/lib/db"

const BLOOD_TYPE_BY_CLASS = {
  s_ap: "A+",
  s_an: "A-",
  s_bp: "B+",
  s_bn: "B-",
  s_abp: "AB+",
  s_abn: "AB-",
  s_op: "O+",
  s_on: "O-",
} as const

type BloodTypeClass = keyof typeof BLOOD_TYPE_BY_CLASS
type BloodType = (typeof BLOOD_TYPE_BY_CLASS)[BloodTypeClass]

type BloodTypeStock = {
  bloodType: BloodType
  minimumQuantity: number
  adequateQuantity: number
  safeQuantity: number
  actualQuantity: number
  fillPercentage: number
  status: StockStatus
}

type BloodBankData = {
  lastUpdatedAt: string | null
  stocks: Record<BloodType, BloodTypeStock>
}

export async function scrapBloodBankData() {
  "use workflow"

  const html = await getBloodBankDataHtml()
  const data = await parseBloodBankData(html)
  return await saveBloodBankData(data)
}

async function getBloodBankDataHtml() {
  "use step"

  const url = "https://cidadao.saude.al.gov.br/transparencia/doacoes/"
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; HemoAlerta/1.0; +https://cidadao.saude.al.gov.br/transparencia/doacoes/)",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch blood bank page: ${response.status}`)
  }

  return await response.text()
}

async function parseBloodBankData(html: string) {
  "use step"

  const $ = cheerio.load(html)
  const stocks = {} as BloodBankData["stocks"]

  $("div.sangue").each((_, element) => {
    const classNames = ($(element).attr("class") ?? "").split(/\s+/)
    const bloodTypeClass = classNames.find(
      (className): className is BloodTypeClass =>
        className in BLOOD_TYPE_BY_CLASS,
    )

    if (!bloodTypeClass) return

    const bloodType = BLOOD_TYPE_BY_CLASS[bloodTypeClass]
    const fillMatch = classNames.find((className) => /^p\d+$/.test(className))
    const minimumQuantity = toQuantity($(element).attr("data-minimo"))
    const adequateQuantity = toQuantity($(element).attr("data-adequado"))
    const safeQuantity = toQuantity($(element).attr("data-seguro"))
    const actualQuantity = toQuantity($(element).attr("data-atual"))

    stocks[bloodType] = {
      bloodType,
      minimumQuantity,
      adequateQuantity,
      safeQuantity,
      actualQuantity,
      fillPercentage: fillMatch ? Number(fillMatch.slice(1)) : 0,
      status: getStockStatus(
        actualQuantity,
        minimumQuantity,
        adequateQuantity,
        safeQuantity,
      ),
    }
  })

  return {
    lastUpdatedAt: parseLastUpdatedAt($),
    stocks,
  }
}

async function saveBloodBankData(data: BloodBankData) {
  "use step"

  return prisma.bloodStockSnapshot.create({
    data: {
      sourceUpdatedAt: data.lastUpdatedAt
        ? new Date(`${data.lastUpdatedAt}T00:00:00.000Z`)
        : null,
      stocks: {
        create: Object.values(data.stocks).map((stock) => ({
          bloodType: toPrismaBloodType(stock.bloodType),
          minimumQuantity: stock.minimumQuantity,
          adequateQuantity: stock.adequateQuantity,
          safeQuantity: stock.safeQuantity,
          actualQuantity: stock.actualQuantity,
          fillPercentage: stock.fillPercentage,
          status: stock.status,
        })),
      },
    },
    include: {
      stocks: true,
    },
  })
}

const BLOOD_TYPE_TO_PRISMA: Record<BloodType, PrismaBloodType> = {
  "A+": PrismaBloodType.A_POSITIVE,
  "A-": PrismaBloodType.A_NEGATIVE,
  "B+": PrismaBloodType.B_POSITIVE,
  "B-": PrismaBloodType.B_NEGATIVE,
  "AB+": PrismaBloodType.AB_POSITIVE,
  "AB-": PrismaBloodType.AB_NEGATIVE,
  "O+": PrismaBloodType.O_POSITIVE,
  "O-": PrismaBloodType.O_NEGATIVE,
}

function toPrismaBloodType(bloodType: BloodType) {
  return BLOOD_TYPE_TO_PRISMA[bloodType]
}

function parseLastUpdatedAt($: cheerio.CheerioAPI) {
  const updatedText = $("p")
    .filter((_, element) => /Atualizado em/i.test($(element).text()))
    .first()
    .text()
    .trim()

  const match = updatedText.match(/Atualizado em\s+(\d{2}\/\d{2}\/\d{4})/i)
  if (!match) return null

  const [day, month, year] = match[1].split("/")
  return `${year}-${month}-${day}`
}

function toQuantity(value: string | undefined) {
  return Number(value ?? 0)
}

function getStockStatus(
  actualQuantity: number,
  minimumQuantity: number,
  adequateQuantity: number,
  safeQuantity: number,
): StockStatus {
  if (actualQuantity < minimumQuantity) return StockStatus.CRITICAL
  if (actualQuantity < adequateQuantity) return StockStatus.MINIMUM
  if (actualQuantity < safeQuantity) return StockStatus.ADEQUATE
  return StockStatus.SAFE
}
