"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@/store/sessionStore";
import { poppins } from "@/utils/fonts";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const { setSession } = useSessionStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  const handleLogin = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      setSession(data.session);
      router.push("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="homeGrid">
      <div
        className={`flex flex-col items-center justify-center row-start-[content-start] col-start-[content-start]`}
      >
        <Link href="/">
          <div
            className={`text-7xl font-medium ${poppins.className} mb-6 text-(--main-color)`}
          >
            guage
          </div>
        </Link>
        <form className="flex flex-col gap-2 items-center">
          <div>
            <div>email</div>
            <input
              type="text"
              name="email"
              value={form.email}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              className="border border-(--sub-color) px-2 py-1 rounded text-[12pt] w-[250px]"
            />
          </div>
          <div>
            <div>password</div>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              className="border border-(--sub-color) px-2 py-1 rounded text-[12pt] w-[250px]"
            />
          </div>
          <button
            className="bg-(--main-color) text-(--bg-color) rounded px-2 py-1 cursor-pointer hover:opacity-80 active:opacity-60"
            type="submit"
            onClick={handleLogin}
          >
            login
          </button>
        </form>
      </div>
    </div>
  );
}
