export default function StatusToast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="fixed top-4 right-4 z-50 bg-green-500/20 border border-green-500/40 text-green-400 px-4 py-2 rounded-xl text-sm shadow-lg">
      {message}
    </div>
  )
}
