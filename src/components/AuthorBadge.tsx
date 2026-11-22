import { CAPSULE_CONFIG, type CapsuleAuthor } from "@/config/capsule";

interface AuthorBadgeProps {
  author: CapsuleAuthor;
  showAlias?: boolean;
}

export function AuthorBadge({ author, showAlias = false }: AuthorBadgeProps) {
  const isMe = author === CAPSULE_CONFIG.me;
  const alias = isMe ? CAPSULE_CONFIG.meAliases[0] : CAPSULE_CONFIG.friendAliases[0];

  return (
    <span
      className={
        isMe
          ? "inline-flex items-center gap-1 rounded-full border border-[rgba(192,132,252,0.28)] bg-[rgba(168,85,247,0.14)] px-2.5 py-0.5 text-xs font-medium text-[#D8B4FE]"
          : "inline-flex items-center gap-1 rounded-full border border-[rgba(244,114,182,0.3)] bg-[rgba(244,114,182,0.13)] px-2.5 py-0.5 text-xs font-medium text-[#F9A8D4]"
      }
    >
      <span>{author}</span>
      {showAlias && alias ? (
        <span className="opacity-75">({alias})</span>
      ) : null}
    </span>
  );
}
