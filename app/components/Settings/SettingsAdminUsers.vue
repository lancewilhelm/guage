<script setup lang="ts">
import { ref, onMounted } from "vue";

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const users = ref<User[]>([]);
const sortedUsers = ref<User[]>([]);

// Fetch users data
const fetchUsers = async () => {
  const response = await $fetch<{ users: User[] }>("/api/users", {
    method: "GET",
  });

  users.value = response.users;
  // Sort users by createdAt date (newest first)
  sortedUsers.value = [...users.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

// Call fetchUsers on component mount
onMounted(fetchUsers);

// Handlers for creating and deleting users
const createUserModalVisible = ref(false);
const newUserEmail = ref("");
const newUserPassword = ref("");
const newUserRole = ref("user");

async function createUser() {
  if (!newUserEmail.value || !newUserPassword.value) {
    alert("Please fill in all fields");
    return;
  }

  const { signUp } = useAuth();
  const { error } = await signUp.email({
    email: newUserEmail.value,
    password: newUserPassword.value,
    name: "",
  });

  if (error) {
    console.error("Error creating user:", error);
    return;
  }

  // Reset the form
  newUserEmail.value = "";
  newUserPassword.value = "";
  newUserRole.value = "user";
  createUserModalVisible.value = false;

  // Refetch users to update the list
  await fetchUsers();
}
</script>

<template>
  <div class="w-full">
    <SettingsGroup title="users" icon="lucide:users">
      <div class="w-full mt-4 overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-(--sub-color) text-(--main-color)">
            <tr>
              <th scope="col" class="px-6 py-1 text-left font-medium">email</th>
              <th scope="col" class="px-6 py-1 text-left font-medium">role</th>
              <th scope="col" class="px-6 py-1 text-left font-medium">
                date created
              </th>
              <th scope="col" class="px-6 py-1 text-left font-medium w-[150px]">
                actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-(--sub-color) text-(--text-color)">
            <template v-if="sortedUsers.length > 0">
              <tr v-for="user in sortedUsers" :key="user.id">
                <td class="px-6 py-1 whitespace-nowrap text-sm">
                  {{ user.email }}
                </td>
                <td class="px-6 py-1 whitespace-nowrap text-sm">
                  {{ user.role }}
                </td>
                <td class="px-6 py-1 whitespace-nowrap text-sm">
                  {{ new Date(user.createdAt).toLocaleDateString() }}
                </td>
                <td class="px-6 py-1 whitespace-nowrap text-sm flex gap-2">
                  <button
                    class="flex items-center bg-(--sub-alt-color) p-2 rounded-lg text-(--text-color) cursor-pointer"
                    @click="() => console.log('Edit user', user.id)"
                  >
                    <Icon
                      name="lucide:user-pen"
                      class="text-(--text-color) scale-125"
                    />
                  </button>
                  <button
                    class="flex items-center bg-(--error-color) p-2 rounded-lg text-(--bg-color) cursor-pointer"
                    @click="() => console.log('Disable user', user.id)"
                  >
                    <Icon
                      name="lucide:octagon-pause"
                      class="text-(--bg-color) scale-125"
                    />
                  </button>
                  <button
                    class="flex items-center bg-(--error-color) p-2 rounded-lg text-(--bg-color) cursor-pointer"
                    @click="() => console.log('Delete user', user.id)"
                  >
                    <Icon
                      name="lucide:trash-2"
                      class="text-(--bg-color) scale-125"
                    />
                  </button>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="3" class="px-6 py-4 text-center text-sm">
                Loading users...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="w-full flex justify-center">
        <button
          class="flex items-center gap-2 mt-4 bg-(--main-color) text-(--bg-color) p-2 rounded-lg px-4 cursor-pointer"
          @click="createUserModalVisible = true"
        >
          <Icon name="lucide:user-plus" class="text-(--bg-color) scale-125" />
          add user
        </button>
      </div>
    </SettingsGroup>
    <ModalWindow
      :open="createUserModalVisible"
      @close="createUserModalVisible = false"
    >
      <div class="flex flex-col gap-4 items-center">
        <div class="text-(--main-color) text-lg">create new user</div>
        <div class="flex flex-col gap-2">
          <input
            v-model="newUserEmail"
            type="email"
            placeholder="email"
            class="border border-(--main-color) rounded px-3 py-1 w-[300px]"
            @keyup.enter="createUser"
          />
          <input
            v-model="newUserPassword"
            type="password"
            placeholder="password"
            class="border border-(--main-color) rounded px-3 py-1 w-[300px]"
            @keyup.enter="createUser"
          />
          <select
            v-model="newUserRole"
            class="border border-(--main-color) rounded px-3 py-1"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button
          class="bg-(--main-color) text-(--bg-color) p-2 rounded-lg"
          @click="createUser"
        >
          create
        </button>
      </div>
    </ModalWindow>
  </div>
</template>
