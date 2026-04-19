---
title: Field Group
icon: lucide:settings-2
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtFieldGroup.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
    ::ct-field-group
      ::ct-field{name="withDefault" type="boolean" defaultValue="true"}
      A field with a default value.
      ::
      ::ct-field{name="requiredField" type="boolean" required}
      A required field.
      ::
      ::ct-field{name="clear (path?: string)" type="void"}
      Clears form errors associated with a specific path. If no path is provided, clears all form errors.
      ::
      ::ct-field{name="getErrors (path?: string)" type="FormError[]"}
      Retrieves form errors associated with a specific path. If no path is provided, returns all form errors.
      ::
      ::ct-field{name="setErrors (errors: FormError[], path?: string)" type="void"}
      Sets form errors for a given path. If no path is provided, overrides all errors.
      ::
      ::ct-field{name="errors" type="Ref<FormError[]>"}
      A reference to the array containing validation errors. Use this to access or manipulate the error information.
      ::
    ::
  ::

  ```mdc
  ::ct-field-group
    ::ct-field{name="withDefault" type="boolean" defaultValue="true"}
    A field with a default value.
    ::
    ::ct-field{name="requiredField" type="boolean" required}
    A required field.
    ::
    ::ct-field{name="clear (path?: string)" type="void"}
    Clears form errors associated with a specific path. If no path is provided, clears all form errors.
    ::
    ::ct-field{name="getErrors (path?: string)" type="FormError[]"}
    Retrieves form errors associated with a specific path. If no path is provided, returns all form errors.
    ::
    ::ct-field{name="setErrors (errors: FormError[], path?: string)" type="void"}
    Sets form errors for a given path. If no path is provided, overrides all errors.
    ::
    ::ct-field{name="errors" type="Ref<FormError[]>"}
    A reference to the array containing validation errors. Use this to access or manipulate the error information.
    ::
  ::
  ```
::
