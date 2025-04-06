export async function useSignOut() {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        loadTheme("guage");
        navigateTo("/login");
      },
      onError: (error) => {
        console.error("Sign out error:", error);
      },
    },
  });
}
