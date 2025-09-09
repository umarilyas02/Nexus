import React, { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "../ui/Button";

interface ChatInputProps {
  onSendMessage: (msg: { type: "text" | "document"; content?: string; file?: File }) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSend = () => {
    if (file) {
      onSendMessage({ type: "document", file });
      setFile(null);
    } else if (text.trim()) {
      onSendMessage({ type: "text", content: text });
      setText("");
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 border-t bg-white">
      {/* File Upload */}
      <label className="cursor-pointer">
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        <Paperclip className="text-gray-600 hover:text-primary-600" size={20} />
      </label>

      {/* Text Input */}
      <input
        type="text"
        value={file ? file.name : text}
        onChange={(e) => setText(e.target.value)}
        placeholder={file ? "Ready to send file" : "Type a message..."}
        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none"
        disabled={!!file}
      />

      {/* Send Button */}
      <Button onClick={handleSend} size="sm" className="flex items-center space-x-1">
        <Send size={16} />
      </Button>
    </div>
  );
};
