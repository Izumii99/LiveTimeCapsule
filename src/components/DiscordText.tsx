"use client";

import { Fragment, useState, type ReactNode } from "react";
import {
  parseDiscordMarkdown,
  type MarkdownNode,
} from "@/lib/discord-markdown";

function SpoilerSpan({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setRevealed((prev) => !prev);
      }}
      aria-label={revealed ? "Hide spoiler" : "Reveal spoiler"}
      className={
        revealed
          ? "inline rounded bg-[rgba(255,255,255,0.1)] px-1 py-0.5 text-left transition-colors"
          : "inline cursor-pointer rounded bg-[rgba(11,10,16,0.75)] px-1 py-0.5 text-transparent transition-colors select-none hover:bg-[rgba(11,10,16,0.9)]"
      }
    >
      <span className={revealed ? "opacity-100" : "opacity-0"}>{children}</span>
    </button>
  );
}

function renderNodes(nodes: MarkdownNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "bold":
        return (
          <strong key={key} className="font-semibold text-[var(--text-primary)]">
            {renderNodes(node.children, key)}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className="italic text-[#E8E2F6]">
            {renderNodes(node.children, key)}
          </em>
        );
      case "underline":
        return (
          <span key={key} className="underline underline-offset-2">
            {renderNodes(node.children, key)}
          </span>
        );
      case "strike":
        return (
          <del key={key} className="line-through opacity-75">
            {renderNodes(node.children, key)}
          </del>
        );
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-[rgba(11,10,16,0.55)] px-1.5 py-0.5 font-mono text-[0.82em] text-[#E9D5FF]"
          >
            {node.value}
          </code>
        );
      case "spoiler":
        return (
          <SpoilerSpan key={key}>{renderNodes(node.children, key)}</SpoilerSpan>
        );
    }
  });
}

interface DiscordTextProps {
  text: string;
}

export function DiscordText({ text }: DiscordTextProps) {
  const blocks = parseDiscordMarkdown(text);

  return (
    <div className="space-y-1 break-words">
      {blocks.map((block, index) => {
        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-[rgba(192,132,252,0.55)] pl-2.5 text-[var(--text-secondary)]"
            >
              {block.nodes.length > 0
                ? renderNodes(block.nodes, `q-${index}`)
                : "\u00A0"}
            </blockquote>
          );
        }

        return (
          <p key={index} className="min-h-[1.25em]">
            {block.nodes.length > 0
              ? renderNodes(block.nodes, `l-${index}`)
              : "\u00A0"}
          </p>
        );
      })}
    </div>
  );
}
