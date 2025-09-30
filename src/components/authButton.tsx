"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (session) {
    return (
      <div>
        <p>
          Signed in as {session.user?.name} ({session.user?.email})
        </p>
        {/* 如果配置了 callbacks 传递 accessToken，此处可按需使用 */}
        {/* <p>Access Token: {session.accessToken}</p> */}
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <p>Not signed in</p>
      <button onClick={() => signIn("github")}>Sign in with GitHub</button>
    </div>
  );
}
