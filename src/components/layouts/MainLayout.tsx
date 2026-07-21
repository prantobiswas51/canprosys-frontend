import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1E1E1E]">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <div className="main-wrapper flex w-full flex-row gap-6">

          {/* Sidebar - fixed 260px */}
          <div className="w-[260px] shrink-0">
            <Sidebar />
          </div>

          {/* Main workspace - renders whichever route matched */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
