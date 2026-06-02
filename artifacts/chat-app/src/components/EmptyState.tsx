import { MessageCircle, Lock } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-950 gap-4">
      <div className="w-48 h-48 rounded-full bg-[#128C7E]/10 dark:bg-[#128C7E]/20 flex items-center justify-center">
        <MessageCircle className="w-24 h-24 text-[#128C7E] opacity-50" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-light text-gray-700 dark:text-gray-200 mb-2">WhatsChat Web</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Send and receive messages without keeping your phone online. Use WhatsChat on up to 4 linked devices and 1 phone at the same time.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 border-t border-gray-200 dark:border-gray-800 pt-4 w-full max-w-sm justify-center">
        <Lock className="w-3 h-3" />
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
}
