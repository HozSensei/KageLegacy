<template>
  <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    <svg
      class="absolute -left-[10%] top-[8%] h-[70vh] w-[55vw] opacity-[0.07]"
      viewBox="0 0 400 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 80C80 40 140 120 200 90C260 60 320 140 380 100" stroke="currentColor" stroke-width="0.75" class="text-accent-soft" />
      <path d="M10 160C70 120 150 200 220 170C290 140 340 220 390 190" stroke="currentColor" stroke-width="0.75" class="text-accent-soft" />
      <path d="M30 240C100 200 170 280 240 250C310 220 350 300 400 270" stroke="currentColor" stroke-width="0.75" class="text-accent-soft" />
      <path d="M0 320C60 280 130 360 210 330C290 300 350 380 400 350" stroke="currentColor" stroke-width="0.75" class="text-accent-soft" />
      <path d="M40 400C110 360 180 440 260 410C340 380 370 460 400 430" stroke="currentColor" stroke-width="0.75" class="text-accent-soft" />
      <path d="M20 480C90 440 160 520 230 490C300 460 360 540 400 510" stroke="currentColor" stroke-width="0.75" class="text-accent-soft" />
      <circle cx="120" cy="130" r="2" class="fill-accent-soft/40" />
      <circle cx="280" cy="280" r="1.5" class="fill-accent-soft/30" />
      <circle cx="180" cy="420" r="2" class="fill-accent-soft/35" />
    </svg>
    <div class="absolute inset-0 bg-gradient-to-br from-bg via-bg to-bg-soft" />
  </div>
</template>
