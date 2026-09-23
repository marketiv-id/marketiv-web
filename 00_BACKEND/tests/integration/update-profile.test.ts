import { beforeEach, describe, expect, it, vi } from "vitest";

const store: Record<string, any[]> = {};
const updateCalls: Array<{ collection: string; docId: string; data: any }> = [];
/** Snapshot frozen for collections that listDocuments must serve stale after write. */
const staleSnapshots: Record<string, any[]> = {};

const seed = (collection: string, docs: any[]) => {
  store[collection] = docs;
};

const freezeStaleListDocuments = (...collections: string[]) => {
  for (const collection of collections) {
    staleSnapshots[collection] = JSON.parse(JSON.stringify(store[collection] || []));
  }
};

const clearStaleListDocuments = () => {
  for (const key of Object.keys(staleSnapshots)) delete staleSnapshots[key];
};

class Databases {
  async listDocuments(_db: string, collection: string, queries: any[] = []) {
    // Stale mode: serve pre-write snapshot even after updateDocument mutates store.
    const source =
      collection in staleSnapshots ? staleSnapshots[collection] : store[collection];
    let documents = [...(source || [])];
    for (const query of queries) {
      if (query?.attribute === "userId") {
        documents = documents.filter((doc) => doc.userId === query.value);
      }
      if (query?.attribute === "creatorId") {
        documents = documents.filter((doc) => doc.creatorId === query.value);
      }
      if (query?.attribute === "platform") {
        documents = documents.filter((doc) => doc.platform === query.value);
      }
    }
    return { documents };
  }

  async updateDocument(_db: string, collection: string, docId: string, data: any) {
    const documents = store[collection] || [];
    const index = documents.findIndex((doc) => doc.$id === docId);
    if (index === -1) throw new Error("not found");
    documents[index] = { ...documents[index], ...data };
    updateCalls.push({ collection, docId, data });
    return documents[index];
  }

  async getDocument(_db: string, collection: string, docId: string) {
    const documents = store[collection] || [];
    const doc = documents.find((d) => d.$id === docId);
    if (!doc) throw new Error("not found");
    return doc;
  }
}

class Client {
  setEndpoint() {
    return this;
  }
  setProject() {
    return this;
  }
  setKey() {
    return this;
  }
}

const Query = {
  equal: (attribute: string, value: string) => ({ attribute, value }),
  limit: () => ({}),
};

vi.mock("node-appwrite", () => ({ Client, Databases, Query }));

const makeReq = (bodyJson: any, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "x-appwrite-user-id": "u1", ...headers },
  bodyJson,
});

const makeRes = () => {
  const calls: any[] = [];
  return {
    calls,
    json: (body: any, status = 200) => {
      calls.push({ body, status });
      return { body, status };
    },
  };
};

const invoke = async (body: any, headers?: Record<string, string>) => {
  const main = (await import("../../functions/update-profile/src/main.js")).default;
  const res = makeRes();
  const logs: string[] = [];
  await main({
    req: makeReq(body, headers),
    res,
    log: (message: string) => {
      logs.push(message);
    },
    error: () => {},
  });
  return { ...res.calls[0], logs };
};

beforeEach(() => {
  for (const collection of Object.keys(store)) delete store[collection];
  updateCalls.length = 0;
  clearStaleListDocuments();
  process.env.APPWRITE_FUNCTION_API_ENDPOINT = "https://mock.appwrite.io/v1";
  process.env.APPWRITE_FUNCTION_PROJECT_ID = "mock-project";
  process.env.APPWRITE_API_KEY = "mock-key";
  process.env.APPWRITE_DATABASE_ID = "db";
  process.env.USERS_COLLECTION_ID = "users";
  process.env.UMKM_PROFILES_COLLECTION_ID = "umkm_profiles";
  process.env.CREATOR_PROFILES_COLLECTION_ID = "creator_profiles";
  process.env.CREATOR_SOCIAL_ACCOUNTS_COLLECTION_ID = "creator_social_accounts";
  process.env.CREATOR_SOCIAL_ACCOUNT_COLLECTION_ID = "creator_social_accounts";
});

const completeUmkmBody = {
  role: "umkm",
  businessName: "Dapur Sehat",
  category: "kuliner",
  city: "Sukabumi",
  description: "Deskripsi usaha yang cukup panjang minimal dua puluh karakter.",
  phone: "081234567890",
};

const completeCreatorBody = {
  role: "creator",
  displayName: "Nadia Visuals",
  niche: "fashion",
  city: "Bandung",
  bio: "Bio kreator yang cukup panjang minimal dua puluh karakter.",
};

describe("update-profile function", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await invoke(completeUmkmBody, { "x-appwrite-user-id": "" });
    // header defaults to u1 in makeReq — clear it properly
    const main = (await import("../../functions/update-profile/src/main.js")).default;
    const res = makeRes();
    await main({
      req: { method: "POST", headers: {}, bodyJson: completeUmkmBody },
      res,
      log: () => {},
      error: () => {},
    });
    expect(res.calls[0]).toMatchObject({ status: 401 });
    void response;
  });

  it("rejects unsupported method", async () => {
    const main = (await import("../../functions/update-profile/src/main.js")).default;
    const res = makeRes();
    await main({
      req: { method: "GET", headers: { "x-appwrite-user-id": "u1" }, bodyJson: {} },
      res,
      log: () => {},
      error: () => {},
    });
    expect(res.calls[0]).toMatchObject({ status: 405 });
  });

  it("returns 404 when users row is missing", async () => {
    const response = await invoke(completeUmkmBody);
    expect(response).toMatchObject({ status: 404 });
  });

  it("returns 400 when role is invalid", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "admin", phone: "081234567890" }]);
    const response = await invoke({ role: "admin" });
    expect(response).toMatchObject({ status: 400 });
  });

  it("ignores client-provided isProfileCompleted and computes false when incomplete", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "" }]);
    seed("umkm_profiles", [
      { $id: "up1", userId: "u1", businessName: "", category: "", city: "", description: "", isProfileCompleted: false },
    ]);

    const response = await invoke({
      role: "umkm",
      businessName: "X",
      category: "kuliner",
      city: "",
      description: "pendek",
      isProfileCompleted: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(false);
    const flagWrites = updateCalls.filter((c) => c.data.isProfileCompleted !== undefined);
    expect(flagWrites.every((c) => c.data.isProfileCompleted === false)).toBe(true);
  });

  it("never downgrades an already completed UMKM profile", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "081234567890" }]);
    seed("umkm_profiles", [
      {
        $id: "up1",
        userId: "u1",
        businessName: "Dapur Sehat",
        category: "kuliner",
        city: "Sukabumi",
        description: "Deskripsi usaha yang cukup panjang minimal dua puluh karakter.",
        isProfileCompleted: true,
      },
    ]);

    const response = await invoke({
      role: "umkm",
      businessName: "Dapur Sehat",
      category: "kuliner",
      city: "",
      description: "x",
      phone: "",
    });

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(true);
    expect(
      updateCalls.some((c) => c.collection === "umkm_profiles" && c.data.isProfileCompleted === false)
    ).toBe(false);
  });

  it("promotes UMKM flag to true when all canonical fields pass and phone is written", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "" }]);
    seed("umkm_profiles", [
      { $id: "up1", userId: "u1", businessName: "", category: "", city: "", description: "", isProfileCompleted: false },
    ]);

    const response = await invoke(completeUmkmBody);

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(true);
    expect(updateCalls.find((c) => c.collection === "users")?.data.phone).toBe("081234567890");
    expect(
      updateCalls.some((c) => c.collection === "umkm_profiles" && c.data.isProfileCompleted === true)
    ).toBe(true);
  });

  it("rejects isProfileCompleted as a body field by stripping it", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "081234567890" }]);
    seed("umkm_profiles", [
      { $id: "up1", userId: "u1", businessName: "A", category: "kuliner", city: "B", description: "x", isProfileCompleted: false },
    ]);

    // Field incomplete — client's isProfileCompleted:true must not stick.
    const response = await invoke({
      role: "umkm",
      businessName: "X",
      category: "kuliner",
      city: "B",
      description: "pendek",
      phone: "081234567890",
      isProfileCompleted: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(false);
    expect(
      updateCalls.some((c) => c.collection === "umkm_profiles" && c.data.isProfileCompleted === true)
    ).toBe(false);
  });

  it("promotes creator flag when profile + tiktok social account are complete", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "creator" }]);
    seed("creator_profiles", [
      { $id: "cp1", userId: "u1", displayName: "", niche: "", city: "", bio: "", isProfileCompleted: false },
    ]);
    seed("creator_social_accounts", [
      { $id: "sa1", creatorId: "u1", platform: "tiktok", username: "nadia.visuals" },
    ]);

    const response = await invoke(completeCreatorBody);

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(true);
    expect(
      updateCalls.some((c) => c.collection === "creator_profiles" && c.data.isProfileCompleted === true)
    ).toBe(true);
  });

  it("reads CREATOR_SOCIAL_ACCOUNT_COLLECTION_ID (live Development name) when plural is absent", async () => {
    delete process.env.CREATOR_SOCIAL_ACCOUNTS_COLLECTION_ID;
    // Non-default id: proves lookup uses singular key, not hardcoded fallback.
    process.env.CREATOR_SOCIAL_ACCOUNT_COLLECTION_ID = "dev_creator_social_accounts";

    seed("users", [{ $id: "u-doc", userId: "u1", role: "creator" }]);
    seed("creator_profiles", [
      { $id: "cp1", userId: "u1", displayName: "", niche: "", city: "", bio: "", isProfileCompleted: false },
    ]);
    seed("dev_creator_social_accounts", [
      { $id: "sa1", creatorId: "u1", platform: "tiktok", username: "nadia.visuals" },
    ]);
    seed("creator_social_accounts", []);

    const response = await invoke(completeCreatorBody);

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(true);
  });

  it("keeps creator incomplete when tiktok social account is missing", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "creator" }]);
    seed("creator_profiles", [
      { $id: "cp1", userId: "u1", displayName: "", niche: "", city: "", bio: "", isProfileCompleted: false },
    ]);
    seed("creator_social_accounts", []);

    const response = await invoke(completeCreatorBody);

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(false);
  });

  it("never downgrades an already completed creator profile", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "creator" }]);
    seed("creator_profiles", [
      {
        $id: "cp1",
        userId: "u1",
        displayName: "Nadia",
        niche: "fashion",
        city: "Bandung",
        bio: "Bio kreator yang cukup panjang minimal dua puluh karakter.",
        isProfileCompleted: true,
      },
    ]);
    seed("creator_social_accounts", []);

    const response = await invoke({
      role: "creator",
      displayName: "Nadia",
      niche: "",
      city: "",
      bio: "x",
    });

    expect(response.status).toBe(200);
    expect(response.body.isProfileCompleted).toBe(true);
  });

  it("reproduces stale listDocuments after write and still persists isProfileCompleted=true", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "081234567890" }]);
    seed("umkm_profiles", [
      {
        $id: "up1",
        userId: "u1",
        businessName: "Dapur Sehat",
        category: "kuliner",
        city: "Sukabumi",
        description: "pendek13chr!!",
        isProfileCompleted: false,
      },
    ]);
    freezeStaleListDocuments("umkm_profiles", "users");

    const response = await invoke(completeUmkmBody);

    expect(response.status).toBe(200);
    expect(store.umkm_profiles[0].description).toBe(completeUmkmBody.description);
    expect(response.body.isProfileCompleted).toBe(true);
    expect(response.body.description).toBe(completeUmkmBody.description);
    expect(
      updateCalls.some((c) => c.collection === "umkm_profiles" && c.data.isProfileCompleted === true)
    ).toBe(true);
    expect(store.umkm_profiles[0].isProfileCompleted).toBe(true);
  });

  it("logs failed completion fields when evaluated is false", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "invalid" }]);
    seed("umkm_profiles", [
      {
        $id: "up1",
        userId: "u1",
        businessName: "Dapur Sehat",
        category: "kuliner",
        city: "Sukabumi",
        description: "pendek",
        isProfileCompleted: false,
      },
    ]);

    const response = await invoke({
      businessName: "Dapur Sehat",
      category: "kuliner",
      city: "Sukabumi",
      description: "pendek",
      phone: "invalid",
    });

    expect(response.body.isProfileCompleted).toBe(false);
    const line = response.logs.find((l) => l.startsWith("update-profile umkm"));
    expect(line).toBe(
      "update-profile umkm u1 completed=false failed=description,phone"
    );
  });

  it("promotes flag when only profile fields are written and listDocuments is stale", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "081234567890" }]);
    seed("umkm_profiles", [
      {
        $id: "up1",
        userId: "u1",
        businessName: "Dapur Sehat",
        category: "kuliner",
        city: "Sukabumi",
        description: "pendek13chr!!",
        isProfileCompleted: false,
      },
    ]);
    freezeStaleListDocuments("umkm_profiles");

    const response = await invoke({
      businessName: "Dapur Sehat",
      category: "kuliner",
      city: "Sukabumi",
      description: "Deskripsi usaha yang cukup panjang minimal dua puluh karakter.",
    });

    expect(response.body.isProfileCompleted).toBe(true);
    expect(store.umkm_profiles[0].isProfileCompleted).toBe(true);
  });

  it("strips unknown fields and does not write arbitrary columns", async () => {
    seed("users", [{ $id: "u-doc", userId: "u1", role: "umkm", phone: "081234567890" }]);
    seed("umkm_profiles", [
      { $id: "up1", userId: "u1", businessName: "", category: "", city: "", description: "", isProfileCompleted: false },
    ]);

    const response = await invoke({
      ...completeUmkmBody,
      evil: "payload",
      role: "creator",
    });

    expect(response.status).toBe(200);
    for (const call of updateCalls) {
      expect(call.data).not.toHaveProperty("evil");
      expect(call.data).not.toHaveProperty("role");
    }
  });
});
