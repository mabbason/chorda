import { useState, useEffect, useCallback } from "react";
import { fetchUsers, createUser, selectUser, logout } from "../utils/auth";
import type { User } from "../utils/auth";
import { AvatarPicker, AVATAR_MAP } from "./AvatarPicker";

interface Props {
  onUserSelected: (userId: number) => void;
  onLogout: () => void;
}

export function UserPicker({ onUserSelected, onLogout }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState("piano");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetchUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const handleSelect = useCallback(
    async (userId: number) => {
      setSelecting(userId);
      const result = await selectUser(userId);
      if (result.ok) {
        onUserSelected(userId);
      }
      setSelecting(null);
    },
    [onUserSelected]
  );

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    setAddError("");
    try {
      const user = await createUser(newName.trim(), newAvatar);
      setUsers((prev) => [...prev, user]);
      setShowAdd(false);
      setNewName("");
      setNewAvatar("piano");
      // Auto-select the new user
      handleSelect(user.id);
    } catch (e: any) {
      setAddError(e.message);
    }
  }, [newName, newAvatar, handleSelect]);

  const handleLogout = useCallback(async () => {
    await logout();
    onLogout();
  }, [onLogout]);

  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-full max-w-lg px-6">
        <h1 className="text-4xl font-bold text-white text-center mb-2">Chorda</h1>
        <p className="text-slate-500 text-center text-sm mb-8">Who's playing?</p>

        {loading ? (
          <div className="text-slate-500 text-center">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  disabled={selecting !== null}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                    selecting === user.id
                      ? "bg-cyan-600/30 ring-2 ring-cyan-500"
                      : "bg-slate-800 hover:bg-slate-700"
                  } disabled:opacity-50`}
                >
                  <span className="text-4xl">
                    {AVATAR_MAP[user.avatar] || AVATAR_MAP.piano}
                  </span>
                  <span className="text-white text-sm font-medium truncate w-full text-center">
                    {selecting === user.id ? "Loading..." : user.name}
                  </span>
                </button>
              ))}

              {/* Add user card */}
              <button
                onClick={() => setShowAdd(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500 text-slate-500 hover:text-cyan-400 transition-all"
              >
                <span className="text-3xl">+</span>
                <span className="text-sm">Add User</span>
              </button>
            </div>

            {/* Add user form */}
            {showAdd && (
              <div className="bg-slate-800 rounded-xl p-5 mb-4">
                <h3 className="text-white font-medium mb-3">New User</h3>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Name"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 mb-3"
                  autoFocus
                />
                <p className="text-slate-400 text-xs mb-2">Pick an avatar</p>
                <AvatarPicker selected={newAvatar} onSelect={setNewAvatar} />
                {addError && (
                  <p className="text-red-400 text-sm mt-3">{addError}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowAdd(false);
                      setAddError("");
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="text-center mt-6">
          <button
            onClick={handleLogout}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
