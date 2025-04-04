<script setup lang="ts">
// Redirect to the profile page if the page parameter is empty
definePageMeta({
  middleware: [
    function (to) {
      if (to.params.page === "") {
        return navigateTo("/settings/profile");
      }
    },
  ],
});

// Compute the current page based on the route parameter
const route = useRoute();
const currentPageName = computed(() =>
  route.params.page !== "" ? route.params.page : "profile",
);
const profilePage = resolveComponent("SettingsProfile");
const themePage = resolveComponent("SettingsTheme");
const dangerZonePage = resolveComponent("SettingsDangerZone");
const currentPage = computed(() => {
  switch (currentPageName.value) {
    case "profile":
      return profilePage;
    case "theme":
      return themePage;
    case "danger-zone":
      return dangerZonePage;
    default:
      return profilePage;
  }
});
</script>
<template>
  <div class="flex flex-col items-center w-full h-full">
    <SettingsHeader class="w-full h-[40px]" />
    <div
      class="flex justify-center gap-4 px-4 py-2 border-t border-b border-(--sub-color) w-full"
    >
      <div
        :class="[
          'flex items-center gap-1 cursor-pointer hover:opacity-80',
          currentPageName === 'profile'
            ? 'text-(--main-color) underline'
            : 'text-(--text-color)',
        ]"
        @click="navigateTo('/settings/profile')"
      >
        <Icon name="lucide:circle-user" class="text-(--main-color)" />
        profile
      </div>
      <div
        :class="[
          'flex items-center gap-1 cursor-pointer hover:opacity-80',
          currentPageName === 'theme'
            ? 'text-(--main-color) underline'
            : 'text-(--text-color)',
        ]"
        @click="navigateTo('/settings/theme')"
      >
        <Icon name="lucide:palette" class="text-(--main-color)" />
        theme
      </div>
      <div
        :class="[
          'flex items-center gap-1 cursor-pointer hover:opacity-80',
          currentPageName === 'danger-zone'
            ? 'text-(--main-color) underline'
            : 'text-(--text-color)',
        ]"
        @click="navigateTo('/settings/danger-zone')"
      >
        <Icon name="lucide:triangle-alert" class="text-(--main-color)" />
        danger zone
      </div>
    </div>
    <div
      class="flex flex-col items-center w-full h-full overflow-y-auto overflow-x-hidden"
    >
      <div class="flex justify-center w-full max-w-[900px] p-4">
        <component :is="currentPage" />
      </div>
    </div>
  </div>
</template>
