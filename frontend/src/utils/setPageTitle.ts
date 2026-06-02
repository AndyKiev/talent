const APP_NAME = 'Talent';

export function setPageTitle(page?: string) {
    document.title = page ? `${page} | ${APP_NAME}` : APP_NAME;
}