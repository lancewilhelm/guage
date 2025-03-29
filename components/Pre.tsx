"use client";
import { useState, useRef, useEffect } from "react";
import CopyIcon from "@/components/Icon/Copy";
import ThumbsUpIcon from "@/components/Icon/ThumbsUp";
import { PropsWithChildren } from "react";
import { useUserSettingsStore } from "@/store/userSettingsStore";

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
  const { settings } = useUserSettingsStore();

  useEffect(() => {
    const preElement = preRef.current;
    if (preElement) {
      // Apply theme-specific classes
      if (settings.darkCode) {
        preElement.classList.remove("light-code");
        preElement.classList.add("dark-code");
        // Remove any theme-specific classes
        document.documentElement.classList.add("dark-code");
        document.documentElement.classList.remove("light-code");
      } else {
        preElement.classList.remove("dark-code");
        preElement.classList.add("light-code");
        // Add the light-code class to root
        document.documentElement.classList.add("light-code");
        document.documentElement.classList.remove("dark-code");
      }
    }
  }, [settings.darkCode]); // Add dependency to prevent unnecessary rerenders

  function copyCode() {
    if (!preRef.current) return;
    const codeElement = preRef.current.querySelector("code");
    if (!codeElement) return;
    navigator.clipboard.writeText(codeElement.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col my-[10px] sm:m-[10px] code">
      <div className="flex flex-col">
        <div className="grid grid-cols-[min-content_max-content_minmax(0,auto)_min-content] text-sm font-mono">
          {language && (
            <div
              className={`bg-(--sub-alt-color) text-(--text-color) p-[5px] rounded-tl-(--border-radius) col-start-1 italic rounded-tr-(--border-radius)`}
            >
              {language}
            </div>
          )}
          <div
            className="flex justify-center w-[30px] items-center bg-(--sub-alt-color) p-[5px] rounded-t-(--border-radius) col-start-4 cursor-pointer hover:opacity-80 transition-all duration-300 copy-code-btn"
            onClick={copyCode}
          >
            {copied ? (
              <ThumbsUpIcon fill="var(--text-color)" />
            ) : (
              <CopyIcon fill="var(--text-color)" />
            )}
          </div>
        </div>
      </div>
      <pre ref={preRef} style={props.style} className="rounded-b shadow">
        {children}
      </pre>
    </div>
  );
}
