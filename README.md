# Ocean Geographical Map

A Next.js application for visualizing geographical ocean data.

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

## Docker Production setup

1. Make sure you have Docker installed on your system.

2. Build the Docker image:
```bash
docker build -t ocean-geographical-map .
```

3. Run the Docker container:
```bash
docker run --name ocean-map -p 3005:3005 ocean-geographical-map
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
