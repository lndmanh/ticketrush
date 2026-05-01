<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold text-foreground">
          Users
        </h2>
        <p class="text-sm text-muted-foreground">
          Manage accounts, roles, and recent access activity.
        </p>
      </div>

      <Button @click="openAddDialog">
        <UserPlus class="h-4 w-4" />
        Add user
      </Button>
    </section>

    <DataTable
      ref="dataTableRef"
      :columns="columns"
      :data="users"
      :loading="loading"
      toolbar-label="User registry"
      toolbar-description="Search accounts and manage roles."
      search-placeholder="Search users, emails, or roles"
      empty-title="No users match the current view."
      empty-description="Adjust the search or add a new account."
      @update:data="fetchUsers"
    />

    <div
      v-if="selectedUserIds.length > 0"
      class="flex gap-2 p-4 bg-muted rounded-lg border"
    >
      <div class="flex-1 flex items-center gap-2">
        <InfoIcon class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm text-muted-foreground">
          {{ selectedUserIds.length }} user(s) selected
        </span>
      </div>
      <Button
        variant="destructive"
        :disabled="loading"
        @click="openBatchDeleteDialog"
      >
        <Trash2Icon class="h-4 w-4" />
        Delete Selected
      </Button>
    </div>

    <AlertDialog v-model:open="singleDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete user "{{ userToDelete?.username }}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="closeSingleDeleteDialog">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="loading"
            @click="confirmSingleDelete"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="batchDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected users?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {{ selectedUserIds.length }} user(s)? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="loading || selectedUserIds.length === 0"
            @click="confirmBatchDelete"
          >
            Delete selected
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog v-model:open="showDialog">
      <DialogScrollContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {{ isEditing ? 'Edit user' : 'Add user' }}
          </DialogTitle>
          <DialogDescription>
            Account details and permissions.
          </DialogDescription>
        </DialogHeader>

        <form
          @submit.prevent="onSubmit"
        >
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Basic information</FieldLegend>
              <FieldGroup>
                <VeeField
                  v-slot="{ field, errors }"
                  name="username"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="admin-user-username">
                      Username
                    </FieldLabel>
                    <Input
                      id="admin-user-username"
                      placeholder="Enter username"
                      :disabled="isEditing"
                      autocomplete="off"
                      :aria-invalid="!!errors.length"
                      :model-value="field.value"
                      @update:model-value="field.onChange"
                    />
                    <FieldDescription v-if="isEditing">
                      Username cannot be changed
                    </FieldDescription>
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="name"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="admin-user-name">
                      Full Name
                    </FieldLabel>
                    <Input
                      id="admin-user-name"
                      :model-value="field.value"
                      placeholder="Enter full name"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="email"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="admin-user-email">
                      Email
                    </FieldLabel>
                    <Input
                      id="admin-user-email"
                      :model-value="field.value"
                      type="email"
                      placeholder="Enter email"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="password"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="admin-user-password">
                      Password
                    </FieldLabel>
                    <Input
                      id="admin-user-password"
                      :model-value="field.value"
                      type="password"
                      :placeholder="isEditing ? 'Leave blank to keep current password' : 'Enter password'"
                      autocomplete="new-password"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldDescription v-if="isEditing">
                      Only fill this if you want to change the password
                    </FieldDescription>
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Settings</FieldLegend>
              <FieldGroup>
                <VeeField
                  v-slot="{ field, errors }"
                  name="isAdmin"
                >
                  <Field
                    orientation="horizontal"
                    :data-invalid="!!errors.length"
                  >
                    <FieldContent>
                      <FieldLabel for="admin-user-is-admin">
                        Administrator
                      </FieldLabel>
                      <FieldDescription>
                        Mark as an admin user with elevated permissions
                      </FieldDescription>
                      <FieldError
                        v-if="errors.length"
                        :errors="errors"
                      />
                    </FieldContent>
                    <Switch
                      id="admin-user-is-admin"
                      :model-value="field.value"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                  </Field>
                </VeeField>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              :disabled="loading"
              @click="closeDialog"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              :is-loading="loading"
            >
              {{ isEditing ? 'Save changes' : 'Create user' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import {
  adminUserCreateFormSchema,
  adminUserEditFormSchema,
} from '#shared/schemas/userSchema'
import type {
  AdminUserCreateFormInput,
  AdminUserEditFormInput,
} from '#shared/schemas/userSchema'
import type { User } from '#shared/db'
import type { ApiResponse } from '~~/types/api'
import { InfoIcon, Trash2Icon, UserPlus } from '@lucide/vue'
import DataTable from '@/components/DataTable.vue'
import { createColumns } from './columns'

type UserFormValues = AdminUserCreateFormInput & Pick<AdminUserEditFormInput, 'id'>

interface TableRowWithOriginal {
  original: User
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data !== null) {
      if ('statusMessage' in data && typeof data.statusMessage === 'string') {
        return data.statusMessage
      }
      if ('message' in data && typeof data.message === 'string') {
        return data.message
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

const dataTableRef = ref<{ table?: { getFilteredSelectedRowModel: () => { rows: TableRowWithOriginal[] }, resetRowSelection: () => void } }>()
const users = ref<User[]>([])
const loading = ref(false)
const showDialog = ref(false)
const editingUserId = ref<number | null>(null)
const singleDeleteDialogOpen = ref(false)
const batchDeleteDialogOpen = ref(false)
const deleteUserId = ref<number | null>(null)

const defaultFormData: UserFormValues = {
  id: 0,
  username: '',
  email: '',
  name: '',
  password: '',
  isAdmin: false,
}

const isEditing = computed(() => editingUserId.value !== null)
const validationSchema = computed(() => isEditing.value ? adminUserEditFormSchema : adminUserCreateFormSchema)

const {
  handleSubmit,
  resetForm,
  setFieldError,
} = useForm<UserFormValues>({
  initialValues: { ...defaultFormData },
  validationSchema,
})

const onSubmit = handleSubmit(
  async (values) => {
    try {
      loading.value = true

      if (isEditing.value && editingUserId.value !== null) {
        const payload: AdminUserEditFormInput = {
          id: editingUserId.value,
          username: values.username,
          email: values.email,
          name: values.name,
          password: values.password.trim() ? values.password : undefined,
          isAdmin: values.isAdmin,
        }

        await $fetch(`/api/admin/users/${editingUserId.value}`, {
          method: 'PUT',
          body: payload,
        })
      }
      else {
        const payload: AdminUserCreateFormInput = {
          username: values.username,
          email: values.email,
          name: values.name,
          password: values.password,
          isAdmin: values.isAdmin,
        }

        await $fetch('/api/admin/users', {
          method: 'POST',
          body: payload,
        })
      }

      toast.success(isEditing.value ? 'User updated successfully' : 'User created successfully')
      closeDialog()
      await fetchUsers()
    }
    catch (error) {
      const message = extractErrorMessage(error, 'Failed to save the user record')
      setFieldError('email', message)
    }
    finally {
      loading.value = false
    }
  },
)

const selectedUserIds = computed(() => {
  if (!dataTableRef.value?.table) {
    return []
  }

  const selectedRows = dataTableRef.value.table.getFilteredSelectedRowModel().rows
  return selectedRows.map(row => row.original.id)
})

const userToDelete = computed(() => {
  if (deleteUserId.value === null) {
    return null
  }

  return users.value.find(user => user.id === deleteUserId.value) ?? null
})

const columns = computed(() => createColumns(handleEdit, handleDeleteConfirm))

async function fetchUsers() {
  try {
    loading.value = true
    const res = await $fetch<ApiResponse<User[]>>('/api/admin/users')
    if (!res.success) {
      throw new Error('Unsuccessful response')
    }
    users.value = res.data
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to load the user records'))
  }
  finally {
    loading.value = false
  }
}

function resetToDefaults() {
  resetForm({ values: { ...defaultFormData } })
}

function openAddDialog() {
  editingUserId.value = null
  resetToDefaults()
  showDialog.value = true
}

function handleEdit(user: User) {
  editingUserId.value = user.id
  resetForm({
    values: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      password: '',
      isAdmin: user.isAdmin,
    },
  })
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingUserId.value = null
  resetToDefaults()
}

function handleDeleteConfirm(userId: number) {
  const user = users.value.find(candidate => candidate.id === userId)
  if (!user) {
    return
  }

  deleteUserId.value = userId
  singleDeleteDialogOpen.value = true
}

function closeSingleDeleteDialog() {
  singleDeleteDialogOpen.value = false
  deleteUserId.value = null
}

async function confirmSingleDelete() {
  if (deleteUserId.value === null) {
    return
  }

  const userId = deleteUserId.value
  closeSingleDeleteDialog()
  await handleDelete(userId)
}

async function handleDelete(userId: number) {
  try {
    loading.value = true
    await $fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })
    toast.success('User deleted successfully')
    await fetchUsers()
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to delete the user record'))
  }
  finally {
    loading.value = false
  }
}

async function handleBatchDelete() {
  if (selectedUserIds.value.length === 0) {
    return
  }

  try {
    loading.value = true
    const count = selectedUserIds.value.length
    await $fetch('/api/admin/users/delete', {
      method: 'POST',
      body: { userIds: selectedUserIds.value },
    })
    toast.success(`Successfully deleted ${count} user(s)`)

    dataTableRef.value?.table?.resetRowSelection()
    await fetchUsers()
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to delete the selected users'))
  }
  finally {
    loading.value = false
  }
}

function openBatchDeleteDialog() {
  if (selectedUserIds.value.length === 0) {
    return
  }

  batchDeleteDialogOpen.value = true
}

async function confirmBatchDelete() {
  batchDeleteDialogOpen.value = false
  await handleBatchDelete()
}

onMounted(() => {
  fetchUsers()
})
</script>
