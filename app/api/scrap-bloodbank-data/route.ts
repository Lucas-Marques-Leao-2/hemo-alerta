import { start } from "workflow/api"
import { scrapBloodBankData } from "@/server/workflows/scrapping.workflow"

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (
    cronSecret &&
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 })
  }

  const run = await start(scrapBloodBankData)

  const returnData = await run.returnValue
  return Response.json(returnData)
}
