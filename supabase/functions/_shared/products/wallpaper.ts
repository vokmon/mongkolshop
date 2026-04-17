import type { WallpaperGeneratedContent } from "../types.ts";
import { KEYWORDS } from "../constants.ts";

export function buildWallpaperDeliveryText(
  content: WallpaperGeneratedContent,
): string {
  return (
    `✨ รูปมงคลของคุณมาแล้วค่ะ!\n\n` +
    `🙏 ${content.fortune_text}\n\n` +
    `📿 คาถาบูชา: ${content.mantra}\n` +
    `💡 ความหมาย: ${content.mantra_meaning}\n\n` +
    `🎨 สีมงคล: ${content.lucky_colors}\n` +
    `🔢 เลขมงคล: ${content.lucky_number}\n\n` +
    `หากต้องการสั่งใหม่ พิมพ์ว่า ${KEYWORDS.RESTART} ได้เลยค่ะ 🙏`
  );
}
