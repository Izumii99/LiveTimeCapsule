import { resolveChatSide, splitDateTime } from "@/lib/chat-parser";
import type { ChatMessageLine } from "@/lib/types";
import { DiscordText } from "./DiscordText";

interface ChatBubbleStreamProps {
  messages: ChatMessageLine[];
  compact?: boolean;
}

export function ChatBubbleStream({
  messages,
  compact = false,
}: ChatBubbleStreamProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {messages.map((line, index) => {
        const side = resolveChatSide(line.sender);
        const isMe = side === "me";
        const { date, time } = splitDateTime(line.date_time);

        const previous = messages[index - 1];
        const prevDate = previous ? splitDateTime(previous.date_time).date : "";
        const showDateDivider = Boolean(date) && date !== prevDate;
        const showLabel =
          !previous || previous.sender !== line.sender || prevDate !== date;

        return (
          <div key={index}>
            {showDateDivider ? (
              <div className="my-3 flex items-center justify-center">
                <span className="tabular-nums rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                  {date}
                </span>
              </div>
            ) : null}

            <div
              className={
                isMe ? "flex flex-col items-end" : "flex flex-col items-start"
              }
            >
              {showLabel ? (
                <span
                  className={
                    isMe
                      ? "mb-1 px-1 text-[11px] font-medium text-[#D8B4FE]"
                      : side === "friend"
                        ? "mb-1 px-1 text-[11px] font-medium text-[#F9A8D4]"
                        : "mb-1 px-1 text-[11px] font-medium text-[var(--text-secondary)]"
                  }
                >
                  {line.sender}
                </span>
              ) : null}

              <div
                className={
                  isMe
                    ? "max-w-[85%] rounded-2xl rounded-br-md border border-[rgba(192,132,252,0.28)] bg-[rgba(168,85,247,0.16)] px-3.5 py-2 text-sm leading-relaxed text-[var(--text-primary)]"
                    : "max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-sm leading-relaxed text-[var(--text-primary)]"
                }
              >
                <DiscordText text={line.text} />
                {time ? (
                  <span
                    className={
                      isMe
                        ? "tabular-nums mt-1 block text-right text-[10px] text-[#D8B4FE]/70"
                        : "tabular-nums mt-1 block text-right text-[10px] text-[var(--text-muted)]"
                    }
                  >
                    {time}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
