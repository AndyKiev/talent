from pydantic import BaseModel


class LdapConfig(BaseModel):
    server: str
    # user_ldap_auchan: str = "cn=Bitlog,ou=servicesaccounts,dc=auchan,dc=corp"
    password: str
    user_ldap_project: str = "uid=%s,ou=users,ou=Bitlog,ou=localapps,dc=auchan,dc=corp"
    search_base: str = "dc=auchan,dc=corp"
    search_filter: str = "(&(objectclass=person)(uid=%s))"
    attributes: list = ["*", "+"]
