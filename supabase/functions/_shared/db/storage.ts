import { getClient } from "./client.ts"

const BUCKET = "images"

/** Upload image bytes to Supabase Storage and return the permanent public URL.
 *  Path pattern: {lineUserId}/{orderNo}.png */
export async function uploadImage(
  lineUserId: string,
  orderNo: string,
  bytes: Uint8Array,
): Promise<string> {
  const path = `${lineUserId}/${orderNo}.png`

  const { error } = await getClient().storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = getClient().storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
