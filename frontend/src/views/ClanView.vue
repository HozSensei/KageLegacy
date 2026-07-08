<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import { useFormatRyos } from '../composables/useFormatRyos'

defineOptions({ name: 'ClanView' })

const { t } = useI18n()
const { formatRyos } = useFormatRyos()
const store = useSquadStore()

const clanName = ref('')
const inviteCode = ref('')
const busy = ref(false)
const recruitingPostId = ref(null)

const clan = computed(() => store.clan)
const board = computed(() => store.clanBoard)
const well = computed(() => store.clan?.well)

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
})

async function createClan() {
  busy.value = true
  try {
    await store.createClan(clanName.value)
    clanName.value = ''
  } finally {
    busy.value = false
  }
}

async function joinClan() {
  busy.value = true
  try {
    await store.joinClan(inviteCode.value)
    inviteCode.value = ''
  } finally {
    busy.value = false
  }
}

async function leaveClan() {
  busy.value = true
  try {
    await store.leaveClan()
  } finally {
    busy.value = false
  }
}

async function recruitFromBoard(postId) {
  recruitingPostId.value = postId
  try {
    await store.recruitFromClanBoard(postId)
  } finally {
    recruitingPostId.value = null
  }
}

function expiresLabel(expiresAt) {
  const ms = new Date(expiresAt) - Date.now()
  if (ms <= 0) return t('clan.boardExpired')
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  return t('clan.boardExpiresIn', { hours, minutes })
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="clan-page">
    <header class="lg:grid lg:grid-cols-12 lg:gap-10">
      <div class="lg:col-span-7">
        <p class="page-lead">{{ t('clan.lead') }}</p>
      </div>
    </header>

    <p v-if="store.loading && !store.sensei" class="mt-12 text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="store.error" class="mt-12 text-sm text-fire">{{ store.error }}</p>

    <template v-else>
      <section v-if="!clan?.member" class="mt-12 max-w-lg">
        <p class="section-label">{{ t('clan.joinTitle') }}</p>
        <p class="mt-2 text-sm text-ink-muted">{{ t('clan.joinHint') }}</p>

        <div class="mt-8 space-y-8">
          <div>
            <label class="text-xs uppercase tracking-wide text-ink-faint">{{ t('clan.createLabel') }}</label>
            <div class="mt-2 flex flex-wrap gap-2">
              <input
                v-model="clanName"
                type="text"
                maxlength="64"
                class="min-w-[12rem] flex-1 border border-line bg-transparent px-3 py-2 text-sm"
                :placeholder="t('clan.createPlaceholder')"
              />
              <button type="button" class="btn-primary" :disabled="busy" @click="createClan">
                {{ t('clan.createAction') }}
              </button>
            </div>
          </div>

          <div>
            <label class="text-xs uppercase tracking-wide text-ink-faint">{{ t('clan.inviteLabel') }}</label>
            <div class="mt-2 flex flex-wrap gap-2">
              <input
                v-model="inviteCode"
                type="text"
                maxlength="12"
                class="min-w-[12rem] flex-1 border border-line bg-transparent px-3 py-2 text-sm uppercase"
                :placeholder="t('clan.invitePlaceholder')"
              />
              <button type="button" class="btn-ghost" :disabled="busy" @click="joinClan">
                {{ t('clan.joinAction') }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <template v-else>
        <section class="mt-12">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 class="font-display text-3xl text-ink">{{ clan.clan.name }}</h2>
              <p class="mt-2 text-sm text-ink-muted">
                {{ t('clan.memberCount', { count: clan.clan.memberCount, max: clan.clan.maxMembers }) }}
              </p>
            </div>
            <div class="text-right text-xs text-ink-faint">
              <p>{{ t('clan.inviteCode') }}</p>
              <p class="mt-1 font-mono text-sm text-accent">{{ clan.clan.inviteCode }}</p>
            </div>
          </div>

          <button type="button" class="btn-ghost mt-6 text-xs" :disabled="busy" @click="leaveClan">
            {{ t('clan.leaveAction') }}
          </button>
        </section>

        <section class="mt-14 border-t border-line pt-10" data-testid="clan-well-panel">
          <p class="section-label">{{ t('clan.wellTitle') }}</p>
          <p class="mt-2 max-w-xl text-sm text-ink-muted">{{ t('clan.wellHint') }}</p>

          <div class="mt-6 max-w-md">
            <div class="h-3 overflow-hidden rounded-full bg-ink/20">
              <div
                class="h-full bg-accent transition-all duration-500"
                :style="{ width: `${well?.pct ?? 0}%` }"
              />
            </div>
            <p class="mt-2 text-sm text-ink">
              {{ t('clan.wellProgress', { drops: well?.drops ?? 0, capacity: well?.capacity ?? 50 }) }}
            </p>
          </div>
        </section>

        <section class="mt-14 border-t border-line pt-10" data-testid="clan-board-panel">
          <p class="section-label">{{ t('clan.boardTitle') }}</p>
          <p class="mt-2 max-w-xl text-sm text-ink-muted">{{ t('clan.boardHint') }}</p>

          <div v-if="board?.posts?.length" class="mt-6 grid gap-3 lg:grid-cols-2">
            <article
              v-for="post in board.posts"
              :key="post.id"
              class="border border-line p-4 text-sm"
              :class="{ 'opacity-60': post.recruited || !post.canRecruit }"
            >
              <p class="text-xs text-ink-faint">
                {{ t('clan.boardPostedBy', { name: post.posterSenseiName }) }}
                · {{ expiresLabel(post.expiresAt) }}
              </p>
              <p class="mt-2 font-medium text-ink">{{ post.candidate.name }}</p>
              <p class="mt-1 text-xs text-ink-muted">
                {{ post.candidate.clanTierLabel }} · {{ post.candidate.potential }}
              </p>
              <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span class="text-ink">{{ formatRyos(post.price) }}</span>
                <span v-if="post.recruited" class="text-xs text-accent">{{ t('clan.boardRecruited') }}</span>
                <button
                  v-else-if="post.canRecruit"
                  type="button"
                  class="btn-ghost"
                  :disabled="recruitingPostId === post.id"
                  @click="recruitFromBoard(post.id)"
                >
                  {{ t('clan.boardRecruit') }}
                </button>
                <span v-else-if="post.isMine" class="text-xs text-ink-faint">{{ t('clan.boardYours') }}</span>
              </div>
            </article>
          </div>
          <p v-else class="mt-6 text-sm text-ink-faint">{{ t('clan.boardEmpty') }}</p>
        </section>

        <section class="mt-14 border-t border-line pt-10">
          <p class="section-label">{{ t('clan.membersTitle') }}</p>
          <ul class="mt-4 space-y-2 text-sm">
            <li v-for="member in clan.members" :key="member.userId" class="text-ink-muted">
              {{ member.senseiName }}
              <span v-if="member.userId === clan.clan.leaderUserId" class="text-accent">
                · {{ t('clan.leaderBadge') }}
              </span>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>
