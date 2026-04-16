import json

from sqlalchemy import TypeDecorator, CLOB


class JSONEncodedDict(TypeDecorator):
    """Represents an immutable structure as a json-encoded string."""

    impl = CLOB

    def process_bind_param(self, value, dialect):
        # print(f"JSONEncodedDict.process_bind_param: {type(value)} - {value}")
        if value is not None:
            # If it's already a string, assume it's already JSON and don't double-encode
            if isinstance(value, str):
                try:
                    # Validate it's proper JSON
                    json.loads(value)
                    return value
                except json.JSONDecodeError:
                    # If not valid JSON, convert to JSON
                    return json.dumps(value, ensure_ascii=False)
            else:
                # Convert Python object to JSON string
                return json.dumps(value, ensure_ascii=False)
        return value

    def process_result_value(self, value, dialect):
        # print(f"JSONEncodedDict.process_result_value: {type(value)} - {value}")
        if value is not None:
            # Handle double-encoded JSON strings
            if isinstance(value, str):
                try:
                    # First, try to parse as JSON
                    parsed = json.loads(value)

                    # If the parsed result is still a string, it was double-encoded
                    if isinstance(parsed, str):
                        try:
                            # Parse the inner JSON
                            return json.loads(parsed)
                        except json.JSONDecodeError:
                            # If inner parsing fails, return the parsed string
                            return parsed
                    else:
                        # Single-encoded JSON, return as-is
                        return parsed
                except json.JSONDecodeError:
                    # If JSON parsing fails entirely, return the string as-is
                    return value
            else:
                # Already a Python object (dict/list)
                return value
        return value
