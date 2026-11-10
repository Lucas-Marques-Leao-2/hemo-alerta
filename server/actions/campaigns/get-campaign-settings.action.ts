"use server"

import { z } from "zod"

import { getCampaignRules } from "@/server/campaigns/audience"
import { permissionActionClient } from "@/server/safe-action"

export const getCampaignSettingsAction = permissionActionClient({ campaign: ["list"] })
  .inputSchema(z.object({}))
  .action(async () => getCampaignRules())
