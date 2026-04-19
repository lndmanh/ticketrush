<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-semibold">
          Users
        </h2>
        <p class="text-sm text-muted-foreground mt-1">
          Manage user accounts and permissions
        </p>
      </div>
      <Button @click="openAddDialog">
        <UserPlus class="h-4 w-4" />
        Add User
      </Button>
    </div>

    <DataTable
      ref="dataTableRef"
      :columns="columns"
      :data="users"
      :loading="loading"
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
        @click="handleBatchDelete"
      >
        <Trash2Icon class="h-4 w-4" />
        Delete Selected
      </Button>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogScrollContent>
        <DialogHeader>
          <DialogTitle>
            {{ isEditing ? 'Edit User' : 'Add New User' }}
          </DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Update user information and permissions.' : 'Create a new user account with the details below.' }}
          </DialogDescription>
        </DialogHeader>

        <form
          id="admin-user-form"
          @submit="onSubmit"
        >
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Basic Information</FieldLegend>
              <FieldGroup>
                <VeeField
                  v-slot="{ componentField, errorMessage, meta }"
                  name="username"
                  :rules="validateUsername"
                >
                  <Field :data-invalid="meta.touched && !!errorMessage">
                    <FieldLabel for="username">
                      Username
                    </FieldLabel>
                    <Input
                      id="username"
                      v-bind="componentField"
                      placeholder="Enter username"
                      :disabled="isEditing"
                      autocomplete="off"
                      :aria-invalid="meta.touched && !!errorMessage"
                    />
                    <FieldDescription v-if="isEditing">
                      Username cannot be changed
                    </FieldDescription>
                    <FieldError
                      v-if="errorMessage"
                      :errors="[errorMessage]"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ componentField, errorMessage, meta }"
                  name="name"
                  :rules="validateName"
                >
                  <Field :data-invalid="meta.touched && !!errorMessage">
                    <FieldLabel for="name">
                      Full Name
                    </FieldLabel>
                    <Input
                      id="name"
                      v-bind="componentField"
                      placeholder="Enter full name"
                      :aria-invalid="meta.touched && !!errorMessage"
                    />
                    <FieldError
                      v-if="errorMessage"
                      :errors="[errorMessage]"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ componentField, errorMessage, meta }"
                  name="email"
                  :rules="validateEmail"
                >
                  <Field :data-invalid="meta.touched && !!errorMessage">
                    <FieldLabel for="email">
                      Email
                    </FieldLabel>
                    <Input
                      id="email"
                      v-bind="componentField"
                      type="email"
                      placeholder="Enter email"
                      :aria-invalid="meta.touched && !!errorMessage"
                    />
                    <FieldError
                      v-if="errorMessage"
                      :errors="[errorMessage]"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ componentField, errorMessage, meta }"
                  name="password"
                  :rules="validatePassword"
                >
                  <Field :data-invalid="meta.touched && !!errorMessage">
                    <FieldLabel for="password">
                      Password
                    </FieldLabel>
                    <Input
                      id="password"
                      v-bind="componentField"
                      type="password"
                      :placeholder="isEditing ? 'Leave blank to keep current password' : 'Enter password'"
                      autocomplete="new-password"
                      :aria-invalid="meta.touched && !!errorMessage"
                    />
                    <FieldDescription v-if="isEditing">
                      Only fill this if you want to change the password
                    </FieldDescription>
                    <FieldError
                      v-if="errorMessage"
                      :errors="[errorMessage]"
                    />
                  </Field>
                </VeeField>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />
            <FieldSet>
              <FieldLegend>Settings</FieldLegend>
              <FieldGroup>
                <Field>
                  <div class="flex items-center justify-between">
                    <div>
                      <FieldLabel for="isAdmin">
                        Administrator
                      </FieldLabel>
                      <FieldDescription>
                        Mark as an admin user with elevated permissions
                      </FieldDescription>
                    </div>
                    <VeeField
                      v-slot="{ field }"
                      name="isAdmin"
                      :rules="validateIsAdmin"
                    >
                      <Switch
                        id="isAdmin"
                        :model-value="field.value"
                        @update:model-value="field.onChange"
                      />
                    </VeeField>
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </form>

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
            form="admin-user-form"
            type="submit"
            :is-loading="loading"
          >
            {{ isEditing ? 'Save Changes' : 'Create User' }}
          </Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { emailSchema, usernameSchema } from '#shared/schemas/userSchema'
import type { User } from '#shared/db'
import type { ApiResponse } from '~~/server/utils/apiResponse'
import { InfoIcon, Trash2Icon, UserPlus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldSeparator,
} from '@/components/ui/field'
import DataTable from '@/components/DataTable.vue'
import { createColumns } from './columns'

const dataTableRef = ref()
const users = ref<User[]>([])
const loading = ref(false)
const showDialog = ref(false)
const editingUserId = ref<number | null>(null)

const defaultFormData = {
  username: '',
  email: '',
  name: '',
  password: '',
  isAdmin: false,
}

const isEditing = computed(() => editingUserId.value !== null)

const {
  handleSubmit,
  resetForm,
} = useForm({
  initialValues: { ...defaultFormData },
})

const onSubmit = handleSubmit(
  async (values) => {
    try {
      loading.value = true
      const submitData = { ...values }

      if (isEditing.value && submitData.password.trim() === '') {
        const { password: _password, ...payload } = submitData
        await $fetch(`/api/admin/users/${editingUserId.value}`, {
          method: 'PUT',
          body: { ...payload, id: editingUserId.value },
        })
      }
      else if (isEditing.value) {
        await $fetch(`/api/admin/users/${editingUserId.value}`, {
          method: 'PUT',
          body: { ...submitData, id: editingUserId.value },
        })
      }
      else {
        await $fetch('/api/admin/users', {
          method: 'POST',
          body: submitData,
        })
      }

      toast.success(isEditing.value ? 'User updated successfully' : 'User created successfully')
      closeDialog()
      await fetchUsers()
    }
    catch (error) {
      createError({ statusCode: 500, statusMessage: 'Internal Client Error. Failed to save the user record.', data: error })
    }
    finally {
      loading.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors)[0]
    if (firstError)
      toast.error(firstError)
    else
      toast.error('Please fix the errors above')
  },
)

function validateUsername(value: unknown) {
  const result = usernameSchema.safeParse(value)
  return result.success ? true : (result.error.issues[0]?.message ?? 'Invalid username')
}

function validateName(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? true
    : 'Full name is required'
}

function validateEmail(value: unknown) {
  const result = emailSchema.safeParse(value)
  return result.success ? true : (result.error.issues[0]?.message ?? 'Valid email is required')
}

function validatePassword(value: unknown) {
  if (isEditing.value)
    return true

  return typeof value === 'string' && value.trim().length > 0
    ? true
    : 'Password is required for new users'
}

function validateIsAdmin(_value: unknown) {
  return true
}

const selectedUserIds = computed(() => {
  if (!dataTableRef.value?.table) return []
  const selectedRows = dataTableRef.value.table.getFilteredSelectedRowModel().rows
  return selectedRows.map((row: { original: User }) => row.original.id)
})

const columns = computed(() => createColumns(handleEdit, handleDeleteConfirm))

async function fetchUsers() {
  try {
    loading.value = true
    const res = await $fetch<ApiResponse<User[]>>('/api/admin/users')
    if (!res.success) throw new Error('Unsuccessful response')
    users.value = res.data
  }
  catch (error) {
    createError({ statusCode: 500, statusMessage: 'Internal Client Error. Failed to load the user records.', data: error })
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
  const user = users.value.find(u => u.id === userId)
  if (!user) return

  if (confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
    void handleDelete(userId)
  }
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
    createError({ statusCode: 500, statusMessage: 'Internal Client Error. Failed to delete the user record.', data: error })
  }
  finally {
    loading.value = false
  }
}

async function handleBatchDelete() {
  if (selectedUserIds.value.length === 0) return

  const count = selectedUserIds.value.length
  if (!confirm(`Are you sure you want to delete ${count} user(s)? This action cannot be undone.`)) {
    return
  }

  try {
    loading.value = true
    await $fetch('/api/admin/users/delete', {
      method: 'POST',
      body: { userIds: selectedUserIds.value },
    })
    toast.success(`Successfully deleted ${count} user(s)`)

    if (dataTableRef.value?.table) {
      dataTableRef.value.table.resetRowSelection()
    }
    await fetchUsers()
  }
  catch (error) {
    createError({ statusCode: 500, statusMessage: 'Internal Client Error. Failed to delete the selected users.', data: error })
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>
