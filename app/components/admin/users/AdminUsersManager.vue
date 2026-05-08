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
import { InfoIcon, Trash2Icon, UserPlus } from '@lucide/vue'
import DataTable from '@/components/DataTable.vue'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { createColumns } from './columns'

type UserFormValues = AdminUserCreateFormInput & Pick<AdminUserEditFormInput, 'id'>

interface TableRowWithOriginal {
  original: User
}

type UserFieldName = 'username' | 'email' | 'name' | 'password' | 'isAdmin'
const userFieldNames: UserFieldName[] = ['username', 'email', 'name', 'password', 'isAdmin']

function isUserFieldName(value: string): value is UserFieldName {
  return userFieldNames.some(field => field === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIssueRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && ('message' in value || 'path' in value)
}

function getFieldFromPath(path: unknown): string | null {
  if (typeof path === 'string') {
    return path.split('.').filter(Boolean)[0] ?? null
  }

  if (Array.isArray(path)) {
    const first = path[0]
    return typeof first === 'string' ? first : null
  }

  return null
}

function getIssueList(error: unknown): unknown[] | null {
  if (!isRecord(error) || !isRecord(error.data)) {
    return null
  }

  const directIssues = error.data.issues
  if (Array.isArray(directIssues)) {
    return directIssues
  }

  if (isRecord(error.data.data) && Array.isArray(error.data.data.issues)) {
    return error.data.data.issues
  }

  return null
}

function getIssueFieldAndMessage(error: unknown): { field: UserFieldName, message: string } | null {
  const issues = getIssueList(error)
  if (!issues) {
    return null
  }

  for (const issue of issues) {
    if (!isIssueRecord(issue)) {
      continue
    }

    const field = getFieldFromPath(issue.path)
    const message = typeof issue.message === 'string' && issue.message.trim() ? issue.message : null
    if (field && isUserFieldName(field)) {
      return message ? { field, message } : { field, message: 'Invalid value' }
    }
  }

  return null
}

function mapUserErrorToField(message: string): UserFieldName | null {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes('username')) {
    return 'username'
  }
  if (lowerMessage.includes('password')) {
    return 'password'
  }
  if (lowerMessage.includes('email')) {
    return 'email'
  }

  return null
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (isRecord(error) && isRecord(error.data)) {
    if (typeof error.data.statusMessage === 'string') {
      return error.data.statusMessage
    }
    if (typeof error.data.message === 'string') {
      return error.data.message
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

        const response = await apiRequest(apiRoutes.adminUser(editingUserId.value), {
          method: 'PUT',
          body: payload,
        })
        if (!response.success) throw response
      }
      else {
        const payload: AdminUserCreateFormInput = {
          username: values.username,
          email: values.email,
          name: values.name,
          password: values.password,
          isAdmin: values.isAdmin,
        }

        const response = await apiRequest(apiRoutes.ADMIN_USERS, {
          method: 'POST',
          body: payload,
        })
        if (!response.success) throw response
      }

      toast.success(isEditing.value ? 'User updated successfully' : 'User created successfully')
      closeDialog()
      await fetchUsers()
    }
    catch (error) {
      const message = parseApiError(error, 'Failed to save the user record').message
      const structuredIssue = getIssueFieldAndMessage(error)
      if (structuredIssue) {
        setFieldError(structuredIssue.field, structuredIssue.message)
      }
      else {
        const mappedField = mapUserErrorToField(message)
        if (mappedField) {
          setFieldError(mappedField, message)
        }
        else {
          toast.error(message)
        }
      }
    }
    finally {
      loading.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'Please fix the highlighted fields'
    toast.error(firstError)
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
    const res = await apiRequest(apiRoutes.ADMIN_USERS)
    if (!res.success) {
      throw res
    }
    users.value = res.data
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to load the user records').message)
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
    const response = await apiRequest(apiRoutes.adminUser(userId), {
      method: 'DELETE',
    })
    if (!response.success) throw response
    toast.success('User deleted successfully')
    await fetchUsers()
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to delete the user record').message)
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
    const response = await apiRequest(apiRoutes.ADMIN_USERS_DELETE, {
      method: 'POST',
      body: { userIds: selectedUserIds.value },
    })
    if (!response.success) throw response
    toast.success(`Successfully deleted ${count} user(s)`)

    dataTableRef.value?.table?.resetRowSelection()
    await fetchUsers()
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to delete the selected users').message)
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
