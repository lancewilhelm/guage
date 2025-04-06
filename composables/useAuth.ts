export async function useSignOut() {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        loadTheme("guage").then(() => {
          navigateTo("/login");
        });
      },
      onError: (error) => {
        console.error("Sign out error:", error);
      },
    },
  });
}
