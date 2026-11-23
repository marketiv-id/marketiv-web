import { callAdminApi } from "@/lib/api/call-api";

export type DeliverableDecision = "valid" | "invalid";
export interface RateCardValidationItem { id:string; orderId:string; version:number; source:string; evidenceUrl:string; notes?:string; submittedAt:string; creatorId:string; umkmId:string; projectTitle:string; }
export async function getRateCardValidationQueue(): Promise<RateCardValidationItem[]> { const body=await callAdminApi("getAdminRatecardDeliverableQueue",{},isQueue,"Gagal memuat antrean validasi Rate Card."); return body.items; }
// POST /api/admin/ratecard-deliverables/[deliverableId]/review (RPC review_ratecard_deliverable, 0024).
export async function reviewRateCardDeliverable(deliverableId:string, decision:DeliverableDecision, notes:string) { return callAdminApi("reviewRatecardDeliverable",{deliverableId,decision,notes},isReview,"Gagal menyimpan keputusan validasi."); }
function isQueue(v:unknown):v is {items:RateCardValidationItem[];total:number}{return !!v&&typeof v==="object"&&Array.isArray((v as {items?:unknown}).items);}
function isReview(v:unknown):v is {success:true;deliverableId:string;decision:DeliverableDecision;reviewedAt:string}{const x=v as Record<string,unknown>;return !!x&&x.success===true&&typeof x.deliverableId==="string"&&(x.decision==="valid"||x.decision==="invalid");}
