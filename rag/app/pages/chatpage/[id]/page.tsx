// app/pages/chatpage/[id]/page.tsx

import ChatClient from '@/components/ChatClient';

export default async function ChatPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // In Next.js 15, params is a Promise, so we need to await it
  const { id } = await params;

  return (
    <ChatClient 
      chatId={id} 
      fileInfoId="your-file-info-id-here" // You need to provide this
    />
  );
}