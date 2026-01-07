
import { fetchWeatherForecast } from "../lib/weather";
import WeatherClient from "./WeatherClient";

export const dynamic = "force-dynamic"; // Ensure fresh data on navigation

export default async function WeatherPage() {
    // Fetch data using the re-implemented single-day fetcher
    const forecast = await fetchWeatherForecast();

    return <WeatherClient forecast={forecast} />;
}
