import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/layouts/MainLayout'
import GuestLayout from './components/layouts/GuestLayout'
import RequireAuth from './components/layouts/RequireAuth'
import Login from './components/layouts/Login'
import Dashboard from './pages/Dashboard'
import Task from './pages/Task'
import DailyEntry from './pages/DailyEntry'
import ActivityLogs from './pages/ActivityLogs'
import Inventory from './pages/Inventory'
import FinishedProducts from './pages/FinishedProducts'
import WasteManagement from './pages/WasteManagement'
import Payouts from './pages/Payouts'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Employees from './pages/Employees'
import RoleManagement from './pages/RoleManagement'
import Recipes from './pages/Recipes'
import TransportManagement from './pages/TransportManagement'
import ShipmentBasic from './pages/ShipmentBasic'
import ApprovalQueue from './pages/ApprovalQueue'
import SystemSettings from './pages/SystemSettings'
import UserManual from './pages/UserManual'

function App() {
  return (
    <Routes>
      <Route element={<GuestLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Task />} />
        <Route path="/daily-entry" element={<DailyEntry />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/finished-products" element={<FinishedProducts />} />
        <Route path="/waste-management" element={<WasteManagement />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/manage-roles" element={<RoleManagement />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/transport" element={<TransportManagement />} />
        <Route path="/shipment-basic" element={<ShipmentBasic />} />
        <Route path="/approvals" element={<ApprovalQueue />} />
        <Route path="/settings" element={<SystemSettings />} />
        <Route path="/user-manual" element={<UserManual />} />
      </Route>
      </Route>
    </Routes>
  )
}

export default App
