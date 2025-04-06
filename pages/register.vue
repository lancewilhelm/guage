<script setup lang="ts">
useHead({
  title: "Register",
});

const email = ref("");
const password = ref("");
const verifyPassword = ref("");

async function handleSubmit() {
  if (password.value !== verifyPassword.value) {
    alert("Passwords do not match");
    return;
  }

  const { error } = await authClient.signUp.email({
    email: email.value,
    password: password.value,
    name: "",
  });

  if (error) {
    console.error("Error signing up:", error);
    return;
  }

  return navigateTo("/chat");
}
</script>

<template>
  <div
    class="login-container w-full h-full flex flex-col items-center justify-center"
  >
    <NuxtLink
      to="/login"
      class="logo text-7xl font-bold mb-6 text-(--main-color)"
      >guage</NuxtLink
    >
    <form
      class="flex flex-col gap-2 items-center"
      @submit.prevent="handleSubmit"
    >
      <input
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="email"
        class="border border-(--sub-color) px-2 py-1 rounded text-[12pt] w-[250px]"
      />
      <input
        v-model="password"
        type="password"
        autocomplete="password"
        placeholder="password"
        class="border border-(--sub-color) px-2 py-1 rounded text-[12pt] w-[250px]"
      />
      <input
        v-model="verifyPassword"
        type="password"
        autocomplete="verifyPassword"
        placeholder="retype password"
        :class="[
          'border px-2 py-1 rounded text-[12pt] w-[250px]',
          password && verifyPassword && password !== verifyPassword
            ? 'border-(--error-color)'
            : 'border-(--sub-color)',
        ]"
      />
      <button
        class="bg-(--main-color) text-(--bg-color) rounded px-2 py-1 cursor-pointer hover:opacity-80 active:opacity-60"
      >
        login
      </button>
    </form>
  </div>
</template>

<style>
.logo {
  font-family: Poppins, sans-serif;
}
</style>
