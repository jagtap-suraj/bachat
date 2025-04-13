# Bachat - Personal Finance Tracker

Bachat is a comprehensive personal finance tracking application built with Next.js, Prisma, and TypeScript. Track your expenses, manage multiple accounts, set budgets, and visualize your financial journey with intuitive charts and dashboards.

![Bachat Dashboard](/public/dashboard_screenshot.jpeg)

## Features

- **Multi-account Management**: Create and manage multiple financial accounts
- **Transaction Tracking**: Log income and expenses with categories and descriptions
- **Budget Planning**: Set monthly budgets and track your spending against them
- **Visual Analytics**: View your financial data through intuitive charts and graphs
- **Responsive Design**: Access your finances from any device with a fully responsive UI
- **Secure Authentication**: User authentication powered by Clerk
- **Performance Optimized**: Redis caching and rate limiting for blazing fast experience

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Clerk
- **Performance**: Redis (Upstash) for caching and rate limiting
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Clerk account for authentication
- Upstash Redis (optional, for caching and rate limiting)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jagtap-suraj/bachat.git
   cd bachat
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/bachat"
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # Upstash Redis (Optional - for caching and rate limiting)
   UPSTASH_REDIS_REST_URL=your_upstash_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
   ```

4. Run database migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Demo Data

To seed your database with sample transactions:

1. Update the USER_ID and ACCOUNT_ID in `src/lib/actions/seed.ts` to match your user's ID and account ID
2. Visit `/api/seed` in your browser to generate 90 days of sample transactions

## Test Credentials

You can use these credentials to test the application:

- **Email**: bachat@grr.la
- **Password**: welth@bachat

## Deployment

The easiest way to deploy Bachat is using Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjagtap-suraj%2Fbachat)

Make sure to set up the required environment variables in your Vercel project settings.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Prisma](https://prisma.io/)
- [Clerk](https://clerk.dev/)
- [Upstash](https://upstash.com/)
- [shadcn/ui](https://ui.shadcn.com/)
