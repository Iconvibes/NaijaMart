import { useEffect, useState } from 'react'

const pad = (n) => String(n).padStart(2, '0')

function diffParts(target) {
  let s = Math.max(0, Math.floor((target - Date.now()) / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return { d, h, m, s: sec }
}

export default function CountdownTimer({ hours = 5 }) {
  const [target] = useState(() => Date.now() + hours * 3600 * 1000)
  const [parts, setParts] = useState(() => diffParts(target))

  useEffect(() => {
    const t = setInterval(() => setParts(diffParts(target)), 1000)
    return () => clearInterval(t)
  }, [target])

  const cells = [
    { label: 'Days', value: parts.d },
    { label: 'Hrs', value: parts.h },
    { label: 'Min', value: parts.m },
    { label: 'Sec', value: parts.s },
  ]

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Time left in sale">
      {cells.map((c) => (
        <span key={c.label} className="flex items-center gap-1.5">
          <span className="bg-secondary text-white text-sm md:text-base font-bold rounded-md w-9 h-9 md:w-10 md:h-10 grid place-items-center tabular-nums">
            {pad(c.value)}
          </span>
          <span className="text-secondary font-bold text-sm md:text-base">{c.label !== 'Sec' ? ':' : ''}</span>
        </span>
      ))}
    </div>
  )
}
