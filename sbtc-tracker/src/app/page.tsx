/**
 * Home Page (Redirect)
 * 
 * The main frontend is in /frontend/ (Vite + React).
 * This Next.js app serves as a redirect placeholder.
 */

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          sBTC Portfolio Tracker
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Frontend available in /frontend/ directory
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
          <p>✅ Backend services ready</p>
          <p>✅ Hooks & state management ready</p>
          <p>✅ Type definitions ready</p>
          <p>✅ React frontend ready</p>
        </div>
      </div>
    </main>
  );
}
