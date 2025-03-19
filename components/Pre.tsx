"use client";
import { useState, useRef } from "react";
import CopyIcon from "@/components/Icon/Copy";
import ThumbsUpIcon from "@/components/Icon/ThumbsUp";
import { PropsWithChildren } from "react";

interface PreProps extends PropsWithChildren {
  node?: { children: { properties: { className: string[] } }[] } | undefined;
  style?: React.CSSProperties;
}

export default function Pre({ children, ...props }: PreProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const language = props.node?.children[0].properties.className?.[1].replace(
    "language-",
    "",
  );

  function copyCode() {
    if (!preRef.current) return;
    const codeElement = preRef.current.querySelector("code");
    if (!codeElement) return;
    navigator.clipboard.writeText(codeElement.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col my-[10px] sm:m-[10px]">
      <div className="flex flex-col">
        <div className="grid grid-cols-[min-content_max-content_auto_min-content] text-sm font-mono">
          {language && (
            <div
              className={`bg-(--main-color) text-(--bg-color) p-[5px] rounded-tl-(--border-radius) col-start-1 italic rounded-tr-(--border-radius)`}
            >
              {language}
            </div>
          )}
          <div
            className="flex justify-center w-[30px] items-center bg-(--main-color) text-(--bg-color) p-[5px] rounded-t-(--border-radius) col-start-4 cursor-pointer hover:bg-(--sub-color) transition-all duration-300 copy-code-btn"
            onClick={copyCode}
          >
            {copied ? (
              <ThumbsUpIcon fill="var(--bg-color)" />
            ) : (
              <CopyIcon fill="var(--bg-color)" />
            )}
          </div>
        </div>
      </div>
      <pre
        ref={preRef}
        style={props.style}
        className="overflow-x-auto border border-(--main-color) rounded-b"
      >
        {children}
      </pre>
    </div>
  );
}
