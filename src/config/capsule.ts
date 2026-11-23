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
  guest: "Freya",
  guestAliases: ["Ruune"] as const,
  appTitle: "Living Memory Capsule",
  houseMembersLabel: "Izumi, Rui & Freya",
  lockScreenSubtitle:
    "A quiet midnight home for us: Izumi (cumi), Rui (Lunelle / kekski), and Freya (Ruune). Enter our passcode to step inside.",
  passcodeHint: "Use our shared secret word.",
  bgmTitle: "Jeremy Zucker — always, i'll care",
  bgmSrc: "/bgm.mp3",
  sealedLetterHeading: "A sealed note for us",
  sealedLetterSubtitle:
    "For Rui (Lunelle / kekski), Freya (Ruune), and Izumi (cumi). Tap the seal to read inside.",
  openingLetterTitle: "To our midnight home,",
  openingLetterSignOff: "Always glad we share the same lobby, Izumi (cumi)",
  openingLetter: [
    "I made this little corner of the internet so our favorite nights online don't vanish under a pile of Discord scrolls and full screenshot folders.",
    "This vault is our shared midnight home for the three of us, keeping every chaotic lobby moment, every outfit check, every gifted item, and every late-night laugh we never want to lose.",
    "Whether it's Rui (Lunelle / kekski), Freya (Ruune), or cumi jumping into the room after a long day, thank you for making every session feel lighter, funnier, and warmer than the day before.",
    "Whenever something happens that we want to keep, drop it in here. Let's fill these empty slots together.",
  ],
} as const;

export const CAPSULE_AUTHORS = [
  CAPSULE_CONFIG.me,
  CAPSULE_CONFIG.friend,
  CAPSULE_CONFIG.guest,
] as const;

export type CapsuleAuthor = (typeof CAPSULE_AUTHORS)[number];

export function getAuthorPrimaryAlias(author: CapsuleAuthor): string {
  if (author === CAPSULE_CONFIG.me) {
    return CAPSULE_CONFIG.meAliases[0];
  }
  if (author === CAPSULE_CONFIG.friend) {
    return CAPSULE_CONFIG.friendAliases[0];
  }
  return CAPSULE_CONFIG.guestAliases[0];
}
