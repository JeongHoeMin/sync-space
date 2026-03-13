import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Paperclip, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: { id: string; email: string };
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  created_at: string;
  tempId?: string;
  isSending?: boolean;
  isError?: boolean;
}

interface ChatPanelProps {
  channelId: string;
}

export default function ChatPanel({ channelId }: ChatPanelProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(API_URL, {
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
      setMessages((prev) => {
        if (msg.tempId) {
          const index = prev.findIndex(m => m.id === msg.tempId);
          if (index !== -1) {
            const newMessages = [...prev];
            newMessages[index] = msg;
            return newMessages;
          }
        }
        return [...prev, msg];
      });
      scrollToBottom();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [channelId]);

  const fetchPreviousMessages = async () => {
    // 메시지가 없거나(초기 로딩 전) 다음 페이지가 없거나 로딩 중이면 중단
    if (!hasNextPage || isLoadingMore || messages.length === 0) return;
    
    setIsLoadingMore(true);
    const cursor = messages[0].id;
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/messages?cursor=${cursor}&limit=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.messages && data.messages.length > 0) {
        const container = scrollContainerRef.current;
        const oldScrollHeight = container?.scrollHeight || 0;
        const oldScrollTop = container?.scrollTop || 0;
        
        setMessages(prev => [...data.messages, ...prev]);
        setHasNextPage(data.hasNextPage);
        
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
          }
        }, 0);
      } else {
        setHasNextPage(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchPreviousMessages();
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [messages, hasNextPage, isLoadingMore]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;
    
    let email = 'me';
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email || 'me';
      }
    } catch (e) {}
    
    const tempId = `temp-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      sender: { id: 'me', email },
      content: inputText,
      type: 'TEXT',
      created_at: new Date().toISOString(),
      isSending: true
    };
    
    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();
    
    socket.emit('send_message', { channelId, content: inputText, type: 'TEXT', tempId });
    setInputText('');
    
    // 5초 타임아웃
    setTimeout(() => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === tempId);
        if (idx !== -1 && prev[idx].isSending) {
           const next = [...prev];
           next[idx] = { ...next[idx], isSending: false, isError: true };
           return next;
        }
        return prev;
      });
    }, 5000);
  };
  
  const handleResend = (msg: ChatMessage) => {
    if (!socket || !msg.isError) return;
    
    // 낙관적 UI 재설정
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msg.id);
      if (idx !== -1) {
         const next = [...prev];
         next[idx] = { ...next[idx], isSending: true, isError: false };
         return next;
      }
      return prev;
    });
    
    socket.emit('send_message', { channelId, content: msg.content, type: msg.type, tempId: msg.id });
    
    setTimeout(() => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msg.id);
        if (idx !== -1 && prev[idx].isSending) {
           const next = [...prev];
           next[idx] = { ...next[idx], isSending: false, isError: true };
           return next;
        }
        return prev;
      });
    }, 5000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File | undefined;
    if ('target' in e) {
      file = e.target.files?.[0];
    } else {
      file = e as File;
    }
    
    if (!file || !socket) return;

    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/upload`, true);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        const type = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
        const content = JSON.stringify({ url: data.url, filename: data.originalname });
        socket.emit('send_message', { channelId, content, type });
      } else {
        if (xhr.status === 413) {
          showToast('20MB 이하의 파일만 업로드 가능합니다.');
        } else if (xhr.status === 415) {
          showToast('지원하지 않는 파일 형식입니다.');
        } else {
          showToast('파일 업로드에 실패했습니다.');
        }
      }
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.onerror = () => {
      showToast('네트워크 오류가 발생했습니다.');
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.send(formData);
  };
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
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
    <div 
      className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 w-80 shadow-2xl z-[60] pointer-events-auto absolute right-0 bottom-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-[70] backdrop-blur-sm whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm border-2 border-dashed border-indigo-400 z-[65] flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900/90 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
            <Paperclip size={32} className="text-indigo-400" />
            <p className="text-white font-medium">이곳에 파일을 놓으세요</p>
          </div>
        </div>
      )}

      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <h2 className="text-lg font-bold text-white">라이브 채팅</h2>
      </div>
      
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-zinc-700">
        {hasNextPage && messages.length > 0 && (
          <div ref={observerTarget} className="h-4 w-full flex items-center justify-center shrink-0">
            {isLoadingMore && <span className="text-zinc-500 text-xs">이전 대화 로딩 중...</span>}
          </div>
        )}
        {messages.map((msg, index) => {
          const isMe = msg.isSending || msg.isError || false; // 낙관적 렌더링은 무조건 내 메시지 (우측)
          // 실제로는 사용자 검증이 필요하지만 시연용
          return (
            <div key={msg.id || index} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-zinc-500 mb-1">{msg.sender.email.split('@')[0]}</span>
              <div className="flex items-center gap-2">
                {isMe && msg.isError && (
                  <button onClick={() => handleResend(msg)} className="text-xs text-red-500 hover:underline">재전송</button>
                )}
                {isMe && msg.isSending && (
                  <span className="text-xs text-zinc-400">⏳</span>
                )}
                <div className={`p-3 rounded-2xl shadow-sm max-w-[90%] text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'} ${msg.isError ? 'opacity-50 ring-2 ring-red-500' : ''}`}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur shrink-0 relative">
        {isUploading && (
          <div className="absolute -top-1 left-0 right-0 h-1 bg-zinc-800">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300 relative"
              style={{ width: `${uploadProgress}%` }}
            >
              <div className="absolute -top-5 right-0 text-[10px] text-zinc-400 bg-zinc-800 px-1 rounded">
                {uploadProgress}%
              </div>
            </div>
          </div>
        )}
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
