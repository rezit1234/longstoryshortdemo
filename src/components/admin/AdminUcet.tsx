"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { AdminAvatar } from "./AdminAvatar";
import { useAdminUser } from "./AdminUserProvider";
import { IconSave } from "./icons";

type SavedKey = "avatar" | "name" | "username" | "password" | null;
type SavingKey = SavedKey;

const TOAST_MS = 3400;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const TOAST_COPY: Record<
  Exclude<SavedKey, null>,
  { title: string; detail: string }
> = {
  avatar: {
    title: "Profilovka změněna",
    detail: "Profilový obrázek byl úspěšně uložen.",
  },
  name: {
    title: "Jméno změněno",
    detail: "Zobrazované jméno bylo úspěšně uloženo.",
  },
  username: {
    title: "Přihlašovací jméno změněno",
    detail: "Nové přihlašovací jméno je aktivní.",
  },
  password: {
    title: "Heslo změněno",
    detail: "Nové heslo bylo úspěšně nastaveno.",
  },
};

function MaskIcon({ src }: { src: string }) {
  return (
    <span
      className="admin-mask-icon"
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
      aria-hidden
    />
  );
}

function SaveButton({
  saved,
  saving,
  disabled,
  onClick,
}: {
  saved: boolean;
  saving: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="admin-primary-btn admin-account-save-btn"
      disabled={disabled || saving}
      onClick={onClick}
    >
      <IconSave className="admin-account-save-icon" />
      {saving ? "Ukládám…" : saved ? "Uloženo" : "Uložit"}
    </button>
  );
}

function AvatarEditModal({
  saving,
  hasCustomAvatar,
  onClose,
  onPickFile,
  onReset,
}: {
  saving: boolean;
  hasCustomAvatar: boolean;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onReset: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, saving]);

  function acceptFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setLocalError("Povolené formáty: JPG, PNG, WEBP, GIF.");
      return;
    }
    setLocalError(null);
    onPickFile(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    if (saving) return;
    acceptFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      className="admin-confirm-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-avatar-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-avatar-modal-title"
        aria-describedby="admin-avatar-modal-desc"
      >
        <h2 id="admin-avatar-modal-title">Profilový obrázek</h2>
        <p id="admin-avatar-modal-desc">
          Přetáhněte obrázek sem, nebo klikněte a vyberte soubor z počítače.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="admin-account-avatar-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            acceptFile(file);
          }}
        />

        <button
          type="button"
          className={
            dragging
              ? "admin-avatar-dropzone is-dragging"
              : "admin-avatar-dropzone"
          }
          disabled={saving}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget.contains(event.relatedTarget as Node)) return;
            setDragging(false);
          }}
          onDrop={handleDrop}
        >
          <span className="admin-avatar-dropzone-title">
            {saving ? "Nahrávám…" : "Přetáhněte obrázek sem"}
          </span>
          <span className="admin-avatar-dropzone-hint">
            nebo klikněte pro výběr · JPG, PNG, WEBP, GIF · max. 2 MB
          </span>
        </button>

        {localError ? <p className="admin-drawer-error">{localError}</p> : null}

        <div className="admin-confirm-actions admin-avatar-modal-actions">
          <button
            type="button"
            className="admin-outline-btn"
            disabled={saving}
            onClick={onClose}
          >
            Zavřít
          </button>
          <button
            type="button"
            className="admin-outline-btn"
            disabled={saving || !hasCustomAvatar}
            onClick={onReset}
          >
            Obnovit výchozí
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminUcet() {
  const { user, updateName, updateUsername, updatePassword, updateAvatar, resetAvatar } =
    useAdminUser();

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [usernamePassword, setUsernamePassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savedKey, setSavedKey] = useState<SavedKey>(null);
  const [savingKey, setSavingKey] = useState<SavingKey>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(TOAST_COPY.name);
  const hasCustomAvatar = Boolean(user.avatarUrl?.trim());

  useEffect(() => {
    setName(user.name);
    setUsername(user.username);
  }, [user.name, user.username]);

  useEffect(() => {
    if (!toastVisible) return;

    const leaveTimer = window.setTimeout(() => setToastLeaving(true), TOAST_MS - 280);
    const hideTimer = window.setTimeout(() => {
      setToastVisible(false);
      setToastLeaving(false);
    }, TOAST_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [toastVisible]);

  function flashSaved(key: Exclude<SavedKey, null>) {
    setSavedKey(key);
    window.setTimeout(() => setSavedKey(null), 1600);
  }

  function showToast(key: Exclude<SavedKey, null>) {
    setToastMessage(TOAST_COPY[key]);
    setToastLeaving(false);
    setToastVisible(true);
  }

  async function handleSaveName() {
    setError(null);
    setSavingKey("name");
    const result = await updateName(name);
    setSavingKey(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    flashSaved("name");
    showToast("name");
  }

  async function handleAvatarFile(file: File) {
    setError(null);
    setSavingKey("avatar");
    const result = await updateAvatar(file);
    setSavingKey(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAvatarModalOpen(false);
    flashSaved("avatar");
    showToast("avatar");
  }

  async function handleResetAvatar() {
    setError(null);
    setSavingKey("avatar");
    const result = await resetAvatar();
    setSavingKey(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAvatarModalOpen(false);
    flashSaved("avatar");
    setToastMessage({
      title: "Profilovka obnovena",
      detail: "Používá se výchozí obrázek Long Story Short.",
    });
    setToastLeaving(false);
    setToastVisible(true);
  }

  async function handleSaveUsername() {
    setError(null);
    setSavingKey("username");
    const result = await updateUsername(username, usernamePassword);
    setSavingKey(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setUsernamePassword("");
    flashSaved("username");
    showToast("username");
  }

  async function handleSavePassword() {
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Nová hesla se neshodují.");
      return;
    }

    setSavingKey("password");
    const result = await updatePassword(oldPassword, newPassword);
    setSavingKey(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    flashSaved("password");
    showToast("password");
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
            <h2>Profil uživatele</h2>
            <p>Jméno a fotka, které se zobrazují v administraci.</p>
          </div>
          <div className="admin-account-row admin-account-row-with-avatar">
            <button
              type="button"
              className="admin-account-avatar-trigger"
              aria-label="Upravit profilový obrázek"
              onClick={() => setAvatarModalOpen(true)}
            >
              <AdminAvatar
                src={user.avatarUrl}
                name={user.name}
                className="admin-member-avatar is-account"
              />
              <span className="admin-account-avatar-edit" aria-hidden>
                <MaskIcon src="/icons/Edit.svg" />
              </span>
            </button>

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
              saving={savingKey === "name"}
              disabled={!canSaveName}
              onClick={() => {
                void handleSaveName();
              }}
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
              saving={savingKey === "username"}
              disabled={!canSaveUsername}
              onClick={() => {
                void handleSaveUsername();
              }}
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
              saving={savingKey === "password"}
              disabled={!canSavePassword}
              onClick={() => {
                void handleSavePassword();
              }}
            />
          </div>
        </div>
      </section>

      {avatarModalOpen ? (
        <AvatarEditModal
          saving={savingKey === "avatar"}
          hasCustomAvatar={hasCustomAvatar}
          onClose={() => setAvatarModalOpen(false)}
          onPickFile={(file) => {
            void handleAvatarFile(file);
          }}
          onReset={() => {
            void handleResetAvatar();
          }}
        />
      ) : null}

      {toastVisible ? (
        <div
          className={toastLeaving ? "admin-toast is-leaving" : "admin-toast"}
          role="status"
          aria-live="polite"
        >
          <span className="admin-toast-check" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.2 8.2 6.4 11.4 12.8 4.6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="admin-toast-copy">
            <strong>{toastMessage.title}</strong>
            <span>{toastMessage.detail}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
