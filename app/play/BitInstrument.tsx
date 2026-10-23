"use client"

export default function BitInstrument() {
    return (
        <iframe
            src="/experiments/bit-instrument/index.html"
            title="877hand BIT INSTRUMENT"
            allow="autoplay"
            className="fixed inset-0 h-dvh w-full border-0 bg-[#f9c70d]"
            onLoad={(event) => event.currentTarget.contentWindow?.focus()}
        />
    )
}
