"use client";

import { useEffect, useState } from "react";
import { useAdminUser } from "./AdminUserProvider";
import { IconSave } from "./icons";

type SavedKey = "name" | "username" | "password" | null;

function SaveButton({
  saved,
  disabled,
  onClick,
}: {
  saved: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="admin-primary-btn admin-account-save-btn"
      disabled={disabled}
      onClick={onClick}
    >
      <IconSave className="admin-account-save-icon" />
      {saved ? "Uloženo" : "Uložit"}
    </button>
  );
}

export function AdminUcet() {
  const { user, updateName, updateUsername, updatePassword } = useAdminUser();

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [usernamePassword, setUsernamePassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savedKey, setSavedKey] = useState<SavedKey>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name);
    setUsername(user.username);
  }, [user.name, user.username]);

  function flashSaved(key: SavedKey) {
    setSavedKey(key);
    window.setTimeout(() => setSavedKey(null), 1600);
  }

  function handleSaveName() {
    setError(null);
    const result = updateName(name);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    flashSaved("name");
  }

  function handleSaveUsername() {
    setError(null);
    const result = updateUsername(username, usernamePassword);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setUsernamePassword("");
    flashSaved("username");
  }

  function handleSavePassword() {
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Nová hesla se neshodují.");
      return;
    }

    const result = updatePassword(oldPassword, newPassword);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    flashSaved("password");
  }

  const canSaveName = name.trim().length > 0 && name.trim() !== user.name;
  const canSaveUsername =
    username.trim().length > 0 &&
    username.trim() !== user.username &&
    usernamePassword.trim().length > 0;
  const canSavePassword =
    oldPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  return (
    <div className="admin-ucet">
      <div className="admin-page-head">
        <div>
          <h1>Nastavení účtu</h1>
          <p>Správa profilu a přihlašovacích údajů.</p>
        </div>
      </div>

      <section className="admin-panel admin-account-panel">
        {error ? (
          <p className="admin-account-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="admin-account-section">
          <div className="admin-account-section-head">
            <h2>Jméno uživatele</h2>
            <p>Zobrazované jméno v administraci.</p>
          </div>
          <div className="admin-account-row">
            <label className="admin-field">
              <span>Jméno</span>
              <input
                type="text"
                value={name}
                autoComplete="name"
                onChange={(event) => {
                  setError(null);
                  setName(event.target.value);
                }}
              />
            </label>
            <SaveButton
              saved={savedKey === "name"}
              disabled={!canSaveName}
              onClick={handleSaveName}
            />
          </div>
        </div>

        <div className="admin-account-section">
          <div className="admin-account-section-head">
            <h2>Přihlašovací jméno</h2>
            <p>Pro změnu je potřeba ověření heslem.</p>
          </div>
          <div className="admin-account-row is-wide">
            <label className="admin-field">
              <span>Přihlašovací jméno</span>
              <input
                type="text"
                value={username}
                autoComplete="username"
                onChange={(event) => {
                  setError(null);
                  setUsername(event.target.value);
                }}
              />
            </label>
            <label className="admin-field">
              <span>Heslo pro ověření</span>
              <input
                type="password"
                value={usernamePassword}
                autoComplete="current-password"
                onChange={(event) => {
                  setError(null);
                  setUsernamePassword(event.target.value);
                }}
              />
            </label>
            <SaveButton
              saved={savedKey === "username"}
              disabled={!canSaveUsername}
              onClick={handleSaveUsername}
            />
          </div>
        </div>

        <div className="admin-account-section">
          <div className="admin-account-section-head">
            <h2>Heslo</h2>
            <p>Zadejte současné heslo a nové heslo dvakrát.</p>
          </div>
          <div className="admin-account-row is-wide">
            <label className="admin-field">
              <span>Současné heslo</span>
              <input
                type="password"
                value={oldPassword}
                autoComplete="current-password"
                onChange={(event) => {
                  setError(null);
                  setOldPassword(event.target.value);
                }}
              />
            </label>
            <label className="admin-field">
              <span>Nové heslo</span>
              <input
                type="password"
                value={newPassword}
                autoComplete="new-password"
                onChange={(event) => {
                  setError(null);
                  setNewPassword(event.target.value);
                }}
              />
            </label>
            <label className="admin-field">
              <span>Nové heslo znovu</span>
              <input
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(event) => {
                  setError(null);
                  setConfirmPassword(event.target.value);
                }}
              />
            </label>
            <SaveButton
              saved={savedKey === "password"}
              disabled={!canSavePassword}
              onClick={handleSavePassword}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
