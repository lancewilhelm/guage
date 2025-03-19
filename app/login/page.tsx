"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EB_Garamond } from "next/font/google";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond-serif",
  subsets: ["latin"],
});

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });

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
            className={`text-7xl ${ebGaramond.className} mb-6 text-(--color-acc)`}
          >
            Guage
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
              className="border border-(--color-bg2) px-2 py-1 rounded text-[12pt] w-[250px]"
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
              className="border border-(--color-bg2) px-2 py-1 rounded text-[12pt] w-[250px]"
            />
          </div>
          <button
            className="bg-(--color-fg2) text-(--color-bg0) rounded px-2 py-1 cursor-pointer hover:opacity-80 active:opacity-60"
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
