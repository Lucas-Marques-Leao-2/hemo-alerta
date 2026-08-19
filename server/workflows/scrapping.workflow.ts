import {
  getBloodBankDataHtml,
  parseBloodBankData,
  saveBloodBankData,
} from "./scrapping.steps"

export async function scrapBloodBankData() {
  "use workflow"

  const html = await getBloodBankDataHtml()
  const data = await parseBloodBankData(html)
  return await saveBloodBankData(data)
}
