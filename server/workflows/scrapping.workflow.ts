import * as cheerio from "cheerio"
import puppeteer from "puppeteer"

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

type StockStatus = "critico" | "minimo" | "adequado" | "seguro"

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
  return data
}

async function getBloodBankDataHtml() {
  "use step"

  const url = "https://cidadao.saude.al.gov.br/transparencia/doacoes/"
  const browser = await puppeteer.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: "domcontentloaded" })

    return await page.evaluate(() => {
      return document.querySelector("main")?.outerHTML ?? document.body.outerHTML
    })
  } finally {
    await browser.close()
  }
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
  if (actualQuantity < minimumQuantity) return "critico"
  if (actualQuantity < adequateQuantity) return "minimo"
  if (actualQuantity < safeQuantity) return "adequado"
  return "seguro"
}
