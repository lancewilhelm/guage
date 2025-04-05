<script setup lang="ts">
defineProps<{
  currentPageName: string;
}>();

const { data: session } = await authClient.useSession(useFetch);
</script>
<template>
  <div
    class="flex justify-center gap-4 px-4 py-2 border-t border-b border-(--sub-color) w-full"
  >
    <SettingsTabBarItem
      :is-active-tab="currentPageName === 'profile'"
      icon="lucide:circle-user"
      path="/settings/profile"
      label="profile"
    />
    <SettingsTabBarItem
      :is-active-tab="currentPageName === 'theme'"
      icon="lucide:palette"
      path="/settings/theme"
      label="theme"
    />
    <SettingsTabBarItem
      :is-active-tab="currentPageName === 'danger-zone'"
      icon="lucide:triangle-alert"
      path="/settings/danger-zone"
      label="danger zone"
    />
    <div v-if="session?.user.role === 'admin'">
      <SettingsTabBarItem
        :is-active-tab="currentPageName === 'admin'"
        icon="lucide:shield-check"
        path="/settings/admin"
        label="admin"
      />
    </div>
  </div>
</template>
