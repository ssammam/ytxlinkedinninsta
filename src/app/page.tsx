'use client';

import { useState } from 'react';

export default function Home() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [commentStatus, setCommentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [xStatus, setXStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [liStatus, setLiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [messages, setMessages] = useState({
    sync: '', yt: '', x: '', li: ''
  });

  const triggerApi = async (url: string, key: 'sync' | 'yt' | 'x' | 'li', setStatus: Function) => {
    setStatus('loading');
    setMessages(prev => ({ ...prev, [key]: '' }));
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessages(prev => ({ ...prev, [key]: `Success: Processed ${data.processed || data.replied} items.` }));
      } else {
        setStatus('error');
        setMessages(prev => ({ ...prev, [key]: `Error: ${data.error}` }));
      }
    } catch (err: any) {
      setStatus('error');
      setMessages(prev => ({ ...prev, [key]: err.message }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30 pb-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-400 text-transparent bg-clip-text drop-shadow-sm">
            Automation Hub
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Manage your cross-platform synchronization and automated reply bots.
          </p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Sync Card */}
          <BotCard 
            title="Cross-Platform Sync" 
            desc="Pulls IG videos and distributes to X, LinkedIn, and YT."
            color="purple"
            status={syncStatus}
            message={messages.sync}
            onClick={() => triggerApi('/api/cron/sync', 'sync', setSyncStatus)}
          />

          {/* YT Card */}
          <BotCard 
            title="YouTube Bot" 
            desc="Scans YT comments for pricing & replies autonomously."
            color="red"
            status={commentStatus}
            message={messages.yt}
            onClick={() => triggerApi('/api/cron/youtube-comments', 'yt', setCommentStatus)}
          />

          {/* X Card */}
          <BotCard 
            title="X (Twitter) Bot" 
            desc="Scans mentions for pricing & replies autonomously."
            color="sky"
            status={xStatus}
            message={messages.x}
            onClick={() => triggerApi('/api/cron/x-comments', 'x', setXStatus)}
          />

          {/* LinkedIn Card */}
          <BotCard 
            title="LinkedIn Bot" 
            desc="Scans page comments for pricing & replies autonomously."
            color="blue"
            status={liStatus}
            message={messages.li}
            onClick={() => triggerApi('/api/cron/linkedin-comments', 'li', setLiStatus)}
          />
        </div>
      </div>
    </div>
  );
}

function BotCard({ title, desc, color, status, message, onClick }: any) {
  const colorMap: any = {
    purple: 'from-purple-500 to-indigo-600 hover:border-purple-500/30 text-purple-400 shadow-purple-500/20',
    red: 'from-red-500 to-rose-600 hover:border-red-500/30 text-red-400 shadow-red-500/20',
    sky: 'from-sky-400 to-blue-500 hover:border-sky-500/30 text-sky-400 shadow-sky-500/20',
    blue: 'from-blue-600 to-cyan-600 hover:border-blue-500/30 text-blue-400 shadow-blue-500/20'
  };
  const c = colorMap[color];

  return (
    <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/[0.05] hover:-translate-y-1 ${c.split(' ')[2]}`}>
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.split(' ')[0]} ${c.split(' ')[1]} flex items-center justify-center mb-6 shadow-lg ${c.split(' ')[4]}`}>
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      </div>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-gray-400 text-sm mb-6 h-12">{desc}</p>
      
      <button 
        onClick={onClick}
        disabled={status === 'loading'}
        className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 disabled:opacity-50"
      >
        {status === 'loading' ? 'Processing...' : 'Run Bot Now'}
      </button>

      {message && (
        <div className={`mt-4 p-3 rounded-xl text-xs border ${status === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
