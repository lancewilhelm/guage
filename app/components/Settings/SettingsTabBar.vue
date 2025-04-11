<script setup lang="ts">
defineProps<{
  currentPageName: string;
}>();

const { user } = useAuth();
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
      :is-active-tab="currentPageName === 'model'"
      icon="lucide:bot"
      path="/settings/model"
      label="model"
    />
    <SettingsTabBarItem
      :is-active-tab="currentPageName === 'theme'"
      icon="lucide:palette"
      path="/settings/theme"
      label="theme"
    />
    <SettingsTabBarItem
      :is-active-tab="currentPageName === 'cloud'"
      icon="lucide:cloud"
      path="/settings/cloud"
      label="cloud"
    />
    <div v-if="user?.role === 'admin'">
      <SettingsTabBarItem
        :is-active-tab="currentPageName === 'admin'"
        icon="lucide:shield-check"
        path="/settings/admin"
        label="admin"
      />
    </div>
  </div>
</template>
