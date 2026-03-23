"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/auth";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const session = loadSession();
    router.replace(session ? "/dashboard" : "/login");
  }, [router]);
  return null;
}
