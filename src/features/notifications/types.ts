export interface NotificationPreference {
  channel: "in-app" | "email" | "sms";
  enabled: boolean;
}
