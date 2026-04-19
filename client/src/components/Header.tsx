import { motion } from 'framer-motion'

interface HeaderProps {
  onLogin: () => void
  onSignup: () => void
  isLoggedIn?: boolean
}

export function Header({ onLogin, onSignup, isLoggedIn }: HeaderProps) {
  if (isLoggedIn) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-6 right-6 z-50 flex items-center gap-3"
    >
      <motion.button
        onClick={onLogin}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-4 py-2 text-sm text-white font-medium hover:text-purple-300 transition-colors"
      >
        Sign In
      </motion.button>

      <motion.button
        onClick={onSignup}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-5 py-2 text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-violet-500/20"
      >
        Get Started
      </motion.button>
    </motion.div>
  )
}
