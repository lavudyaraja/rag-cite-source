'use client';

import React from 'react';
import ChatEngine from '@/components/chat/chat-engine';

export default function ChatPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatEngine />
    </div>
  );
}
