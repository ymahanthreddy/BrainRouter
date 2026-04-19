import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Mic, Globe, Check, ArrowLeft } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Response {
  model: string
  text: string
  score: number
  best: boolean
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  model?: string
  isResponse?: boolean
}

interface ResponseWindowProps {
  id?: string
  prompt: string
  responses: Response[]
  onClose?: (id: string) => void
  judgeAnalysis?: string
  onMessageSent?: (prompt: string, chatId: string) => void
  followUps?: Array<{ prompt: string; timestamp: string }>
}

export function ResponseWindow({
  id = 'main',
  prompt,
  responses,
  onClose,
  judgeAnalysis,
  onMessageSent,
  followUps = []
}: ResponseWindowProps) {
  const [isListening, setIsListening] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  const recognitionRef = useRef<any>(null)
  const [showUserChoice, setShowUserChoice] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [userChoiceSubmitted, setUserChoiceSubmitted] = useState(false)
  const [currentView, setCurrentView] = useState<'chat' | string>('chat')
  const [chatInput, setChatInput] = useState('')
  const [hideJudgeAnalysis, setHideJudgeAnalysis] = useState(false)
  const [hideUserFeedback, setHideUserFeedback] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const topModel = responses && responses.length > 0 ? responses.sort((a, b) => b.score - a.score)[0] : null;

  const [messages, setMessages] = useState<Message[]>(() => {
    if (!topModel) {
      return [{ role: 'user', content: prompt }];
    }
    return [
      { role: 'user', content: prompt },
      {
        role: 'assistant',
        content: `🏆 #1 Ranked: ${topModel.model} (Score: ${topModel.score}/10)`,
        model: topModel.model,
      },
      {
        role: 'assistant',
        content: topModel.text,
        model: topModel.model,
        isResponse: true,
      },
    ];
  })

  const [conversations, setConversations] = useState<Record<string, Message[]>>(() => {
    const initial: Record<string, Message[]> = {}
    if (responses && responses.length > 0) {
      responses.forEach((resp) => {
        initial[resp.model] = [
          { role: 'user', content: prompt },
          { role: 'assistant', content: resp.text, model: resp.model, isResponse: true }
        ]
      })
    }
    return initial
  })

  const isLoading = responses.length === 0;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load follow-ups into messages on mount
  useEffect(() => {
    if (followUps && followUps.length > 0) {
      setMessages(prev => {
        let updated = [...prev]
        followUps.forEach(followUp => {
          // Add user message
          if (!updated.some(m => m.role === 'user' && m.content === followUp.prompt)) {
            updated.push({ role: 'user', content: followUp.prompt })

            // Add response if available
            if (followUp.responses && followUp.responses.length > 0) {
              const topResp = followUp.responses.sort((a: any, b: any) => b.score - a.score)[0]
              updated.push({
                role: 'assistant',
                content: `🏆 #1 Ranked: ${topResp.model} (Score: ${topResp.score}/10)`,
                model: topResp.model
              })
              updated.push({
                role: 'assistant',
                content: topResp.text,
                model: topResp.model,
                isResponse: true
              })
            }
          }
        })
        return updated
      })
    }
  }, [followUps.length])

  // Sync responses to messages when new responses arrive
  useEffect(() => {
    if (responses.length > 0) {
      const topModel = responses.sort((a, b) => b.score - a.score)[0]
      const lastMsg = messages[messages.length - 1]

      // Only add responses if last message is a user message (not already a response)
      if (lastMsg?.role === 'user') {
        const responseMessage: Message = {
          role: 'assistant',
          content: `🏆 #1 Ranked: ${topModel.model} (Score: ${topModel.score}/10)`,
          model: topModel.model,
        }
        const responseTextMessage: Message = {
          role: 'assistant',
          content: topModel.text,
          model: topModel.model,
          isResponse: true,
        }
        setMessages(prev => [...prev, responseMessage, responseTextMessage])
        setShowUserChoice(true)
        setSelectedModel(topModel.model)
        setUserChoiceSubmitted(false)
      }

      // Update conversations
      setConversations(prev => {
        const updated = { ...prev }
        responses.forEach((resp) => {
          updated[resp.model] = [
            { role: 'user', content: prompt },
            { role: 'assistant', content: resp.text, model: resp.model, isResponse: true }
          ]
        })
        return updated
      })
    }
  }, [responses, prompt])

  const rankedModels = [...responses]
    .sort((a, b) => b.score - a.score)
    .map((r, idx) => ({ ...r, rank: idx + 1 }))

  const langCodes: Record<string, string> = {
    'en': 'en-US', 'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN', 'ml': 'ml-IN',
    'mr': 'mr-IN', 'pa': 'pa-IN', 'gu': 'gu-IN', 'bn': 'bn-IN', 'or': 'or-IN'
  }

  const handleMicClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in your browser')
      return
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = langCodes[selectedLang]

    let transcript = ''

    recognition.onstart = () => {
      setIsListening(true)
      transcript = ''
    }

    recognition.onresult = (event: any) => {
      transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
    }

    recognition.onend = () => {
      if (transcript.trim()) {
        setChatInput(prev => prev + (prev ? ' ' : '') + transcript)
      }
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: Message = { role: 'user', content: chatInput }
    setMessages(prev => [...prev, userMessage])
    setChatInput('')
    onMessageSent?.(chatInput, id)
  }

  const handleSubmitUserChoice = async () => {
    if (!selectedModel) return

    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: id,
          preferredModel: selectedModel,
          judgeAnalysis: judgeAnalysis,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {}) // Silent fail on feedback save
    } catch (error) {
      console.error('Error saving feedback:', error)
    }

    console.log('✓ User preference recorded:', selectedModel)
    setUserChoiceSubmitted(true)
    setTimeout(() => {
      setShowUserChoice(false)
    }, 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-screen rounded-none overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 backdrop-blur-2xl border-none shadow-2xl flex flex-col md:flex-row relative"
    >
      {/* Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full md:w-40 bg-gradient-to-b from-purple-500/10 to-blue-500/10 backdrop-blur-xl border-b md:border-b-0 md:border-r border-purple-500/20 p-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto"
      >
        {/* Back Button */}
        {onClose && (
          <motion.button
            onClick={() => onClose(id)}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-xl bg-purple-500/20 border border-purple-400/40 hover:bg-purple-500/30 transition-all text-left text-xs flex-shrink-0 min-w-max md:min-w-0"
            title="Back"
          >
            <p className="font-semibold text-white">← Back</p>
          </motion.button>
        )}

        {/* Chat Overview Button */}
        <motion.button
          onClick={() => setCurrentView('chat')}
          whileHover={{ x: 5, scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className={`p-3 rounded-xl transition-all text-left text-xs cursor-pointer flex-shrink-0 min-w-max md:min-w-0 ${
            currentView === 'chat'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400/80 shadow-lg shadow-blue-500/30'
              : 'bg-blue-500/10 border border-blue-400/20 hover:bg-blue-500/20'
          }`}
        >
          <p className="font-semibold text-white">💬 Chat</p>
          <p className="text-blue-200 text-xs mt-1 font-medium">Main</p>
        </motion.button>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl text-center flex-shrink-0 min-w-max md:min-w-0"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((dot) => (
                  <motion.div
                    key={dot}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2 }}
                  />
                ))}
              </div>
              <p className="text-xs text-purple-300 font-medium">BR Thinking...</p>
            </div>
          </motion.div>
        )}

        {/* Model Buttons */}
        {!isLoading && rankedModels.map((model) => (
          <motion.button
            key={model.model}
            onClick={() => setCurrentView(model.model)}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-xl transition-all text-left text-xs flex-shrink-0 min-w-max md:min-w-0 ${
              currentView === model.model
                ? 'bg-purple-500/40 border border-purple-400/60 shadow-lg shadow-purple-500/20'
                : 'bg-purple-500/10 border border-purple-400/20 hover:bg-purple-500/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-purple-300 w-6 h-6 flex items-center justify-center bg-purple-600/40 rounded">
                #{model.rank}
              </span>
            </div>
            <p className="font-semibold text-white text-xs mt-1 line-clamp-2 max-w-24 md:max-w-none">
              {model.model}
            </p>
            <p className="text-purple-300 text-xs font-bold mt-1">
              {model.score}/10
            </p>
          </motion.button>
        ))}
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-purple-500/20 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide text-purple-300 font-semibold mb-1">
                {currentView === 'chat' ? 'AI Decision Layer' : `${currentView}`}
              </p>
              <p className="text-white font-medium line-clamp-2 text-sm">
                {currentView === 'chat' ? 'Compare responses from all models' : `Response from ${currentView}`}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              {currentView === 'chat' && (
                <>
                  {hideJudgeAnalysis && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setHideJudgeAnalysis(false)}
                      className="text-xs px-2 py-1 rounded bg-purple-500/20 border border-purple-400/40 hover:bg-purple-500/30 transition-colors text-purple-300"
                      title="Show judge analysis"
                    >
                      📊 Analysis
                    </motion.button>
                  )}
                  {hideUserFeedback && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setHideUserFeedback(false)}
                      className="text-xs px-2 py-1 rounded bg-blue-500/20 border border-blue-400/40 hover:bg-blue-500/30 transition-colors text-blue-300"
                      title="Show user feedback"
                    >
                      👍 Feedback
                    </motion.button>
                  )}
                </>
              )}
              {onClose && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onClose(id)}
                  className="flex-shrink-0 p-2 hover:bg-purple-500/20 rounded-lg transition-colors flex items-center gap-2"
                  title="Back to chat"
                >
                  <ArrowLeft size={20} className="text-purple-300" />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        {currentView === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Unhide Buttons */}
            {(hideJudgeAnalysis || hideUserFeedback) && (
              <div className="px-6 pt-3 pb-2 flex gap-2 flex-wrap">
                {hideJudgeAnalysis && (
                  <button
                    onClick={() => setHideJudgeAnalysis(false)}
                    className="text-xs text-purple-300 hover:text-purple-200 underline"
                  >
                    Show Analysis
                  </button>
                )}
                {hideUserFeedback && (
                  <button
                    onClick={() => setHideUserFeedback(false)}
                    className="text-xs text-blue-300 hover:text-blue-200 underline"
                  >
                    Show Feedback
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-900/50 to-gray-950">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-5 py-3 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none shadow-lg shadow-blue-500/20'
                        : msg.isResponse
                        ? 'bg-gradient-to-b from-yellow-400/60 to-orange-400/50 text-gray-900 rounded-bl-none border-2 border-yellow-300/80 shadow-lg shadow-yellow-500/40'
                        : 'bg-gradient-to-r from-gray-700/50 to-gray-800/50 text-gray-100 rounded-bl-none shadow-lg shadow-gray-900/30'
                    }`}
                  >
                    {!msg.isResponse && (
                      <p className="text-xs text-gray-300 font-semibold mb-1 uppercase tracking-wide">
                        {msg.role === 'user' ? 'You' : msg.model || 'AI'}
                      </p>
                    )}
                    {msg.isResponse && (
                      <p className="text-xs font-bold mb-2 text-yellow-700">✨ Response</p>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap break-words text-sm">
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-700/50 rounded-lg px-5 py-3">
                    <div className="flex gap-2">
                      {[1, 2, 3].map((dot) => (
                        <motion.div
                          key={dot}
                          className="w-2 h-2 bg-white/60 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Judge Analysis */}
            {judgeAnalysis && messages.length > 1 && !hideJudgeAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-4 backdrop-blur-sm flex-shrink-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wide text-purple-300 font-semibold">
                    Judge Analysis
                  </p>
                  <button
                    onClick={() => setHideJudgeAnalysis(true)}
                    className="text-xs text-purple-300 hover:text-purple-200 px-2 py-1 rounded hover:bg-purple-500/20 transition-colors"
                  >
                    Hide
                  </button>
                </div>
                <p className="text-sm text-gray-100 leading-relaxed">{judgeAnalysis}</p>
              </motion.div>
            )}

            {/* User Choice Box */}
            <AnimatePresence>
              {showUserChoice && !userChoiceSubmitted && !hideUserFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="border-t border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-4 backdrop-blur-sm flex-shrink-0"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-white">Which response do you prefer as #1?</p>
                    <button
                      onClick={() => setHideUserFeedback(true)}
                      className="text-xs text-purple-300 hover:text-purple-200 px-2 py-1 rounded hover:bg-purple-500/20 transition-colors"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                    {responses.map((resp) => (
                      <label key={resp.model} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-all">
                        <input
                          type="radio"
                          name="preferred-model"
                          value={resp.model}
                          checked={selectedModel === resp.model}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{resp.model}</p>
                          <p className="text-xs text-gray-400">Score: {resp.score}/10</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleSubmitUserChoice}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Check size={16} />
                    Submit Choice
                  </button>
                </motion.div>
              )}
              {userChoiceSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="border-t border-green-500/20 bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-4 backdrop-blur-sm flex-shrink-0"
                >
                  <p className="text-sm text-green-300 flex items-center gap-2">
                    <Check size={16} />
                    ✓ Preference recorded!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="border-t border-white/10 p-4 bg-gradient-to-r from-gray-900 to-gray-950 space-y-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-purple-400" />
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400/50"
                >
                  <option value="en" className="bg-gray-900">English</option>
                  <option value="hi" className="bg-gray-900">Hindi</option>
                  <option value="te" className="bg-gray-900">Telugu</option>
                  <option value="ta" className="bg-gray-900">Tamil</option>
                  <option value="kn" className="bg-gray-900">Kannada</option>
                  <option value="ml" className="bg-gray-900">Malayalam</option>
                  <option value="mr" className="bg-gray-900">Marathi</option>
                  <option value="pa" className="bg-gray-900">Punjabi</option>
                  <option value="gu" className="bg-gray-900">Gujarati</option>
                  <option value="bn" className="bg-gray-900">Bengali</option>
                  <option value="or" className="bg-gray-900">Odia</option>
                </select>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-3 hover:bg-white/10 transition-all">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                  disabled={isLoading}
                />
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleMicClick}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-full transition-all ${
                      isListening
                        ? 'bg-red-500/80 text-white animate-pulse'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Mic size={16} />
                  </motion.button>
                  <motion.button
                    onClick={handleSendMessage}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!chatInput.trim() || isLoading}
                    className="p-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send size={16} />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        ) : conversations[currentView] ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-900/50 to-gray-950">
              {conversations[currentView].map((msg, idx) => (
                <motion.div
                  key={`${idx}-${msg.content}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600/80 text-white rounded-br-sm'
                        : 'bg-gradient-to-b from-purple-700/60 to-purple-600/50 text-white rounded-bl-sm border border-purple-400/40'
                    }`}
                  >
                    <p className="text-xs text-gray-200 mb-1 font-medium">
                      {msg.role === 'user' ? 'You' : currentView}
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap break-words text-sm">
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="border-t border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-4 text-center text-xs text-gray-400">
              📖 View-only conversation with {currentView}
            </div>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  )
}
