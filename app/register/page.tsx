"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { poppins } from "@/utils/fonts";
import { useSessionStore } from "@/store/sessionStore";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { setSession } = useSessionStore();
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRegister();
    }
  };

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.message);
      return;
    }

    // Redirect to login or home page after successful registration
    const data = await res.json();
    setSession(data.session);
    router.push("/chat");
  };

  return (
    <div className="homeGrid">
      <div className="flex flex-col items-center justify-center row-start-[content-start] col-start-[content-start]">
        <Link href="/">
          <div
            className={`text-7xl font-medium ${poppins.className} mb-6 text-(--main-color)`}
          >
            guage
          </div>
        </Link>
        <div className="flex flex-col gap-2 items-center">
          <div>
            <div>email</div>
            <input
              type="text"
              name="email"
              value={form.email}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              className="border border-(--sub-color) rounded px-2 py-1 text-[12pt] w-[250px]"
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
              className="border border-(--sub-color) rounded px-2 py-1 text-[12pt] w-[250px]"
            />
          </div>
          <div>
            <div>confirm password</div>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              className="border border-(--sub-color) rounded px-2 py-1 text-[12pt] w-[250px]"
            />
          </div>
          {error && <div className="text-red-500 text-[12pt]">{error}</div>}
          <button
            onClick={handleRegister}
            className="bg-(--main-color) text-(--bg-color) rounded px-2 py-1"
          >
            register
          </button>
        </div>
      </div>
    </div>
  );
}
