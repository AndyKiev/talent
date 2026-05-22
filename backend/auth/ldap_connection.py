from ldap3 import ALL, Connection, Server

from backend.config import settings


def authenticate_ldap(
    username: str,
    password: str,
) -> dict:
    server = Server(settings.ldap.server, get_info=ALL)
    with Connection(
        server=server,
        user=settings.ldap.user_ldap_project % username,
        password=password,
    ) as connection:
        connection.search(
            search_base=settings.ldap.search_base,
            search_filter=settings.ldap.search_filter % username,
            attributes=settings.ldap.attributes,
        )
        entry = connection.entries[0].entry_attributes_as_dict
        return dict(
            user_ukr=entry["employeeNumber"][0],
            full_name=entry["cn"][0],
            group=[
                (
                    ",".join([group.split(",")[0][3:] for group in entry["memberOf"]])
                    if entry["memberOf"]
                    else 1
                )
            ],
        )


if __name__ == "__main__":
    print(authenticate_ldap(username="", password=""))
