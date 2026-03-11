import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Video } from 'lucide-react';

interface Channel {
  id: string;
  title: string;
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();

  const fetchChannels = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');

    try {
      const res = await fetch('http://localhost:3000/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) throw new Error('Unauthorized');
      const data = await res.json();
      setChannels(data);
    } catch (err) {
      navigate('/');
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!newTitle.trim()) return;

    try {
      await fetch('http://localhost:3000/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      setNewTitle('');
      fetchChannels();
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="w-screen h-screen bg-zinc-950 text-white p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-800">
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <button onClick={logout} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <LogOut size={20} />
            <span>로그아웃</span>
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex gap-4 mb-10 bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-lg">
          <input
            type="text"
            className="flex-1 bg-zinc-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="새로운 채널(방) 이름..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 px-6 font-bold rounded-lg flex items-center gap-2 transition-colors">
            <Plus size={20} />
            방 생성
          </button>
        </form>

        <h2 className="text-xl font-bold mb-4 text-zinc-300">채널 목록</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map(channel => (
            <div key={channel.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-indigo-500/50 transition-all cursor-pointer group shadow-md" onClick={() => navigate(`/room/${channel.id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-zinc-800 rounded-xl group-hover:bg-indigo-500 transition-colors">
                  <Video size={24} className="text-zinc-400 group-hover:text-white" />
                </div>
              </div>
              <h3 className="font-semibold text-lg truncate mb-1">{channel.title}</h3>
              <p className="text-xs text-zinc-500 font-mono turncate">{channel.id}</p>
            </div>
          ))}
          {channels.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
              아직 생성된 방이 없습니다. 새로운 방을 만들어보세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
