import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';

datadogRum.init({
    applicationId: 'f3058a65-81b2-4276-9f14-5a18005dfd15',
    clientToken: 'pub38b3412b59ad324ba0aca30029cdfd3f',
    remoteConfiguration: {
        id: 'a34ac96f-0ef0-4ae1-a9f1-e84ed34e7b4e',
    },
    site: 'us3.datadoghq.com',
    service: '<SERVICE_NAME>',
    env: '<ENV_NAME>',				// e.g. 'prod', 'staging-1', 'dev'
    version: '<VERSION_NUMBER>',	// e.g. '1.0.0'
    sessionSampleRate: 100,			// capture 100% of sessions
    sessionReplaySampleRate: 20,	// capture 20% of sessions with replay
    trackResources: true,			// Enable Resource tracking
    trackUserInteractions: true,	// Enable Action tracking
    trackLongTasks: true,			// Enable Long Tasks tracking

    // ----- Recommended Options -----
    // allowedTracingUrls: '<BACKEND_URL>',		// Enable distributed tracing
    // defaultPrivacyLevel: 'mask-user-input',	// 'mask-user-input' | 'allow' | 'mask'
    plugins: [reactPlugin({ router: false })],
})
