import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: import.meta.env.VITE_DATADOG_APPLICATION_ID,
  clientToken: import.meta.env.VITE_DATADOG_CLIENT_TOKEN,
  site: 'us3.datadoghq.com',

  service: 'employee-frontend',
  env: 'production',
  version: '1.0.0',

  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,

  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,

  allowedTracingUrls: [
    {
      match: 'http://20.99.223.75',
      propagatorTypes: ['datadog', 'tracecontext'],
    },
  ],
});
