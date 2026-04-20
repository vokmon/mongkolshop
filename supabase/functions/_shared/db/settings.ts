import { getClient } from "./client.ts"

export async function getAllSettings(): Promise<Array<{ key: string; value: string }>> {
  const { data } = await getClient().from("settings").select("key, value")
  return data ?? []
}
