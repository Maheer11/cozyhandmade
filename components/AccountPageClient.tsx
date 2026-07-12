"use client";

import { useSearchParams } from "next/navigation";
import Toast from "./Toast";

interface AccountPageClientProps {
  children: React.ReactNode;
}

export default function AccountPageClient({ children }: AccountPageClientProps) {
  const searchParams = useSearchParams();
  const emailVerified = searchParams.get("emailVerified") === "true";

  return (
    <>
      {emailVerified && (
        <Toast
          message="Email verified successfully! Your account is now fully activated."
          type="success"
          duration={6000}
        />
      )}
      {children}
    </>
  );
}
