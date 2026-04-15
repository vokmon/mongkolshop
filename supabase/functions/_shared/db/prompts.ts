import { getClient } from "./client.ts"
import type { Prompt } from "../types.ts"

export async function getAllPrompts(): Promise<Prompt[]> {
  const { data, error } = await getClient().from("prompts").select("*")
  if (error) throw error
  return data
}
