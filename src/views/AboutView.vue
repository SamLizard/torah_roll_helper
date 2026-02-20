<template>
  <v-container fluid class="pa-4">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card variant="flat" :dir="$vuetify.locale.isRtl ? 'rtl' : 'ltr'">
          <v-card-title class="text-h5 font-weight-bold">
            {{ $t('about.title') }}
          </v-card-title>
          <v-card-text class="text-body-1">
            <p>{{ $t('about.description') }}</p>

            <p class="text-subtitle-1 font-weight-bold mt-6 mb-2">
              {{ $t('about.dataCreditsTitle') }}
            </p>
            <p>
              {{ $t('about.dataCreditsPrefix') }}
              <a
                href="https://github.com/akivajgordon/tikkun.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                tikkun.io
              </a>
              {{ $t('about.dataCreditsMiddle') }}
              <a
                href="https://www.sefaria.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sefaria
              </a>.
            </p>
            <p>{{ $t('about.dataCreditsThanks') }}</p>
            <p class="mt-4">{{ $t('about.issueInvite') }}</p>

            <p class="mt-4">
              <v-btn
                href="https://github.com/SamLizard/torah_roll_helper"
                target="_blank"
                rel="noopener noreferrer"
                prepend-icon="mdi-github"
                variant="outlined"
              >
                {{ $t('about.github') }}
              </v-btn>
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
