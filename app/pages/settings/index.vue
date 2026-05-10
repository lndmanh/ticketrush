<script setup lang="ts">
const localePath = useLocalePath()

await navigateTo(localePath('/settings/security'), { replace: true })
</script>
