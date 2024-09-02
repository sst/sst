import { Await, createFileRoute, defer } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/start'
import { Suspense, useState } from 'react'

const personServerFn = createServerFn('GET', (name: string) => {
  return { name, randomNumber: Math.floor(Math.random() * 100) }
})

const slowServerFn = createServerFn('GET', async (name: string) => {
  await new Promise((r) => setTimeout(r, 1000))
  return { name, randomNumber: Math.floor(Math.random() * 100) }
})

export const Route = createFileRoute('/deferred')({
  loader: async () => {
    return {
      deferredStuff: defer(
        new Promise<string>((r) =>
          setTimeout(() => r('Hello deferred!'), 2000),
        ),
      ),
      deferredPerson: defer(slowServerFn('Tanner Linsley')),
      person: await personServerFn('John Doe'),
    }
  },
  component: Deferred,
})

function Deferred() {
  const [count, setCount] = useState(0)
  const { deferredStuff, deferredPerson, person } = Route.useLoaderData()

  return (
    <div className="p-2">
      <div data-testid="regular-person">
        {person.name} - {person.randomNumber}
      </div>
      <Suspense fallback={<div>Loading person...</div>}>
        <Await
          promise={deferredPerson}
          children={(data) => (
            <div data-testid="deferred-person">
              {data.name} - {data.randomNumber}
            </div>
          )}
        />
      </Suspense>
      <Suspense fallback={<div>Loading stuff...</div>}>
        <Await
          promise={deferredStuff}
          children={(data) => <h3 data-testid="deferred-stuff">{data}</h3>}
        />
      </Suspense>
      <div>Count: {count}</div>
      <div>
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
    </div>
  )
}
