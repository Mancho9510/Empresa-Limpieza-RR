import * as Sentry from '@sentry/nextjs';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: 'https://14115ff4602d3cacadd5f83c5b7d77cb@o4511199542640640.ingest.us.sentry.io/4511199548669952',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: 'https://14115ff4602d3cacadd5f83c5b7d77cb@o4511199542640640.ingest.us.sentry.io/4511199548669952',
    });
  }
}
