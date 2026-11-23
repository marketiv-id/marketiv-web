import type { ApiRoute } from "./types";

/**
 * Fase 7: alur campaign (klaim → bukti → review) dan order rate card
 * (offer → order → deliverable → revisi → approve). Pemilik domain boleh
 * menambah/mengubah entri di file ini.
 */
export const FLOW_ROUTES = {
  // Campaign mode
  claimCampaign: { method: "POST", path: "/api/campaigns/:campaignId/claim" },
  unclaimCampaign: { method: "DELETE", path: "/api/campaigns/:campaignId/claim" },
  submitCampaignProof: { method: "POST", path: "/api/campaigns/:campaignId/submissions" },
  reviewSubmission: { method: "POST", path: "/api/submissions/:submissionId/review" },
  generateCampaignBrief: { method: "POST", path: "/api/ai/brief" },
  // Rate card order
  createOffer: { method: "POST", path: "/api/offers" },
  acceptOffer: { method: "POST", path: "/api/offers/:offerId/accept" },
  rejectOffer: { method: "POST", path: "/api/offers/:offerId/reject" },
  deleteOffer: { method: "DELETE", path: "/api/offers/:offerId" },
  cancelOrder: { method: "POST", path: "/api/orders/:orderId/cancel" },
  submitDeliverable: { method: "POST", path: "/api/orders/:orderId/deliverables" },
  requestRevision: { method: "POST", path: "/api/orders/:orderId/revisions" },
  approveDeliverable: { method: "POST", path: "/api/deliverables/:deliverableId/approve" },
} as const satisfies Record<string, ApiRoute>;
