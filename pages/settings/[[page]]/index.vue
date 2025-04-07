<script setup lang="ts">
// Redirect to the profile page if the page parameter is empty
definePageMeta({
  auth: {
    only: "user",
    redirectGuestTo: "/login",
  },
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
  route.params.page !== ""
    ? Array.isArray(route.params.page)
      ? route.params.page[0]
      : route.params.page
    : "profile",
);
const profileTab = resolveComponent("SettingsProfile");
const themeTab = resolveComponent("SettingsTheme");
const cloudTab = resolveComponent("SettingsCloud");
const adminTab = resolveComponent("SettingsAdmin");
const currentTab = computed(() => {
  switch (currentPageName.value) {
    case "profile":
      return profileTab;
    case "theme":
      return themeTab;
    case "cloud":
      return cloudTab;
    case "admin":
      return adminTab;
    default:
      return profileTab;
  }
});
</script>
<template>
  <div class="flex flex-col items-center w-full h-full">
    <SettingsHeader class="w-full h-[40px]" />
    <SettingsTabBar :current-page-name="currentPageName" />
    <div
      class="flex flex-col items-center w-full h-full overflow-y-auto overflow-x-hidden"
    >
      <div class="flex justify-center w-full max-w-[900px] p-4">
        <component :is="currentTab" />
      </div>
    </div>
  </div>
</template>
