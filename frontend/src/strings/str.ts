// src/strings/str.ts
//
// Hardcoded fallback strings — ONLY for screens shown BEFORE the user logs in.
// After login, RootLayout loads every translation from the DB (/full_msgs) into
// useTranslationsStore, and useString resolves DB-first. So the rest of the app
// needs nothing here. Keep this file tiny: just the login route (LoginPage +
// ThemeSwitch), which renders pre-auth when the DB strings are not yet loaded.
//
// To add app strings, put them in the DB via the translations admin / JSON upload
// (use the /add-translation workflow) — NOT here.

export const str = {
    // LoginPage
    signUpToTalentHRM:           { ukr: 'вхід до HRM "Таланти"', eng: "sign up to talent HRM" },
    welcomeBack:                 { ukr: "з поверненням!", eng: "welcome back!" },
    username:                    { ukr: "код користувача", eng: "username" },
    password:                    { ukr: "пароль", eng: "password" },
    signIn:                      { ukr: "вхід", eng: "sign in" },
    inputLoginAndPasswordPlease: { ukr: "будь ласка введіть логін і пароль", eng: "Please enter both username and password." },

    // ThemeSwitch (rendered on the login page)
    dark:  { ukr: "темна", eng: "dark" },
    light: { ukr: "світла", eng: "light" },
};

export default str;
