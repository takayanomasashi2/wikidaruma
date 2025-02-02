// app/login/page.tsx
"use client";

import { Button } from "@/components/tailwind/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/tailwind/ui/card";
import { Input } from "@/components/tailwind/ui/input";
import { Label } from "@/components/tailwind/ui/label";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-2xl text-center pb-2">ログイン</CardTitle>
          <CardDescription className="text-center">
            利用を開始するにはログインが必要です。
          </CardDescription>
          <CardDescription className="text-center">
            株式会社ブルテナサス　高谷
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
