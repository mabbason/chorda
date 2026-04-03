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
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to create user");
    }
  }, [newName, newAvatar, handleSelect]);

  const handleLogout = useCallback(async () => {
    await logout();
    onLogout();
  }, [onLogout]);

  return (
    <div className="h-screen bg-n-900 flex items-center justify-center">
      <div className="w-full max-w-lg px-6">
        <div className="flex justify-center mb-2">
          <img src="/logos/chorda-logo-full.png" alt="Chorda" className="h-24" />
        </div>
        <p className="text-n-500 text-center text-sm mb-8">Who's playing?</p>

        {loading ? (
          <div className="text-n-500 text-center">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  disabled={selecting !== null}
                  className={`flex flex-col items-center gap-2 p-4 w-28 h-28 rounded-full transition-all ${
                    selecting === user.id
                      ? "bg-purple-base/30 ring-2 ring-purple-light"
                      : "bg-n-800 hover:bg-n-700"
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
                className="flex flex-col items-center justify-center gap-1 w-28 h-28 rounded-full border-2 border-dashed border-n-700 hover:border-purple-light text-n-500 hover:text-purple-light transition-all"
              >
                <span className="text-3xl">+</span>
                <span className="text-sm">Add User</span>
              </button>
            </div>

            {/* Add user form */}
            {showAdd && (
              <div className="bg-n-800 rounded-xl p-5 mb-4">
                <h3 className="text-white font-medium mb-3">New User</h3>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Name"
                  className="w-full px-3 py-2 bg-n-700 border border-n-600 rounded-lg text-white placeholder-n-500 text-sm focus:outline-none focus:border-purple-light mb-3"
                  autoFocus
                />
                <p className="text-n-400 text-xs mb-2">Pick an avatar</p>
                <AvatarPicker selected={newAvatar} onSelect={setNewAvatar} />
                {addError && (
                  <p className="text-pink-base text-sm mt-3">{addError}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                    className="flex-1 py-2 bg-purple-base hover:bg-purple-light disabled:bg-n-700 disabled:text-n-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowAdd(false);
                      setAddError("");
                    }}
                    className="px-4 py-2 text-n-400 hover:text-white text-sm transition-colors"
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
            className="text-n-600 hover:text-n-400 text-xs transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
