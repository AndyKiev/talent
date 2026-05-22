from pydantic import BaseModel


class GeneralExceptionDescription(BaseModel):
    exist: str = "Запис вже існує"
    current_exist: str = "цей запис вже має таку назву"
    not_exist: str = "Відсутні дані"
    delete: str = "Запис видалено"
    update: str = "Оновлено %s записів"
    archiving: str = "Заархівовано %s записів"
    rebranding: str = "Ребрендинг проведено"
    added: str = "Дані додано/оновлено, %s записів"
    margin_validation_error: str = "Помилка. Дані які передаються дублюються: %s"
    no_comment: str = "Коментар не може бути пустим рядком"
    create_error: str = "Неможливо створити запис з такими даними"
    orig_type_error: str = "поле origin_type_name некоректне"
    delete_failed_integrity_error: str = (
        "Неможливо видалити запис '%s', оскільки він використовується в інших записах."
    )


class ServerExceptionDescription(BaseModel):
    internal_server_error: str = "Внутрішня помилка сервера"
    service_unavailable: str = "Сервіс недоступний"


class ClientExceptionDescription(BaseModel):
    unauthorized: str = "Невірний логін чи пароль"
    not_unauthorized: str = "Необхідна повторна автентифікація"
    forbidden: str = "Доступ заборонено"
