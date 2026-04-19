"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    Palette,
    MonitorIcon,
    Command,
    Paperclip,
    SendIcon,
    XIcon,
    LoaderIcon,
    Sparkles,
    Mic,
    Globe,
    ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react"
import { ResponseWindow } from "./ResponseWindow"
import { RainbowButton } from "./ui/RainbowButton"

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn(
        "relative",
        containerClassName
      )}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-white/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

interface Response {
    model: string;
    text: string;
    score: number;
    best: boolean;
    response_time_ms: number;
    reasoning?: string;
}

interface AnimatedAIChatProps {
    selectedPromptId?: string | null
    onPromptLoaded?: () => void
    onMessageSent?: (prompt: string) => void
}

export function AnimatedAIChat({ selectedPromptId, onPromptLoaded, onMessageSent }: AnimatedAIChatProps = {}) {
    const [value, setValue] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [responseWindows, setResponseWindows] = useState<Array<{
      id: string;
      prompt: string;
      responses: Response[];
      judgeReasoning?: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string; model?: string; isResponse?: boolean }>;
    }>>([]);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });
    const [inputFocused, setInputFocused] = useState(false);
    const commandPaletteRef = useRef<HTMLDivElement>(null);
    const [selectedLang, setSelectedLang] = useState('en');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const [showCommandResult, setShowCommandResult] = useState(false);
    const [currentCommand, setCurrentCommand] = useState<string | null>(null);
    const [selectedWindowForCommand, setSelectedWindowForCommand] = useState<number | null>(null);
    const [allChats, setAllChats] = useState<Array<{
      _id: string;
      prompt: string;
      title: string;
      responses: Response[];
      judgeReasoning?: string;
    }>>([]);

    const langCodes: Record<string, string> = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'te': 'te-IN',
        'ta': 'ta-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'mr': 'mr-IN',
        'pa': 'pa-IN',
        'gu': 'gu-IN',
        'bn': 'bn-IN',
        'or': 'or-IN'
    };

    const langNames: Record<string, string> = {
        'en': 'English',
        'hi': 'हिंदी',
        'te': 'తెలుగు',
        'ta': 'தமிழ்',
        'kn': 'ಕನ್ನಡ',
        'ml': 'മലയാളം',
        'mr': 'मराठी',
        'pa': 'ਪੰਜਾਬੀ',
        'gu': 'ગુજરાતી',
        'bn': 'বাংলা',
        'or': 'ଓଡିଆ'
    };

    const commandSuggestions: CommandSuggestion[] = [
        {
            icon: <ImageIcon className="w-4 h-4" />,
            label: "Best Response",
            description: "Show highest scored response",
            prefix: "/best"
        },
        {
            icon: <Palette className="w-4 h-4" />,
            label: "Compare All",
            description: "Compare all AI responses",
            prefix: "/compare"
        },
        {
            icon: <MonitorIcon className="w-4 h-4" />,
            label: "Deep Analysis",
            description: "Get detailed response analysis",
            prefix: "/analyze"
        },
        {
            icon: <Sparkles className="w-4 h-4" />,
            label: "Summary",
            description: "Generate response summary",
            prefix: "/summary"
        },
    ];

    useEffect(() => {
        if (value.startsWith('/') && !value.includes(' ')) {
            setShowCommandPalette(true);

            const matchingSuggestionIndex = commandSuggestions.findIndex(
                (cmd) => cmd.prefix.startsWith(value)
            );

            if (matchingSuggestionIndex >= 0) {
                setActiveSuggestion(matchingSuggestionIndex);
            } else {
                setActiveSuggestion(-1);
            }
        } else {
            setShowCommandPalette(false);
        }
    }, [value]);

    // Load selected prompt from history
    useEffect(() => {
        if (selectedPromptId) {
            console.log('📂 Loading sidebar chat:', selectedPromptId);
            const loadPrompt = async () => {
                try {
                    const token = localStorage.getItem('token')
                    const headers: Record<string, string> = {}
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`
                    }
                    const res = await fetch(`/api/prompt/${selectedPromptId}`, { headers });
                    const data = await res.json();
                    console.log('📥 Fetched prompt:', data.prompt);
                    if (data.prompt) {
                        const prompt = data.prompt;
                        const newWindow = {
                            id: Date.now().toString(),
                            prompt: prompt.prompt,
                            responses: prompt.responses,
                            judgeReasoning: prompt.judgeReasoning,
                            messages: prompt.messages || []
                        };
                        console.log('🪟 Creating window:', newWindow);
                        setResponseWindows(prev => [...prev, newWindow]);
                        onPromptLoaded?.();
                        console.log('✅ Window created and callback called');
                    }
                } catch (error) {
                    console.error('❌ Error loading prompt:', error);
                }
            };
            loadPrompt();
        }
    }, [selectedPromptId, onPromptLoaded]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector('[data-command-button]');

            if (commandPaletteRef.current &&
                !commandPaletteRef.current.contains(target) &&
                !commandButton?.contains(target)) {
                setShowCommandPalette(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev =>
                    prev < commandSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev =>
                    prev > 0 ? prev - 1 : commandSuggestions.length - 1
                );
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const selectedCommand = commandSuggestions[activeSuggestion];
                    setValue(selectedCommand.prefix + ' ');
                    setShowCommandPalette(false);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !value.startsWith('/')) {
                handleSendMessage();
            }
        }
    };

    const handleSendMessage = async () => {
        // BLOCK: prevent new windows while one is open
        if (responseWindows.length > 0) {
            console.log('⛔ Chat window open - use it for follow-ups');
            return;
        }

        const trimmedValue = value.trim();

        // Don't send commands as prompts
        if (trimmedValue.startsWith('/')) {
            console.log('ℹ️ Commands are not sent as prompts. Use them after receiving results.');
            return;
        }

        if (trimmedValue) {
            setIsTyping(true);

            // Call parent's onMessageSent to save chat to history
            onMessageSent?.(trimmedValue);

            setValue('');
            adjustHeight(true);
            setIsTyping(false);
        }
    };

    const handleAttachFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files;
        if (files) {
            setAttachments(prev => [...prev, ...Array.from(files)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleMicClick = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech Recognition not supported');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = langCodes[selectedLang];
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onstart = () => {
            setIsListening(true);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript;
                }
            }
            if (transcript) {
                setValue(prev => prev + transcript);
                adjustHeight();
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognitionRef.current.start();
    };


    const getCommandResult = (windowIndex: number) => {
        if (windowIndex < 0 || windowIndex >= allChats.length) return '';
        const chat = allChats[windowIndex];
        if (!chat.responses || chat.responses.length === 0) return 'No responses available';

        const bestResponse = [...chat.responses].sort((a, b) => b.score - a.score)[0];

        switch(currentCommand) {
            case '/best':
                return `🏆 Best Response\n\nModel: ${bestResponse.model}\nScore: ${bestResponse.score}/10\n\n${bestResponse.text}`;
            case '/compare':
                return `📊 Compare All Responses\n\n${chat.responses.map((r, i) => `${i+1}. ${r.model} - Score: ${r.score}/10`).join('\n')}`;
            case '/analyze':
                return `🔍 Deep Analysis\n\nTop Response: ${bestResponse.model}\nScore: ${bestResponse.score}/10\n\nJudge Analysis:\n${chat.judgeAnalysis || 'Analyzing responses...'}`;
            case '/summary':
                return `📝 Summary\n\n${chat.responses.map((r, i) => `${i+1}. ${r.model} (${r.score}/10):\n${r.text.substring(0, 100)}...`).join('\n\n')}`;
            default:
                return '';
        }
    };

    const selectCommandSuggestion = () => {
        setShowCommandPalette(false);
    };

    const handleCloseWindow = (id: string) => {
        setResponseWindows(prev => prev.filter(w => w.id !== id));
    };

    return (
        <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
                <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
            </div>
            <div className="w-full max-w-2xl mx-auto relative z-10">
                {responseWindows.length === 0 && (
                <motion.div
                    className="relative space-y-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div className="text-center space-y-3">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="inline-block"
                        >
                            <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                                How can I help today?
                            </h1>
                            <motion.div
                                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-4"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "100%", opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            />
                        </motion.div>
                        <motion.p
                            className="text-base text-white/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Compare multiple AI models and find the best answer
                        </motion.p>
                    </div>

                    <motion.div
                        className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl"
                        initial={{ scale: 0.98 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <AnimatePresence>
                            {showCommandPalette && (
                                <motion.div
                                    ref={commandPaletteRef}
                                    className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-lg z-50 shadow-lg border border-white/10 overflow-hidden"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className="py-1 bg-black/95">
                                        {commandSuggestions.map((suggestion, index) => (
                                            <motion.div
                                                key={suggestion.prefix}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                                                    activeSuggestion === index
                                                        ? "bg-white/10 text-white"
                                                        : "text-white/70 hover:bg-white/5"
                                                )}
                                                onClick={() => selectCommandSuggestion()}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: index * 0.03 }}
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center text-white/60">
                                                    {suggestion.icon}
                                                </div>
                                                <div className="font-medium">{suggestion.label}</div>
                                                <div className="text-white/40 text-xs ml-1">
                                                    {suggestion.prefix}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4">
                            <Textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder="Ask a question..."
                                containerClassName="w-full"
                                className={cn(
                                    "w-full px-4 py-3",
                                    "resize-none",
                                    "bg-transparent",
                                    "border-none",
                                    "text-white/90 text-sm",
                                    "focus:outline-none",
                                    "placeholder:text-white/20",
                                    "min-h-[60px]"
                                )}
                                style={{
                                    overflow: "hidden",
                                }}
                                showRing={false}
                            />
                        </div>

                        <AnimatePresence>
                            {attachments.length > 0 && (
                                <motion.div
                                    className="px-4 pb-3 flex gap-2 flex-wrap"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {attachments.map((file, index) => (
                                        <motion.div
                                            key={index}
                                            className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-lg text-white/70"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <span>📎 {file.name}</span>
                                            <button
                                                onClick={() => removeAttachment(index)}
                                                className="text-white/40 hover:text-white transition-colors"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <motion.button
                                    type="button"
                                    onClick={handleAttachFile}
                                    whileTap={{ scale: 0.94 }}
                                    className="p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </motion.button>

                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-white/40" />
                                    <select
                                        value={selectedLang}
                                        onChange={(e) => setSelectedLang(e.target.value)}
                                        className="bg-transparent text-white/70 text-xs rounded px-2 py-1 border border-white/10 hover:border-white/30 transition-colors focus:outline-none focus:border-white/50"
                                    >
                                        {Object.entries(langNames).map(([code, name]) => (
                                            <option key={code} value={code} className="bg-gray-900">
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <motion.button
                                    type="button"
                                    onClick={handleMicClick}
                                    whileTap={{ scale: 0.94 }}
                                    className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-500/80 text-white animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                >
                                    <Mic className="w-4 h-4" />
                                </motion.button>

                                <motion.button
                                    type="button"
                                    data-command-button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCommandPalette(prev => !prev);
                                    }}
                                    whileTap={{ scale: 0.94 }}
                                    className={cn(
                                        "p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group",
                                        showCommandPalette && "bg-white/10 text-white/90"
                                    )}
                                >
                                    <Command className="w-4 h-4" />
                                </motion.button>
                            </div>

                            <RainbowButton
                                onClick={handleSendMessage}
                                disabled={isTyping || !value.trim() || responseWindows.length > 0}
                            >
                                {isTyping ? (
                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <SendIcon className="w-4 h-4" />
                                )}
                                <span>Send</span>
                            </RainbowButton>
                        </div>
                    </motion.div>
                </motion.div>
                )}

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 pointer-events-auto z-[55] max-w-2xl">
                <button onClick={async () => {
                    try {
                        const res = await fetch('/api/ai/history');
                        const data = await res.json();
                        setAllChats(Array.isArray(data) ? data : (data.history || []));
                        setCurrentCommand('/best');
                        setShowCommandResult(true);
                        setSelectedWindowForCommand(null);
                    } catch (error) {
                        console.error('Error fetching chats:', error);
                    }
                }} className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 cursor-pointer backdrop-blur-md border border-white/10">
                    <ImageIcon className="w-4 h-4" />
                    <span>Best Response</span>
                </button>
                <button onClick={async () => {
                    try {
                        const res = await fetch('/api/ai/history');
                        const data = await res.json();
                        setAllChats(Array.isArray(data) ? data : (data.history || []));
                        setCurrentCommand('/compare');
                        setShowCommandResult(true);
                        setSelectedWindowForCommand(null);
                    } catch (error) {
                        console.error('Error fetching chats:', error);
                    }
                }} className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 cursor-pointer backdrop-blur-md border border-white/10">
                    <Palette className="w-4 h-4" />
                    <span>Compare All</span>
                </button>
                <button onClick={async () => {
                    try {
                        const res = await fetch('/api/ai/history');
                        const data = await res.json();
                        setAllChats(Array.isArray(data) ? data : (data.history || []));
                        setCurrentCommand('/analyze');
                        setShowCommandResult(true);
                        setSelectedWindowForCommand(null);
                    } catch (error) {
                        console.error('Error fetching chats:', error);
                    }
                }} className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 cursor-pointer backdrop-blur-md border border-white/10">
                    <MonitorIcon className="w-4 h-4" />
                    <span>Deep Analysis</span>
                </button>
                <button onClick={async () => {
                    try {
                        const res = await fetch('/api/ai/history');
                        const data = await res.json();
                        setAllChats(Array.isArray(data) ? data : (data.history || []));
                        setCurrentCommand('/summary');
                        setShowCommandResult(true);
                        setSelectedWindowForCommand(null);
                    } catch (error) {
                        console.error('Error fetching chats:', error);
                    }
                }} className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 cursor-pointer backdrop-blur-md border border-white/10">
                    <Sparkles className="w-4 h-4" />
                    <span>Summary</span>
                </button>
            </div>
            </div>

            <AnimatePresence>
                {isTyping && (
                    <motion.div
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05] z-[56]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-center">
                                <span className="text-xs font-medium text-white/90">AI</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                                <span>Processing</span>
                                <TypingDots />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {inputFocused && (
                <motion.div
                    className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none -z-10 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
                    animate={{
                        x: mousePosition.x - 400,
                        y: mousePosition.y - 400,
                    }}
                    transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 150,
                        mass: 0.5,
                    }}
                />
            )}


            {showCommandResult && selectedWindowForCommand !== null && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-gradient-to-br from-slate-900 via-gray-950 to-black rounded-2xl border border-purple-500/20 p-8 max-w-2xl max-h-[80vh] overflow-y-auto w-full text-white pointer-events-auto backdrop-blur-xl"
                    >
                        <button
                            onClick={() => { setShowCommandResult(false); setSelectedWindowForCommand(null); }}
                            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-sm">Back</span>
                        </button>
                        <div className="whitespace-pre-wrap text-gray-100 leading-relaxed font-mono text-sm">
                            {getCommandResult(selectedWindowForCommand)}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {showCommandResult && selectedWindowForCommand === null && allChats.length >= 1 && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-gradient-to-br from-slate-900 via-gray-950 to-black rounded-2xl border border-purple-500/20 p-8 max-w-lg w-full text-white pointer-events-auto backdrop-blur-xl max-h-[80vh] overflow-y-auto"
                    >
                        <button
                            onClick={() => { setShowCommandResult(false); setCurrentCommand(null); setAllChats([]); }}
                            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-sm">Back</span>
                        </button>
                        <h2 className="text-2xl font-bold mb-6">Select which chat</h2>
                        <div className="space-y-3">
                            {allChats.map((chat, idx) => (
                                <motion.button
                                    key={chat._id}
                                    onClick={() => setSelectedWindowForCommand(idx)}
                                    whileHover={{ scale: 1.02 }}
                                    className="w-full p-4 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-purple-500/20 hover:border-purple-500/40 transition-all text-left"
                                >
                                    <p className="font-semibold">{chat.title || chat.prompt.substring(0, 50)}</p>
                                    <p className="text-xs text-gray-400 mt-1">{chat.responses.length} responses</p>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {responseWindows.length > 0 && !showCommandResult && (
                <motion.div
                    className="fixed inset-0 z-50 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <AnimatePresence mode="wait">
                        <ResponseWindow
                            key={responseWindows[responseWindows.length - 1].id}
                            id={responseWindows[responseWindows.length - 1].id}
                            prompt={responseWindows[responseWindows.length - 1].prompt}
                            responses={responseWindows[responseWindows.length - 1].responses}
                            onClose={handleCloseWindow}
                            judgeReasoning={responseWindows[responseWindows.length - 1].judgeReasoning}
                            messages={responseWindows[responseWindows.length - 1].messages}
                        />
                    </AnimatePresence>
                </motion.div>
            )}

        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                    style={{
                        boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)"
                    }}
                />
            ))}
        </div>
    );
}
