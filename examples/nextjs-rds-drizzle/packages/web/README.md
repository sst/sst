This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) in an [SST](https://sst.dev/) application setup in [standalone mode](https://docs.sst.dev/start/standalone).

It includes the following:

* [NextJS](https://nextjs.org) (using `TS` + `Tailwind` + `App Router`)
* [SST RDS](https://docs.sst.dev/constructs/RDS) (PostgreSQL database)
* [SST Script](https://docs.sst.dev/constructs/Script) (run drizzle migrations on deploy)
* [Drizzle ORM](https://orm.drizzle.team/)

## Getting Started

1. Change to the `examples/nextjs-rds-drizzle-migrations` folder and install dependencies:

    ```bash
    cd examples/nextjs-rds-drizzle-migrations
    npm i
    ```

1. Start the `sst` application:

    From within the root of the `nextjs-rds-drizzle-migrations` folder, type:

    ```bash
    npx sst dev # this will take a few minutes to complete
    ```

1. Then, change to the NextJS `packages/web` directory and start the dev server:

    ```bash
    cd packages/web
    npm run dev
    ```

1. The following should now work:

    * [http://localhost:3000](http://localhost:3000)
    
        The NextJS root/home page

    * [http://localhost:3000/api/users](http://localhost:3000/api/users)

        An example NextJS API endpoint that uses Drizzle to return the users list from the RDS database.

## Drizzle Schema and Migrations

This NextJS SST application is setup such that you manage your Drizzle schema and migrations from the NextJS application as you would in a 'normal' NextJS application.

### **Schema and Migrations**

* Schema definitions are in the NextJS `packages/web` folder:

    `packages/web/drizzle/schema.ts`

* Migrations are generated in the NextJS `packages/web` folder:

    `packages/web/migrations`

**NOTE:** When you deploy the application your migrations will run automatically.

### Developing the application locally

1. First of all, your migrations will run once when you start the application:

    ```bash
    # migrations run during local 'deploy'
    npx sst dev
    ```

    *You should see the script run in the console when you startup `sst dev`.*

1. If you modify the schema (`packages/web/drizzle/schema.ts`) while developing, you will want to generate a new migration.

    `Drizzle` will generate your new migrations based off of your current schema + a diff it takes of your local `SST RDS` database instance.
    
    Go to the NextJS `packages/web` folder and run the `db:generate` command:
    ```bash
    cd packages/web
    npm run db:generate
    ```

    You should now have new migrations located under the NextJS `packages/web/migrations` folder.

1. Then, run those migrations against your local SST dev instance to update your local database structure.

    Go to the NextJS `packages/web` folder and run the `db:migrate` command:
    ```bash
    cd packages/web
    npm run db:migrate
    ```

    Now your local application `SST RDS` database is up to date with your current `Drizzle` schema (`packages/web/drizzle/schema.ts`).

### Deploying

When you deploy to another environment your migrations will automatically trigger according to the function and options defined by the `Script` construct in `stacks/Defaults.ts`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
