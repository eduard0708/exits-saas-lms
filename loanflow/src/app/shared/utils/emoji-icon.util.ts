import emojiIconMap from '@assets/config/emoji-icon-map.json';

const DEFAULT_EMOJI = '✨';

const ICON_MAP: Record<string, string> = emojiIconMap;

export function iconToEmoji(name?: string | null, fallback: string = DEFAULT_EMOJI): string {
  if (!name) {
    return fallback;
  }

  const normalized = name.toLowerCase();
  return (
    ICON_MAP[normalized] ||
    ICON_MAP[normalized.replace(/-outline$/, '')] ||
    fallback
  );
}
