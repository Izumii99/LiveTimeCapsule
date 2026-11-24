export type MarkdownNode =
  | { type: "text"; value: string }
  | { type: "bold"; children: MarkdownNode[] }
  | { type: "italic"; children: MarkdownNode[] }
  | { type: "underline"; children: MarkdownNode[] }
  | { type: "strike"; children: MarkdownNode[] }
  | { type: "code"; value: string }
  | { type: "spoiler"; children: MarkdownNode[] };

export interface MarkdownBlock {
  type: "line" | "quote";
  nodes: MarkdownNode[];
}

const MAX_DEPTH = 4;

function isWordChar(ch: string | undefined): boolean {
  return Boolean(ch && /[A-Za-z0-9]/.test(ch));
}

function findClosingDelimiter(
  text: string,
  fromIndex: number,
  delimiter: string,
  requireTightEdges: boolean
): number {
  const len = delimiter.length;
  let pos = fromIndex;

  while (pos <= text.length - len) {
    if (text[pos] === "\\" && pos + 1 < text.length) {
      pos += 2;
      continue;
    }

    if (text.startsWith(delimiter, pos)) {
      const innerLength = pos - fromIndex;
      if (innerLength > 0) {
        if (!requireTightEdges) {
          return pos;
        }

        const firstInner = text[fromIndex];
        const lastInner = text[pos - 1];
        const nextAfter = text[pos + len];
        const validUnderscoreEnd =
          delimiter !== "_" || !isWordChar(nextAfter);

        if (
          firstInner !== " " &&
          lastInner !== " " &&
          validUnderscoreEnd
        ) {
          return pos;
        }
      }
    }

    pos += 1;
  }

  return -1;
}

function pushText(nodes: MarkdownNode[], value: string): void {
  if (!value) {
    return;
  }

  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") {
    last.value += value;
    return;
  }

  nodes.push({ type: "text", value });
}

export function parseInlineMarkdown(
  text: string,
  depth = 0
): MarkdownNode[] {
  if (!text || depth >= MAX_DEPTH) {
    return text ? [{ type: "text", value: text }] : [];
  }

  const nodes: MarkdownNode[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // Escaped markdown marker
    if (
      ch === "\\" &&
      i + 1 < text.length &&
      "*_~|`\\".includes(text[i + 1])
    ) {
      pushText(nodes, text[i + 1]);
      i += 2;
      continue;
    }

    // Inline code: `code`
    if (ch === "`") {
      const close = findClosingDelimiter(text, i + 1, "`", false);
      if (close !== -1) {
        nodes.push({ type: "code", value: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }

    // Spoiler: ||secret||
    if (text.startsWith("||", i)) {
      const close = findClosingDelimiter(text, i + 2, "||", false);
      if (close !== -1) {
        nodes.push({
          type: "spoiler",
          children: parseInlineMarkdown(text.slice(i + 2, close), depth + 1),
        });
        i = close + 2;
        continue;
      }
    }

    // Strikethrough: ~~text~~ (double tilde only so single cute ~ stays literal)
    if (text.startsWith("~~", i)) {
      const close = findClosingDelimiter(text, i + 2, "~~", false);
      if (close !== -1) {
        nodes.push({
          type: "strike",
          children: parseInlineMarkdown(text.slice(i + 2, close), depth + 1),
        });
        i = close + 2;
        continue;
      }
    }

    // Underline: __text__
    if (text.startsWith("__", i)) {
      const close = findClosingDelimiter(text, i + 2, "__", false);
      if (close !== -1) {
        nodes.push({
          type: "underline",
          children: parseInlineMarkdown(text.slice(i + 2, close), depth + 1),
        });
        i = close + 2;
        continue;
      }
    }

    // Bold italic: ***text***
    if (text.startsWith("***", i)) {
      const close = findClosingDelimiter(text, i + 3, "***", true);
      if (close !== -1) {
        nodes.push({
          type: "bold",
          children: [
            {
              type: "italic",
              children: parseInlineMarkdown(
                text.slice(i + 3, close),
                depth + 1
              ),
            },
          ],
        });
        i = close + 3;
        continue;
      }
    }

    // Bold: **text**
    if (text.startsWith("**", i)) {
      const close = findClosingDelimiter(text, i + 2, "**", true);
      if (close !== -1) {
        nodes.push({
          type: "bold",
          children: parseInlineMarkdown(text.slice(i + 2, close), depth + 1),
        });
        i = close + 2;
        continue;
      }
    }

    // Italic: *text*
    if (ch === "*") {
      const close = findClosingDelimiter(text, i + 1, "*", true);
      if (close !== -1) {
        nodes.push({
          type: "italic",
          children: parseInlineMarkdown(text.slice(i + 1, close), depth + 1),
        });
        i = close + 1;
        continue;
      }
    }

    // Italic: _text_ (only outside words so snake_case stays intact)
    if (ch === "_" && !isWordChar(text[i - 1])) {
      const close = findClosingDelimiter(text, i + 1, "_", true);
      if (close !== -1) {
        nodes.push({
          type: "italic",
          children: parseInlineMarkdown(text.slice(i + 1, close), depth + 1),
        });
        i = close + 1;
        continue;
      }
    }

    pushText(nodes, ch);
    i += 1;
  }

  return nodes;
}

export function parseDiscordMarkdown(input: string): MarkdownBlock[] {
  const lines = input.split("\n");
  return lines.map((line) => {
    // Require a space after '>' so emoticons like >w> stay plain text
    if (line.startsWith("> ")) {
      return {
        type: "quote",
        nodes: parseInlineMarkdown(line.slice(2)),
      };
    }

    return {
      type: "line",
      nodes: parseInlineMarkdown(line),
    };
  });
}
