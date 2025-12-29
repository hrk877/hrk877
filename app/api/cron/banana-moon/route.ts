import { NextResponse } from 'next/server';
import SunCalc from 'suncalc';
import { sendCustomBroadcast } from '@/app/actions/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const now = new Date();
    // Tokyo Coordinates for calculation (matches frontend)
    const lat = 35.6762;
    const lon = 139.6503;

    // Calculate Moon Age
    const phase = SunCalc.getMoonIllumination(now);
    const age = phase.phase * 29.53;
    const roundedAge = Math.round(age);

    // Banana Moon Definition: Age 5 or 25
    const isBananaMoon = roundedAge === 5 || roundedAge === 25;

    if (isBananaMoon) {
        const subject = "Banana Moon Day Has Arrived🍌";
        const message = `
今日はバナナムーンの日。
夜空に浮かぶ月が、バナナの形をしています。

空を見上げてバナナに願いを込めましょう。

Catch the Moon
https://877hand.vercel.app/moon`.trim();

        console.log(`[Cron] Banana Moon Day detected (Age: ${age.toFixed(2)}). Sending email...`);

        const result = await sendCustomBroadcast(subject, message);

        if (result.success) {
            return NextResponse.json({ sent: true, age: age.toFixed(2), message: "Email sent successfully" });
        } else {
            console.error("[Cron] Failed to send email:", result.error);
            return NextResponse.json({ sent: false, error: result.error, age: age.toFixed(2) }, { status: 500 });
        }
    }

    return NextResponse.json({ sent: false, reason: "Not Banana Moon Day", age: age.toFixed(2) });
}
