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
  route.params.page !== ""
    ? Array.isArray(route.params.page)
      ? route.params.page[0]
      : route.params.page
    : "profile",
);
const profilePage = resolveComponent("SettingsProfile");
const themePage = resolveComponent("SettingsTheme");
const dangerZonePage = resolveComponent("SettingsDangerZone");
const adminPage = resolveComponent("SettingsAdmin");
const currentPage = computed(() => {
  switch (currentPageName.value) {
    case "profile":
      return profilePage;
    case "theme":
      return themePage;
    case "danger-zone":
      return dangerZonePage;
    case "admin":
      return adminPage;
    default:
      return profilePage;
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
        <component :is="currentPage" />
      </div>
    </div>
  </div>
</template>
