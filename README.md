# Ocean Geographical Map

A Next.js application for visualizing geographical ocean data.

## Current Features

- Interactive global map powered by Mapbox
- Visualization of [microplastics data sourced from NOAA](https://www.ncei.noaa.gov/products/microplastics)
- Toggle between street view and satellite map styles
- Interactive data points with detailed information popups including
- Real-time data point count display
- Responsive design with a modern UI

## Prerequisites

- Node.js (Latest LTS version recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm (Latest LTS version recommended: comes with Node.js)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/daniel-ethridge/OceanGeographicalMap.git
cd OceanGeographicalMap
```

2. Copy env template
```bash
cp template.env .env.local
```
> Add your own Mapbox API key to the `.env.local` file

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
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

## Acknowledgements

- [NOAA](https://www.ncei.noaa.gov/products/microplastics) for providing the microplastics data

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
