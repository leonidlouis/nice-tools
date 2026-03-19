import posthog from 'posthog-js';

type EventName =
    | 'compression_started'
    | 'compression_completed'
    | 'compression_failed'
    | 'batch_completed'
    | 'files_added'
    | 'download_clicked'
    | 'support_clicked'
    | 'error_occurred'
    | 'settings_changed'
    | 'help_clicked'
    | 'clear_all_clicked'
    | 'download_all_clicked'
    | 'support_menu_opened'
    | 'preview_opened'
    | 'preview_toggle_clicked'
    | 'video_files_added'
    | 'video_conversion_started'
    | 'video_batch_completed'
    | 'video_error_occurred'
    | 'video_preview_opened'
    | 'video_download_all'
    | 'video_settings_changed'
    | 'video_error_report_clicked'
    | 'exif_stripping_started'
    | 'exif_batch_completed'
    | 'exif_error_occurred'
    | 'svg_file_added'
    | 'svg_optimization_started'
    | 'svg_optimization_completed'
    | 'svg_optimization_failed'
    | 'jwt_decoded'
    | 'cron_expression_parsed'
    | 'color_palette_generated'
    | 'unit_converted';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventProperties = { active_user_account?: string | null; } & Record<string, any>;

export const sendEvent = (name: EventName, properties?: EventProperties) => {
    // 1. Send to PostHog
    if (typeof window !== 'undefined') {
        try {
            posthog.capture(name, properties);
        } catch (e) {
            console.error('Failed to send event to PostHog', e);
        }
    }
};
