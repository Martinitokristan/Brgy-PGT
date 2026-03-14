// Translations for the Barangay PGT system
// Usage: const t = useT(); then use t("key")

export type Lang = "en" | "fil";

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav/Sidebar
    feed: "Feed",
    events: "Events",
    notifications: "Notifications",
    profile: "Profile",
    menu: "Menu",
    settings: "Settings",
    logout: "Logout",
    help_support: "Help & Support",
    security: "Security",
    // Settings page
    settings_title: "Settings",
    settings_subtitle: "Manage your account and preferences",
    account: "Account",
    edit_profile: "Edit Profile",
    edit_profile_desc: "Update your name, photo, and contact info",
    change_password: "Change Password",
    change_password_desc: "Update your account password",
    notifications_title: "Notifications",
    push_notifications: "Push Notifications",
    push_notifications_desc: "Alerts on your device for new posts",
    email_notifications: "Email Notifications",
    email_notifications_desc: "Weekly digest of barangay activity",
    appearance: "Appearance",
    dark_mode: "Dark Mode",
    dark_mode_on: "Dark theme is on",
    dark_mode_off: "Light theme is on",
    language: "Language",
    security_title: "Security",
    logout_all_devices: "Log Out All Devices",
    logout_all_desc: "Immediately end all active sessions",
    log_out: "Log out",
    account_actions: "Account Actions",
    delete_account: "Delete Account",
    delete_account_desc: "Deactivate your account (recoverable via email)",
    // Feed
    like: "Like",
    comment: "Comment",
    share: "Share",
    // Common
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    loading: "Loading...",
    search: "Search",
    no_results: "No results found",
    // Posts
    general: "General",
    emergency: "Emergency",
    complaint: "Complaint",
    suggestion: "Suggestion",
    resolved: "Resolved",
    pending: "Pending",
    in_progress: "In Progress",
    // Approval
    approval_pending: "Your account is pending approval",
    approval_wait: "Please wait 1-2 days for admin approval.",
  },
  fil: {
    // Nav/Sidebar
    feed: "Feed",
    events: "Mga Kaganapan",
    notifications: "Mga Abiso",
    profile: "Profile",
    menu: "Menu",
    settings: "Mga Setting",
    logout: "Mag-logout",
    help_support: "Tulong at Suporta",
    security: "Seguridad",
    // Settings page
    settings_title: "Mga Setting",
    settings_subtitle: "Pamahalaan ang iyong account at mga kagustuhan",
    account: "Account",
    edit_profile: "I-edit ang Profile",
    edit_profile_desc: "I-update ang iyong pangalan, larawan, at contact info",
    change_password: "Baguhin ang Password",
    change_password_desc: "I-update ang iyong password",
    notifications_title: "Mga Abiso",
    push_notifications: "Push Notifications",
    push_notifications_desc: "Mga alerto sa iyong device para sa mga bagong post",
    email_notifications: "Email Notifications",
    email_notifications_desc: "Lingguhang buod ng mga aktibidad ng barangay",
    appearance: "Hitsura",
    dark_mode: "Dark Mode",
    dark_mode_on: "Naka-on ang dark theme",
    dark_mode_off: "Naka-on ang light theme",
    language: "Wika",
    security_title: "Seguridad",
    logout_all_devices: "Mag-logout sa Lahat ng Device",
    logout_all_desc: "Agad na tapusin ang lahat ng aktibong session",
    log_out: "Mag-logout",
    account_actions: "Mga Aksyon sa Account",
    delete_account: "Burahin ang Account",
    delete_account_desc: "I-deactivate ang iyong account (mababawi sa pamamagitan ng email)",
    // Feed
    like: "Like",
    comment: "Komento",
    share: "Ibahagi",
    // Common
    save: "I-save",
    cancel: "Kanselahin",
    confirm: "Kumpirmahin",
    loading: "Naglo-load...",
    search: "Maghanap",
    no_results: "Walang nahanap na resulta",
    // Posts
    general: "Pangkalahatan",
    emergency: "Emergency",
    complaint: "Reklamo",
    suggestion: "Mungkahi",
    resolved: "Nalutas",
    pending: "Naghihintay",
    in_progress: "Isinasagawa",
    // Approval
    approval_pending: "Ang iyong account ay naghihintay ng pag-apruba",
    approval_wait: "Mangyaring maghintay ng 1-2 araw para sa pag-apruba ng admin.",
  },
};

export function getT(lang: Lang) {
  return (key: string): string => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  };
}
