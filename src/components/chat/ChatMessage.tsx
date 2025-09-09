import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMessagesBetweenUsers, sendMessage } from '../../data/messages';
import { ChatInput } from './ChatInput';

export const ChatMessage: React.FC = () => {
  const { user } = useAuth();
  const { partnerId } = useParams<{ partnerId: string }>();
  const [chatMessages, setChatMessages] = useState(() =>
    user && partnerId ? getMessagesBetweenUsers(user.id, partnerId) : []
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);

  if (!user || !partnerId) return null;

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle sending a new message
  const handleSend = (content: string) => {
    if (!content.trim()) return;

    const newMsg = sendMessage({
      senderId: user.id,
      receiverId: partnerId,
      content,
    });

    setChatMessages((prev) => [...prev, newMsg]);
  };

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderId === user.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`px-4 py-2 rounded-2xl text-sm max-w-xs ${
                msg.senderId === user.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
};
