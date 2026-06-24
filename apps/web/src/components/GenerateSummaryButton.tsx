'use client'

export default function GenerateSummaryButton() {
  function handleGenerateSummary() {
    console.log('Generate Summary clicked')
  }

  return (
    <button
      type="button"
      onClick={handleGenerateSummary}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
    >
      Generate Summary
    </button>
  )
}
