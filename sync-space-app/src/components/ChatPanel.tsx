import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Paperclip, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: { id: string; email: string };
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  created_at: string;
}

interface ChatPanelProps {
  channelId: string;
}

export default function ChatPanel({ channelId }: ChatPanelProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:3000', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_channel', { channelId });
    });

    newSocket.on('channel_history', (data: { messages: ChatMessage[] }) => {
      setMessages(data.messages);
      scrollToBottom();
    });

    newSocket.on('receive_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [channelId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;
    socket.emit('send_message', { channelId, content: inputText, type: 'TEXT' });
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      const type = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
      const content = JSON.stringify({ url: data.url, filename: data.originalname });
      
      socket.emit('send_message', { channelId, content, type });
    } catch (err) {
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.type === 'TEXT') return <p>{msg.content}</p>;
    
    try {
      const data = JSON.parse(msg.content);
      if (msg.type === 'IMAGE') {
        return <img src={data.url} alt={data.filename} className="max-w-full h-auto rounded-lg" />;
      }
      return (
        <a href={data.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 font-medium">
          <Paperclip size={14}/>
          {data.filename}
        </a>
      );
    } catch(e) {
      return <p>{msg.content}</p>; // 파싱 실패 시 원본 표시
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-900 border-l border-zinc-800 w-80 shadow-2xl z-[60] pointer-events-auto absolute right-0 top-0">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <h2 className="text-lg font-bold text-white">라이브 채팅</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-zinc-700">
        {messages.map((msg, index) => {
          const isMe = false; // 현재 로그인된 사용자 검증 (시간상 생략, 전부 좌측 정렬)
          return (
            <div key={msg.id || index} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-zinc-500 mb-1">{msg.sender.email.split('@')[0]}</span>
              <div className={`p-3 rounded-2xl shadow-sm max-w-[90%] text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                {renderMessageContent(msg)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <form onSubmit={handleSendText} className="flex gap-2">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors shrink-0"
            disabled={isUploading}
            title="파일 첨부"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-500"
            placeholder={isUploading ? "업로드 중..." : "메시지 입력..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isUploading}
          />
          <button 
            type="submit" 
            className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shrink-0 flex items-center justify-center disabled:opacity-50" 
            disabled={isUploading || !inputText.trim()}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
