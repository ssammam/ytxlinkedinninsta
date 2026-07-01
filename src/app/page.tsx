'use client';

import { useState } from 'react';

export default function Home() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [commentStatus, setCommentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [commentMessage, setCommentMessage] = useState('');

  const triggerSync = async () => {
    setSyncStatus('loading');
    setSyncMessage('');
    try {
      const res = await fetch('/api/cron/sync');
      const data = await res.json();
      if (res.ok) {
        setSyncStatus('success');
        setSyncMessage(`Successfully processed ${data.processed} new videos.`);
      } else {
        setSyncStatus('error');
        setSyncMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(err.message);
    }
  };

  const triggerComments = async () => {
    setCommentStatus('loading');
    setCommentMessage('');
    try {
      const res = await fetch('/api/cron/youtube-comments');
      const data = await res.json();
      if (res.ok) {
        setCommentStatus('success');
        setCommentMessage(`Successfully replied to ${data.processed} comments.`);
      } else {
        setCommentStatus('error');
        setCommentMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setCommentStatus('error');
      setCommentMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-400 text-transparent bg-clip-text drop-shadow-sm">
            Automation Hub
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Manage your seamless cross-platform social media synchronization and YouTube comment bot operations.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Sync */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/[0.05] hover:border-purple-500/30 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Cross-Platform Sync</h2>
            <p className="text-gray-400 mb-8 h-12">
              Pulls latest Instagram videos and distributes them across X (Twitter), LinkedIn, and YouTube Shorts.
            </p>
            
            <button 
              onClick={triggerSync}
              disabled={syncStatus === 'loading'}
              className="w-full py-4 px-6 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-purple-500 hover:border-purple-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {syncStatus === 'loading' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </>
                ) : 'Trigger Sync Now'}
              </span>
            </button>

            {syncMessage && (
              <div className={`mt-6 p-4 rounded-xl text-sm ${syncStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {syncMessage}
              </div>
            )}
          </div>

          {/* Card 2: Comments */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/[0.05] hover:border-blue-500/30 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">YouTube Bot</h2>
            <p className="text-gray-400 mb-8 h-12">
              Scans YouTube comments for keywords (prices, locations, MC) and replies autonomously.
            </p>
            
            <button 
              onClick={triggerComments}
              disabled={commentStatus === 'loading'}
              className="w-full py-4 px-6 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-blue-500 hover:border-blue-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {commentStatus === 'loading' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </>
                ) : 'Run Comment Check'}
              </span>
            </button>

            {commentMessage && (
              <div className={`mt-6 p-4 rounded-xl text-sm ${commentStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {commentMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
