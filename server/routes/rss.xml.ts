import { Feed } from 'feed'
import { queryCollection } from '@nuxt/content/server'
import { withoutTrailingSlash } from 'ufo'
import { defaultLocale } from '../../i18n-constants'
import { APP_MANIFEST } from '#shared/constants/manifest'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const url = withoutTrailingSlash(runtimeConfig.public.url as string)

  const now = new Date()

  const feed = new Feed({
    title: APP_MANIFEST.name,
    description: APP_MANIFEST.description,
    id: url,
    link: url,
    language: defaultLocale,
    favicon: `${url}/favicon.ico`,
    copyright: `All rights reserved ${now.getFullYear()}, ${APP_MANIFEST.short_name}`,
  })

  const docs = await queryCollection(event, 'content')
    .where('draft', '<>', true)
    .all()

  for (const post of docs) {
    if (!post.publishedAt) continue

    feed.addItem({
      title: post.title ?? '-',
      id: withoutTrailingSlash(url + post.path),
      link: withoutTrailingSlash(url + post.path),
      description: post.description,
      date: new Date(post.publishedAt),
      category: post.category ? [{ name: post.category }] : undefined,
    })
  }

  event.node.res.setHeader('content-type', 'text/xml')
  return feed.rss2()
})
