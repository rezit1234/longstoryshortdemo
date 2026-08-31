"use client";

import { resolveAvatarUrl } from "@/lib/auth";

type AdminAvatarProps = {
  src?: string | null;
  name: string;
  className?: string;
};

export function AdminAvatar({
  src,
  name,
  className = "admin-member-avatar",
}: AdminAvatarProps) {
  const resolved = resolveAvatarUrl(src);

  return (
    <span className={`${className} has-image`} title={name} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolved} alt="" className="admin-avatar-img" />
    </span>
  );
}
