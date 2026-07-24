import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

interface Role {
  id: number;
  name: string;
}

interface Permission {
  id: number;
  key: string;
  description?: string;
}

interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

export default function RoleManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === 'super_admin';

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Roles + the full permission catalogue, loaded once.
  const loadBase = useCallback(async () => {
    setLoadingRoles(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        axios.get<Role[]>(`${API_URL}/roles`),
        axios.get<Permission[]>(`${API_URL}/permissions`),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
      setSelectedRoleId((prev) => prev ?? rolesRes.data[0]?.id ?? null);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load roles/permissions: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load roles/permissions', err);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  // Whichever role's selected -- pull its current permission keys.
  const loadRolePermissions = useCallback(async (roleId: number) => {
    setLoadingRolePerms(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await axios.get<RoleWithPermissions>(`${API_URL}/roles/${roleId}/permissions`);
      setCheckedKeys(new Set(res.data.permissions.map((p) => p.key)));
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load role permissions: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load role permissions', err);
    } finally {
      setLoadingRolePerms(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId != null) {
      loadRolePermissions(selectedRoleId);
    }
  }, [selectedRoleId, loadRolePermissions]);

  const togglePermission = (key: string) => {
    setSuccess(false);
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedRoleId == null) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await axios.put(`${API_URL}/roles/${selectedRoleId}/permissions`, {
        keys: Array.from(checkedKeys),
      });
      setSuccess(true);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response
          ? err.response.status === 403
            ? 'You do not have permission to change roles.'
            : `Failed to save: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to save role permissions', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  if (!isSuperAdmin) {
    return (
      <div className={cardClass}>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Role Management</h2>
        <p className="text-[0.9rem] text-[#545454]">Only Super Admin can manage role permissions.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="pb-4">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Role Management</h2>
        <p className="text-[0.9rem] text-[#545454]">Control what each role is allowed to do.</p>
      </div>

      <div className="flex w-full gap-6 items-start">
        {/* Left: role selector */}
        <div className={`${cardClass} w-[25%] min-w-0 flex flex-col gap-2`}>
          <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 mb-1 text-[#1E1E1E]">
            <i className="fa-solid fa-user-shield mr-[0.4rem] text-[#161138]" />
            Roles
          </h3>

          {loadingRoles && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading...</p>}

          {!loadingRoles && roles.length === 0 && (
            <p className="text-[0.8rem] font-semibold text-[#545454]">No roles found.</p>
          )}

          {!loadingRoles &&
            roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`text-left rounded-lg px-3 py-2 text-[0.85rem] font-semibold transition-all duration-200 cursor-pointer ${
                  selectedRoleId === role.id
                    ? 'bg-[#e21e53] text-white shadow-[0_4px_12px_rgba(226,30,83,0.25)]'
                    : 'bg-[#f8fafc] text-[#545454] hover:bg-[rgba(226,30,83,0.08)] hover:text-[#1E1E1E]'
                }`}
              >
                {role.name}
              </button>
            ))}
        </div>

        {/* Right: permission checkboxes for the selected role */}
        <div className={`${cardClass} w-[75%] min-w-0 flex flex-col gap-4`}>
          <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-2">
            <h3 className="text-base font-extrabold text-[#1E1E1E]">
              <i className="fa-solid fa-key mr-[0.4rem] text-[#e21e53]" />
              Permissions{selectedRole ? ` — ${selectedRole.name}` : ''}
            </h3>
            <button
              onClick={handleSave}
              disabled={saving || selectedRoleId == null || loadingRolePerms}
              className="h-9 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.8rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {error && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{error}</p>}
          {success && <p className="text-[0.8rem] font-semibold text-[#10b981]">Permissions updated.</p>}

          {loadingRolePerms && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading permissions...</p>}

          {!loadingRolePerms && permissions.length === 0 && (
            <p className="text-[0.8rem] font-semibold text-[#545454]">
              No permissions defined yet. Create some via <code>POST /permissions</code> first.
            </p>
          )}

          {!loadingRolePerms && permissions.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {permissions.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-start gap-3 rounded-lg border border-[#e8e8e8] p-3 cursor-pointer hover:bg-[#f8fafc] transition-colors duration-200"
                >
                  <input
                    type="checkbox"
                    checked={checkedKeys.has(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    className="mt-[0.15rem] h-4 w-4 accent-[#e21e53] cursor-pointer"
                  />
                  <span className="flex flex-col">
                    <span className="text-[0.85rem] font-bold text-[#1E1E1E]">{perm.key}</span>
                    {perm.description && (
                      <span className="text-[0.72rem] text-[#545454]">{perm.description}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
