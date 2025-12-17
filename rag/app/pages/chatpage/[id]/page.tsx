import ChatClient from '@/components/ChatClient';

interface PageProps {
  params: { chatId: string };
}

export default function ChatPage({ params }: PageProps) {
  const { chatId } = params;

  return <ChatClient chatId={chatId} />;
}