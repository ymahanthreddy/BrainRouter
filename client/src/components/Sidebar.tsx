import { useEffect, useState } from 'react'
import { Trash2, Menu, X, LogOut, RotateCw, User, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatItem {
  id: string
  title: string
  prompt: string
  createdAt: string
}

interface SidebarProps {
  onSelectChat: (id: string | null) => void
  selectedId: string | null
  isLoggedIn: boolean
  userName?: string
  userEmail?: string
  onLogout?: () => void
  onLogin?: () => void
  onGetStarted?: () => void
  chatHistory?: ChatItem[]
  onMinimizedChange?: (minimized: boolean) => void
  onDeleteChat?: (id: string) => void
  onRefresh?: () => void
  isViewingChat?: boolean
}

export function Sidebar({
  onSelectChat,
  selectedId,
  isLoggedIn,
  userName,
  userEmail,
  onLogout,
  onLogin,
  onGetStarted,
  chatHistory = [],
  onMinimizedChange,
  onDeleteChat,
  onRefresh,
  isViewingChat
}: SidebarProps) {
  const [loading, setLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Always use chatHistory from parent, never local state
  const prompts = chatHistory

  useEffect(() => {
    onMinimizedChange?.(isMinimized)
  }, [isMinimized, onMinimizedChange])

  const handleRefresh = async () => {
    setLoading(true)
    console.log('🔄 Manual refresh triggered')
    await onRefresh?.()
    setLoading(false)
  }

  const deletePrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this chat?')) return
    onDeleteChat?.(id)
  }

  return (
    <motion.div
      animate={{ width: isMinimized ? 60 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative backdrop-blur-xl border-r border-purple-500/10 flex flex-col overflow-hidden bg-gradient-to-b from-white/[0.03] to-white/[0.01]"
    >

      {/* Header - Logo and Menu Toggle */}
      <motion.div
        className="relative p-3 border-b border-purple-500/10 backdrop-blur-lg"
        layout
      >
        {/* Logo at top */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0">
            ⚡
          </div>
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-white font-bold text-sm whitespace-nowrap"
              >
                BrainRouter
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu toggle and user actions */}
        <div className="flex items-center gap-2">
          {/* Toggle button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors flex-shrink-0"
            title={isMinimized ? 'Expand' : 'Collapse'}
          >
            {isMinimized ? (
              <Menu size={20} className="text-purple-400" />
            ) : (
              <X size={20} className="text-purple-400" />
            )}
          </motion.button>

          {/* Expanded content */}
          <AnimatePresence mode="wait">
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 flex-1"
              >
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onClick={handleRefresh}
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded transition-all border border-purple-400/20 hover:border-purple-400/40 disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                  title="Refresh history"
                >
                  <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
                </motion.button>

                {isLoggedIn && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onLogout}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors flex items-center justify-center flex-shrink-0"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </motion.button>
                )}

                {isLoggedIn && userName && (
                  <div className="px-2 py-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {userName.split(' ')[0]}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* History List */}
      <motion.div className="flex-1 overflow-y-auto relative" layout>
        <AnimatePresence mode="popLayout">
          {prompts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-2 space-y-2"
            >
              {prompts.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  {/* Prompt Item - Only show when expanded */}
                  {!isMinimized && (
                    <motion.div
                      onClick={() => onSelectChat(item.id)}
                      whileHover={{ scale: 1.01, x: 3 }}
                      className={`p-2 cursor-pointer rounded transition-all ${
                        selectedId === item.id
                          ? 'bg-purple-500/20 border border-purple-400/30'
                          : 'bg-transparent border border-transparent hover:bg-purple-500/10 hover:border-purple-400/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/90 truncate">
                            {item.title || item.prompt}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.2, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => deletePrompt(item.id, e)}
                          className="text-gray-400 hover:text-red-400 flex-shrink-0 transition-colors"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            !isMinimized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 text-center text-sm text-gray-500"
              >
                No chat history yet
              </motion.div>
            )
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer - User Profile / Auth */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 border-t border-purple-500/10 backdrop-blur-lg mt-auto"
      >
        {isLoggedIn ? (
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-purple-500/20 transition-all"
              title={isMinimized ? userName : ''}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {(userName || 'U')[0].toUpperCase()}
              </div>
              {!isMinimized && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{userName || 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
              )}
            </motion.button>

            {/* Profile Menu Dropdown */}
            <AnimatePresence>
              {showProfileMenu && !isMinimized && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full mb-2 bg-gray-900/95 border border-purple-500/30 rounded-lg p-2 space-y-1 z-50 left-0 right-0"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-500/20 transition-all text-left text-sm text-purple-300"
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-500/20 transition-all text-left text-sm text-blue-300"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-all text-left text-sm text-red-400"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-purple-500/20 transition-all"
              title={isMinimized ? 'Guest' : ''}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs text-gray-300 flex-shrink-0">
                <User size={16} />
              </div>
              {!isMinimized && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-semibold text-white">Guest</p>
                  <p className="text-xs text-gray-400">{prompts.length} saved</p>
                </div>
              )}
            </motion.button>

            {/* Guest Menu Dropdown */}
            <AnimatePresence>
              {showProfileMenu && !isMinimized && !isViewingChat && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full mb-2 bg-gray-900/95 border border-purple-500/30 rounded-lg p-2 space-y-1 z-50 left-0 right-0"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onLogin?.()
                      setShowProfileMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-500/20 transition-all text-left text-sm text-blue-300"
                  >
                    <User size={16} />
                    <span>Sign In</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onGetStarted?.()
                      setShowProfileMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-all text-left text-sm text-green-300"
                  >
                    <User size={16} />
                    <span>Get Started</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
