# Ocean Geographical Map

A Next.js application for visualizing geographical ocean data.

## Docker Quick setup

1. Make sure you have Docker and Docker Compose installed on your system.

2. Build and run the application using Docker Compose:
```bash
docker compose up --build
```

3. To stop the application:
```bash
docker compose down
```

The application will be available at `http://localhost:3005`

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone https://github.com/daniel-ethridge/OceanGeographicalMap.git
cd OceanGeographicalMap
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3005`

## Technologies Used

- Next.js 15.1.6
- React 19
- TypeScript
- Tailwind CSS

## Development

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
