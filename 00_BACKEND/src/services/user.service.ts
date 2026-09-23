import { ID, Permission, Query, Role } from 'appwrite';
import { account, COLLECTIONS, DATABASE_ID, FUNCTIONS, databases, functions } from '../lib/appwrite';

export type UserRole = 'umkm' | 'creator' | 'admin';
export type SocialPlatform = 'tiktok';

export type UserMirror = {
  id: string;
  userId: string;
  role: UserRole;
  status: string;
  email: string;
  phone?: string;
  createdAt?: string;
};

export type UmkmProfile = {
  id: string;
  userId: string;
  role: 'umkm';
  businessName: string;
  category: string;
  description?: string;
  city?: string;
  address?: string;
  tiktok?: string;
  logoUrl?: string;
  isProfileCompleted: boolean;
};

export type CreatorProfile = {
  id: string;
  userId: string;
  role: 'creator';
  displayName: string;
  bio?: string;
  city?: string;
  avatarUrl?: string;
  totalFollowers: number;
  totalOrders: number;
  rating: number;
  isProfileCompleted: boolean;
};

export type Profile = UmkmProfile | CreatorProfile;

export type UpdateProfileInput = Partial<{
  userId: string;
  role: UserRole;
  businessName: string;
  category: string;
  description: string;
  city: string;
  address: string;
  tiktok: string;
  logoUrl: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isProfileCompleted: boolean;
}>;

export type AddSocialAccountInput = {
  /** @deprecated Diabaikan — creatorId selalu diambil dari sesi. Lihat addSocialAccount. */
  creatorId?: string;
  platform: SocialPlatform;
  username: string;
  followers?: number;
  engagementRate?: number;
};

export type CreatorSocialAccount = {
  id: string;
  creatorId: string;
  platform: SocialPlatform;
  username: string;
  followers: number;
  engagementRate: number;
};

export type SearchCreatorFilter = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'orders_desc';
  limit?: number;
};

export type UploadFileInput = {
  file: File;
};

export type UserFile = {
  id: string;
  userId: string;
  storageFileId: string;
  bucketId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'active' | 'deleted';
  createdAt?: string;
  deletedAt?: string;
};

export type StorageUsage = {
  id: string;
  userId: string;
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
};

export class UserServiceError extends Error {
  code: string;
  cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'UserServiceError';
    this.code = code;
    this.cause = cause;
  }
}

const mapError = (err: any, fallbackMessage: string): UserServiceError => {
  if (err instanceof UserServiceError) return err;

  if (err?.code === 401) return new UserServiceError('auth', 'Silakan login untuk mengakses profil.', err);
  if (err?.code === 403) return new UserServiceError('forbidden', 'Kamu tidak memiliki akses ke data ini.', err);
  if (err?.code === 404) return new UserServiceError('not_found', 'Data tidak ditemukan.', err);

  return new UserServiceError(err?.type || 'unknown', fallbackMessage, err);
};

const mapUserMirror = (document: Record<string, any>): UserMirror => ({
  id: document.$id,
  userId: document.userId,
  role: document.role,
  status: document.status,
  email: document.email,
  phone: document.phone || undefined,
  createdAt: document.createdAt || document.$createdAt,
});

const mapUmkmProfile = (document: Record<string, any>): UmkmProfile => ({
  id: document.$id,
  userId: document.userId,
  role: 'umkm',
  businessName: document.businessName || '',
  category: document.category || '',
  description: document.description || undefined,
  city: document.city || undefined,
  address: document.address || undefined,
  tiktok: document.tiktok || undefined,
  logoUrl: document.logoUrl || undefined,
  isProfileCompleted: Boolean(document.isProfileCompleted),
});

const mapCreatorProfile = (document: Record<string, any>): CreatorProfile => ({
  id: document.$id,
  userId: document.userId,
  role: 'creator',
  displayName: document.displayName || '',
  bio: document.bio || undefined,
  city: document.city || undefined,
  avatarUrl: document.avatarUrl || undefined,
  totalFollowers: document.totalFollowers ?? 0,
  totalOrders: document.totalOrders ?? 0,
  rating: document.rating ?? 0,
  isProfileCompleted: Boolean(document.isProfileCompleted),
});

const mapSocialAccount = (document: Record<string, any>): CreatorSocialAccount => ({
  id: document.$id,
  creatorId: document.creatorId,
  platform: document.platform,
  username: document.username,
  followers: document.followers ?? 0,
  engagementRate: document.engagementRate ?? 0,
});

const mapUserFile = (document: Record<string, any>): UserFile => ({
  id: document.$id,
  userId: document.userId,
  storageFileId: document.storageFileId,
  bucketId: document.bucketId,
  fileName: document.fileName,
  mimeType: document.mimeType,
  sizeBytes: document.sizeBytes ?? 0,
  status: document.status,
  createdAt: document.createdAt || document.$createdAt,
  deletedAt: document.deletedAt || undefined,
});

const mapStorageUsage = (document: Record<string, any>): StorageUsage => ({
  id: document.$id,
  userId: document.userId,
  usedBytes: document.usedBytes ?? 0,
  quotaBytes: document.quotaBytes ?? 0,
  fileCount: document.fileCount ?? 0,
});

const parseFunctionResponse = <T>(responseBody: string): T => {
  if (!responseBody) throw new UserServiceError('server', 'Response function kosong.');

  try {
    return JSON.parse(responseBody) as T;
  } catch (err) {
    throw new UserServiceError('server', 'Response function tidak valid.', err);
  }
};

const getByUserId = async (collectionId: string, userId: string): Promise<Record<string, any> | null> => {
  const response = await databases.listDocuments(DATABASE_ID, collectionId, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);

  return response.documents[0] || null;
};

const getUserMirror = async (userId: string): Promise<UserMirror> => {
  const document = await getByUserId(COLLECTIONS.users, userId);
  if (!document) throw new UserServiceError('not_found', 'Data user tidak ditemukan.');
  return mapUserMirror(document);
};

const getProfileCollection = (role: UserRole): string => {
  if (role === 'umkm') return COLLECTIONS.umkmProfiles;
  if (role === 'creator') return COLLECTIONS.creatorProfiles;
  throw new UserServiceError('validation', 'Role profil tidak valid.');
};

const getProfileDocument = async (userId: string, role?: UserRole): Promise<{ role: UserRole; document: Record<string, any> }> => {
  const resolvedRole = role || (await getUserMirror(userId)).role;
  const document = await getByUserId(getProfileCollection(resolvedRole), userId);

  if (!document) throw new UserServiceError('not_found', 'Profil tidak ditemukan.');
  return { role: resolvedRole, document };
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const getProfile = async (userId: string, role?: UserRole): Promise<Profile> => {
  if (!userId) throw new UserServiceError('validation', 'User ID wajib diisi.');

  try {
    const profile = await getProfileDocument(userId, role);
    return profile.role === 'umkm' ? mapUmkmProfile(profile.document) : mapCreatorProfile(profile.document);
  } catch (err) {
    throw mapError(err, 'Gagal memuat profil. Coba lagi.');
  }
};

export const updateProfile = async (data: UpdateProfileInput): Promise<Profile> => {
  try {
    const user = await account.get();
    const profile = await getProfileDocument(data.userId || user.$id, data.role);
    // isProfileCompleted TIDAK boleh ditulis dari service client-side —
    // hanya Function `update-profile` yang menghitung flag (never downgrade).
    const allowedFields = profile.role === 'umkm'
      ? ['businessName', 'category', 'description', 'city', 'address', 'tiktok', 'logoUrl']
      : ['displayName', 'bio', 'city', 'avatarUrl'];
    const payload = Object.fromEntries(
      allowedFields
        .filter((field) => data[field as keyof UpdateProfileInput] !== undefined)
        .map((field) => [field, data[field as keyof UpdateProfileInput]])
    );

    if (Object.keys(payload).length === 0) {
      throw new UserServiceError('validation', 'Tidak ada data profil untuk diperbarui.');
    }

    const updated = await databases.updateDocument(
      DATABASE_ID,
      getProfileCollection(profile.role),
      profile.document.$id,
      payload
    );

    return profile.role === 'umkm' ? mapUmkmProfile(updated) : mapCreatorProfile(updated);
  } catch (err) {
    throw mapError(err, 'Gagal memperbarui profil. Coba lagi.');
  }
};

export const addSocialAccount = async (data: AddSocialAccountInput): Promise<CreatorSocialAccount> => {
  if (data.platform !== 'tiktok') {
    throw new UserServiceError('validation', 'MVP hanya mendukung akun TikTok.');
  }

  if (!data.username?.trim()) {
    throw new UserServiceError('validation', 'Username akun sosial wajib diisi.');
  }

  try {
    const user = await account.get();
    // Memastikan profil kreatornya ada sebelum menulis akun sosial.
    await getProfileDocument(user.$id, 'creator');

    // WAJIB id akun Auth, BUKAN `$id` dokumen creator_profiles. Kedua
    // pembacanya menjodohkan `creator_social_accounts.creatorId` dengan
    // `creator_profiles.userId` — get-creator-profile:72 dan
    // get-creator-directory:74. Versi sebelumnya jatuh ke `document.$id`,
    // jadi akun sosial yang ditulis di sini TIDAK PERNAH terbaca siapa pun.
    // `data.creatorId` sengaja diabaikan: selain salah kunci, ia membuat
    // kreator bisa menulis akun sosial atas nama orang lain.
    const creatorId = user.$id;

    const document = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.creatorSocialAccounts,
      ID.unique(),
      {
        creatorId,
        platform: data.platform,
        username: data.username.trim(),
        followers: data.followers ?? 0,
        engagementRate: data.engagementRate ?? 0,
      },
      [Permission.read(Role.any()), Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))]
    );

    return mapSocialAccount(document);
  } catch (err) {
    throw mapError(err, 'Gagal menambah akun sosial. Coba lagi.');
  }
};

export const removeSocialAccount = async (id: string): Promise<void> => {
  if (!id) throw new UserServiceError('validation', 'ID akun sosial wajib diisi.');

  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.creatorSocialAccounts, id);
  } catch (err) {
    throw mapError(err, 'Gagal menghapus akun sosial. Coba lagi.');
  }
};

export const searchCreators = async (filter: SearchCreatorFilter = {}): Promise<CreatorProfile[]> => {
  try {
    const queries = [Query.equal('isProfileCompleted', true), Query.limit(filter.limit ?? 50)];

    if (filter.city) queries.push(Query.equal('city', filter.city));
    if (filter.sortBy === 'rating_desc') queries.push(Query.orderDesc('rating'));
    if (filter.sortBy === 'orders_desc') queries.push(Query.orderDesc('totalOrders'));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.creatorProfiles, queries);
    let creators = response.documents.map(mapCreatorProfile);

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined || filter.sortBy?.startsWith('price_')) {
      const creatorIds = await getCreatorIdsByRateCardPrice(filter);
      creators = creators.filter((creator) => creatorIds.includes(creator.userId));
    }

    return creators;
  } catch (err) {
    throw mapError(err, 'Gagal mencari creator. Coba lagi.');
  }
};

const getCreatorIdsByRateCardPrice = async (filter: SearchCreatorFilter): Promise<string[]> => {
  const queries = [Query.limit(100)];

  if (filter.minPrice !== undefined) queries.push(Query.greaterThanEqual('price', filter.minPrice));
  if (filter.maxPrice !== undefined) queries.push(Query.lessThanEqual('price', filter.maxPrice));
  if (filter.sortBy === 'price_asc') queries.push(Query.orderAsc('price'));
  if (filter.sortBy === 'price_desc') queries.push(Query.orderDesc('price'));

  // Price lives on `rate_card_packages`, not `rate_cards`.
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.rateCardPackages, queries);
  const rateCardIds = [...new Set(response.documents.map((document) => document.rateCardId).filter(Boolean))];

  if (rateCardIds.length === 0) return [];

  // Map rate card ids -> creator ids. Appwrite `equal` accepts an
  // array for OR semantics.
  const cards = await databases.listDocuments(DATABASE_ID, COLLECTIONS.rateCards, [
    Query.equal('$id', rateCardIds as unknown as string),
    Query.limit(100),
  ]);

  return [...new Set(cards.documents.map((document) => document.creatorId).filter(Boolean))];
};

export const uploadFile = async (input: UploadFileInput): Promise<UserFile> => {
  try {
    const contentBase64 = await fileToBase64(input.file);
    const execution = await functions.createExecution(
      FUNCTIONS.validateAndUpload,
      JSON.stringify({
        fileName: input.file.name,
        mimeType: input.file.type,
        sizeBytes: input.file.size,
        contentBase64,
      }),
      false
    );

    if (execution.status === 'failed') throw new UserServiceError('server', 'Upload file gagal.');
    const result = parseFunctionResponse<{ file: Record<string, any> }>(execution.responseBody);
    return mapUserFile(result.file);
  } catch (err) {
    throw mapError(err, 'Gagal upload file. Coba lagi.');
  }
};

export const deleteFile = async (fileId: string): Promise<UserFile> => {
  if (!fileId) throw new UserServiceError('validation', 'File ID wajib diisi.');

  try {
    const execution = await functions.createExecution(
      FUNCTIONS.deleteFile,
      JSON.stringify({ fileId }),
      false
    );

    if (execution.status === 'failed') throw new UserServiceError('server', 'Hapus file gagal.');
    const result = parseFunctionResponse<{ file: Record<string, any> }>(execution.responseBody);
    return mapUserFile(result.file);
  } catch (err) {
    throw mapError(err, 'Gagal menghapus file. Coba lagi.');
  }
};

export const getMyFiles = async (filter: { status?: 'active' | 'deleted' } = {}): Promise<UserFile[]> => {
  try {
    const user = await account.get();
    const queries = [Query.equal('userId', user.$id), Query.orderDesc('$createdAt'), Query.limit(50)];

    if (filter.status) queries.push(Query.equal('status', filter.status));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.userFiles, queries);
    return response.documents.map(mapUserFile);
  } catch (err) {
    throw mapError(err, 'Gagal memuat file. Coba lagi.');
  }
};

export const getStorageUsage = async (): Promise<StorageUsage> => {
  try {
    const user = await account.get();
    const document = await getByUserId(COLLECTIONS.userStorageUsage, user.$id);
    if (!document) throw new UserServiceError('not_found', 'Data penggunaan storage tidak ditemukan.');
    return mapStorageUsage(document);
  } catch (err) {
    throw mapError(err, 'Gagal memuat penggunaan storage. Coba lagi.');
  }
};
