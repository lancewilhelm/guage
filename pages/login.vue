<script setup lang="ts">
useHead({
  title: "Login",
});
const email = ref("");
const password = ref("");

async function handleSubmit() {
  const { error } = await authClient.signIn.email({
    email: email.value,
    password: password.value,
  });

  if (error) {
    alert("Login failed:");
    return;
  }

  return navigateTo("/chat");
}
</script>

<template>
  <div
    class="login-container w-full h-full flex flex-col items-center justify-center"
  >
    <div className="text-7xl font-bold font-logo mb-6 text-(--main-color)">
      guage
    </div>
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
        autocomplete="current-password"
        placeholder="password"
        class="border border-(--sub-color) px-2 py-1 rounded text-[12pt] w-[250px]"
      />
      <button
        class="bg-(--main-color) text-(--bg-color) rounded px-2 py-1 cursor-pointer hover:opacity-80 active:opacity-60"
      >
        login
      </button>
    </form>
  </div>
</template>
