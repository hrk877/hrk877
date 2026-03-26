export const dynamic = 'force-dynamic'

import { getDevelopmentStats } from "../actions/stats"
import StatsDashboardClient from "./StatsDashboardClient"

export default async function StatsPage() {
    const data = await getDevelopmentStats();

    return <StatsDashboardClient data={data} />;
}
