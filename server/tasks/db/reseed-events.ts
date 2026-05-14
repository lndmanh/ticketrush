import { reseedDemoEvents } from '~~/server/utils/database/demo-events'

export default defineTask({
  meta: {
    name: 'db:reseed-events',
    description: 'Delete event data and seed 10 demo events with 20 seats per ticket type section',
  },
  async run() {
    console.log('Starting event reseed...')
    const result = await reseedDemoEvents()
    console.log(`Created ${result.eventsCreated} events across ${result.venuesCreated} venues`)
    console.log(`Seats per type: ${result.seatsPerType}`)

    return result
  },
})
