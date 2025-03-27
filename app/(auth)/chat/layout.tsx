import { Metadata } from "next";
import ChatLayout from "./chat-layout";

export const metadata: Metadata = {
  title: "Chat | Guage",
  description: "Start a new conversation or continue an existing chat session",
  openGraph: {
    title: "Chat | Guage",
    description:
      "Start a new conversation or continue an existing chat session",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ChatLayout>{children}</ChatLayout>;
}
