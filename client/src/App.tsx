import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { AnimatedAIChat } from "./components/AnimatedAIChat";
import { ResponseWindow } from "./components/ResponseWindow";
import { LoginPage } from "./components/LoginPage";
import { SignupPage } from "./components/SignupPage";
import { Header } from "./components/Header";
import "./globals.css";

interface ChatItem {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  responses?: Response[];
  judgeAnalysis?: string;
}

interface Response {
  model: string;
  text: string;
  score: number;
  best: boolean;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [activeResponse, setActiveResponse] = useState<{
    id: string;
    prompt: string;
    responses: Response[];
    judgeAnalysis?: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState<'welcome' | 'login' | 'signup'>('welcome');

  // Check if user is logged in and load history on mount
  useEffect(() => {
    console.log('🔍 App mounted, loading chat history from DB...');
    const token = localStorage.getItem('br_token');
    const userData = localStorage.getItem('br_user');

    if (token && userData) {
      setIsLoggedIn(true);
      const parsed = JSON.parse(userData);
      setUser({ name: parsed.username, email: parsed.email });
    }

    // Load chat history from database
    loadChatHistory();
  }, []);

  // Load chat history from database
  const loadChatHistory = async () => {
    try {
      console.log('🔄 Fetching chat history from DB...');
      const response = await fetch('/api/ai/history');
      console.log('📡 API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📚 Raw data from API:', data);

        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.log('⚠️ API returned empty data, checking localStorage...');
          const saved = localStorage.getItem('br_chat_history');
          if (saved) {
            const parsed = JSON.parse(saved);
            console.log('📚 Loaded from localStorage:', parsed.length, 'chats');
            setChatHistory(parsed);
            return;
          }
          setChatHistory([]);
          return;
        }

        // Handle both array and object responses
        let history = Array.isArray(data) ? data : (data.history || data || []);

        if (!Array.isArray(history)) {
          console.error('❌ History is not an array:', history);
          history = [];
        }

        // Map MongoDB _id to id field and generate title from prompt if missing
        history = history.map((chat: any) => {
          if (!chat) return null;
          return {
            ...chat,
            id: chat.id || chat._id || Date.now().toString(),
            title: chat.title || (chat.prompt ? chat.prompt.substring(0, 50) + (chat.prompt.length > 50 ? "..." : "") : "Untitled"),
            prompt: chat.prompt || '',
            createdAt: chat.createdAt || new Date().toISOString(),
          };
        }).filter(Boolean);

        console.log('✅ Processed history:', history.length, 'chats', history);
        setChatHistory(history);
        localStorage.setItem('br_chat_history', JSON.stringify(history));
        console.log('💾 Saved to localStorage:', history.length, 'chats');
      } else {
        console.log('⚠️ API Error:', response.status, response.statusText);
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error loading history:', error);
      console.log('📚 Falling back to localStorage...');

      const saved = localStorage.getItem('br_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('✅ Loaded from localStorage fallback:', parsed.length, 'chats');
          setChatHistory(parsed);
        } catch (parseError) {
          console.error('❌ Failed to parse localStorage:', parseError);
          setChatHistory([]);
        }
      } else {
        console.log('⚠️ No chat history found anywhere');
        setChatHistory([]);
      }
    }
  };

  // Save chat to history
  const addChatToHistory = (prompt: string) => {
    const newChat: ChatItem = {
      id: Date.now().toString(),
      title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
      prompt: prompt,
      createdAt: new Date().toISOString(),
    };

    const updated = [newChat, ...chatHistory];
    setChatHistory(updated);
    localStorage.setItem('br_chat_history', JSON.stringify(updated));
    setSelectedChatId(newChat.id);
  };

  const handleLoginSuccess = (token: string, username: string, email: string) => {
    setUser({ name: username, email });
    setIsLoggedIn(true);
    setCurrentPage('welcome');
  };

  const handleSignupSuccess = (token: string, username: string, email: string) => {
    setUser({ name: username, email });
    setIsLoggedIn(true);
    setCurrentPage('welcome');
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setSelectedChatId(null);
    setActiveResponse(null);
    localStorage.removeItem('br_token');
    localStorage.removeItem('br_user');
    setChatHistory([]);
    localStorage.removeItem('br_chat_history');
    setCurrentPage('welcome');
  };

  const handleSelectChat = (id: string | null) => {
    console.log('🔍 handleSelectChat called with id:', id);
    setSelectedChatId(id);
    if (id) {
      const chat = chatHistory.find(c => c.id === id);
      console.log('🔎 Found chat:', chat);
      if (chat) {
        console.log('✅ Opening chat:', chat);
        const response = {
          id: chat.id,
          prompt: chat.prompt,
          responses: chat.responses || [],
          judgeAnalysis: chat.judgeAnalysis || '',
        };
        console.log('📤 Setting activeResponse:', response);
        setActiveResponse(response);
        console.log('✅ setActiveResponse called');
      } else {
        console.log('❌ Chat not found in history');
      }
    }
  };

  const handleDeleteChat = (id: string) => {
    console.log('🗑️ Deleting chat:', id);
    const updated = chatHistory.filter(chat => chat.id !== id);
    setChatHistory(updated);
    localStorage.setItem('br_chat_history', JSON.stringify(updated));
    if (selectedChatId === id) {
      setSelectedChatId(null);
      setActiveResponse(null);
    }
  };

  const handleMessageSent = async (prompt: string, chatId?: string) => {
    const isNewChat = !chatId;
    const finalChatId = chatId || Date.now().toString();

    console.log('💬 Message sent:', { isNewChat, chatId: finalChatId, prompt: prompt.substring(0, 50) });

    if (isNewChat) {
      // NEW CHAT - Create and initialize
      const newChat: ChatItem = {
        id: finalChatId,
        title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
        prompt,
        createdAt: new Date().toISOString(),
        responses: [],
        judgeAnalysis: 'Loading...',
      };

      const currentHistory = JSON.parse(localStorage.getItem('br_chat_history') || '[]');
      const updated = [newChat, ...currentHistory];
      localStorage.setItem('br_chat_history', JSON.stringify(updated));
      setChatHistory(updated);
      console.log('✅ New chat created');

      setActiveResponse({
        id: finalChatId,
        prompt,
        responses: [],
        judgeAnalysis: 'Thinking...',
      });
      setSelectedChatId(finalChatId);
    } else {
      // CONTINUE CHAT - Just update status
      console.log('✏️ Continuing chat');
      setActiveResponse(prev => prev ? { ...prev, judgeAnalysis: 'Thinking...' } : null);
    }

    try {
      const response = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...(chatId ? { chatId } : {}) }),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 API Response data:', data);

      // Generate smart title only for new chats
      let smartTitle: string | null = null;
      if (isNewChat) {
        try {
          const titleRes = await fetch('/api/ai/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
          if (titleRes.ok) {
            const titleData = await titleRes.json();
            smartTitle = titleData.title;
            console.log('✨ Smart title generated:', smartTitle);
          }
        } catch (titleError) {
          console.log('ℹ️ Using default title');
        }
      }

      // Get existing chat for continuation
      const existingChat = chatHistory.find(c => c.id === finalChatId);

      // Update with actual responses
      const updatedChat: ChatItem = {
        id: finalChatId,
        title: smartTitle || (existingChat?.title || prompt.substring(0, 50)),
        prompt: existingChat?.prompt || prompt,
        createdAt: existingChat?.createdAt || new Date().toISOString(),
        responses: data.responses || [],
        judgeAnalysis: data.judgeAnalysis || '',
      };

      // Update history
      const history = JSON.parse(localStorage.getItem('br_chat_history') || '[]');
      const filtered = history.filter((c: ChatItem) => c.id !== finalChatId);
      const finalUpdated = [updatedChat, ...filtered];
      localStorage.setItem('br_chat_history', JSON.stringify(finalUpdated));
      setChatHistory(finalUpdated);
      console.log('✅ Chat updated with responses');

      // Reload from DB
      await loadChatHistory();

      // Update ResponseWindow
      setActiveResponse({
        id: finalChatId,
        prompt: existingChat?.prompt || prompt,
        responses: data.responses || [],
        judgeAnalysis: data.judgeAnalysis || '',
      });
    } catch (error) {
      console.error("❌ Error:", error);
      setActiveResponse(prev => prev ? {
        ...prev,
        judgeAnalysis: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      } : null);
    }
  };

  // Show login page
  if (!isLoggedIn && currentPage === 'login') {
    return (
      <LoginPage
        onBackClick={() => setCurrentPage('welcome')}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Show signup page
  if (!isLoggedIn && currentPage === 'signup') {
    return (
      <SignupPage
        onBackClick={() => setCurrentPage('welcome')}
        onSignupSuccess={handleSignupSuccess}
      />
    );
  }

  // Show chat page for all users
  return (
    <>
      {/* Header with auth buttons - only show when not logged in */}
      {!isLoggedIn && (
        <Header
          onLogin={() => setCurrentPage('login')}
          onSignup={() => setCurrentPage('signup')}
          isLoggedIn={isLoggedIn}
        />
      )}

      <div className="flex w-full min-h-screen bg-[#0b0b14]">
        {/* Sidebar - always show */}
        <Sidebar
          onSelectChat={handleSelectChat}
          selectedId={selectedChatId}
          isLoggedIn={isLoggedIn}
          userName={user?.name}
          userEmail={user?.email}
          onLogout={handleLogout}
          onLogin={() => setCurrentPage('login')}
          onGetStarted={() => setCurrentPage('signup')}
          chatHistory={chatHistory}
          onMinimizedChange={setSidebarMinimized}
          onDeleteChat={handleDeleteChat}
          onRefresh={loadChatHistory}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          {console.log('🎯 Rendering - activeResponse:', activeResponse)}
          {activeResponse ? (
            <ResponseWindow
              id={activeResponse.id}
              prompt={activeResponse.prompt}
              responses={activeResponse.responses}
              judgeAnalysis={activeResponse.judgeAnalysis}
              onClose={() => {
                setActiveResponse(null)
                setSelectedChatId(null)
              }}
              onMessageSent={handleMessageSent}
            />
          ) : (
            <AnimatedAIChat onMessageSent={handleMessageSent} />
          )}
        </div>
      </div>
    </>
  );
}
