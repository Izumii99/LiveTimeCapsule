export const MEMORY_CATEGORIES = [
  "#Moment",
  "#FunnyChat",
  "#OutfitCheck",
  "#ItemGift",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const CAPSULE_CONFIG = {
  me: "Izumi",
  meAliases: ["cumi"] as const,
  friend: "Rui",
  friendAliases: ["Lunelle", "kekski"] as const,
  appTitle: "Living Memory Capsule",
  lockScreenSubtitle:
    "A quiet midnight corner for Rui (Lunelle / kekski) and Izumi (cumi). Enter our passcode to step inside.",
  passcodeHint: "Use our shared secret word.",
  bgmTitle: "Jeremy Zucker — always, i'll care",
  bgmSrc: "/bgm.mp3",
  openingLetterTitle: "Hey Rui,",
  openingLetterSignOff: "Always glad we queued up, Izumi (cumi)",
  openingLetter: [
    "I made this little corner of the internet so our favorite nights online don't vanish under a pile of Discord scrolls and full screenshot folders.",
    "We only have a handful of screenshots tucked in right now, and that's the whole point. This vault is meant to grow with us — every chaotic lobby moment, every outfit check, every item you randomly gifted me, and every late-night chat line that made us laugh way too hard.",
    "Whether I'm calling you Rui, Lunelle, or kekski, and whether you're teasing cumi right back, thank you for making every session feel lighter and warmer than the day before.",
    "Whenever something happens that we never want to forget, drop it in here. Let's fill these empty slots together.",
  ],
} as const;

export const CAPSULE_AUTHORS = [
  CAPSULE_CONFIG.me,
  CAPSULE_CONFIG.friend,
] as const;

export type CapsuleAuthor = (typeof CAPSULE_AUTHORS)[number];
