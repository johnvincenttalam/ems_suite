import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-8 h-8 text-zinc-400" />
        </div>
        <h1 className="text-6xl font-bold text-zinc-900 mb-2">404</h1>
        <p className="text-lg text-zinc-600 mb-2">Page not found</p>
        <p className="text-[13px] text-zinc-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-lg text-[13px] font-medium hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </motion.div>
    </div>
  )
}
