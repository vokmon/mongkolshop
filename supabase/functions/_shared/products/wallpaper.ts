import type { WallpaperGeneratedContent } from "../types.ts"

export function buildWallpaperDeliveryText(content: WallpaperGeneratedContent): string {
  return (
    `✨ รูปมงคลของคุณมาแล้วค่ะ!\n\n` +
    `🙏 ${content.fortune_text}\n\n` +
    `📿 คาถา: ${content.mantra}\n` +
    `💡 ความหมาย: ${content.mantra_meaning}\n\n` +
    `🎨 สีมงคล: ${content.lucky_colors}`
  )
}
