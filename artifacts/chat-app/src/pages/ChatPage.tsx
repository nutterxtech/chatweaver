import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { EmptyState } from "@/components/EmptyState";

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleSelectConversation = (id: string) => setSelectedConversationId(id);
  const handleBack = () => setSelectedConversationId(null);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-200">
      {/*
        Mobile:  show sidebar full-width when no chat is selected;
                 show chat full-width when a chat is selected.
        Desktop: always show sidebar (fixed width) + chat side by side.
      */}

      {/* Sidebar */}
      <div className={`
        flex-shrink-0 h-full
        ${selectedConversationId ? "hidden md:flex" : "flex w-full"}
        md:w-[380px] md:flex
      `}>
        <Sidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat area */}
      <div className={`
        flex-1 h-full min-w-0
        ${selectedConversationId ? "flex" : "hidden md:flex"}
      `}>
        {selectedConversationId ? (
          <ChatWindow
            conversationId={selectedConversationId}
            onBack={handleBack}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
