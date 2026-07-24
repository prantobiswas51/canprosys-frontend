import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col text-[#1E1E1E]" style={{
      background:
        "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
    }}>
      <Header />

      <main
        className="flex-1 max-w-7xl w-full mx-auto py-6"

      >
        <div className="main-wrapper flex w-full flex-row gap-6">

          {/* Sidebar */}
          <div className="w-[260px] shrink-0 rounded-xl">
            <Sidebar />
          </div>

          {/* Main workspace */}
          <div
            className="
          flex-1 min-w-0
          rounded-xl
          border border-white/40
          backdrop-blur-xl
          shadow-md
          p-6
        "
          >
            <div
              className="
            h-full rounded-xl
            backdrop-blur-2xl
          "
            >
              <Outlet />
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
