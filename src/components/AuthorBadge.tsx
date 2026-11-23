import {
  CAPSULE_CONFIG,
  getAuthorPrimaryAlias,
  type CapsuleAuthor,
} from "@/config/capsule";

interface AuthorBadgeProps {
  author: CapsuleAuthor;
  showAlias?: boolean;
}

const AUTHOR_STYLES: Record<CapsuleAuthor, string> = {
  [CAPSULE_CONFIG.me]:
    "inline-flex items-center gap-1 rounded-full border border-[rgba(192,132,252,0.28)] bg-[rgba(168,85,247,0.14)] px-2.5 py-0.5 text-xs font-medium text-[#D8B4FE]",
  [CAPSULE_CONFIG.friend]:
    "inline-flex items-center gap-1 rounded-full border border-[rgba(244,114,182,0.3)] bg-[rgba(244,114,182,0.13)] px-2.5 py-0.5 text-xs font-medium text-[#F9A8D4]",
  [CAPSULE_CONFIG.guest]:
    "inline-flex items-center gap-1 rounded-full border border-[rgba(125,211,252,0.3)] bg-[rgba(56,189,248,0.13)] px-2.5 py-0.5 text-xs font-medium text-[#BAE6FD]",
};

export function AuthorBadge({ author, showAlias = false }: AuthorBadgeProps) {
  const alias = getAuthorPrimaryAlias(author);

  return (
    <span className={AUTHOR_STYLES[author]}>
      <span>{author}</span>
      {showAlias && alias ? (
        <span className="opacity-75">({alias})</span>
      ) : null}
    </span>
  );
}
