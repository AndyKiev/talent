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

    // LoginPage — self-registration (shown only when the app setting is on)
    noAccountRegister:    { ukr: "немає облікового запису? зареєструйтесь", eng: "no account? register" },
    registerTitle:        { ukr: "реєстрація в HRM \"Таланти\"", eng: "register to talent HRM" },
    employeeCode:         { ukr: "код працівника", eng: "employee code" },
    fullName:             { ukr: "повне ім'я", eng: "full name" },
    emailLocalPart:       { ukr: "пошта (до @)", eng: "email (before @)" },
    emailDomain:          { ukr: "домен", eng: "domain" },
    createAccount:        { ukr: "створити обліковий запис", eng: "create account" },
    backToSignIn:         { ukr: "назад до входу", eng: "back to sign in" },
    registrationSuccess:  { ukr: "реєстрація успішна. тепер ви можете увійти.", eng: "registration successful. you can now log in." },
    fillAllRegisterFields:{ ukr: "будь ласка, заповніть всі поля", eng: "please fill in all fields" },
    invalidEmployeeCode:  { ukr: "код має починатися з UKR і містити 1-7 літер/цифр (напр. UKR7101004)", eng: "code must start with UKR followed by 1-7 letters/digits (e.g. UKR7101004)" },

    // ThemeSwitch (rendered on the login page)
    dark:  { ukr: "темна", eng: "dark" },
    light: { ukr: "світла", eng: "light" },

    // New theme family labels & theme names (fallbacks for pre-auth)
    chooseTheme:       { ukr: "вибрати тему", eng: "choose theme" },
    familyNeutral:     { ukr: "Нейтральна", eng: "Neutral" },
    familyBlue:        { ukr: "Блакитна", eng: "Blue" },
    familySand:        { ukr: "Пісочна", eng: "Sand" },
    familyForest:      { ukr: "Лісова", eng: "Forest" },
    familyRose:        { ukr: "Рожева", eng: "Rose" },
    familyCyan:        { ukr: "Бірюзова", eng: "Cyan" },
    themeBlueLight:    { ukr: "світло-блакитна", eng: "blue light" },
    themeBlueDark:     { ukr: "темно-блакитна", eng: "blue dark" },
    themeSand:         { ukr: "пісочна", eng: "sand" },
    themeSandDark:     { ukr: "темно-пісочна", eng: "sand dark" },
    themeForest:       { ukr: "лісова", eng: "forest" },
    themeForestDark:   { ukr: "темно-лісова", eng: "forest dark" },
    themeRose:         { ukr: "рожева", eng: "rose" },
    themeRoseDark:     { ukr: "темно-рожева", eng: "rose dark" },
    themeCyan:         { ukr: "бірюзова темна", eng: "cyan dark" },
    themeCyanLight:    { ukr: "бірюзова світла", eng: "cyan light" },
};

export default str;
