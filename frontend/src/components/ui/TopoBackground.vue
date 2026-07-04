<template>
  <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
    <!-- Base -->
    <div class="absolute inset-0 bg-bg" />

    <!-- Vignette légère (ne masque pas les lignes) -->
    <div
      class="absolute inset-0"
      style="background: radial-gradient(ellipse 80% 60% at 15% 20%, color-mix(in srgb, var(--color-accent-soft) 8%, transparent), transparent 55%), radial-gradient(ellipse 50% 40% at 85% 80%, color-mix(in srgb, var(--color-accent) 5%, transparent), transparent 50%);"
    />

    <!-- Lignes topographiques — AU-DESSUS du fond, visibles -->
    <svg
      class="absolute -left-[5%] top-[2%] h-[85vh] w-[62vw] text-accent-soft"
      style="opacity: 0.22"
      viewBox="0 0 500 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 60C90 20 160 100 240 70C320 40 400 120 480 80" stroke="currentColor" stroke-width="1" />
      <path d="M0 140C70 100 150 180 230 150C310 120 390 200 500 160" stroke="currentColor" stroke-width="1" />
      <path d="M30 220C110 180 190 260 270 230C350 200 420 280 500 250" stroke="currentColor" stroke-width="1" />
      <path d="M10 300C80 260 170 340 250 310C330 280 410 360 490 330" stroke="currentColor" stroke-width="1" />
      <path d="M40 380C120 340 200 420 280 390C360 360 440 440 500 410" stroke="currentColor" stroke-width="1" />
      <path d="M0 460C90 420 180 500 260 470C340 440 430 520 500 490" stroke="currentColor" stroke-width="1" />
      <path d="M50 540C130 500 210 580 290 550C370 520 450 600 500 570" stroke="currentColor" stroke-width="1" />
      <path d="M20 620C100 580 190 660 280 630C370 600 450 680 500 650" stroke="currentColor" stroke-width="0.75" opacity="0.6" />
      <!-- Contours secondaires -->
      <path d="M60 100C120 130 180 90 240 120C300 150 360 110 420 140" stroke="currentColor" stroke-width="0.5" opacity="0.45" />
      <path d="M80 260C140 290 200 250 260 280C320 310 380 270 440 300" stroke="currentColor" stroke-width="0.5" opacity="0.45" />
      <path d="M40 420C100 450 160 410 220 440C280 470 340 430 400 460" stroke="currentColor" stroke-width="0.5" opacity="0.45" />
    </svg>

    <!-- Symboles dispersés (style carte) -->
    <svg class="absolute right-[8%] top-[18%] size-3 text-accent-soft/30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
    </svg>
    <svg class="absolute left-[42%] top-[42%] size-2 text-accent-soft/20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="3" />
    </svg>
    <svg class="absolute bottom-[22%] right-[22%] size-4 text-accent-soft/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
    <div class="absolute bottom-[30%] left-[28%] size-1.5 rotate-45 border border-accent-soft/25" />

    <!-- Seconde couche topo droite (équilibre) -->
    <svg
      class="absolute -right-[15%] bottom-[5%] h-[50vh] w-[45vw] text-accent-soft"
      style="opacity: 0.1"
      viewBox="0 0 400 400"
      fill="none"
    >
      <path d="M0 80C60 50 120 110 200 90C280 70 340 130 400 100" stroke="currentColor" stroke-width="1" />
      <path d="M20 160C80 130 140 190 220 170C300 150 360 210 400 180" stroke="currentColor" stroke-width="1" />
      <path d="M0 240C70 210 150 270 230 250C310 230 370 290 400 260" stroke="currentColor" stroke-width="1" />
    </svg>
  </div>
</template>
