"use client";

import React, { useState } from "react";

/**
 * Interactive Spoiler component that unblurs when clicked, like Discord!
 */
function SpoilerText({ children }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((prev) => !prev);
      }}
      title="คลิกเพื่อดูข้อความสปอยล์ (Discord Spoiler)"
      style={{
        backgroundColor: revealed ? "rgba(255, 255, 255, 0.12)" : "rgba(35, 39, 42, 0.95)",
        color: revealed ? "#ffffff" : "transparent",
        filter: revealed ? "none" : "blur(5px)",
        borderRadius: "4px",
        padding: "2px 6px",
        cursor: "pointer",
        userSelect: revealed ? "text" : "none",
        transition: "all 0.2s ease",
        display: "inline-block",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        verticalAlign: "baseline",
      }}
    >
      {children}
    </span>
  );
}

/**
 * Parse inline Discord formatting (bold, italic, underline, strikethrough, spoiler, code)
 */
function parseInline(text) {
  if (!text) return null;

  // Tokenize regex for inline elements
  // Order matters: multiline/larger tokens first
  const regex = /(\|\|.+?\|\||`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|~~[^~]+~~|https?:\/\/[^\s<]+)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];

    // Spoiler ||text||
    if (token.startsWith("||") && token.endsWith("||")) {
      const content = token.slice(2, -2);
      parts.push(
        <SpoilerText key={`spoiler-${match.index}`}>
          {parseInline(content)}
        </SpoilerText>
      );
    }
    // Inline code `code`
    else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`code-${match.index}`}
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            color: "#00e5ff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "0.9em",
            border: "1px solid rgba(0, 229, 255, 0.25)",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    // Bold Italic ***text***
    else if (token.startsWith("***") && token.endsWith("***")) {
      parts.push(
        <strong key={`bi-${match.index}`} style={{ fontStyle: "italic", color: "#ffd700" }}>
          {parseInline(token.slice(3, -3))}
        </strong>
      );
    }
    // Bold **text**
    else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} style={{ color: "#ffd700", fontWeight: "700" }}>
          {parseInline(token.slice(2, -2))}
        </strong>
      );
    }
    // Underline __text__
    else if (token.startsWith("__") && token.endsWith("__")) {
      parts.push(
        <span key={`u-${match.index}`} style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>
          {parseInline(token.slice(2, -2))}
        </span>
      );
    }
    // Strikethrough ~~text~~
    else if (token.startsWith("~~") && token.endsWith("~~")) {
      parts.push(
        <span key={`s-${match.index}`} style={{ textDecoration: "line-through", opacity: 0.65 }}>
          {parseInline(token.slice(2, -2))}
        </span>
      );
    }
    // Italic *text*
    else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${match.index}`} style={{ fontStyle: "italic", color: "#90caf9" }}>
          {parseInline(token.slice(1, -1))}
        </em>
      );
    }
    // Hyperlink
    else if (token.startsWith("http://") || token.startsWith("https://")) {
      parts.push(
        <a
          key={`link-${match.index}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#38bdf8",
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {token}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export default function DiscordMarkdown({ content, style = {} }) {
  if (!content) return null;

  // Process lines and blocks
  const lines = content.split("\n");
  const elements = [];
  let codeBlock = null;
  let codeLang = "";
  let inMultiQuote = false;
  let multiQuoteLines = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Handle code fence ```
    if (rawLine.trim().startsWith("```")) {
      if (codeBlock !== null) {
        // End code block
        elements.push(
          <div
            key={`codeblock-${i}`}
            style={{
              backgroundColor: "#08101e",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              margin: "8px 0",
              overflowX: "auto",
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#a5f3fc",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {codeBlock.join("\n")}
          </div>
        );
        codeBlock = null;
      } else {
        // Start code block
        codeBlock = [];
        codeLang = rawLine.trim().slice(3).trim();
      }
      continue;
    }

    if (codeBlock !== null) {
      codeBlock.push(rawLine);
      continue;
    }

    // Handle multiline blockquote >>>
    if (rawLine.startsWith(">>>")) {
      inMultiQuote = true;
      multiQuoteLines.push(rawLine.slice(3).trim());
      continue;
    }

    if (inMultiQuote) {
      multiQuoteLines.push(rawLine);
      continue;
    }

    // Handle single line blockquote >
    if (rawLine.startsWith("> ")) {
      elements.push(
        <div
          key={`quote-${i}`}
          style={{
            borderLeft: "3.5px solid #00e5ff",
            paddingLeft: "12px",
            margin: "6px 0",
            color: "#e2e8f0",
            background: "rgba(0, 229, 255, 0.05)",
            paddingTop: "4px",
            paddingBottom: "4px",
            borderRadius: "0 6px 6px 0",
          }}
        >
          {parseInline(rawLine.slice(2))}
        </div>
      );
      continue;
    }

    // Handle Discord headers: # H1, ## H2, ### H3
    if (rawLine.startsWith("# ")) {
      elements.push(
        <h3 key={`h1-${i}`} style={{ color: "#ffd700", margin: "10px 0 6px", fontSize: "18px", fontWeight: "800" }}>
          {parseInline(rawLine.slice(2))}
        </h3>
      );
      continue;
    }
    if (rawLine.startsWith("## ")) {
      elements.push(
        <h4 key={`h2-${i}`} style={{ color: "#00e5ff", margin: "8px 0 4px", fontSize: "16px", fontWeight: "700" }}>
          {parseInline(rawLine.slice(3))}
        </h4>
      );
      continue;
    }
    if (rawLine.startsWith("### ")) {
      elements.push(
        <h5 key={`h3-${i}`} style={{ color: "#e2e8f0", margin: "6px 0 3px", fontSize: "14px", fontWeight: "700" }}>
          {parseInline(rawLine.slice(4))}
        </h5>
      );
      continue;
    }

    // Handle bullet list: - item or * item
    if (rawLine.startsWith("- ") || rawLine.startsWith("* ")) {
      elements.push(
        <div key={`bullet-${i}`} style={{ display: "flex", gap: "8px", margin: "3px 0", paddingLeft: "8px" }}>
          <span style={{ color: "#ffd700" }}>•</span>
          <span style={{ flex: 1 }}>{parseInline(rawLine.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Empty line = spacer
    if (!rawLine.trim()) {
      elements.push(<div key={`empty-${i}`} style={{ height: "6px" }} />);
      continue;
    }

    // Regular line
    elements.push(
      <div key={`line-${i}`} style={{ margin: "2px 0", wordBreak: "break-word" }}>
        {parseInline(rawLine)}
      </div>
    );
  }

  // Flush remaining multiquote if any
  if (inMultiQuote && multiQuoteLines.length > 0) {
    elements.push(
      <div
        key="multiquote"
        style={{
          borderLeft: "3.5px solid #00e5ff",
          paddingLeft: "12px",
          margin: "8px 0",
          color: "#e2e8f0",
          background: "rgba(0, 229, 255, 0.05)",
          paddingTop: "6px",
          paddingBottom: "6px",
          borderRadius: "0 6px 6px 0",
        }}
      >
        {multiQuoteLines.map((line, lIdx) => (
          <div key={`mq-${lIdx}`}>{parseInline(line)}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="discord-markdown-container"
      style={{
        lineHeight: 1.6,
        fontSize: "14px",
        color: "#f1f5f9",
        ...style,
      }}
    >
      {elements}
    </div>
  );
}
