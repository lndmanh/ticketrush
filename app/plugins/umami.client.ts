export default defineNuxtPlugin(() => {
  const { enable, dataWebsiteId, src } = useConfig().site.umami

  if (enable && !import.meta.dev) {
    useScriptUmamiAnalytics({
      scriptInput: {
        src,
        defer: true,
      },
      websiteId: dataWebsiteId,
    })
  }
})
