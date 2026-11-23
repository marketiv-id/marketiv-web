import type { ApiRoute } from "./types";

/** Fase 6: CRUD campaign draft, brief, aset, status. */
export const CAMPAIGN_ROUTES = {
  createCampaign: { method: "POST", path: "/api/campaigns" },
  deleteCampaign: { method: "DELETE", path: "/api/campaigns/:campaignId" },
  patchCampaignDraft: { method: "PATCH", path: "/api/campaigns/:campaignId/draft" },
  putCampaignBrief: { method: "PUT", path: "/api/campaigns/:campaignId/brief" },
  createCampaignAsset: { method: "POST", path: "/api/campaigns/:campaignId/assets" },
  deleteCampaignAsset: { method: "DELETE", path: "/api/campaigns/:campaignId/assets/:assetId" },
  patchCampaignStatus: { method: "PATCH", path: "/api/campaigns/:campaignId/status" },
} as const satisfies Record<string, ApiRoute>;
